import { createSupabaseClient } from '@/lib/supabase';
import { LeaderboardEntry, PlayerDetailedStats, PartnerStats, OpponentStats, RecentGame, UnluckyGame } from '@/types';

export interface GroupPlayerStats {
  groupPlayerId: string;
  playerName: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  pointsScored: number;
  pointsConceded: number;
  sessionsPlayed: number;
}

interface GameData {
  id: string;
  session_id: string;
  team_a: string[] | string;
  team_b: string[] | string;
  winning_team: 'A' | 'B' | null;
  team_a_score: number | null;
  team_b_score: number | null;
  created_at: string;
}

/**
 * Service layer for aggregating player stats across sessions
 */
export class StatsService {
  /**
   * Get leaderboard data for a group
   * Computes wins/losses from actual games for accuracy (stored stats may be stale)
   */
  static async getLeaderboard(groupId: string): Promise<LeaderboardEntry[]> {
    try {
      const supabase = createSupabaseClient();
      
      // Run independent queries in parallel for better performance
      const [groupPlayersResult, sessionsResult] = await Promise.all([
        supabase
          .from('group_players')
          .select('id, name, elo_rating')
          .eq('group_id', groupId)
          .order('elo_rating', { ascending: false }),
        supabase
          .from('sessions')
          .select('id')
          .eq('group_id', groupId)
      ]);

      const { data: groupPlayers, error: gpError } = groupPlayersResult;
      const { data: sessions } = sessionsResult;

      if (gpError) throw gpError;
      if (!groupPlayers || groupPlayers.length === 0) return [];

      const sessionIds = (sessions || []).map(s => s.id);
      if (sessionIds.length === 0) {
        // No sessions = no games, return empty stats for all players
        return groupPlayers.map((gp, index) => ({
          groupPlayerId: gp.id,
          playerName: gp.name,
          eloRating: gp.elo_rating || 1500,
          rank: index + 1,
          totalGames: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          recentForm: [],
          trend: 'stable' as const,
        }));
      }
      
      // Run player mappings and games queries in parallel
      const [playersResult, allGamesResult] = await Promise.all([
        supabase
          .from('players')
          .select('id, group_player_id')
          .in('session_id', sessionIds)
          .not('group_player_id', 'is', null),
        supabase
          .from('games')
          .select('team_a, team_b, winning_team, created_at')
          .in('session_id', sessionIds)
          .not('winning_team', 'is', null)
          .order('created_at', { ascending: false })
      ]);

      const { data: players } = playersResult;
      const { data: allGames } = allGamesResult;

      const playerToGroupPlayer = new Map<string, string>();
      (players || []).forEach((p) => {
        if (p.group_player_id) {
          playerToGroupPlayer.set(p.id, p.group_player_id);
        }
      });
      
      
      // Debug: Log a sample of games to verify data
      if (allGames && allGames.length > 0) {
      }

      // Compute stats for each player from games
      const statsMap = new Map<string, { wins: number; losses: number; recentForm: ('W' | 'L')[] }>();
      groupPlayers.forEach(gp => statsMap.set(gp.id, { wins: 0, losses: 0, recentForm: [] }));

      (allGames || []).forEach((game) => {
        const teamA = this.parseJsonArray(game.team_a);
        const teamB = this.parseJsonArray(game.team_b);
        const winningTeam = game.winning_team;
        
        // Use Sets to track which group players have been counted for this game
        // This prevents double-counting if the same group player has multiple session entries
        const countedGroupPlayers = new Set<string>();

        teamA.forEach((playerId: string) => {
          const groupPlayerId = playerToGroupPlayer.get(playerId);
          if (groupPlayerId && statsMap.has(groupPlayerId) && !countedGroupPlayers.has(groupPlayerId)) {
            countedGroupPlayers.add(groupPlayerId);
            const stats = statsMap.get(groupPlayerId)!;
            const won = winningTeam === 'A';
            if (won) stats.wins++;
            else stats.losses++;
            if (stats.recentForm.length < 5) {
              stats.recentForm.push(won ? 'W' : 'L');
            }
          }
        });

        teamB.forEach((playerId: string) => {
          const groupPlayerId = playerToGroupPlayer.get(playerId);
          if (groupPlayerId && statsMap.has(groupPlayerId) && !countedGroupPlayers.has(groupPlayerId)) {
            countedGroupPlayers.add(groupPlayerId);
            const stats = statsMap.get(groupPlayerId)!;
            const won = winningTeam === 'B';
            if (won) stats.wins++;
            else stats.losses++;
            if (stats.recentForm.length < 5) {
              stats.recentForm.push(won ? 'W' : 'L');
            }
          }
        });
      });

      // Build leaderboard entries
      const leaderboard: LeaderboardEntry[] = groupPlayers.map((gp) => {
        const stats = statsMap.get(gp.id) || { wins: 0, losses: 0, recentForm: [] };
        const totalGames = stats.wins + stats.losses;
        const winRate = totalGames > 0 ? (stats.wins / totalGames) * 100 : 0;
        
        // Debug: Log stats for each player
        
        // Determine trend based on recent form
        const recentWins = stats.recentForm.filter(r => r === 'W').length;
        const recentLosses = stats.recentForm.filter(r => r === 'L').length;
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (recentWins > recentLosses + 1) trend = 'up';
        else if (recentLosses > recentWins + 1) trend = 'down';

        return {
          groupPlayerId: gp.id,
          playerName: gp.name,
          eloRating: gp.elo_rating || 1500,
          rank: 0, // Will be set after sorting
          totalGames,
          wins: stats.wins,
          losses: stats.losses,
          winRate,
          recentForm: stats.recentForm,
          trend,
        };
      });

      // Sort by ELO and assign ranks
      leaderboard.sort((a, b) => b.eloRating - a.eloRating);
      leaderboard.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      return leaderboard;
    } catch (error) {
      console.error('[StatsService] Error fetching leaderboard:', error);
      throw new Error('Failed to fetch leaderboard');
    }
  }

