import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface StoredSession {
  cookies: any[];
  userAgent: string;
  savedAt: string;
}

export async function saveSession(connectionId: string, session: StoredSession): Promise<void> {
  const { error } = await supabase
    .from('bank_scraper_sessions')
    .upsert(
      {
        connection_id: connectionId,
        session_data: session,
        user_agent: session.userAgent,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'connection_id' }
    );
  if (error) throw error;
}

export async function loadSession(connectionId: string): Promise<StoredSession | null> {
  const { data, error } = await supabase
    .from('bank_scraper_sessions')
    .select('session_data')
    .eq('connection_id', connectionId)
    .maybeSingle();
  if (error) throw error;
  return (data?.session_data as StoredSession) || null;
}

export async function deleteSession(connectionId: string): Promise<void> {
  await supabase.from('bank_scraper_sessions').delete().eq('connection_id', connectionId);
}