import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

// GET /api/debug/sessions - Debug endpoint to see all sessions and their group_ids
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    
    // Get all sessions with their group_ids
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('id, name, group_id, created_at, date')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      total: sessions?.length || 0,
      sessions: sessions?.map(s => ({
        id: s.id,
        name: s.name,
        group_id: s.group_id,
        group_id_type: typeof s.group_id,
        created_at: s.created_at,
        date: s.date
      }))
    });
  } catch (error) {
    console.error('[Debug] Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

