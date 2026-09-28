// Crea el cobro de un servicio. Stripe (USD, diáspora) listo. Azul: pendiente de credenciales.
import {createClient} from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@16'
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
const json=(b:unknown,status=200)=>new Response(JSON.stringify(b),{status,headers:{...cors,'Content-Type':'application/json'}})
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  try{
    const {servicio_id,metodo}=await req.json()
    const url=Deno.env.get('SUPABASE_URL')!
    // Lee el servicio con el JWT de la persona: la RLS garantiza que puede verlo
    const user=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}}})
    const {data:s}=await user.from('servicios').select('id,total,estado,beneficiario').eq('id',servicio_id).single()
    if(!s)throw new Error('Servicio no encontrado')
    if(s.estado!=='pendiente')throw new Error('Este servicio ya está pagado')
    const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const app=Deno.env.get('APP_URL')!
    if(metodo==='stripe'){
      const {data:cfg}=await admin.from('config').select('valor').eq('clave','tasa_usd_dop').single()
      const usd=Math.round(Number(s.total)/Number(cfg!.valor)*100)/100
      const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
      const sess=await stripe.checkout.sessions.create({mode:'payment',metadata:{servicio_id:s.id},
        line_items:[{quantity:1,price_data:{currency:'usd',unit_amount:Math.round(usd*100),product_data:{name:`JUNTOS · Acompañamiento para ${s.beneficiario}`}}}],
        success_url:`${app}/?pago=ok`,cancel_url:`${app}/?pago=cancelado`})
      await admin.from('pagos').insert({servicio_id:s.id,metodo:'stripe',moneda:'USD',monto:usd,tasa_cambio:cfg!.valor,ref_externa:sess.id})
      return json({url:sess.url})
    }
    if(metodo==='azul')return json({error:'Azul aún no está configurado. Se necesitan MerchantId, clave de autorización y URL de la Payment Page de Azul.'},501)
    throw new Error('Método de pago no válido')
  }catch(e){return json({error:(e as Error).message},400)}
})
