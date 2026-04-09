import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string || 'placeholder'

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn('[FD Veículos] VITE_SUPABASE_URL não configurada — preencha o .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
