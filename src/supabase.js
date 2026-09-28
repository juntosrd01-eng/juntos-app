import { createClient } from '@supabase/supabase-js'

const envUrl = import.meta.env.VITE_SUPABASE_URL
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fallback a las credenciales del proyecto si la variable no viene definida
const url = (typeof envUrl === 'string' && envUrl.startsWith('http')) 
  ? envUrl.trim() 
  : 'https://huqpaqdrrruffyyqgzho.supabase.co'

const key = (typeof envKey === 'string' && envKey.trim().length > 0) 
  ? envKey.trim() 
  : 'sb_publishable_VYkVeMqjYDE9553TIqOVqg_AGUnyzE3'

export const sb = (url && key && url.startsWith('http')) 
  ? createClient(url, key) 
  : null
