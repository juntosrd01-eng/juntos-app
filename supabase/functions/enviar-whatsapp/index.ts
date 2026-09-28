// Procesa cola_whatsapp y envía por Twilio (WhatsApp). Se dispara con un Database Webhook
// (INSERT en cola_whatsapp) o con un cron cada minuto. Desplegar con --no-verify-jwt; se protege con CRON_SECRET.
import {createClient} from 'npm:@supabase/supabase-js@2'
const APP=Deno.env.get('APP_URL')!,SID=Deno.env.get('TWILIO_ACCOUNT_SID')!,TOK=Deno.env.get('TWILIO_AUTH_TOKEN')!,FROM=Deno.env.get('TWILIO_WHATSAPP_FROM')! // ej: whatsapp:+14155238886
const hora=(t:string)=>new Date(t).toLocaleTimeString('es-DO',{hour:'numeric',minute:'2-digit',timeZone:'America/Santo_Domingo'})
Deno.serve(async req=>{
  if(req.headers.get('x-cron-secret')!==Deno.env.get('CRON_SECRET'))return new Response('No autorizado',{status:401})
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const {data:cola}=await db.from('cola_whatsapp').select('*, users(whatsapp)').eq('estado','pendiente').order('id').limit(20)
  let ok=0
  for(const m of cola??[]){
    const d=m.datos as Record<string,string>,to=m.users?.whatsapp
    let body='',media:string|undefined
    if(m.plantilla==='servicio_asignado')body=`💙 JUNTOS: ya hay una acompañante asignada para ${d.beneficiario}. Te avisamos apenas llegue.`
    if(m.plantilla==='checkin_in')body=`✅ JUNTOS: tu acompañante llegó donde ${d.beneficiario} a las ${hora(d.ts)}. Mira la foto de llegada.`
    if(m.plantilla==='checkin_out'){
      const {data:r}=await db.from('reportes').select('*').eq('servicio_id',d.servicio_id).maybeSingle()
      body=`🏁 JUNTOS: terminó el acompañamiento de ${d.beneficiario} a las ${hora(d.ts)}.`+(r?`\n${{bien:'Comió bien',poco:'Comió poco',nada:'No quiso comer'}[r.comio as string]}, ${r.pastilla?'tomó su pastilla':'sin pastilla hoy'}. Ánimo ${r.animo}/5.${r.nota?`\n“${r.nota}”`:''}${r.video_path?'\n🎥 Tienes un Video-Abrazo esperándote en la app.':''}`:'')+`\n${APP}`
    }
    if(d.foto){const {data}=await db.storage.from('checkin-fotos').createSignedUrl(d.foto,86400);media=data?.signedUrl}
    let estado='error'
    if(to&&body){
      const f=new URLSearchParams({From:FROM,To:'whatsapp:'+to.replace(/^whatsapp:/,''),Body:body});if(media)f.set('MediaUrl',media)
      const r=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`,{method:'POST',headers:{Authorization:'Basic '+btoa(`${SID}:${TOK}`)},body:f})
      if(r.ok){estado='enviado';ok++}
    }
    await db.from('cola_whatsapp').update({estado,enviado_en:new Date().toISOString()}).eq('id',m.id)
  }
  return new Response(JSON.stringify({procesados:cola?.length??0,enviados:ok}),{headers:{'Content-Type':'application/json'}})
})
