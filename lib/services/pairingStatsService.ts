import { createSupabaseClient } from '@/lib/supabase';
import { PairingStats, PairingMatchup, PairingDetailedStats, RecentGame, UnluckyGame, ClutchGame } from '@/types';

/**
 * Service for managing pairing statistics (doubles team combinations)
 * Maintains stored aggregates for efficient reads while keeping games as source of truth
 */
export class PairingStatsService {
  private static readonly DEFAULT_PAIRING_ELO = 1500;
  private static readonly K_FACTOR = 32;
  static readonly MIN_GAMES_QUALIFIED = 5; // Minimum games for a pairing to be considered "qualified"

  /**
   * Calculate expected score for ELO (probability of winning)
   */
  private static calculateExpectedScore(rating: number, opponentRating: number): number {
    return 1 / (1 + Math.pow(10, (opponentRating - rating) / 400));
  }

  /**
   * Calculate new ELO rating after a game
   */
  private static calculateNewRating(currentRating: number, opponentRating: number, won: boolean): number {
    const expectedScore = this.calculateExpectedScore(currentRating, opponentRating);
    const actualScore = won ? 1 : 0;
    const newRating = Math.round(currentRating + this.K_FACTOR * (actualScore - expectedScore));
    return Math.max(100, newRating);
  }

  /**
   * Helper to get ordered pair IDs (ensures consistent key ordering)
   * Always returns [smaller_id, larger_id]
   */
  static getOrderedPair(id1: string, id2: string): [string, string] {
    return id1 < id2 ? [id1, id2] : [id2, id1];
  }

