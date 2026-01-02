import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

// GET /api/groups/[id]/guests - Get unlinked players (guests) from recent sessions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;
    const supabase = createSupabaseClient();

    // Get sessions for this group (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, name, date')
      .eq('group_id', groupId)
      .gte('date', thirtyDaysAgo.toISOString())
      .order('date', { ascending: false });

    if (sessionsError) {
      throw sessionsError;
    }

    const sessionIds = (sessions || []).map(s => s.id);
    if (sessionIds.length === 0) {
      return NextResponse.json({ guests: [] });
    }

    // Get unlinked players from these sessions
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, session_id, group_player_id')
      .in('session_id', sessionIds)
      .is('group_player_id', null);

    if (playersError) {
      throw playersError;
    }

    // Get existing group players to filter out guests that are already in the group
    const { data: existingGroupPlayers } = await supabase
      .from('group_players')
      .select('name')
      .eq('group_id', groupId);

    const existingNames = new Set(
      (existingGroupPlayers || []).map(p => p.name.toLowerCase().trim())
    );

    // Group guests by name (same guest might play in multiple sessions)
    // But filter out any that already exist as group players
    const guestMap = new Map<string, {
      name: string;
      sessionCount: number;
      lastSessionId: string;
      lastSessionName: string;
      lastSessionDate: string;
    }>();

    (players || []).forEach(player => {
      const nameLower = player.name.toLowerCase().trim();
      
      // Skip if this name already exists as a group player
      if (existingNames.has(nameLower)) {
        return;
      }
      
      const session = sessions?.find(s => s.id === player.session_id);
      
      if (!guestMap.has(nameLower)) {
        guestMap.set(nameLower, {
          name: player.name,
          sessionCount: 1,
          lastSessionId: player.session_id,
          lastSessionName: session?.name || 'Unknown Session',
          lastSessionDate: session?.date || '',
        });
      } else {
        const existing = guestMap.get(nameLower)!;
        existing.sessionCount++;
        // Update to most recent session
        if (session?.date && session.date > existing.lastSessionDate) {
          existing.lastSessionId = player.session_id;
          existing.lastSessionName = session.name || 'Unknown Session';
          existing.lastSessionDate = session.date;
        }
      }
    });

    // Convert to array and sort by most recent
    const guests = Array.from(guestMap.values())
      .sort((a, b) => new Date(b.lastSessionDate).getTime() - new Date(a.lastSessionDate).getTime());

    return NextResponse.json({ guests });
  } catch (error) {
    console.error('[API] Error fetching guests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guests' },
      { status: 500 }
    );
  }
}

// POST /api/groups/[id]/guests - Promote a guest to group player
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient();

    // Check if player with this name already exists in group
    const { data: existing } = await supabase
      .from('group_players')
      .select('id, name')
      .eq('group_id', groupId)
      .ilike('name', name.trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Player with this name already exists in group', existingPlayer: existing },
        { status: 409 }
      );
    }

    // Create new group player
    const groupPlayerId = `gp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: newPlayer, error: createError } = await supabase
      .from('group_players')
      .insert({
        id: groupPlayerId,
        group_id: groupId,
        name: name.trim(),
        elo_rating: 1500,
        wins: 0,
        losses: 0,
        total_games: 0,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Link all past session players with matching name to this group player
    // This allows future stats to be computed from past games
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('group_id', groupId);

    const sessionIds = (sessions || []).map(s => s.id);
    
    if (sessionIds.length > 0) {
      // First get all players that should be linked (for logging)
      const { data: playersToLink } = await supabase
        .from('players')
        .select('id, name, session_id')
        .in('session_id', sessionIds)
        .is('group_player_id', null);

      // Filter by name case-insensitively
      const matchingPlayers = (playersToLink || []).filter(p => 
        p.name.toLowerCase().trim() === name.trim().toLowerCase()
      );

      console.log(`[API] Linking ${matchingPlayers.length} session players to group player ${groupPlayerId} for name "${name}"`);

      // Update matching players by their IDs
      if (matchingPlayers.length > 0) {
        const playerIds = matchingPlayers.map(p => p.id);
        const { error: linkError, count } = await supabase
          .from('players')
          .update({ group_player_id: groupPlayerId })
          .in('id', playerIds);

        if (linkError) {
          console.warn('[API] Failed to link past players:', linkError);
          // Don't fail the request - player was created successfully
        } else {
          console.log(`[API] Successfully linked ${count} players`);
        }
      }
    }

    return NextResponse.json({
      player: {
        id: newPlayer.id,
        groupId: newPlayer.group_id,
        name: newPlayer.name,
        eloRating: newPlayer.elo_rating,
      },
      message: 'Player added to group and linked to past sessions',
    });
  } catch (error) {
    console.error('[API] Error promoting guest:', error);
    return NextResponse.json(
      { error: 'Failed to promote guest' },
      { status: 500 }
    );
  }
}
