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
      
      const { data, error } = await supabase
        .from('groups')
        .select('*')
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
      
      // Query sessions with group_id filter
      let { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('group_id', groupId);
      
      // If no results, try alternative query to handle potential replication lag
      if ((!sessionsData || sessionsData.length === 0) && !sessionsError) {
        // Try querying all sessions and filtering in memory
        const { data: allSessionsCheck, error: allError } = await supabase
          .from('sessions')
          .select('id, group_id, name, date, created_at')
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (allSessionsCheck && !allError) {
          const matchingSessions = allSessionsCheck.filter(s => s.group_id === groupId);
          
          if (matchingSessions.length > 0) {
            // Fetch full data for matching sessions
            const sessionIds = matchingSessions.map(s => s.id);
            const { data: fullSessions, error: fullError } = await supabase
              .from('sessions')
              .select('*')
              .in('id', sessionIds);
            
            if (fullSessions && fullSessions.length > 0 && !fullError) {
              sessionsData = fullSessions;
              sessionsError = fullError;
            }
          }
        }
      }
      
      // Sort by date descending, then by created_at descending as tiebreaker
      if (sessionsData) {
        sessionsData.sort((a, b) => {
          const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          const createdDiff = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
          return createdDiff;
        });
      }

      if (sessionsError) {
        console.error('[GroupService] Error fetching group sessions:', {
          groupId,
          message: sessionsError.message,
          code: sessionsError.code,
        });
        throw sessionsError;
      }

      if (!sessionsData || sessionsData.length === 0) {
        return [];
      }

      // Fetch players for each session
      const sessionsWithPlayers = await Promise.all(
        sessionsData.map(async (session) => {
          const { data: playersData } = await supabase
            .from('players')
            .select('id, name, group_player_id')
            .eq('session_id', session.id);

          return {
            id: session.id,
            name: session.name || undefined,
            date: new Date(session.date),
            players: (playersData || []).map((p) => ({
              id: p.id,
              name: p.name,
              groupPlayerId: p.group_player_id || undefined,
            })),
            organizerId: session.organizer_id,
            courtCostType: session.court_cost_type as 'per_person' | 'total',
            courtCostValue: parseFloat(String(session.court_cost_value || 0)),
            birdCostTotal: parseFloat(String(session.bird_cost_total || 0)),
            betPerPlayer: parseFloat(String(session.bet_per_player || 0)),
            gameMode: session.game_mode as 'doubles' | 'singles',
            groupId: session.group_id || undefined,
            bettingEnabled: session.betting_enabled ?? true,
          } as Session;
        })
      );

      return sessionsWithPlayers;
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
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
    };
  }
}


