import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

// GET /api/debug/group-data?groupId=xxx - Check all data for a group
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json(
        { error: 'groupId query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient();
    
    // Check all tables for data related to this group
    const results: Record<string, any> = {};

    // 1. Check if group exists
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();
    
    results.group = { exists: !!group, data: group, error: groupError?.message };

    // 2. Check group_players
    const { data: groupPlayers, error: gpError } = await supabase
      .from('group_players')
      .select('id, name, is_active')
      .eq('group_id', groupId);
    
    results.group_players = { 
      count: groupPlayers?.length || 0, 
      data: groupPlayers,
      error: gpError?.message 
    };

    // 3. Check sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, name, date')
      .eq('group_id', groupId);
    
    results.sessions = { 
      count: sessions?.length || 0, 
      data: sessions,
      error: sessionsError?.message 
    };

    // 4. Check partner_stats
    const { data: partnerStats, error: psError } = await supabase
      .from('partner_stats')
      .select('id, player1_id, player2_id, wins, losses')
      .eq('group_id', groupId);
    
    results.partner_stats = { 
      count: partnerStats?.length || 0, 
      data: partnerStats,
      error: psError?.message 
    };

    // 5. Check pairing_matchups
    const { data: pairingMatchups, error: pmError } = await supabase
      .from('pairing_matchups')
      .select('id, team1_player1_id, team1_player2_id, team1_wins, team2_wins')
      .eq('group_id', groupId);
    
    results.pairing_matchups = { 
      count: pairingMatchups?.length || 0, 
      data: pairingMatchups,
      error: pmError?.message 
    };

    // 6. Check players in sessions belonging to this group
    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, name, session_id, group_player_id')
        .in('session_id', sessionIds);
      
      results.players_via_sessions = { 
        count: players?.length || 0, 
        data: players,
        error: playersError?.message 
      };

      // 7. Check games in those sessions
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('id, game_number, session_id, winning_team')
        .in('session_id', sessionIds);
      
      results.games = { 
        count: games?.length || 0, 
        data: games,
        error: gamesError?.message 
      };
    } else {
      results.players_via_sessions = { count: 0, data: [] };
      results.games = { count: 0, data: [] };
    }

    // Summary
    results.summary = {
      group_exists: !!group,
      total_orphaned_records: 
        (results.group_players.count || 0) +
        (results.sessions.count || 0) +
        (results.partner_stats.count || 0) +
        (results.pairing_matchups.count || 0) +
        (results.players_via_sessions.count || 0) +
        (results.games.count || 0),
      should_be_zero_after_deletion: true
    };

    return NextResponse.json(results);
  } catch (error) {
    console.error('[API] Error checking group data:', error);
    return NextResponse.json(
      { error: 'Failed to check group data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