  /**
   * Get detailed stats for a specific player
   */
  static async getPlayerDetailedStats(groupId: string, groupPlayerId: string): Promise<PlayerDetailedStats | null> {
    try {
      const supabase = createSupabaseClient();
      
      // Run first batch of independent queries in parallel
      const [playerResult, allPlayersResult, sessionsResult] = await Promise.all([
        supabase
          .from('group_players')
          .select('id, name, elo_rating')
          .eq('id', groupPlayerId)
          .eq('group_id', groupId)
          .single(),
        supabase
          .from('group_players')
          .select('id, elo_rating')
          .eq('group_id', groupId)
          .order('elo_rating', { ascending: false }),
        supabase
          .from('sessions')
          .select('id')
          .eq('group_id', groupId)
      ]);

      const { data: player, error: playerError } = playerResult;
      const { data: allPlayers } = allPlayersResult;
      const { data: sessions } = sessionsResult;

      if (playerError || !player) return null;

      const totalPlayers = allPlayers?.length || 0;
      const rank = (allPlayers?.findIndex(p => p.id === groupPlayerId) || 0) + 1;

      const sessionIds = (sessions || []).map(s => s.id);
      if (sessionIds.length === 0) {
        return this.buildEmptyStats(player, rank, totalPlayers);
      }

      // Run second batch of queries in parallel
      const [sessionPlayersResult, gamesResult] = await Promise.all([
        supabase
          .from('players')
          .select('id, session_id, group_player_id, name')
          .in('session_id', sessionIds),
        supabase
          .from('games')
          .select('*')
          .in('session_id', sessionIds)
          .not('winning_team', 'is', null)
          .order('created_at', { ascending: false })
      ]);

      const { data: sessionPlayers } = sessionPlayersResult;
      const { data: games } = gamesResult;

      const playerToGroupPlayer = new Map<string, string>();
      const groupPlayerToName = new Map<string, string>();
      const thisPlayerSessionIds = new Set<string>();
      
      (sessionPlayers || []).forEach((p) => {
        if (p.group_player_id) {
          playerToGroupPlayer.set(p.id, p.group_player_id);
          groupPlayerToName.set(p.group_player_id, p.name);
          if (p.group_player_id === groupPlayerId) {
            thisPlayerSessionIds.add(p.session_id);
          }
        }
      });

      // Calculate stats
      let wins = 0;
      let losses = 0;
      let pointsScored = 0;
      let pointsConceded = 0;
      const recentForm: ('W' | 'L')[] = [];
      const recentGames: RecentGame[] = [];
      const unluckyGames: UnluckyGame[] = []; // Games lost by 1-2 points
      const partnerStatsMap = new Map<string, { wins: number; losses: number; games: RecentGame[] }>();
      const opponentStatsMap = new Map<string, { wins: number; losses: number; games: RecentGame[] }>();
      let currentStreak = 0;
      let streakType: 'W' | 'L' | null = null;
      let streakBroken = false; // Flag to stop counting once streak breaks
      let bestWinStreak = 0;
      let tempWinStreak = 0;
      let gamesPlayerFoundIn = 0;

      (games || []).forEach((game) => {
        const teamA = this.parseJsonArray(game.team_a);
        const teamB = this.parseJsonArray(game.team_b);
        const winningTeam = game.winning_team as 'A' | 'B';
        const teamAScore = game.team_a_score || 0;
        const teamBScore = game.team_b_score || 0;

        // Find which team this player is on
        const thisPlayerSessionId = teamA.find(id => playerToGroupPlayer.get(id) === groupPlayerId) 
          || teamB.find(id => playerToGroupPlayer.get(id) === groupPlayerId);
        
        if (!thisPlayerSessionId) return; // Player not in this game
        
        gamesPlayerFoundIn++;

        const isOnTeamA = teamA.includes(thisPlayerSessionId);
        const playerTeam = isOnTeamA ? teamA : teamB;
        const opponentTeam = isOnTeamA ? teamB : teamA;
        const won = (isOnTeamA && winningTeam === 'A') || (!isOnTeamA && winningTeam === 'B');

        // Update W/L
        if (won) {
          wins += 1;
          pointsScored += isOnTeamA ? teamAScore : teamBScore;
          pointsConceded += isOnTeamA ? teamBScore : teamAScore;
        } else {
          losses += 1;
          pointsScored += isOnTeamA ? teamAScore : teamBScore;
          pointsConceded += isOnTeamA ? teamBScore : teamAScore;
          
          // Check for unlucky games (lost by 1-2 points)
          const margin = Math.abs(teamAScore - teamBScore);
          if (margin >= 1 && margin <= 2 && game.team_a_score !== null && game.team_b_score !== null) {
            unluckyGames.push({
              teamANames: teamA.map(id => groupPlayerToName.get(playerToGroupPlayer.get(id) || '') || 'Unknown'),
              teamBNames: teamB.map(id => groupPlayerToName.get(playerToGroupPlayer.get(id) || '') || 'Unknown'),
              teamAScore: game.team_a_score ?? undefined,
              teamBScore: game.team_b_score ?? undefined,
              won: false,
              date: game.created_at ? new Date(game.created_at) : undefined,
              margin,
            });
          }
        }

        // Recent form (first 10 games since we sorted desc)
        if (recentForm.length < 10) {
          recentForm.push(won ? 'W' : 'L');
        }

        // Recent games with details (first 10)
        if (recentGames.length < 10) {
          recentGames.push({
            teamANames: teamA.map(id => groupPlayerToName.get(playerToGroupPlayer.get(id) || '') || 'Unknown'),
            teamBNames: teamB.map(id => groupPlayerToName.get(playerToGroupPlayer.get(id) || '') || 'Unknown'),
            teamAScore: game.team_a_score ?? undefined,
            teamBScore: game.team_b_score ?? undefined,
            won,
            date: game.created_at ? new Date(game.created_at) : undefined,
          });
        }

        // Streak calculation (only count consecutive from most recent)
        // Once the streak breaks, stop counting - streakBroken flag prevents further accumulation
        if (streakType === null) {
          streakType = won ? 'W' : 'L';
          currentStreak = won ? 1 : -1;
        } else if (!streakBroken) {
          if ((won && streakType === 'W') || (!won && streakType === 'L')) {
            currentStreak += won ? 1 : -1;
          } else {
            // Streak broken - stop counting
            streakBroken = true;
          }
        }

        // Track best win streak (iterate through all games)
        if (won) {
          tempWinStreak += 1;
          if (tempWinStreak > bestWinStreak) {
            bestWinStreak = tempWinStreak;
          }
        } else {
          tempWinStreak = 0;
        }

        // Partner stats (for doubles - teammates)
        playerTeam.forEach(teammateId => {
          if (teammateId === thisPlayerSessionId) return;
          const partnerGroupId = playerToGroupPlayer.get(teammateId);
          if (partnerGroupId) {
            if (!partnerStatsMap.has(partnerGroupId)) {
              partnerStatsMap.set(partnerGroupId, { wins: 0, losses: 0, games: [] });
            }
            const pStats = partnerStatsMap.get(partnerGroupId)!;
            if (won) pStats.wins += 1;
            else pStats.losses += 1;
            // Add game to partner's history
            pStats.games.push({
              teamANames: teamA.map(id => groupPlayerToName.get(playerToGroupPlayer.get(id) || '') || 'Unknown'),
              teamBNames: teamB.map(id => groupPlayerToName.get(playerToGroupPlayer.get(id) || '') || 'Unknown'),
              teamAScore: game.team_a_score ?? undefined,
              teamBScore: game.team_b_score ?? undefined,
              won,
              date: game.created_at ? new Date(game.created_at) : undefined,
            });
          }
        });

        // Opponent stats
        opponentTeam.forEach(opponentId => {
          const opponentGroupId = playerToGroupPlayer.get(opponentId);
          if (opponentGroupId) {
            if (!opponentStatsMap.has(opponentGroupId)) {
              opponentStatsMap.set(opponentGroupId, { wins: 0, losses: 0, games: [] });
            }
            const oStats = opponentStatsMap.get(opponentGroupId)!;
            if (won) oStats.wins += 1;
            else oStats.losses += 1;
            // Add game to opponent's history
            oStats.games.push({
              teamANames: teamA.map(id => groupPlayerToName.get(playerToGroupPlayer.get(id) || '') || 'Unknown'),
              teamBNames: teamB.map(id => groupPlayerToName.get(playerToGroupPlayer.get(id) || '') || 'Unknown'),
              teamAScore: game.team_a_score ?? undefined,
              teamBScore: game.team_b_score ?? undefined,
              won,
              date: game.created_at ? new Date(game.created_at) : undefined,
            });
          }
        });
      });

      // Build partner stats array
      const partnerStats: PartnerStats[] = Array.from(partnerStatsMap.entries())
        .map(([partnerId, stats]) => ({
          partnerId,
          partnerName: groupPlayerToName.get(partnerId) || 'Unknown',
          gamesPlayed: stats.wins + stats.losses,
          wins: stats.wins,
          losses: stats.losses,
          winRate: stats.wins + stats.losses > 0 
            ? (stats.wins / (stats.wins + stats.losses)) * 100 
            : 0,
          games: stats.games,
        }))
        .sort((a, b) => b.winRate - a.winRate || b.gamesPlayed - a.gamesPlayed);

      // Build opponent stats array
      const opponentStats: OpponentStats[] = Array.from(opponentStatsMap.entries())
        .map(([opponentId, stats]) => ({
          opponentId,
          opponentName: groupPlayerToName.get(opponentId) || 'Unknown',
          gamesPlayed: stats.wins + stats.losses,
          wins: stats.wins,
          losses: stats.losses,
          winRate: stats.wins + stats.losses > 0 
            ? (stats.wins / (stats.wins + stats.losses)) * 100 
            : 0,
          games: stats.games,
        }))
        .sort((a, b) => b.winRate - a.winRate || b.gamesPlayed - a.gamesPlayed);

      const totalGames = wins + losses;
      

      return {
        groupPlayerId: player.id,
        playerName: player.name,
        eloRating: player.elo_rating || 1500,
        rank,
        totalPlayers,
        totalGames,
        wins,
        losses,
        winRate: totalGames > 0 ? (wins / totalGames) * 100 : 0,
        pointsScored,
        pointsConceded,
        pointDifferential: pointsScored - pointsConceded,
        sessionsPlayed: thisPlayerSessionIds.size,
        recentForm: recentForm.slice(0, 5), // Keep only last 5 for display
        currentStreak,
        bestWinStreak,
        partnerStats,
        opponentStats,
        recentGames,
        unluckyGames,
        unluckyCount: unluckyGames.length,
      };
    } catch (error) {
      console.error('[StatsService] Error fetching player detailed stats:', error);
      throw new Error('Failed to fetch player stats');
    }
  }

