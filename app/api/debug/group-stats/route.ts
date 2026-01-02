import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

/**
 * Debug endpoint for investigating group stats issues
 * GET /api/debug/group-stats?groupId=xxx
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
    }

    const supabase = createSupabaseClient();

    // Get all sessions for this group
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, name, date')
      .eq('group_id', groupId);

    if (sessionsError) {
      return NextResponse.json({ error: 'Failed to fetch sessions', details: sessionsError }, { status: 500 });
    }

    const sessionIds = (sessions || []).map(s => s.id);

    // Get all games for these sessions
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('id, session_id, winning_team, game_number')
      .in('session_id', sessionIds);

    if (gamesError) {
      return NextResponse.json({ error: 'Failed to fetch games', details: gamesError }, { status: 500 });
    }

    // Count completed games
    const completedGames = (games || []).filter(g => g.winning_team !== null);
    const unplayedGames = (games || []).filter(g => g.winning_team === null);

    // Get games grouped by session
    const gamesBySession = (sessions || []).map(session => {
      const sessionGames = (games || []).filter(g => g.session_id === session.id);
      return {
        sessionId: session.id,
        sessionName: session.name,
        sessionDate: session.date,
        totalGames: sessionGames.length,
        completedGames: sessionGames.filter(g => g.winning_team !== null).length,
        unplayedGames: sessionGames.filter(g => g.winning_team === null).length,
      };
    });

    return NextResponse.json({
      groupId,
      totalSessions: sessions?.length || 0,
      totalGamesInDb: games?.length || 0,
      completedGamesCount: completedGames.length,
      unplayedGamesCount: unplayedGames.length,
      gamesBySession,
      sampleGames: games?.slice(0, 5),
    });
  } catch (error) {
    console.error('[Debug] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
