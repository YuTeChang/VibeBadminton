import { createClient } from '@supabase/supabase-js';

/**
 * Create Supabase client for server-side operations
 * Uses service role key for full database access
 */
export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  // Always prefer service role key for server-side operations to bypass RLS
  // Check service role key first, then fall back to anon key only if service role is not available
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).'
    );
  }

  // Log which key is being used (always log in production for debugging)
  const isServiceRole = supabaseKey === process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log('[SupabaseClient] Using', isServiceRole ? 'SERVICE_ROLE_KEY' : 'ANON_KEY', {
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    env: process.env.NODE_ENV,
  });

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

