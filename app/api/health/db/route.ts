import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

// Simple DB connectivity check using Supabase REST API
export async function GET() {
  try {
    const supabase = createSupabaseClient();
    
    // Test connection by querying sessions count
    const { count, error } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      db: 'connected',
      sessionsCount: count ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        db: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
