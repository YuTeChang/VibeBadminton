import { createSupabaseClient } from '@/lib/supabase';
import { PairingStats, PairingMatchup, PairingDetailedStats } from '@/types';

/**
 * Service for managing pairing statistics (doubles team combinations)
 * Maintains stored aggregates for efficient reads while keeping games as source of truth
 */
export class PairingStatsService {
  /**
   * Helper to get ordered pair IDs (ensures consistent key ordering)
   * Always returns [smaller_id, larger_id]
   */
  static getOrderedPair(id1: string, id2: string): [string, string] {
    return id1 < id2 ? [id1, id2] : [id2, id1];
  }

  /**
   * Helper to get ordered team keys for pairing matchups
   * Returns [team1, team2] where team1 < team2 by concatenated IDs
   */
  static getOrderedTeams(
    team1: [string, string],
    team2: [string, string]
  ): { team1: [string, string]; team2: [string, string]; isSwapped: boolean } {
    const team1Key = team1[0] + team1[1];
    const team2Key = team2[0] + team2[1];
    
    if (team1Key < team2Key) {
      return { team1, team2, isSwapped: false };
    } else {
      return { team1: team2, team2: team1, isSwapped: true };
    }
  }

  /**
   * Update partner stats when a game is recorded
   * Called from EloService.processGameResult
   */
  static async updatePartnerStats(
    groupId: string,
    teamGroupPlayerIds: string[],
    won: boolean
  ): Promise<void> {
    // Only applicable for doubles (2 players)
    if (teamGroupPlayerIds.length !== 2) return;

    const supabase = createSupabaseClient();
    const [player1Id, player2Id] = this.getOrderedPair(teamGroupPlayerIds[0], teamGroupPlayerIds[1]);

    try {
      // Try to get existing record
      const { data: existing } = await supabase
        .from('partner_stats')
        .select('id, wins, losses, total_games')
        .eq('group_id', groupId)
        .eq('player1_id', player1Id)
        .eq('player2_id', player2Id)
        .single();

      if (existing) {
        // Update existing record
        await supabase
          .from('partner_stats')
          .update({
            wins: won ? existing.wins + 1 : existing.wins,
            losses: won ? existing.losses : existing.losses + 1,
            total_games: existing.total_games + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Create new record
        await supabase
          .from('partner_stats')
          .insert({
            group_id: groupId,
            player1_id: player1Id,
            player2_id: player2Id,
            wins: won ? 1 : 0,
            losses: won ? 0 : 1,
            total_games: 1,
          });
      }
    } catch (error) {
      console.error('[PairingStatsService] Error updating partner stats:', error);
    }
  }

  /**
   * Update pairing matchup stats when a game is recorded
   * Called from EloService.processGameResult
   */
  static async updatePairingMatchup(
    groupId: string,
    teamAGroupPlayerIds: string[],
    teamBGroupPlayerIds: string[],
    winningTeam: 'A' | 'B'
  ): Promise<void> {
    // Only applicable for doubles (2v2)
    if (teamAGroupPlayerIds.length !== 2 || teamBGroupPlayerIds.length !== 2) return;

    const supabase = createSupabaseClient();

    // Get ordered pairs for each team
    const teamAPair = this.getOrderedPair(teamAGroupPlayerIds[0], teamAGroupPlayerIds[1]);
    const teamBPair = this.getOrderedPair(teamBGroupPlayerIds[0], teamBGroupPlayerIds[1]);

    // Get ordered teams for consistent storage
    const { team1, team2, isSwapped } = this.getOrderedTeams(teamAPair, teamBPair);

    // Determine if team1 won (from storage perspective)
    // If swapped, team1 is actually teamB, so we need to invert the winner
    const team1Won = isSwapped ? winningTeam === 'B' : winningTeam === 'A';

    try {
      // Try to get existing record
      const { data: existing } = await supabase
        .from('pairing_matchups')
        .select('id, team1_wins, team1_losses, total_games')
        .eq('group_id', groupId)
        .eq('team1_player1_id', team1[0])
        .eq('team1_player2_id', team1[1])
        .eq('team2_player1_id', team2[0])
        .eq('team2_player2_id', team2[1])
        .single();

      if (existing) {
        // Update existing record
        await supabase
          .from('pairing_matchups')
          .update({
            team1_wins: team1Won ? existing.team1_wins + 1 : existing.team1_wins,
            team1_losses: team1Won ? existing.team1_losses : existing.team1_losses + 1,
            total_games: existing.total_games + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Create new record
        await supabase
          .from('pairing_matchups')
          .insert({
            group_id: groupId,
            team1_player1_id: team1[0],
            team1_player2_id: team1[1],
            team2_player1_id: team2[0],
            team2_player2_id: team2[1],
            team1_wins: team1Won ? 1 : 0,
            team1_losses: team1Won ? 0 : 1,
            total_games: 1,
          });
      }
    } catch (error) {
      console.error('[PairingStatsService] Error updating pairing matchup:', error);
    }
  }

  /**
   * Reverse partner stats when a game is deleted or result changes
   */
  static async reversePartnerStats(
    groupId: string,
    teamGroupPlayerIds: string[],
    wasWin: boolean
  ): Promise<void> {
    if (teamGroupPlayerIds.length !== 2) return;

    const supabase = createSupabaseClient();
    const [player1Id, player2Id] = this.getOrderedPair(teamGroupPlayerIds[0], teamGroupPlayerIds[1]);

    try {
      const { data: existing } = await supabase
        .from('partner_stats')
        .select('id, wins, losses, total_games')
        .eq('group_id', groupId)
        .eq('player1_id', player1Id)
        .eq('player2_id', player2Id)
        .single();

      if (existing) {
        await supabase
          .from('partner_stats')
          .update({
            wins: wasWin ? Math.max(0, existing.wins - 1) : existing.wins,
            losses: wasWin ? existing.losses : Math.max(0, existing.losses - 1),
            total_games: Math.max(0, existing.total_games - 1),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      }
    } catch (error) {
      console.error('[PairingStatsService] Error reversing partner stats:', error);
    }
  }

  /**
   * Reverse pairing matchup stats when a game is deleted or result changes
   */
  static async reversePairingMatchup(
    groupId: string,
    teamAGroupPlayerIds: string[],
    teamBGroupPlayerIds: string[],
    wasWinningTeam: 'A' | 'B'
  ): Promise<void> {
    if (teamAGroupPlayerIds.length !== 2 || teamBGroupPlayerIds.length !== 2) return;

    const supabase = createSupabaseClient();

    const teamAPair = this.getOrderedPair(teamAGroupPlayerIds[0], teamAGroupPlayerIds[1]);
    const teamBPair = this.getOrderedPair(teamBGroupPlayerIds[0], teamBGroupPlayerIds[1]);
    const { team1, team2, isSwapped } = this.getOrderedTeams(teamAPair, teamBPair);
    const team1Won = isSwapped ? wasWinningTeam === 'B' : wasWinningTeam === 'A';

    try {
      const { data: existing } = await supabase
        .from('pairing_matchups')
        .select('id, team1_wins, team1_losses, total_games')
        .eq('group_id', groupId)
        .eq('team1_player1_id', team1[0])
        .eq('team1_player2_id', team1[1])
        .eq('team2_player1_id', team2[0])
        .eq('team2_player2_id', team2[1])
        .single();

      if (existing) {
        await supabase
          .from('pairing_matchups')
          .update({
            team1_wins: team1Won ? Math.max(0, existing.team1_wins - 1) : existing.team1_wins,
            team1_losses: team1Won ? existing.team1_losses : Math.max(0, existing.team1_losses - 1),
            total_games: Math.max(0, existing.total_games - 1),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      }
    } catch (error) {
      console.error('[PairingStatsService] Error reversing pairing matchup:', error);
    }
  }

  /**
   * Get all pairing stats for a group (leaderboard of best pairs)
   */
  static async getPairingLeaderboard(groupId: string): Promise<PairingStats[]> {
    const supabase = createSupabaseClient();

    try {
      // Get all partner stats with player names
      const { data: partnerStats, error } = await supabase
        .from('partner_stats')
        .select(`
          player1_id,
          player2_id,
          wins,
          losses,
          total_games
        `)
        .eq('group_id', groupId)
        .gt('total_games', 0)
        .order('wins', { ascending: false });

      if (error) throw error;

      // Get all player names
      const { data: players } = await supabase
        .from('group_players')
        .select('id, name')
        .eq('group_id', groupId);

      const playerNames = new Map<string, string>();
      (players || []).forEach(p => playerNames.set(p.id, p.name));

      // Map to PairingStats
      return (partnerStats || [])
        .map(stat => ({
          player1Id: stat.player1_id,
          player1Name: playerNames.get(stat.player1_id) || 'Unknown',
          player2Id: stat.player2_id,
          player2Name: playerNames.get(stat.player2_id) || 'Unknown',
          gamesPlayed: stat.total_games,
          wins: stat.wins,
          losses: stat.losses,
          winRate: stat.total_games > 0 ? (stat.wins / stat.total_games) * 100 : 0,
        }))
        .sort((a, b) => b.winRate - a.winRate || b.gamesPlayed - a.gamesPlayed);
    } catch (error) {
      console.error('[PairingStatsService] Error fetching pairing leaderboard:', error);
      return [];
    }
  }

  /**
   * Get detailed stats for a specific pairing including head-to-head matchups
   */
  static async getPairingDetailedStats(
    groupId: string,
    player1Id: string,
    player2Id: string
  ): Promise<PairingDetailedStats | null> {
    const supabase = createSupabaseClient();
    const [orderedP1, orderedP2] = this.getOrderedPair(player1Id, player2Id);

    try {
      // Get partner stats
      const { data: partnerStat } = await supabase
        .from('partner_stats')
        .select('*')
        .eq('group_id', groupId)
        .eq('player1_id', orderedP1)
        .eq('player2_id', orderedP2)
        .single();

      // Get player names
      const { data: players } = await supabase
        .from('group_players')
        .select('id, name')
        .eq('group_id', groupId);

      const playerNames = new Map<string, string>();
      (players || []).forEach(p => playerNames.set(p.id, p.name));

      // Get all matchups where this pairing is involved
      const { data: matchups } = await supabase
        .from('pairing_matchups')
        .select('*')
        .eq('group_id', groupId)
        .or(`and(team1_player1_id.eq.${orderedP1},team1_player2_id.eq.${orderedP2}),and(team2_player1_id.eq.${orderedP1},team2_player2_id.eq.${orderedP2})`);

      // Build matchup stats
      const matchupStats: PairingMatchup[] = (matchups || []).map(m => {
        const isTeam1 = m.team1_player1_id === orderedP1 && m.team1_player2_id === orderedP2;
        
        const opponentP1 = isTeam1 ? m.team2_player1_id : m.team1_player1_id;
        const opponentP2 = isTeam1 ? m.team2_player2_id : m.team1_player2_id;
        const wins = isTeam1 ? m.team1_wins : m.team1_losses;
        const losses = isTeam1 ? m.team1_losses : m.team1_wins;

        return {
          pairingPlayer1Id: orderedP1,
          pairingPlayer1Name: playerNames.get(orderedP1) || 'Unknown',
          pairingPlayer2Id: orderedP2,
          pairingPlayer2Name: playerNames.get(orderedP2) || 'Unknown',
          opponentPlayer1Id: opponentP1,
          opponentPlayer1Name: playerNames.get(opponentP1) || 'Unknown',
          opponentPlayer2Id: opponentP2,
          opponentPlayer2Name: playerNames.get(opponentP2) || 'Unknown',
          wins,
          losses,
          gamesPlayed: wins + losses,
          winRate: (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0,
        };
      }).sort((a, b) => b.gamesPlayed - a.gamesPlayed);

      // Calculate recent form from games (computed on-the-fly)
      const recentForm = await this.getRecentFormForPairing(groupId, orderedP1, orderedP2);

      // Calculate streak
      let currentStreak = 0;
      for (const result of recentForm) {
        if (currentStreak === 0) {
          currentStreak = result === 'W' ? 1 : -1;
        } else if ((currentStreak > 0 && result === 'W') || (currentStreak < 0 && result === 'L')) {
          currentStreak += result === 'W' ? 1 : -1;
        } else {
          break;
        }
      }

      return {
        player1Id: orderedP1,
        player1Name: playerNames.get(orderedP1) || 'Unknown',
        player2Id: orderedP2,
        player2Name: playerNames.get(orderedP2) || 'Unknown',
        gamesPlayed: partnerStat?.total_games || 0,
        wins: partnerStat?.wins || 0,
        losses: partnerStat?.losses || 0,
        winRate: partnerStat?.total_games > 0 
          ? (partnerStat.wins / partnerStat.total_games) * 100 
          : 0,
        recentForm: recentForm.slice(0, 5),
        currentStreak,
        matchups: matchupStats,
      };
    } catch (error) {
      console.error('[PairingStatsService] Error fetching pairing detailed stats:', error);
      return null;
    }
  }

  /**
   * Get recent form (last 10 games) for a pairing - computed from games table
   */
  private static async getRecentFormForPairing(
    groupId: string,
    player1Id: string,
    player2Id: string
  ): Promise<('W' | 'L')[]> {
    const supabase = createSupabaseClient();

    try {
      // Get sessions in group
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('group_id', groupId);

      const sessionIds = (sessions || []).map(s => s.id);
      if (sessionIds.length === 0) return [];

      // Get player mappings
      const { data: sessionPlayers } = await supabase
        .from('players')
        .select('id, group_player_id')
        .in('session_id', sessionIds)
        .not('group_player_id', 'is', null);

      // Find session player IDs that map to our group player IDs
      const player1SessionIds = new Set<string>();
      const player2SessionIds = new Set<string>();
      
      (sessionPlayers || []).forEach(p => {
        if (p.group_player_id === player1Id) player1SessionIds.add(p.id);
        if (p.group_player_id === player2Id) player2SessionIds.add(p.id);
      });

      // Get recent games
      const { data: games } = await supabase
        .from('games')
        .select('team_a, team_b, winning_team')
        .in('session_id', sessionIds)
        .not('winning_team', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      const recentForm: ('W' | 'L')[] = [];

      (games || []).forEach(game => {
        if (recentForm.length >= 10) return;

        const teamA = typeof game.team_a === 'string' ? JSON.parse(game.team_a) : game.team_a;
        const teamB = typeof game.team_b === 'string' ? JSON.parse(game.team_b) : game.team_b;

        // Check if both players are on the same team
        const bothInTeamA = teamA.some((id: string) => player1SessionIds.has(id)) && 
                           teamA.some((id: string) => player2SessionIds.has(id));
        const bothInTeamB = teamB.some((id: string) => player1SessionIds.has(id)) && 
                           teamB.some((id: string) => player2SessionIds.has(id));

        if (bothInTeamA) {
          recentForm.push(game.winning_team === 'A' ? 'W' : 'L');
        } else if (bothInTeamB) {
          recentForm.push(game.winning_team === 'B' ? 'W' : 'L');
        }
      });

      return recentForm;
    } catch (error) {
      console.error('[PairingStatsService] Error getting recent form:', error);
      return [];
    }
  }

  /**
   * Recalculate all pairing stats for a group from game history
   * Used for data recovery/migration
   */
  static async recalculatePairingStats(groupId: string): Promise<{
    partnerStatsCreated: number;
    matchupsCreated: number;
    gamesProcessed: number;
  }> {
    const supabase = createSupabaseClient();
    const result = { partnerStatsCreated: 0, matchupsCreated: 0, gamesProcessed: 0 };

    try {
      // Clear existing stats for this group
      await supabase.from('partner_stats').delete().eq('group_id', groupId);
      await supabase.from('pairing_matchups').delete().eq('group_id', groupId);

      // Get all sessions in group
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('group_id', groupId);

      const sessionIds = (sessions || []).map(s => s.id);
      if (sessionIds.length === 0) return result;

      // Get player mappings
      const { data: players } = await supabase
        .from('players')
        .select('id, group_player_id')
        .in('session_id', sessionIds)
        .not('group_player_id', 'is', null);

      const playerToGroupPlayer = new Map<string, string>();
      (players || []).forEach(p => {
        if (p.group_player_id) {
          playerToGroupPlayer.set(p.id, p.group_player_id);
        }
      });

      // Get all completed games
      const { data: games } = await supabase
        .from('games')
        .select('*')
        .in('session_id', sessionIds)
        .not('winning_team', 'is', null)
        .order('created_at', { ascending: true });

      // Process each game
      for (const game of (games || [])) {
        const teamA = typeof game.team_a === 'string' ? JSON.parse(game.team_a) : game.team_a;
        const teamB = typeof game.team_b === 'string' ? JSON.parse(game.team_b) : game.team_b;

        // Only process doubles games
        if (teamA.length !== 2 || teamB.length !== 2) continue;

        const teamAGroupIds = teamA.map((id: string) => playerToGroupPlayer.get(id)).filter(Boolean) as string[];
        const teamBGroupIds = teamB.map((id: string) => playerToGroupPlayer.get(id)).filter(Boolean) as string[];

        if (teamAGroupIds.length !== 2 || teamBGroupIds.length !== 2) continue;

        const winningTeam = game.winning_team as 'A' | 'B';

        // Update partner stats for both teams
        await this.updatePartnerStats(groupId, teamAGroupIds, winningTeam === 'A');
        await this.updatePartnerStats(groupId, teamBGroupIds, winningTeam === 'B');

        // Update pairing matchup
        await this.updatePairingMatchup(groupId, teamAGroupIds, teamBGroupIds, winningTeam);

        result.gamesProcessed++;
      }

      // Count created records
      const { count: partnerCount } = await supabase
        .from('partner_stats')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);

      const { count: matchupCount } = await supabase
        .from('pairing_matchups')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);

      result.partnerStatsCreated = partnerCount || 0;
      result.matchupsCreated = matchupCount || 0;

      console.log(`[PairingStatsService] Recalculation complete: ${result.gamesProcessed} games, ${result.partnerStatsCreated} partner stats, ${result.matchupsCreated} matchups`);

      return result;
    } catch (error) {
      console.error('[PairingStatsService] Error recalculating stats:', error);
      throw error;
    }
  }
}