  /**
   * Get the ELO rating for a pairing (returns default if no record exists)
   */
  static async getPairingElo(groupId: string, player1Id: string, player2Id: string): Promise<number> {
    const supabase = createSupabaseClient();
    const [orderedP1, orderedP2] = this.getOrderedPair(player1Id, player2Id);

    try {
      const { data } = await supabase
        .from('partner_stats')
        .select('elo_rating')
        .eq('group_id', groupId)
        .eq('player1_id', orderedP1)
        .eq('player2_id', orderedP2)
        .single();

      return data?.elo_rating ?? this.DEFAULT_PAIRING_ELO;
    } catch {
      return this.DEFAULT_PAIRING_ELO;
    }
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
   * Includes ELO calculation, streak tracking, and point differential
   */
  static async updatePartnerStats(
    groupId: string,
    teamGroupPlayerIds: string[],
    won: boolean,
    opponentPairingElo?: number,
    pointsFor?: number,
    pointsAgainst?: number
  ): Promise<void> {
    // Only applicable for doubles (2 players)
    if (teamGroupPlayerIds.length !== 2) return;

    const supabase = createSupabaseClient();
    const [player1Id, player2Id] = this.getOrderedPair(teamGroupPlayerIds[0], teamGroupPlayerIds[1]);

    try {
      // Try to get existing record
      const { data: existing } = await supabase
        .from('partner_stats')
        .select('id, wins, losses, total_games, elo_rating, current_streak, best_win_streak, points_for, points_against')
        .eq('group_id', groupId)
        .eq('player1_id', player1Id)
        .eq('player2_id', player2Id)
        .single();

      if (existing) {
        // Calculate new ELO if opponent ELO is provided
        const currentElo = existing.elo_rating ?? this.DEFAULT_PAIRING_ELO;
        const newElo = opponentPairingElo 
          ? this.calculateNewRating(currentElo, opponentPairingElo, won)
          : currentElo;

        // Calculate new streak
        const currentStreak = existing.current_streak ?? 0;
        let newStreak: number;
        if (won) {
          newStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
        } else {
          newStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
        }

        // Update best win streak if exceeded
        const bestWinStreak = existing.best_win_streak ?? 0;
        const newBestWinStreak = newStreak > bestWinStreak ? newStreak : bestWinStreak;

        // Calculate points
        const newPointsFor = (existing.points_for ?? 0) + (pointsFor ?? 0);
        const newPointsAgainst = (existing.points_against ?? 0) + (pointsAgainst ?? 0);

        // Update existing record
        await supabase
          .from('partner_stats')
          .update({
            wins: won ? existing.wins + 1 : existing.wins,
            losses: won ? existing.losses : existing.losses + 1,
            total_games: existing.total_games + 1,
            elo_rating: newElo,
            current_streak: newStreak,
            best_win_streak: newBestWinStreak,
            points_for: newPointsFor,
            points_against: newPointsAgainst,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Create new record with default ELO
        // For new pairings, calculate ELO change from default if opponent ELO provided
        const newElo = opponentPairingElo 
          ? this.calculateNewRating(this.DEFAULT_PAIRING_ELO, opponentPairingElo, won)
          : this.DEFAULT_PAIRING_ELO;

        await supabase
          .from('partner_stats')
          .insert({
            group_id: groupId,
            player1_id: player1Id,
            player2_id: player2Id,
            wins: won ? 1 : 0,
            losses: won ? 0 : 1,
            total_games: 1,
            elo_rating: newElo,
            current_streak: won ? 1 : -1,
            best_win_streak: won ? 1 : 0,
            points_for: pointsFor ?? 0,
            points_against: pointsAgainst ?? 0,
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
   * Computes stats from actual games for accuracy (stored stats may be stale)
   */
  static async getPairingLeaderboard(groupId: string): Promise<PairingStats[]> {
    const supabase = createSupabaseClient();

    try {
      // Get all group players
      const { data: groupPlayers } = await supabase
        .from('group_players')
        .select('id, name')
        .eq('group_id', groupId);

      if (!groupPlayers || groupPlayers.length === 0) return [];

      const playerNames = new Map<string, string>();
      groupPlayers.forEach(p => playerNames.set(p.id, p.name));

      // Get all sessions for this group
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('group_id', groupId);

      const sessionIds = (sessions || []).map(s => s.id);
      if (sessionIds.length === 0) return [];

      // Get player mappings (session player ID -> group player ID)
      const { data: sessionPlayers } = await supabase
        .from('players')
        .select('id, group_player_id')
        .in('session_id', sessionIds)
        .not('group_player_id', 'is', null);

      const playerToGroupPlayer = new Map<string, string>();
      (sessionPlayers || []).forEach((p) => {
        if (p.group_player_id) {
          playerToGroupPlayer.set(p.id, p.group_player_id);
        }
      });

      // Get all completed doubles games
      const { data: games } = await supabase
        .from('games')
        .select('team_a, team_b, winning_team')
        .in('session_id', sessionIds)
        .not('winning_team', 'is', null);

      // Compute stats for each pairing
      const pairingStats = new Map<string, { wins: number; losses: number }>();

      (games || []).forEach((game) => {
        const teamA = typeof game.team_a === 'string' ? JSON.parse(game.team_a) : game.team_a;
        const teamB = typeof game.team_b === 'string' ? JSON.parse(game.team_b) : game.team_b;
        
        // Skip singles games
        if (teamA.length !== 2 || teamB.length !== 2) return;

        const winningTeam = game.winning_team;

        // Get unique group player IDs for each team (use Set to handle duplicate session entries)
        const teamAGroupIds = Array.from(new Set(teamA.map((id: string) => playerToGroupPlayer.get(id)).filter(Boolean))) as string[];
        const teamBGroupIds = Array.from(new Set(teamB.map((id: string) => playerToGroupPlayer.get(id)).filter(Boolean))) as string[];

        // Only count if both players in each team are linked to unique group players
        if (teamAGroupIds.length === 2) {
          const [p1, p2] = this.getOrderedPair(teamAGroupIds[0], teamAGroupIds[1]);
          const key = `${p1}|${p2}`;
          if (!pairingStats.has(key)) pairingStats.set(key, { wins: 0, losses: 0 });
          const stats = pairingStats.get(key)!;
          if (winningTeam === 'A') stats.wins++;
          else stats.losses++;
        }

        if (teamBGroupIds.length === 2) {
          const [p1, p2] = this.getOrderedPair(teamBGroupIds[0], teamBGroupIds[1]);
          const key = `${p1}|${p2}`;
          if (!pairingStats.has(key)) pairingStats.set(key, { wins: 0, losses: 0 });
          const stats = pairingStats.get(key)!;
          if (winningTeam === 'B') stats.wins++;
          else stats.losses++;
        }
      });

      // Get stored ELO ratings (these are calculated properly during game recording)
      const { data: storedStats } = await supabase
        .from('partner_stats')
        .select('player1_id, player2_id, elo_rating')
        .eq('group_id', groupId);

      const eloMap = new Map<string, number>();
      (storedStats || []).forEach(s => {
        const key = `${s.player1_id}|${s.player2_id}`;
        eloMap.set(key, s.elo_rating || this.DEFAULT_PAIRING_ELO);
      });

      // Build result array
      const result: PairingStats[] = [];
      pairingStats.forEach((stats, key) => {
        const [player1Id, player2Id] = key.split('|');
        const totalGames = stats.wins + stats.losses;
        
        result.push({
          player1Id,
          player1Name: playerNames.get(player1Id) || 'Unknown',
          player2Id,
          player2Name: playerNames.get(player2Id) || 'Unknown',
          gamesPlayed: totalGames,
          wins: stats.wins,
          losses: stats.losses,
          winRate: totalGames > 0 ? (stats.wins / totalGames) * 100 : 0,
          eloRating: eloMap.get(key) || this.DEFAULT_PAIRING_ELO,
          isQualified: totalGames >= this.MIN_GAMES_QUALIFIED,
        });
      });

      // Sort: qualified first, then by win rate, then by games played
      return result.sort((a, b) => {
        if (a.isQualified !== b.isQualified) return a.isQualified ? -1 : 1;
        if (a.winRate !== b.winRate) return b.winRate - a.winRate;
        return b.gamesPlayed - a.gamesPlayed;
      });
    } catch (error) {
      console.error('[PairingStatsService] Error fetching pairing leaderboard:', error);
      return [];
    }
  }

  /**
   * Get detailed stats for a specific pairing including head-to-head matchups
   * Computes stats from actual games for accuracy
   */
  static async getPairingDetailedStats(
    groupId: string,
    player1Id: string,
    player2Id: string
  ): Promise<PairingDetailedStats | null> {
    const supabase = createSupabaseClient();
    const [orderedP1, orderedP2] = this.getOrderedPair(player1Id, player2Id);

    try {
      // Get stored partner stats for ELO and streaks (computed values)
      const { data: partnerStat } = await supabase
        .from('partner_stats')
        .select('elo_rating, current_streak, best_win_streak, points_for, points_against')
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

      // Get recent games and compute stats from games
      const { recentForm, recentGames, unluckyGames, clutchGames, wins, losses, pointsFor, pointsAgainst, bestWinStreak } = await this.getRecentGamesForPairingWithStats(
        groupId, orderedP1, orderedP2, playerNames
      );

      const gamesPlayed = wins + losses;

      // Compute matchups from games
      const matchupStats = await this.computeMatchupsFromGames(groupId, orderedP1, orderedP2, playerNames);

      // Use stored streak if available, otherwise compute from recent form
      let currentStreak = partnerStat?.current_streak ?? 0;
      if (currentStreak === 0 && recentForm.length > 0) {
        // Compute from recent form as fallback
        for (const result of recentForm) {
          if (currentStreak === 0) {
            currentStreak = result === 'W' ? 1 : -1;
          } else if ((currentStreak > 0 && result === 'W') || (currentStreak < 0 && result === 'L')) {
            currentStreak += result === 'W' ? 1 : -1;
          } else {
            break;
          }
        }
      }

      // Get stored ELO with default
      const eloRating = partnerStat?.elo_rating ?? this.DEFAULT_PAIRING_ELO;

      return {
        player1Id: orderedP1,
        player1Name: playerNames.get(orderedP1) || 'Unknown',
        player2Id: orderedP2,
        player2Name: playerNames.get(orderedP2) || 'Unknown',
        gamesPlayed,
        wins,
        losses,
        winRate: gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0,
        eloRating,
        pointsFor,
        pointsAgainst,
        pointDifferential: pointsFor - pointsAgainst,
        currentStreak,
        bestWinStreak,
        recentForm: recentForm.slice(0, 5),
        recentGames, // Return all 10 recent games
        matchups: matchupStats,
        unluckyGames,
        unluckyCount: unluckyGames.length,
        clutchGames,
        clutchCount: clutchGames.length,
      };
    } catch (error) {
      console.error('[PairingStatsService] Error fetching pairing detailed stats:', error);
      return null;
    }
  }

  /**
   * Compute head-to-head matchups from games
   */
  private static async computeMatchupsFromGames(
    groupId: string,
    player1Id: string,
    player2Id: string,
    playerNames: Map<string, string>
  ): Promise<PairingMatchup[]> {
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
        .select('id, group_player_id, name')
        .in('session_id', sessionIds)
        .not('group_player_id', 'is', null);

      const player1SessionIds = new Set<string>();
      const player2SessionIds = new Set<string>();
      const sessionPlayerToGroup = new Map<string, string>();
      const sessionPlayerToName = new Map<string, string>();

      (sessionPlayers || []).forEach(p => {
        if (p.group_player_id === player1Id) player1SessionIds.add(p.id);
        if (p.group_player_id === player2Id) player2SessionIds.add(p.id);
        if (p.group_player_id) {
          sessionPlayerToGroup.set(p.id, p.group_player_id);
          sessionPlayerToName.set(p.id, p.name || 'Unknown');
        }
      });

      // Get all completed doubles games with scores
      const { data: games } = await supabase
        .from('games')
        .select('team_a, team_b, winning_team, team_a_score, team_b_score, created_at')
        .in('session_id', sessionIds)
        .not('winning_team', 'is', null)
        .order('created_at', { ascending: false });

      // Compute matchup stats with points and game history
      const matchupMap = new Map<string, { 
        wins: number; 
        losses: number;
        pointsFor: number;
        pointsAgainst: number;
        games: RecentGame[];
      }>();

      (games || []).forEach(game => {
        const teamA = typeof game.team_a === 'string' ? JSON.parse(game.team_a) : game.team_a;
        const teamB = typeof game.team_b === 'string' ? JSON.parse(game.team_b) : game.team_b;

        if (teamA.length !== 2 || teamB.length !== 2) return;

        // Check if our pairing is in team A or team B
        const inTeamA = teamA.some((id: string) => player1SessionIds.has(id)) &&
                        teamA.some((id: string) => player2SessionIds.has(id));
        const inTeamB = teamB.some((id: string) => player1SessionIds.has(id)) &&
                        teamB.some((id: string) => player2SessionIds.has(id));

        if (!inTeamA && !inTeamB) return;

        // Get opponent pairing
        const opponentTeam = inTeamA ? teamB : teamA;
        const opponentGroupIds = opponentTeam
          .map((id: string) => sessionPlayerToGroup.get(id))
          .filter(Boolean) as string[];

        if (opponentGroupIds.length !== 2) return;

        const [oppP1, oppP2] = this.getOrderedPair(opponentGroupIds[0], opponentGroupIds[1]);
        const key = `${oppP1}|${oppP2}`;

        if (!matchupMap.has(key)) {
          matchupMap.set(key, { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, games: [] });
        }
        const stats = matchupMap.get(key)!;

        const won = (inTeamA && game.winning_team === 'A') || (inTeamB && game.winning_team === 'B');
        if (won) stats.wins++;
        else stats.losses++;

        // Calculate points from our pairing's perspective
        const ourScore = inTeamA ? (game.team_a_score ?? 0) : (game.team_b_score ?? 0);
        const theirScore = inTeamA ? (game.team_b_score ?? 0) : (game.team_a_score ?? 0);
        stats.pointsFor += ourScore;
        stats.pointsAgainst += theirScore;

        // Build game record
        const teamANames = teamA.map((id: string) => sessionPlayerToName.get(id) || 'Unknown');
        const teamBNames = teamB.map((id: string) => sessionPlayerToName.get(id) || 'Unknown');
        
        stats.games.push({
          teamANames,
          teamBNames,
          teamAScore: game.team_a_score,
          teamBScore: game.team_b_score,
          won,
          date: game.created_at ? new Date(game.created_at) : undefined,
        });
      });

      // Build result array
      const result: PairingMatchup[] = [];
      matchupMap.forEach((stats, key) => {
        const [oppP1, oppP2] = key.split('|');
        const gamesPlayed = stats.wins + stats.losses;

        result.push({
          pairingPlayer1Id: player1Id,
          pairingPlayer1Name: playerNames.get(player1Id) || 'Unknown',
          pairingPlayer2Id: player2Id,
          pairingPlayer2Name: playerNames.get(player2Id) || 'Unknown',
          opponentPlayer1Id: oppP1,
          opponentPlayer1Name: playerNames.get(oppP1) || 'Unknown',
          opponentPlayer2Id: oppP2,
          opponentPlayer2Name: playerNames.get(oppP2) || 'Unknown',
          wins: stats.wins,
          losses: stats.losses,
          gamesPlayed,
          winRate: gamesPlayed > 0 ? (stats.wins / gamesPlayed) * 100 : 0,
          pointsFor: stats.pointsFor,
          pointsAgainst: stats.pointsAgainst,
          pointDifferential: stats.pointsFor - stats.pointsAgainst,
          games: stats.games,
        });
      });

      return result.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
    } catch (error) {
      console.error('[PairingStatsService] Error computing matchups:', error);
      return [];
    }
  }

  /**
   * Get recent games with details for a pairing - computed from games table
   * Also returns total wins/losses, points, best streak, unlucky and clutch games for accuracy
   */
  private static async getRecentGamesForPairingWithStats(
    groupId: string,
    player1Id: string,
    player2Id: string,
    playerNames: Map<string, string>
  ): Promise<{ 
    recentForm: ('W' | 'L')[]; 
    recentGames: RecentGame[]; 
    unluckyGames: UnluckyGame[];
    clutchGames: ClutchGame[];
    wins: number; 
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
    bestWinStreak: number;
  }> {
    const supabase = createSupabaseClient();

    try {
      // Get sessions in group
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('group_id', groupId);

      const sessionIds = (sessions || []).map(s => s.id);
      if (sessionIds.length === 0) return { recentForm: [], recentGames: [], unluckyGames: [], clutchGames: [], wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, bestWinStreak: 0 };

      // Get player mappings
      const { data: sessionPlayers } = await supabase
        .from('players')
        .select('id, group_player_id')
        .in('session_id', sessionIds)
        .not('group_player_id', 'is', null);

      // Find session player IDs that map to our group player IDs
      const player1SessionIds = new Set<string>();
      const player2SessionIds = new Set<string>();
      const sessionPlayerToGroup = new Map<string, string>();
      
      (sessionPlayers || []).forEach(p => {
        if (p.group_player_id === player1Id) player1SessionIds.add(p.id);
        if (p.group_player_id === player2Id) player2SessionIds.add(p.id);
        if (p.group_player_id) sessionPlayerToGroup.set(p.id, p.group_player_id);
      });

      // Get all completed games (not limited, we need full history for stats)
      const { data: games } = await supabase
        .from('games')
        .select('team_a, team_b, winning_team, team_a_score, team_b_score, created_at')
        .in('session_id', sessionIds)
        .not('winning_team', 'is', null)
        .order('created_at', { ascending: false });

      const recentForm: ('W' | 'L')[] = [];
      const recentGames: RecentGame[] = [];
      const unluckyGames: UnluckyGame[] = [];
      const clutchGames: ClutchGame[] = [];
      let wins = 0;
      let losses = 0;
      let pointsFor = 0;
      let pointsAgainst = 0;
      let bestWinStreak = 0;
      let tempWinStreak = 0;

      (games || []).forEach(game => {
        const teamA = typeof game.team_a === 'string' ? JSON.parse(game.team_a) : game.team_a;
        const teamB = typeof game.team_b === 'string' ? JSON.parse(game.team_b) : game.team_b;

        // Check if both players are on the same team
        const bothInTeamA = teamA.some((id: string) => player1SessionIds.has(id)) && 
                           teamA.some((id: string) => player2SessionIds.has(id));
        const bothInTeamB = teamB.some((id: string) => player1SessionIds.has(id)) && 
                           teamB.some((id: string) => player2SessionIds.has(id));

        if (bothInTeamA) {
          const won = game.winning_team === 'A';
          if (won) wins++; else losses++;
          pointsFor += game.team_a_score || 0;
          pointsAgainst += game.team_b_score || 0;
          
          // Track best win streak and clutch games
          if (won) {
            tempWinStreak++;
            if (tempWinStreak > bestWinStreak) bestWinStreak = tempWinStreak;
            
            // Check for clutch games (won by 1-2 points)
            if (game.team_a_score !== null && game.team_b_score !== null) {
              const margin = Math.abs(game.team_a_score - game.team_b_score);
              if (margin >= 1 && margin <= 2) {
                clutchGames.push({
                  teamANames: teamA.map((id: string) => playerNames.get(sessionPlayerToGroup.get(id) || '') || 'Unknown'),
                  teamBNames: teamB.map((id: string) => playerNames.get(sessionPlayerToGroup.get(id) || '') || 'Unknown'),
                  teamAScore: game.team_a_score ?? undefined,
                  teamBScore: game.team_b_score ?? undefined,
                  won: true,
                  date: game.created_at ? new Date(game.created_at) : undefined,
                  margin,
                });
              }
            }
          } else {
            tempWinStreak = 0;
            
            // Check for unlucky games (lost by 1-2 points)
            if (game.team_a_score !== null && game.team_b_score !== null) {
              const margin = Math.abs(game.team_a_score - game.team_b_score);
              if (margin >= 1 && margin <= 2) {
                unluckyGames.push({
                  teamANames: teamA.map((id: string) => playerNames.get(sessionPlayerToGroup.get(id) || '') || 'Unknown'),
                  teamBNames: teamB.map((id: string) => playerNames.get(sessionPlayerToGroup.get(id) || '') || 'Unknown'),
                  teamAScore: game.team_a_score ?? undefined,
                  teamBScore: game.team_b_score ?? undefined,
                  won: false,
                  date: game.created_at ? new Date(game.created_at) : undefined,
                  margin,
                });
              }
            }
          }
          
          if (recentForm.length < 10) recentForm.push(won ? 'W' : 'L');
          if (recentGames.length < 10) {
            recentGames.push({
              teamANames: teamA.map((id: string) => playerNames.get(sessionPlayerToGroup.get(id) || '') || 'Unknown'),
              teamBNames: teamB.map((id: string) => playerNames.get(sessionPlayerToGroup.get(id) || '') || 'Unknown'),
              teamAScore: game.team_a_score ?? undefined,
              teamBScore: game.team_b_score ?? undefined,
              won,
              date: game.created_at ? new Date(game.created_at) : undefined,
            });
          }
        } else if (bothInTeamB) {
          const won = game.winning_team === 'B';
          if (won) wins++; else losses++;
          pointsFor += game.team_b_score || 0;
          pointsAgainst += game.team_a_score || 0;
          
          // Track best win streak and clutch games
          if (won) {
            tempWinStreak++;
            if (tempWinStreak > bestWinStreak) bestWinStreak = tempWinStreak;
            
            // Check for clutch games (won by 1-2 points)
            if (game.team_a_score !== null && game.team_b_score !== null) {
              const margin = Math.abs(game.team_a_score - game.team_b_score);
              if (margin >= 1 && margin <= 2) {
                clutchGames.push({
                  teamANames: teamA.map((id: string) => playerNames.get(sessionPlayerToGroup.get(id) || '') || 'Unknown'),
                  teamBNames: teamB.map((id: string) => playerNames.get(sessionPlayerToGroup.get(id) || '') || 'Unknown'),
                  teamAScore: game.team_a_score ?? undefined,
                  teamBScore: game.team_b_score ?? undefined,
                  won: true,
                  date: game.created_at ? new Date(game.created_at) : undefined,
                  margin,
                });
              }
            }
          } else {
            tempWinStreak = 0;
            
            // Check for unlucky games (lost by 1-2 points)
            if (game.team_a_score !== null && game.team_b_score !== null) {
              const margin = Math.abs(game.team_a_score - game.team_b_score);
              if (margin >= 1 && margin <= 2) {
                unluckyGames.push({
                  teamANames: teamA.map((id: string) => playerNames.get(sessionPlayerToGroup.get(id) || '') || 'Unknown'),
                  teamBNames: teamB.map((id: string) => playerNames.get(sessionPlayerToGroup.get(id) || '') || 'Unknown'),
                  teamAScore: game.team_a_score ?? undefined,
                  teamBScore: game.team_b_score ?? undefined,
                  won: false,
                  date: game.created_at ? new Date(game.created_at) : undefined,
                  margin,
                });
              }
            }
          }
          
          if (recentForm.length < 10) recentForm.push(won ? 'W' : 'L');
          if (recentGames.length < 10) {
            recentGames.push({
              teamANames: teamA.map((id: string) => playerNames.get(sessionPlayerToGroup.get(id) || '') || 'Unknown'),
              teamBNames: teamB.map((id: string) => playerNames.get(sessionPlayerToGroup.get(id) || '') || 'Unknown'),
              teamAScore: game.team_a_score ?? undefined,
              teamBScore: game.team_b_score ?? undefined,
              won,
              date: game.created_at ? new Date(game.created_at) : undefined,
            });
          }
        }
      });

      return { recentForm, recentGames, unluckyGames, clutchGames, wins, losses, pointsFor, pointsAgainst, bestWinStreak };
    } catch (error) {
      console.error('[PairingStatsService] Error getting recent games:', error);
      return { recentForm: [], recentGames: [], unluckyGames: [], clutchGames: [], wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, bestWinStreak: 0 };
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

        // Get unique group player IDs for each team (use Set to handle duplicate session entries)
        const teamAGroupIds = Array.from(new Set(teamA.map((id: string) => playerToGroupPlayer.get(id)).filter(Boolean))) as string[];
        const teamBGroupIds = Array.from(new Set(teamB.map((id: string) => playerToGroupPlayer.get(id)).filter(Boolean))) as string[];

        // Only process if both teams have exactly 2 unique group players
        if (teamAGroupIds.length !== 2 || teamBGroupIds.length !== 2) continue;

        const winningTeam = game.winning_team as 'A' | 'B';
        
        // Get current pairing ELOs before update (for ELO calculation)
        const teamAElo = await this.getPairingElo(groupId, teamAGroupIds[0], teamAGroupIds[1]);
        const teamBElo = await this.getPairingElo(groupId, teamBGroupIds[0], teamBGroupIds[1]);
        
        // Get scores if available
        const teamAScore = game.team_a_score ?? undefined;
        const teamBScore = game.team_b_score ?? undefined;

        // Update partner stats for both teams with opponent ELO and scores
        await this.updatePartnerStats(groupId, teamAGroupIds, winningTeam === 'A', teamBElo, teamAScore, teamBScore);
        await this.updatePartnerStats(groupId, teamBGroupIds, winningTeam === 'B', teamAElo, teamBScore, teamAScore);

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

      return result;
    } catch (error) {
      console.error('[PairingStatsService] Error recalculating stats:', error);
      throw error;
    }
  }
}

