import { createSupabaseClient } from '../lib/supabase';

async function debug() {
  const supabase = createSupabaseClient();
  const groupId = 'group-1767302687355';
  const jamesGroupPlayerId = 'gp-1767302719038-ci3x14a6x';
  
  // Get all sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('group_id', groupId);
    
  const sessionIds = (sessions || []).map(s => s.id);
  console.log('Total sessions:', sessionIds.length);
  
  // Get all session players
  const { data: sessionPlayers } = await supabase
    .from('players')
    .select('id, session_id, group_player_id, name')
    .in('session_id', sessionIds);
  
  // Find James's session player IDs
  const jamesSessionPlayerIds = sessionPlayers
    ?.filter(p => p.group_player_id === jamesGroupPlayerId)
    .map(p => p.id) || [];
    
  console.log('James session player IDs:', jamesSessionPlayerIds);
  console.log('Sessions James is linked in:', sessionPlayers?.filter(p => p.group_player_id === jamesGroupPlayerId).map(p => p.session_id));
  
  // Build map for all players
  const playerToGroupPlayer = new Map<string, string>();
  sessionPlayers?.forEach(p => {
    if (p.group_player_id) {
      playerToGroupPlayer.set(p.id, p.group_player_id);
    }
  });
  
  // Get all games
  const { data: games } = await supabase
    .from('games')
    .select('id, session_id, team_a, team_b, winning_team')
    .in('session_id', sessionIds)
    .not('winning_team', 'is', null);
    
  console.log('\nTotal completed games:', games?.length);
  
  // Find games James is in
  let jamesGames = 0;
  games?.forEach(game => {
    const teamA = typeof game.team_a === 'string' ? JSON.parse(game.team_a) : game.team_a;
    const teamB = typeof game.team_b === 'string' ? JSON.parse(game.team_b) : game.team_b;
    
    // Check if James is in the game (by group_player_id mapping)
    const jamesInTeamA = teamA.some((id: string) => playerToGroupPlayer.get(id) === jamesGroupPlayerId);
    const jamesInTeamB = teamB.some((id: string) => playerToGroupPlayer.get(id) === jamesGroupPlayerId);
    
    if (jamesInTeamA || jamesInTeamB) {
      jamesGames++;
      console.log(`Game ${game.id} (session ${game.session_id}): James is in ${jamesInTeamA ? 'teamA' : 'teamB'}`);
    }
  });
  
  console.log('\n=== RESULT ===');
  console.log('Games James participated in:', jamesGames);
}

debug().catch(console.error);
