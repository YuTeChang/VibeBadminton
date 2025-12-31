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
      console.log('[GroupService.getGroupSessions] Fetching sessions for group:', groupId);
      const supabase = createSupabaseClient();
      
      // Log which key is actually being used
      const usingServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      const keyPrefix = usingServiceKey 
        ? (process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) || 'unknown')
        : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) || 'unknown');
      
      console.log('[GroupService.getGroupSessions] Supabase client config:', {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing',
        usingServiceKey,
        keyPrefix: `${keyPrefix}...`,
      });

      // Get all sessions - order in JavaScript to avoid Supabase ordering bug with duplicate dates
      // Filter by group_id (must match exactly and not be null)
      console.log('[GroupService.getGroupSessions] Executing query with groupId:', groupId, 'type:', typeof groupId);
      let { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('group_id', groupId);
      
      console.log('[GroupService.getGroupSessions] Raw query response:', {
        dataLength: sessionsData?.length || 0,
        hasError: !!sessionsError,
        errorMessage: sessionsError?.message,
        errorCode: sessionsError?.code,
      });
      
      // Sort by date descending, then by created_at descending as tiebreaker
      if (sessionsData) {
        sessionsData.sort((a, b) => {
          const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          // If dates are equal, sort by created_at
          const createdDiff = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
          return createdDiff;
        });
      }
      
      console.log('[GroupService.getGroupSessions] Query result:', {
        groupId,
        sessionsFound: sessionsData?.length || 0,
        sessions: sessionsData?.map(s => ({ id: s.id, name: s.name, group_id: s.group_id, date: s.date })),
        error: sessionsError?.message,
        errorCode: sessionsError?.code,
        errorDetails: sessionsError?.details,
      });
      
      // Also try a count query to see total
      const { count } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);
      console.log('[GroupService.getGroupSessions] Count query result:', count);

      if (sessionsError) {
        console.error('[GroupService.getGroupSessions] Supabase query error:', {
          message: sessionsError.message,
          code: sessionsError.code,
          details: sessionsError.details,
          hint: sessionsError.hint,
        });
        throw sessionsError;
      }

      if (!sessionsData || sessionsData.length === 0) {
        console.log('[GroupService.getGroupSessions] No sessions found for groupId:', groupId);
        console.log('[GroupService.getGroupSessions] Query returned:', {
          data: sessionsData,
          dataLength: sessionsData?.length,
          error: sessionsError,
        });
        
        // Double-check with a simpler query to debug
        const { data: checkData, error: checkError } = await supabase
          .from('sessions')
          .select('id, group_id')
          .eq('group_id', groupId)
          .limit(1);
        console.log('[GroupService.getGroupSessions] Debug query result:', {
          found: checkData?.length || 0,
          error: checkError?.message,
          checkData: checkData,
        });
        
        // Also check all sessions to see what group_ids exist
        const { data: allSessionsSample, error: sampleError } = await supabase
          .from('sessions')
          .select('id, group_id')
          .limit(10);
        console.log('[GroupService.getGroupSessions] Sample sessions with group_ids:', {
          count: allSessionsSample?.length || 0,
          error: sampleError?.message,
          sessions: allSessionsSample?.map(s => ({ id: s.id, group_id: s.group_id, group_id_type: typeof s.group_id })),
        });
        
        // If we got data from the debug query but not the main query, there's a transformation issue
        if (checkData && checkData.length > 0 && !sessionsError) {
          console.warn('[GroupService.getGroupSessions] WARNING: Debug query found sessions but main query returned empty!');
          // Try to fetch the full session data for the found sessions
          const sessionIds = checkData.map(s => s.id);
          const { data: fullSessions, error: fullError } = await supabase
            .from('sessions')
            .select('*')
            .in('id', sessionIds);
          console.log('[GroupService.getGroupSessions] Full sessions fetch:', {
            count: fullSessions?.length || 0,
            error: fullError?.message,
          });
          if (fullSessions && fullSessions.length > 0) {
            // Use the full sessions data we just fetched
            sessionsData = fullSessions;
          }
        }
        
        // If still no data, return empty
        if (!sessionsData || sessionsData.length === 0) {
          return [];
        }
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


