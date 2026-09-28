# JUNTOS · Acompáñame RD (MVP Gate 1)
React 18 + Vite + Tailwind 4 + Supabase. Sin variables de entorno corre en **modo demo** (datos en memoria, OTP 123456).

## 1. Supabase
1. Crea el proyecto. SQL Editor: ejecuta `supabase/migrations/001_schema.sql` y luego `002_realtime.sql`.
2. Auth → Providers → Phone: activa y conecta Twilio (Messaging Service o Verify con canal **WhatsApp**).
3. Crea tu usuario entrando a la app y luego dale admin: `insert into user_roles values ('<tu-uuid>','admin');`
4. Para crear acompañantes: registra su número, inserta en `acompanantes` (cédula, fecha_nacimiento), sube el PDF de antecedentes al bucket `antecedentes/{user_id}/` y marca `verificado=true`. Agrega el rol: `insert into user_roles values ('<uuid>','acompanante');`

## 2. Edge Functions
    supabase link --project-ref <ref>
    supabase secrets set APP_URL=https://tu-app.vercel.app STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_... \
      TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... TWILIO_WHATSAPP_FROM=whatsapp:+1... CRON_SECRET=<aleatorio>
    supabase functions deploy crear-pago
    supabase functions deploy stripe-webhook --no-verify-jwt
    supabase functions deploy enviar-whatsapp --no-verify-jwt
- Stripe: webhook a `/functions/v1/stripe-webhook` (checkout.session.completed y expired).
- WhatsApp: Dashboard → Database → Webhooks → INSERT en `cola_whatsapp` → HTTP a `/functions/v1/enviar-whatsapp` con header `x-cron-secret`. Los mensajes iniciados por negocio requieren plantillas aprobadas por Meta.
- Azul: `crear-pago` responde 501 hasta configurar credenciales de la Payment Page.

## 3. Vercel
Importa el repo (detecta Vite). Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Anon key nunca lleva la service role.

## 4. Mapbox (mapa real y direcciones)
1. En account.mapbox.com crea un token público (`pk.…`) y restríngelo por URL a tu dominio de Vercel y `localhost`.
2. Agrega `VITE_MAPBOX_TOKEN` en Vercel y en tu `.env` local.
3. Efecto: la dirección se autocompleta en Solicitar (solo RD) y se guardan lat/lng reales; el mapa de la Mesa y de la familia pasa a Mapbox. El check-in usa esas coordenadas para medir el radio de 300 m.
