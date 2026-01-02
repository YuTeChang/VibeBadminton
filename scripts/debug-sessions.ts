import { createSupabaseClient } from '../lib/supabase';

async function debug() {
  const supabase = createSupabaseClient();
  const groupId = 'group-1767302687355';
  
  console.log('Testing sessions query for groupId:', groupId);
  
  // Query 1: Same as getLeaderboard and getPlayerDetailedStats
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id')
    .eq('group_id', groupId);
    
  console.log('Sessions found:', sessions?.length);
  console.log('Sessions:', sessions);
  console.log('Error:', error);
  
  if (sessions && sessions.length > 0) {
    // Get games for all sessions
    const sessionIds = sessions.map(s => s.id);
    const { data: games } = await supabase
      .from('games')
      .select('id, session_id')
      .in('session_id', sessionIds)
      .not('winning_team', 'is', null);
      
    console.log('\nCompleted games found:', games?.length);
    
    // Get session players
    const { data: players } = await supabase
      .from('players')
      .select('id, session_id, group_player_id, name')
      .in('session_id', sessionIds);
      
    console.log('Session players found:', players?.length);
    console.log('Linked to group:', players?.filter(p => p.group_player_id).length);
  }
}

debug().catch(console.error);
