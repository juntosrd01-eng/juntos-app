import {createClient} from '@supabase/supabase-js'
const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_ANON_KEY
// Sin variables de entorno la app corre en modo demo (datos en memoria).
export const sb=url&&key?createClient(url,key):null