  /**
   * Build empty stats for a player with no games
   */
  private static buildEmptyStats(
    player: { id: string; name: string; elo_rating: number | null },
    rank: number,
    totalPlayers: number
  ): PlayerDetailedStats {
    return {
      groupPlayerId: player.id,
      playerName: player.name,
      eloRating: player.elo_rating || 1500,
      rank,
      totalPlayers,
      totalGames: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      pointsScored: 0,
      pointsConceded: 0,
      pointDifferential: 0,
      sessionsPlayed: 0,
      recentForm: [],
      currentStreak: 0,
      bestWinStreak: 0,
      partnerStats: [],
      opponentStats: [],
    };
  }

  /**
   * Get aggregated stats for all players in a group (legacy method)
   */
  static async getGroupPlayersStats(groupId: string): Promise<GroupPlayerStats[]> {
    try {
      const supabase = createSupabaseClient();
      
      // Get all group players
      const { data: groupPlayers, error: gpError } = await supabase
        .from('group_players')
        .select('id, name')
        .eq('group_id', groupId);

      if (gpError) {
        throw gpError;
      }

      if (!groupPlayers || groupPlayers.length === 0) {
        return [];
      }

      // Get all sessions in the group
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id')
        .eq('group_id', groupId);

      if (sessionsError) {
        throw sessionsError;
      }

      if (!sessions || sessions.length === 0) {
        return groupPlayers.map((gp) => ({
          groupPlayerId: gp.id,
          playerName: gp.name,
          totalGames: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          pointsScored: 0,
          pointsConceded: 0,
          sessionsPlayed: 0,
        }));
      }

      const sessionIds = sessions.map((s) => s.id);

      // Get all games from these sessions
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .in('session_id', sessionIds)
        .not('winning_team', 'is', null);

      if (gamesError) {
        throw gamesError;
      }

      // Get all players from these sessions (to map session player IDs to group player IDs)
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, session_id, group_player_id')
        .in('session_id', sessionIds)
        .not('group_player_id', 'is', null);

      if (playersError) {
        throw playersError;
      }

      // Create a map of session player ID to group player ID
      const playerToGroupPlayer = new Map<string, string>();
      const groupPlayerSessions = new Map<string, Set<string>>();
      
      (players || []).forEach((p) => {
        if (p.group_player_id) {
          playerToGroupPlayer.set(p.id, p.group_player_id);
          
          if (!groupPlayerSessions.has(p.group_player_id)) {
            groupPlayerSessions.set(p.group_player_id, new Set());
          }
          groupPlayerSessions.get(p.group_player_id)!.add(p.session_id);
        }
      });

      // Calculate stats for each group player
      const statsMap = new Map<string, GroupPlayerStats>();
      
      groupPlayers.forEach((gp) => {
        statsMap.set(gp.id, {
          groupPlayerId: gp.id,
          playerName: gp.name,
          totalGames: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          pointsScored: 0,
          pointsConceded: 0,
          sessionsPlayed: groupPlayerSessions.get(gp.id)?.size || 0,
        });
      });

      // Process each game
      (games || []).forEach((game) => {
        const teamA = this.parseJsonArray(game.team_a);
        const teamB = this.parseJsonArray(game.team_b);
        const winningTeam = game.winning_team;
        const teamAScore = game.team_a_score || 0;
        const teamBScore = game.team_b_score || 0;
        
        // Use Set to track which group players have been counted for this game
        // This prevents double-counting if the same group player has multiple session entries
        const countedGroupPlayers = new Set<string>();

        // Process team A players
        teamA.forEach((playerId: string) => {
          const groupPlayerId = playerToGroupPlayer.get(playerId);
          if (groupPlayerId && statsMap.has(groupPlayerId) && !countedGroupPlayers.has(groupPlayerId)) {
            countedGroupPlayers.add(groupPlayerId);
            const stats = statsMap.get(groupPlayerId)!;
            stats.totalGames += 1;
            if (winningTeam === 'A') {
              stats.wins += 1;
              stats.pointsScored += teamAScore;
              stats.pointsConceded += teamBScore;
            } else {
              stats.losses += 1;
              stats.pointsScored += teamAScore;
              stats.pointsConceded += teamBScore;
            }
          }
        });

        // Process team B players
        teamB.forEach((playerId: string) => {
          const groupPlayerId = playerToGroupPlayer.get(playerId);
          if (groupPlayerId && statsMap.has(groupPlayerId) && !countedGroupPlayers.has(groupPlayerId)) {
            countedGroupPlayers.add(groupPlayerId);
            const stats = statsMap.get(groupPlayerId)!;
            stats.totalGames += 1;
            if (winningTeam === 'B') {
              stats.wins += 1;
              stats.pointsScored += teamBScore;
              stats.pointsConceded += teamAScore;
            } else {
              stats.losses += 1;
              stats.pointsScored += teamBScore;
              stats.pointsConceded += teamAScore;
            }
          }
        });
      });

      // Calculate win rates
      const results = Array.from(statsMap.values()).map((stats) => ({
        ...stats,
        winRate: stats.totalGames > 0 ? (stats.wins / stats.totalGames) * 100 : 0,
      }));

      // Sort by win rate, then by total games
      return results.sort((a, b) => {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.totalGames - a.totalGames;
      });
    } catch (error) {
      console.error('[StatsService] Error fetching group player stats:', error);
      throw new Error('Failed to fetch group player stats');
    }
  }

  /**
   * Get stats for a specific group player (legacy method)
   */
  static async getGroupPlayerStats(groupId: string, groupPlayerId: string): Promise<GroupPlayerStats | null> {
    const allStats = await this.getGroupPlayersStats(groupId);
    return allStats.find((s) => s.groupPlayerId === groupPlayerId) || null;
  }

  /**
   * Parse JSON array from database (handles both string and array formats)
   */
  private static parseJsonArray(value: unknown): string[] {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value as string[];
  }
}
