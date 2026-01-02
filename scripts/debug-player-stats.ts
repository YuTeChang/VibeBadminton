import { createSupabaseClient } from '../lib/supabase';

async function debug() {
  const supabase = createSupabaseClient();
  const groupId = 'group-1767302687355';
  
  // Get a group player to test with (e.g., "Darvey" or "James")
  const { data: groupPlayers } = await supabase
    .from('group_players')
    .select('id, name')
    .eq('group_id', groupId);
    
  console.log('Group players:', groupPlayers?.map(p => ({ id: p.id, name: p.name })));
  
  // Pick the first player
  const testPlayer = groupPlayers?.[0];
  if (!testPlayer) {
    console.log('No players found');
    return;
  }
  
  console.log('\n--- Testing getPlayerDetailedStats logic for:', testPlayer.name, '---');
  
  // Step 1: Get all sessions in the group (same query as in getPlayerDetailedStats)
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('id')
    .eq('group_id', groupId);
    
  console.log('Sessions query result:', sessions?.length, 'sessions');
  console.log('Sessions:', sessions);
  console.log('Error:', sessionsError);
  
  const sessionIds = (sessions || []).map(s => s.id);
  
  // Step 2: Get session players
  const { data: sessionPlayers } = await supabase
    .from('players')
    .select('id, session_id, group_player_id, name')
    .in('session_id', sessionIds);
    
  console.log('\nSession players found:', sessionPlayers?.length);
  
  // Count how many are linked to our test player
  const thisPlayerMappings = sessionPlayers?.filter(p => p.group_player_id === testPlayer.id);
  console.log(`Mappings for ${testPlayer.name}:`, thisPlayerMappings?.length);
  console.log('Their session IDs:', thisPlayerMappings?.map(p => p.session_id));
  
  // Step 3: Get games
  const { data: games } = await supabase
    .from('games')
    .select('*')
    .in('session_id', sessionIds)
    .not('winning_team', 'is', null);
    
  console.log('\nCompleted games:', games?.length);
  
  // Count games this player is in
  const playerToGroupPlayer = new Map<string, string>();
  sessionPlayers?.forEach(p => {
    if (p.group_player_id) {
      playerToGroupPlayer.set(p.id, p.group_player_id);
    }
  });
  
  let gamesIn = 0;
  games?.forEach(game => {
    const teamA = typeof game.team_a === 'string' ? JSON.parse(game.team_a) : game.team_a;
    const teamB = typeof game.team_b === 'string' ? JSON.parse(game.team_b) : game.team_b;
    
    const inTeamA = teamA.some((id: string) => playerToGroupPlayer.get(id) === testPlayer.id);
    const inTeamB = teamB.some((id: string) => playerToGroupPlayer.get(id) === testPlayer.id);
    
    if (inTeamA || inTeamB) {
      gamesIn++;
    }
  });
  
  console.log(`Games ${testPlayer.name} participated in:`, gamesIn);
}

debug().catch(console.error);
