import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

if (!url || !key) {
  console.warn('[Supabase] Env eksik.')
}

export const supabase = url && key
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

// Backwards-compatible alias while keeping a single GoTrueClient instance.
export const supabaseClient = supabase
export const isSupabaseConfigured = Boolean(url && key)
