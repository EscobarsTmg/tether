import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export interface StoredSession {
  providerSessionRef: string
  userAgent?: string
  savedAt: string
  expiresAt?: string | null
}

export async function saveSession(connectionId: string, session: StoredSession): Promise<void> {
  // Store only an opaque provider authorization/session reference here.
  // Do not persist bank passwords, OTPs, browser cookies, or bearer tokens.
  const { error } = await supabase
    .from('bank_scraper_sessions')
    .upsert(
      {
        connection_id: connectionId,
        session_data: {
          providerSessionRef: session.providerSessionRef,
          savedAt: session.savedAt,
        },
        user_agent: session.userAgent ?? null,
        expires_at: session.expiresAt ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'connection_id' },
    )

  if (error) throw error
}

export async function loadSession(connectionId: string): Promise<StoredSession | null> {
  const { data, error } = await supabase
    .from('bank_scraper_sessions')
    .select('session_data,user_agent,expires_at')
    .eq('connection_id', connectionId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const sessionData = data.session_data as {
    providerSessionRef?: string
    savedAt?: string
  }

  if (!sessionData?.providerSessionRef || !sessionData.savedAt) return null

  return {
    providerSessionRef: sessionData.providerSessionRef,
    savedAt: sessionData.savedAt,
    userAgent: data.user_agent ?? undefined,
    expiresAt: data.expires_at ?? null,
  }
}

export async function deleteSession(connectionId: string): Promise<void> {
  const { error } = await supabase
    .from('bank_scraper_sessions')
    .delete()
    .eq('connection_id', connectionId)

  if (error) throw error
}
