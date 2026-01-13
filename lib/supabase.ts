import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key. Make sure to set SUPABASE_URL and SUPABASE_ANON_KEY in your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)