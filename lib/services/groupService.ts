import { createSupabaseClient } from '@/lib/supabase';
import { Group, GroupPlayer, Session } from '@/types';

/**
 * Generate a short shareable link code
 * Uses 6 characters from an unambiguous character set
 * (removed 0/O/l/1/I to avoid confusion when sharing verbally)
 */
function generateShareableLink(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Service layer for group database operations
 */
export class GroupService {
  /**
   * Create a new group
   */
  static async createGroup(name: string): Promise<Group> {
    try {
      const supabase = createSupabaseClient();
      
      const groupId = `group-${Date.now()}`;
      const shareableLink = generateShareableLink();
      
      const { data, error } = await supabase
        .from('groups')
        .insert({
          id: groupId,
          name,
          shareable_link: shareableLink,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapRowToGroup(data);
    } catch (error) {
      console.error('[GroupService] Error creating group:', error);
      throw new Error('Failed to create group');
    }
  }

  /**
   * Get all groups
   */
  static async getAllGroups(): Promise<Group[]> {
    try {
      const supabase = createSupabaseClient();
      
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map((row) => this.mapRowToGroup(row));
    } catch (error) {
      console.error('[GroupService] Error fetching groups:', error);
      throw new Error('Failed to fetch groups');
    }
  }

  /**
   * Get a group by ID
   */
  static async getGroupById(groupId: string): Promise<Group | null> {
    try {
      const supabase = createSupabaseClient();
      
      // Only select the columns we need for better performance
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, shareable_link, created_at')
        .eq('id', groupId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return this.mapRowToGroup(data);
    } catch (error) {
      console.error('[GroupService] Error fetching group:', error);
      throw new Error('Failed to fetch group');
    }
  }

  /**
   * Get a group by shareable link
   */
  static async getGroupByShareableLink(shareableLink: string): Promise<Group | null> {
    try {
      const supabase = createSupabaseClient();
      
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('shareable_link', shareableLink)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return this.mapRowToGroup(data);
    } catch (error) {
      console.error('[GroupService] Error fetching group by link:', error);
      throw new Error('Failed to fetch group');
    }
  }

  /**
   * Delete a group
   */
  static async deleteGroup(groupId: string): Promise<void> {
    try {
      const supabase = createSupabaseClient();
      
      // First check if group exists
      const { data: existingGroup, error: fetchError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('id', groupId)
        .single();

      if (fetchError || !existingGroup) {
        console.error('[GroupService] Group not found:', groupId, fetchError);
        throw new Error(`Group not found: ${groupId}`);
      }

      console.log('[GroupService] Deleting group:', existingGroup);
      
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) {
        console.error('[GroupService] Supabase delete error:', error);
        throw error;
      }

      console.log('[GroupService] Successfully deleted group:', groupId);
    } catch (error) {
      console.error('[GroupService] Error deleting group:', error);
      // Throw the original error with more context
      if (error instanceof Error) {
        throw new Error(`Failed to delete group: ${error.message}`);
      }
      throw new Error('Failed to delete group');
    }
  }

  /**
   * Get all players in a group's player pool
   * Computes wins/losses from actual games for accuracy (stored stats may be stale)
   */
  static async getGroupPlayers(groupId: string): Promise<GroupPlayer[]> {
    try {
      const supabase = createSupabaseClient();
      
      // Get all ACTIVE group players (soft-deleted players are excluded)
      const { data: groupPlayers, error } = await supabase
        .from('group_players')
        .select('id, group_id, name, elo_rating, created_at, is_active')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      if (!groupPlayers || groupPlayers.length === 0) {
        return [];
      }

      // Get all sessions for this group
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('group_id', groupId);
      
      const sessionIds = (sessions || []).map(s => s.id);
      
      // If no sessions, return players with zero stats
      if (sessionIds.length === 0) {
        return groupPlayers.map(row => ({
          id: row.id,
          groupId: row.group_id,
          name: row.name,
          eloRating: row.elo_rating || 1500,
          wins: 0,
          losses: 0,
          totalGames: 0,
          createdAt: row.created_at ? new Date(row.created_at) : undefined,
        }));
      }

      // Get player mappings (session player ID -> group player ID)
      const { data: players } = await supabase
        .from('players')
        .select('id, group_player_id, name')
        .in('session_id', sessionIds)
        .not('group_player_id', 'is', null);

      const playerToGroupPlayer = new Map<string, string>();
      (players || []).forEach((p) => {
        if (p.group_player_id) {
          playerToGroupPlayer.set(p.id, p.group_player_id);
        }
      });


      // Get all completed games (limited to prevent memory issues)
      const { data: games } = await supabase
        .from('games')
        .select('team_a, team_b, winning_team')
        .in('session_id', sessionIds)
        .not('winning_team', 'is', null)
        .limit(1000);

      // Compute stats for each player from games
      const statsMap = new Map<string, { wins: number; losses: number }>();
      groupPlayers.forEach(gp => statsMap.set(gp.id, { wins: 0, losses: 0 }));

      (games || []).forEach((game) => {
        const teamA = typeof game.team_a === 'string' ? JSON.parse(game.team_a) : game.team_a;
        const teamB = typeof game.team_b === 'string' ? JSON.parse(game.team_b) : game.team_b;
        const winningTeam = game.winning_team;

        teamA.forEach((playerId: string) => {
          const groupPlayerId = playerToGroupPlayer.get(playerId);
          if (groupPlayerId && statsMap.has(groupPlayerId)) {
            const stats = statsMap.get(groupPlayerId)!;
            if (winningTeam === 'A') stats.wins++;
            else stats.losses++;
          }
        });

        teamB.forEach((playerId: string) => {
          const groupPlayerId = playerToGroupPlayer.get(playerId);
          if (groupPlayerId && statsMap.has(groupPlayerId)) {
            const stats = statsMap.get(groupPlayerId)!;
            if (winningTeam === 'B') stats.wins++;
            else stats.losses++;
          }
        });
      });

      // Build result with computed stats
      return groupPlayers.map(row => {
        const stats = statsMap.get(row.id) || { wins: 0, losses: 0 };
        return {
          id: row.id,
          groupId: row.group_id,
          name: row.name,
          eloRating: row.elo_rating || 1500,
          wins: stats.wins,
          losses: stats.losses,
          totalGames: stats.wins + stats.losses,
          createdAt: row.created_at ? new Date(row.created_at) : undefined,
        };
      });
    } catch (error) {
      console.error('[GroupService] Error fetching group players:', error);
      throw new Error('Failed to fetch group players');
    }
  }

  /**
   * Add a player to a group's player pool
   * If a soft-deleted player with the same name exists, reactivate them instead
   */
  static async addGroupPlayer(groupId: string, name: string): Promise<GroupPlayer> {
    try {
      const supabase = createSupabaseClient();
      
      // Check if a soft-deleted player with the same name exists (case-insensitive)
      const { data: existingPlayers } = await supabase
        .from('group_players')
        .select('id, group_id, name, elo_rating, created_at, is_active')
        .eq('group_id', groupId)
        .eq('is_active', false)
        .ilike('name', name);
      
      // If found, reactivate the existing player (preserves ID and all stats)
      if (existingPlayers && existingPlayers.length > 0) {
        const existingPlayer = existingPlayers[0];
        
        const { data: reactivated, error: reactivateError } = await supabase
          .from('group_players')
          .update({ is_active: true })
          .eq('id', existingPlayer.id)
          .select()
          .single();
        
        if (reactivateError) {
          throw reactivateError;
        }
        
        console.log(`[GroupService] Reactivated soft-deleted player "${name}" with preserved stats`);
        return this.mapRowToGroupPlayer(reactivated);
      }
      
      // No existing player found, create a new one
      const playerId = `gp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase
        .from('group_players')
        .insert({
          id: playerId,
          group_id: groupId,
          name,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapRowToGroupPlayer(data);
    } catch (error) {
      console.error('[GroupService] Error adding group player:', error);
      throw new Error('Failed to add group player');
    }
  }

  /**
   * Add multiple players to a group's player pool
   * If soft-deleted players with matching names exist, reactivate them instead
   */
  static async addGroupPlayers(groupId: string, names: string[]): Promise<GroupPlayer[]> {
    try {
      const supabase = createSupabaseClient();
      
      // Check for existing soft-deleted players with matching names
      const { data: existingInactive } = await supabase
        .from('group_players')
        .select('id, group_id, name, elo_rating, created_at, is_active')
        .eq('group_id', groupId)
        .eq('is_active', false);
      
      type InactivePlayer = { id: string; group_id: string; name: string; elo_rating: number | null; created_at: string | null; is_active: boolean };
      const inactiveByName = new Map<string, InactivePlayer>();
      (existingInactive || []).forEach((p: InactivePlayer) => {
        inactiveByName.set(p.name.toLowerCase().trim(), p);
      });
      
      const toReactivate: string[] = [];
      const newNames: string[] = [];
      
      names.forEach(name => {
        const normalizedName = name.toLowerCase().trim();
        const existing = inactiveByName.get(normalizedName);
        if (existing) {
          toReactivate.push(existing.id);
        } else {
          newNames.push(name);
        }
      });
      
      const results: GroupPlayer[] = [];
      
      // Reactivate existing soft-deleted players
      if (toReactivate.length > 0) {
        const { data: reactivated } = await supabase
          .from('group_players')
          .update({ is_active: true })
          .in('id', toReactivate)
          .select();
        
        if (reactivated) {
          results.push(...reactivated.map((row) => this.mapRowToGroupPlayer(row)));
        }
        console.log(`[GroupService] Reactivated ${toReactivate.length} soft-deleted players`);
      }
      
      // Create new players for names that don't have existing records
      if (newNames.length > 0) {
        const playersData = newNames.map((name) => ({
          id: `gp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          group_id: groupId,
          name,
          is_active: true,
        }));
        
        const { data, error } = await supabase
          .from('group_players')
          .insert(playersData)
          .select();

        if (error) {
          throw error;
        }
        
        if (data) {
          results.push(...data.map((row) => this.mapRowToGroupPlayer(row)));
        }
      }

      return results;
    } catch (error) {
      console.error('[GroupService] Error adding group players:', error);
      throw new Error('Failed to add group players');
    }
  }

  /**
   * Remove a player from a group's player pool (soft-delete)
   * The player is marked as inactive but their data is preserved
   * This allows stats to be restored if the player is re-added later
   */
  static async removeGroupPlayer(groupPlayerId: string): Promise<void> {
    try {
      const supabase = createSupabaseClient();
      
      // Soft-delete: mark as inactive instead of deleting
      // This preserves the group_player_id, stats, and session player links
      const { error } = await supabase
        .from('group_players')
        .update({ is_active: false })
        .eq('id', groupPlayerId);

      if (error) {
        console.error('[GroupService] Soft-delete error:', error);
        throw error;
      }
      
      console.log(`[GroupService] Soft-deleted group player ${groupPlayerId}`);
    } catch (error) {
      console.error('[GroupService] Error removing group player:', error);
      throw new Error('Failed to remove group player');
    }
  }

  /**
   * Get all sessions in a group
   */
  static async getGroupSessions(groupId: string): Promise<Session[]> {
    try {
      const supabase = createSupabaseClient();
      
      // Primary query - try direct filter first (fastest)
      let { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
      
      // If query failed or returned empty, try alternative approach
      // This handles cases where RLS or query syntax might be an issue
      if (sessionsError || !sessionsData || sessionsData.length === 0) {
        // Fallback: Fetch recent sessions and filter in memory
        // This is more reliable but slightly slower - only used as fallback
        const { data: allRecentSessions } = await supabase
          .from('sessions')
          .select('id, name, group_id, created_at')
          .order('created_at', { ascending: false })
          .limit(50); // Reasonable limit for in-memory filtering
        
        if (allRecentSessions && allRecentSessions.length > 0) {
          // Filter in memory - explicitly exclude null/undefined group_id values
          const filtered = allRecentSessions.filter(s => 
            s.group_id != null && (s.group_id === groupId || String(s.group_id) === String(groupId))
          );
          
          if (filtered.length > 0) {
            // Fetch full data for matching sessions
            const filteredIds = filtered.map(s => s.id);
            const { data: fullSessionsData } = await supabase
              .from('sessions')
              .select('*')
              .in('id', filteredIds)
              .order('created_at', { ascending: false });
            
            if (fullSessionsData) {
              sessionsData = fullSessionsData;
            }
          }
        }
      }
      
      // If we still don't have sessions after fallback, return empty
      if (!sessionsData || sessionsData.length === 0) {
        if (sessionsError) {
          throw sessionsError;
        }
        return [];
      }
      
      // Sort by date descending, then by created_at descending as tiebreaker
      sessionsData.sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        const createdDiff = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        return createdDiff;
      });

      // Remove duplicates based on session ID before processing
      const uniqueSessions = Array.from(
        new Map(sessionsData.map(s => [s.id, s])).values()
      );

      if (uniqueSessions.length === 0) {
        return [];
      }

      // Batch fetch all players for all sessions in a single query (optimize N+1 problem)
      const sessionIds = uniqueSessions.map(s => s.id);
      const { data: allPlayersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, group_player_id, session_id')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: true });

      // Continue with empty players if error - sessions will still be returned

      // Group players by session_id for O(1) lookup
      const playersBySessionId = new Map<string, any[]>();
      (allPlayersData || []).forEach((player: any) => {
        const sessionId = player.session_id;
        if (!playersBySessionId.has(sessionId)) {
          playersBySessionId.set(sessionId, []);
        }
        playersBySessionId.get(sessionId)!.push({
          id: player.id,
          name: player.name,
          groupPlayerId: player.group_player_id || undefined,
        });
      });

      // Map sessions with their players
      const sessionsWithPlayers = uniqueSessions.map((session: any) => {
        const players = playersBySessionId.get(session.id) || [];
        return {
          id: session.id,
          name: session.name || undefined,
          date: new Date(session.date),
          players: players,
          organizerId: session.organizer_id,
          courtCostType: session.court_cost_type as 'per_person' | 'total',
          courtCostValue: parseFloat(String(session.court_cost_value || 0)),
          birdCostTotal: parseFloat(String(session.bird_cost_total || 0)),
          betPerPlayer: parseFloat(String(session.bet_per_player || 0)),
          gameMode: session.game_mode as 'doubles' | 'singles',
          groupId: session.group_id || undefined,
          bettingEnabled: session.betting_enabled ?? true,
        } as Session;
      });

      // Filter out any null/undefined sessions AND ensure all sessions have matching groupId
      // This prevents standalone sessions (with null/undefined groupId) from being included
      return sessionsWithPlayers.filter(s => 
        s !== null && 
        s !== undefined && 
        s.groupId != null && 
        s.groupId === groupId
      );
    } catch (error) {
      console.error('[GroupService] Error fetching group sessions:', error);
      throw new Error('Failed to fetch group sessions');
    }
  }

  /**
   * Map database row to Group type
   */
  private static mapRowToGroup(row: any): Group {
    return {
      id: row.id,
      name: row.name,
      shareableLink: row.shareable_link,
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
    };
  }

  /**
   * Map database row to GroupPlayer type
   */
  private static mapRowToGroupPlayer(row: any): GroupPlayer {
    return {
      id: row.id,
      groupId: row.group_id,
      name: row.name,
      eloRating: row.elo_rating || 1500,
      wins: row.wins || 0,
      losses: row.losses || 0,
      totalGames: row.total_games || 0,
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
    };
  }

  /**
   * Update a group player's stats after a game
   */
  static async updatePlayerStats(
    groupPlayerId: string, 
    won: boolean
  ): Promise<void> {
    try {
      const supabase = createSupabaseClient();
      
      // Get current stats
      const { data: player, error: fetchError } = await supabase
        .from('group_players')
        .select('wins, losses, total_games')
        .eq('id', groupPlayerId)
        .single();

      if (fetchError) {
        console.error('[GroupService] Error fetching player for stats update:', fetchError);
        return;
      }

      const currentWins = player?.wins || 0;
      const currentLosses = player?.losses || 0;

      const { error: updateError } = await supabase
        .from('group_players')
        .update({
          wins: won ? currentWins + 1 : currentWins,
          losses: won ? currentLosses : currentLosses + 1,
          total_games: currentWins + currentLosses + 1,
        })
        .eq('id', groupPlayerId);

      if (updateError) {
        console.error('[GroupService] Error updating player stats:', updateError);
      }
    } catch (error) {
      console.error('[GroupService] Error in updatePlayerStats:', error);
    }
  }

  /**
   * Reverse a player's stats (when deleting or changing a game result)
   */
  static async reversePlayerStats(
    groupPlayerId: string,
    wasWin: boolean
  ): Promise<void> {
    try {
      const supabase = createSupabaseClient();
      
      // Get current stats
      const { data: player, error: fetchError } = await supabase
        .from('group_players')
        .select('wins, losses, total_games')
        .eq('id', groupPlayerId)
        .single();

      if (fetchError) {
        console.error('[GroupService] Error fetching player for stats reversal:', fetchError);
        return;
      }

      const currentWins = player?.wins || 0;
      const currentLosses = player?.losses || 0;

      const { error: updateError } = await supabase
        .from('group_players')
        .update({
          wins: wasWin ? Math.max(0, currentWins - 1) : currentWins,
          losses: wasWin ? currentLosses : Math.max(0, currentLosses - 1),
          total_games: Math.max(0, currentWins + currentLosses - 1),
        })
        .eq('id', groupPlayerId);

      if (updateError) {
        console.error('[GroupService] Error reversing player stats:', updateError);
      }
    } catch (error) {
      console.error('[GroupService] Error in reversePlayerStats:', error);
    }
  }

  /**
   * Helper to parse JSON array from database
   */
  private static parseJsonArray(data: unknown): string[] {
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * Get extended group-level statistics
   * Returns comprehensive stats including unlucky games, records, etc.
   */
  static async getGroupStats(groupId: string): Promise<{
    totalGames: number;
    totalSessions: number;
    totalPlayers: number;
    avgPointDifferential: number | null;
    gamesPerSession: number;
    closestMatchups: Array<{
      team1Player1Name: string;
      team1Player2Name: string;
      team2Player1Name: string;
      team2Player2Name: string;
      team1Wins: number;
      team2Wins: number;
      totalGames: number;
    }>;
    // Individual records (arrays to support ties)
    highestElo: Array<{ name: string; rating: number }>;
    eloSpread: number | null;
    bestWinStreak: Array<{ name: string; streak: number }>;
    mostGamesPlayed: Array<{ name: string; games: number }>;
    // Pairing records (arrays to support ties)
    highestPairElo: Array<{ player1Name: string; player2Name: string; rating: number }>;
    bestPairStreak: Array<{ player1Name: string; player2Name: string; streak: number }>;
    mostGamesTogether: Array<{ player1Name: string; player2Name: string; games: number }>;
    dreamTeam: { player1Name: string; player2Name: string; winRate: number; gamesPlayed: number; wins: number; losses: number } | null;
    unluckyPlayer: { name: string; count: number } | null;
    unluckyPairing: { player1Name: string; player2Name: string; count: number } | null;
    clutchPlayer: { name: string; count: number } | null;
    clutchPairing: { player1Name: string; player2Name: string; count: number } | null;
    firstSessionDate: Date | null;
    daysSinceFirstSession: number | null;
  }> {
    const supabase = createSupabaseClient();

    try {
      // Run all independent queries in parallel
      const [
        sessionsResult,
        matchupsResult,
        playersResult,
        partnerStatsResult
      ] = await Promise.all([
        supabase
          .from('sessions')
          .select('id, date, created_at')
          .eq('group_id', groupId)
          .order('date', { ascending: true }),
        supabase
          .from('pairing_matchups')
          .select('team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id, team1_wins, team1_losses, total_games')
          .eq('group_id', groupId)
          .gte('total_games', 3),
        supabase
          .from('group_players')
          .select('id, name, elo_rating, wins, losses, total_games, best_win_streak, is_active')
          .eq('group_id', groupId)
          .eq('is_active', true),  // Only count active players in group stats
        supabase
          .from('partner_stats')
          .select('player1_id, player2_id, wins, losses, total_games, elo_rating, best_win_streak')
          .eq('group_id', groupId)
          .gte('total_games', 3)
      ]);

      const { data: sessions } = sessionsResult;
      const { data: matchups } = matchupsResult;
      const { data: players } = playersResult;
      const { data: partnerStats } = partnerStatsResult;

      const sessionIds = (sessions || []).map(s => s.id);
      const totalSessions = sessionIds.length;
      const totalPlayers = players?.length || 0;

      // Get first session date
      const firstSessionDate = sessions && sessions.length > 0 
        ? new Date(sessions[0].date || sessions[0].created_at) 
        : null;
      const daysSinceFirstSession = firstSessionDate 
        ? Math.floor((Date.now() - firstSessionDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Fetch all completed games with scores for detailed analysis
      let totalGames = 0;
      let avgPointDifferential: number | null = null;
      let unluckyPlayerData: { name: string; count: number } | null = null;
      let unluckyPairingData: { player1Name: string; player2Name: string; count: number } | null = null;
      let clutchPlayerData: { name: string; count: number } | null = null;
      let clutchPairingData: { player1Name: string; player2Name: string; count: number } | null = null;

      if (sessionIds.length > 0) {
        // Get all games with scores for analysis (limited to prevent memory issues)
        const { data: allGames } = await supabase
          .from('games')
          .select('team_a, team_b, winning_team, team_a_score, team_b_score')
          .in('session_id', sessionIds)
          .not('winning_team', 'is', null)
          .limit(1000);

        totalGames = allGames?.length || 0;

        // Calculate average point differential, unlucky and clutch stats
        if (allGames && allGames.length > 0) {
          let totalDiff = 0;
          let gamesWithScores = 0;
          const playerUnluckyMap = new Map<string, number>(); // groupPlayerId -> unlucky count
          const pairingUnluckyMap = new Map<string, number>(); // "p1:p2" sorted key -> unlucky count
          const playerClutchMap = new Map<string, number>(); // groupPlayerId -> clutch count
          const pairingClutchMap = new Map<string, number>(); // "p1:p2" sorted key -> clutch count

          // Get player mappings
          const { data: sessionPlayers } = await supabase
            .from('players')
            .select('id, group_player_id')
            .in('session_id', sessionIds)
            .not('group_player_id', 'is', null);

          const sessionPlayerToGroup = new Map<string, string>();
          (sessionPlayers || []).forEach(p => {
            if (p.group_player_id) {
              sessionPlayerToGroup.set(p.id, p.group_player_id);
            }
          });

          allGames.forEach((game) => {
            const teamAScore = game.team_a_score;
            const teamBScore = game.team_b_score;
            const winningTeam = game.winning_team as 'A' | 'B';
            const teamA = this.parseJsonArray(game.team_a);
            const teamB = this.parseJsonArray(game.team_b);

            // Calculate point differential
            if (teamAScore !== null && teamBScore !== null) {
              const diff = Math.abs(teamAScore - teamBScore);
              totalDiff += diff;
              gamesWithScores++;

              // Check for close games (won/lost by 1-2 points)
              if (diff <= 2) {
                const losingTeam = winningTeam === 'A' ? teamB : teamA;
                const winningTeamPlayers = winningTeam === 'A' ? teamA : teamB;
                
                // Track individual player unlucky games (losers)
                losingTeam.forEach((playerId: string) => {
                  const groupPlayerId = sessionPlayerToGroup.get(playerId);
                  if (groupPlayerId) {
                    playerUnluckyMap.set(groupPlayerId, (playerUnluckyMap.get(groupPlayerId) || 0) + 1);
                  }
                });

                // Track pairing unlucky games (for doubles - losers)
                if (losingTeam.length === 2) {
                  const gp1 = sessionPlayerToGroup.get(losingTeam[0]);
                  const gp2 = sessionPlayerToGroup.get(losingTeam[1]);
                  if (gp1 && gp2) {
                    const pairingKey = [gp1, gp2].sort().join(':');
                    pairingUnluckyMap.set(pairingKey, (pairingUnluckyMap.get(pairingKey) || 0) + 1);
                  }
                }

                // Track individual player clutch games (winners)
                winningTeamPlayers.forEach((playerId: string) => {
                  const groupPlayerId = sessionPlayerToGroup.get(playerId);
                  if (groupPlayerId) {
                    playerClutchMap.set(groupPlayerId, (playerClutchMap.get(groupPlayerId) || 0) + 1);
                  }
                });

                // Track pairing clutch games (for doubles - winners)
                if (winningTeamPlayers.length === 2) {
                  const gp1 = sessionPlayerToGroup.get(winningTeamPlayers[0]);
                  const gp2 = sessionPlayerToGroup.get(winningTeamPlayers[1]);
                  if (gp1 && gp2) {
                    const pairingKey = [gp1, gp2].sort().join(':');
                    pairingClutchMap.set(pairingKey, (pairingClutchMap.get(pairingKey) || 0) + 1);
                  }
                }
              }
            }
          });

          avgPointDifferential = gamesWithScores > 0 ? Math.round((totalDiff / gamesWithScores) * 10) / 10 : null;

          // Find most unlucky player
          const playerNameMap = new Map<string, string>();
          (players || []).forEach(p => playerNameMap.set(p.id, p.name));

          let maxPlayerUnlucky = 0;
          let maxPlayerUnluckyId: string | null = null;
          playerUnluckyMap.forEach((count, id) => {
            if (count > maxPlayerUnlucky) {
              maxPlayerUnlucky = count;
              maxPlayerUnluckyId = id;
            }
          });
          if (maxPlayerUnluckyId && maxPlayerUnlucky > 0) {
            unluckyPlayerData = {
              name: playerNameMap.get(maxPlayerUnluckyId) || 'Unknown',
              count: maxPlayerUnlucky,
            };
          }

          // Find most clutch player
          let maxPlayerClutch = 0;
          let maxPlayerClutchId: string | null = null;
          playerClutchMap.forEach((count, id) => {
            if (count > maxPlayerClutch) {
              maxPlayerClutch = count;
              maxPlayerClutchId = id;
            }
          });
          if (maxPlayerClutchId && maxPlayerClutch > 0) {
            clutchPlayerData = {
              name: playerNameMap.get(maxPlayerClutchId) || 'Unknown',
              count: maxPlayerClutch,
            };
          }

          // Find most unlucky pairing
          const pairingEntries = Array.from(pairingUnluckyMap.entries());
          const mostUnluckyPairing = pairingEntries.reduce<{ key: string; count: number } | null>(
            (best, [key, count]) => {
              if (!best || count > best.count) {
                return { key, count };
              }
              return best;
            },
            null
          );
          if (mostUnluckyPairing && mostUnluckyPairing.count > 0) {
            const keyParts = mostUnluckyPairing.key.split(':');
            unluckyPairingData = {
              player1Name: playerNameMap.get(keyParts[0]) || 'Unknown',
              player2Name: playerNameMap.get(keyParts[1]) || 'Unknown',
              count: mostUnluckyPairing.count,
            };
          }

          // Find most clutch pairing
          const clutchPairingEntries = Array.from(pairingClutchMap.entries());
          const mostClutchPairing = clutchPairingEntries.reduce<{ key: string; count: number } | null>(
            (best, [key, count]) => {
              if (!best || count > best.count) {
                return { key, count };
              }
              return best;
            },
            null
          );
          if (mostClutchPairing && mostClutchPairing.count > 0) {
            const keyParts = mostClutchPairing.key.split(':');
            clutchPairingData = {
              player1Name: playerNameMap.get(keyParts[0]) || 'Unknown',
              player2Name: playerNameMap.get(keyParts[1]) || 'Unknown',
              count: mostClutchPairing.count,
            };
          }
        }
      }

      // Calculate player records (with tie support)
      let highestElo: Array<{ name: string; rating: number }> = [];
      let eloSpread: number | null = null;
      let bestWinStreak: Array<{ name: string; streak: number }> = [];
      let mostGamesPlayed: Array<{ name: string; games: number }> = [];

      if (players && players.length > 0) {
        // Highest ELO (all ties)
        const maxElo = Math.max(...players.map(p => p.elo_rating || 1500));
        const minElo = Math.min(...players.map(p => p.elo_rating || 1500));
        eloSpread = maxElo - minElo;
        
        if (maxElo > 1500) {
          highestElo = players
            .filter(p => (p.elo_rating || 1500) === maxElo)
            .map(p => ({ name: p.name, rating: p.elo_rating || 1500 }));
        }

        // Best Win Streak (all ties)
        // Cap best_win_streak to never exceed wins (safety check for data integrity)
        const getValidatedStreak = (p: typeof players[0]) => Math.min(p.best_win_streak || 0, p.wins || 0);
        const maxStreak = Math.max(...players.map(getValidatedStreak));
        if (maxStreak > 0) {
          bestWinStreak = players
            .filter(p => getValidatedStreak(p) === maxStreak)
            .map(p => ({ name: p.name, streak: getValidatedStreak(p) }));
        }

        // Most Games Played (all ties)
        const maxGames = Math.max(...players.map(p => p.total_games || 0));
        if (maxGames > 0) {
          mostGamesPlayed = players
            .filter(p => (p.total_games || 0) === maxGames)
            .map(p => ({ name: p.name, games: p.total_games || 0 }));
        }
      }

      // Calculate pairing records (with tie support)
      let highestPairElo: Array<{ player1Name: string; player2Name: string; rating: number }> = [];
      let bestPairStreak: Array<{ player1Name: string; player2Name: string; streak: number }> = [];
      let mostGamesTogether: Array<{ player1Name: string; player2Name: string; games: number }> = [];

      if (partnerStats && partnerStats.length > 0) {
        const pairNameMap = new Map<string, string>();
        (players || []).forEach(p => pairNameMap.set(p.id, p.name));

        // Highest Pair ELO (all ties)
        const maxPairElo = Math.max(...partnerStats.map(p => p.elo_rating || 1500));
        if (maxPairElo > 1500) {
          highestPairElo = partnerStats
            .filter(p => (p.elo_rating || 1500) === maxPairElo)
            .map(p => ({
              player1Name: pairNameMap.get(p.player1_id) || 'Unknown',
              player2Name: pairNameMap.get(p.player2_id) || 'Unknown',
              rating: p.elo_rating || 1500,
            }));
        }

        // Best Pair Streak (all ties)
        const maxPairStreak = Math.max(...partnerStats.map(p => p.best_win_streak || 0));
        if (maxPairStreak > 0) {
          bestPairStreak = partnerStats
            .filter(p => (p.best_win_streak || 0) === maxPairStreak)
            .map(p => ({
              player1Name: pairNameMap.get(p.player1_id) || 'Unknown',
              player2Name: pairNameMap.get(p.player2_id) || 'Unknown',
              streak: p.best_win_streak || 0,
            }));
        }

        // Most Games Together (all ties)
        const maxPairGames = Math.max(...partnerStats.map(p => p.total_games || 0));
        if (maxPairGames > 0) {
          mostGamesTogether = partnerStats
            .filter(p => (p.total_games || 0) === maxPairGames)
            .map(p => ({
              player1Name: pairNameMap.get(p.player1_id) || 'Unknown',
              player2Name: pairNameMap.get(p.player2_id) || 'Unknown',
              games: p.total_games || 0,
            }));
        }
      }

      // Find closest matchups (all rivalries with the same closeness)
      let closestMatchups: Array<{
        team1Player1Name: string;
        team1Player2Name: string;
        team2Player1Name: string;
        team2Player2Name: string;
        team1Wins: number;
        team2Wins: number;
        totalGames: number;
      }> = [];

      if (matchups && matchups.length > 0) {
        // Find the minimum difference (closest rivalry)
        const minDiff = matchups.reduce((min, current) => {
          const diff = Math.abs(current.team1_wins - current.team1_losses);
          return diff < min ? diff : min;
        }, Infinity);

        // Get all matchups with the minimum difference, sorted by total games
        const closestAll = matchups
          .filter(m => Math.abs(m.team1_wins - m.team1_losses) === minDiff)
          .sort((a, b) => b.total_games - a.total_games);

        const playerNameMap = new Map<string, string>();
        (players || []).forEach(p => playerNameMap.set(p.id, p.name));

        closestMatchups = closestAll.map(closest => ({
          team1Player1Name: playerNameMap.get(closest.team1_player1_id) || 'Unknown',
          team1Player2Name: playerNameMap.get(closest.team1_player2_id) || 'Unknown',
          team2Player1Name: playerNameMap.get(closest.team2_player1_id) || 'Unknown',
          team2Player2Name: playerNameMap.get(closest.team2_player2_id) || 'Unknown',
          team1Wins: closest.team1_wins,
          team2Wins: closest.team1_losses,
          totalGames: closest.total_games,
        }));
      }

      // Find dream team (best pairing by win rate)
      let dreamTeam: { player1Name: string; player2Name: string; winRate: number; gamesPlayed: number; wins: number; losses: number } | null = null;

      if (partnerStats && partnerStats.length > 0) {
        const best = partnerStats.reduce((a, b) => {
          const aWinRate = a.total_games > 0 ? a.wins / a.total_games : 0;
          const bWinRate = b.total_games > 0 ? b.wins / b.total_games : 0;
          return aWinRate > bWinRate ? a : b;
        });

        const playerNameMap = new Map<string, string>();
        (players || []).forEach(p => playerNameMap.set(p.id, p.name));

        dreamTeam = {
          player1Name: playerNameMap.get(best.player1_id) || 'Unknown',
          player2Name: playerNameMap.get(best.player2_id) || 'Unknown',
          winRate: best.total_games > 0 ? Math.round((best.wins / best.total_games) * 100) : 0,
          gamesPlayed: best.total_games,
          wins: best.wins,
          losses: best.total_games - best.wins,
        };
      }

      return {
        totalGames,
        totalSessions,
        totalPlayers,
        avgPointDifferential,
        gamesPerSession: totalSessions > 0 ? Math.round((totalGames / totalSessions) * 10) / 10 : 0,
        closestMatchups,
        highestElo,
        eloSpread,
        bestWinStreak,
        mostGamesPlayed,
        highestPairElo,
        bestPairStreak,
        mostGamesTogether,
        dreamTeam,
        unluckyPlayer: unluckyPlayerData,
        unluckyPairing: unluckyPairingData,
        clutchPlayer: clutchPlayerData,
        clutchPairing: clutchPairingData,
        firstSessionDate,
        daysSinceFirstSession,
      };
    } catch (error) {
      console.error('[GroupService] Error fetching group stats:', error);
      return {
        totalGames: 0,
        totalSessions: 0,
        totalPlayers: 0,
        avgPointDifferential: null,
        gamesPerSession: 0,
        closestMatchups: [],
        highestElo: [],
        eloSpread: null,
        bestWinStreak: [],
        mostGamesPlayed: [],
        highestPairElo: [],
        bestPairStreak: [],
        mostGamesTogether: [],
        dreamTeam: null,
        unluckyPlayer: null,
        unluckyPairing: null,
        clutchPlayer: null,
        clutchPairing: null,
        firstSessionDate: null,
        daysSinceFirstSession: null,
      };
    }
  }
}


