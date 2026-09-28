// Desplegar con: supabase functions deploy stripe-webhook --no-verify-jwt
// En Stripe: Webhooks → https://<ref>.supabase.co/functions/v1/stripe-webhook → checkout.session.completed / expired
import {createClient} from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@16'
const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
Deno.serve(async req=>{
  const body=await req.text()
  let ev:Stripe.Event
  try{ev=await stripe.webhooks.constructEventAsync(body,req.headers.get('stripe-signature')!,Deno.env.get('STRIPE_WEBHOOK_SECRET')!)}
  catch{return new Response('Firma inválida',{status:400})}
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const s=ev.data.object as Stripe.Checkout.Session
  // El trigger pago_confirmado() pasa el servicio a 'pagado'
  if(ev.type==='checkout.session.completed'&&s.payment_status==='paid')await admin.from('pagos').update({estado:'pagado'}).eq('ref_externa',s.id)
  if(ev.type==='checkout.session.expired')await admin.from('pagos').update({estado:'fallido'}).eq('ref_externa',s.id)
  return new Response('ok')
})
