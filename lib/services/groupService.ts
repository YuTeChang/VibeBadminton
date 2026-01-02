import { createSupabaseClient } from '@/lib/supabase';
import { Group, GroupPlayer, Session } from '@/types';

/**
 * Generate a short shareable link code
 */
function generateShareableLink(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
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
      
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('[GroupService] Error deleting group:', error);
      throw new Error('Failed to delete group');
    }
  }

  /**
   * Get all players in a group's player pool
   */
  static async getGroupPlayers(groupId: string): Promise<GroupPlayer[]> {
    try {
      const supabase = createSupabaseClient();
      
      const { data, error } = await supabase
        .from('group_players')
        .select('*')
        .eq('group_id', groupId)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      return (data || []).map((row) => this.mapRowToGroupPlayer(row));
    } catch (error) {
      console.error('[GroupService] Error fetching group players:', error);
      throw new Error('Failed to fetch group players');
    }
  }

  /**
   * Add a player to a group's player pool
   */
  static async addGroupPlayer(groupId: string, name: string): Promise<GroupPlayer> {
    try {
      const supabase = createSupabaseClient();
      
      const playerId = `gp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase
        .from('group_players')
        .insert({
          id: playerId,
          group_id: groupId,
          name,
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
   */
  static async addGroupPlayers(groupId: string, names: string[]): Promise<GroupPlayer[]> {
    try {
      const supabase = createSupabaseClient();
      
      const playersData = names.map((name) => ({
        id: `gp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        group_id: groupId,
        name,
      }));
      
      const { data, error } = await supabase
        .from('group_players')
        .insert(playersData)
        .select();

      if (error) {
        throw error;
      }

      return (data || []).map((row) => this.mapRowToGroupPlayer(row));
    } catch (error) {
      console.error('[GroupService] Error adding group players:', error);
      throw new Error('Failed to add group players');
    }
  }

  /**
   * Remove a player from a group's player pool
   */
  static async removeGroupPlayer(groupPlayerId: string): Promise<void> {
    try {
      const supabase = createSupabaseClient();
      
      const { error } = await supabase
        .from('group_players')
        .delete()
        .eq('id', groupPlayerId);

      if (error) {
        throw error;
      }
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
   * Get group-level statistics
   * Returns total games, total sessions, most active player, and closest matchup
   */
  static async getGroupStats(groupId: string): Promise<{
    totalGames: number;
    totalSessions: number;
    mostActivePlayer: { id: string; name: string; gamesPlayed: number } | null;
    closestMatchup: {
      team1Player1Name: string;
      team1Player2Name: string;
      team2Player1Name: string;
      team2Player2Name: string;
      team1Wins: number;
      team2Wins: number;
      totalGames: number;
    } | null;
  }> {
    const supabase = createSupabaseClient();

    try {
      // Get total sessions
      const { count: sessionCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);

      // Get session IDs for this group
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('group_id', groupId);

      const sessionIds = (sessions || []).map(s => s.id);

      // Get total completed games
      let totalGames = 0;
      if (sessionIds.length > 0) {
        const { count: gameCount } = await supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds)
          .not('winning_team', 'is', null);
        totalGames = gameCount || 0;
      }

      // Get most active player (player with most total_games)
      const { data: topPlayer } = await supabase
        .from('group_players')
        .select('id, name, total_games')
        .eq('group_id', groupId)
        .order('total_games', { ascending: false })
        .limit(1)
        .single();

      const mostActivePlayer = topPlayer && topPlayer.total_games > 0
        ? { id: topPlayer.id, name: topPlayer.name, gamesPlayed: topPlayer.total_games }
        : null;

      // Get closest matchup (pairing matchup with smallest win difference, min 5 games)
      const { data: matchups } = await supabase
        .from('pairing_matchups')
        .select('team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id, team1_wins, team1_losses, total_games')
        .eq('group_id', groupId)
        .gte('total_games', 5);

      let closestMatchup: {
        team1Player1Name: string;
        team1Player2Name: string;
        team2Player1Name: string;
        team2Player2Name: string;
        team1Wins: number;
        team2Wins: number;
        totalGames: number;
      } | null = null;

      if (matchups && matchups.length > 0) {
        // Find matchup with smallest absolute difference
        const closest = matchups.reduce((best, current) => {
          const currentDiff = Math.abs(current.team1_wins - current.team1_losses);
          const bestDiff = best ? Math.abs(best.team1_wins - best.team1_losses) : Infinity;
          return currentDiff < bestDiff ? current : best;
        }, null as typeof matchups[0] | null);

        if (closest) {
          // Get player names
          const { data: players } = await supabase
            .from('group_players')
            .select('id, name')
            .in('id', [closest.team1_player1_id, closest.team1_player2_id, closest.team2_player1_id, closest.team2_player2_id]);

          const playerNames = new Map<string, string>();
          (players || []).forEach(p => playerNames.set(p.id, p.name));

          closestMatchup = {
            team1Player1Name: playerNames.get(closest.team1_player1_id) || 'Unknown',
            team1Player2Name: playerNames.get(closest.team1_player2_id) || 'Unknown',
            team2Player1Name: playerNames.get(closest.team2_player1_id) || 'Unknown',
            team2Player2Name: playerNames.get(closest.team2_player2_id) || 'Unknown',
            team1Wins: closest.team1_wins,
            team2Wins: closest.team1_losses,
            totalGames: closest.total_games,
          };
        }
      }

      return {
        totalGames,
        totalSessions: sessionCount || 0,
        mostActivePlayer,
        closestMatchup,
      };
    } catch (error) {
      console.error('[GroupService] Error fetching group stats:', error);
      return {
        totalGames: 0,
        totalSessions: 0,
        mostActivePlayer: null,
        closestMatchup: null,
      };
    }
  }
}


