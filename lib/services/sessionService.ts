import { createSupabaseClient } from '@/lib/supabase';
import { Session, Player } from '@/types';

export interface SessionRow {
  id: string;
  name: string | null;
  date: Date;
  organizer_id: string;
  court_cost_type: string;
  court_cost_value: string;
  bird_cost_total: string;
  bet_per_player: string;
  game_mode: string;
  round_robin_count: number | null;
  group_id: string | null;
  betting_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PlayerRow {
  id: string;
  session_id: string;
  name: string;
  group_player_id: string | null;
  created_at: Date;
}

/**
 * Service layer for session database operations
 * Follows repository pattern for better separation of concerns
 */
export class SessionService {
  /**
   * Get all sessions with their players
   * Optimized: Uses batch query to fetch all players in one query instead of N+1 queries
   * (More efficient than JOIN for this use case - avoids cartesian product issues)
   */
  static async getAllSessions(): Promise<Session[]> {
    try {
      const supabase = createSupabaseClient();
      
      // Fetch all sessions first
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (sessionsError) {
        throw sessionsError;
      }

      if (!sessionsData || sessionsData.length === 0) {
        return [];
      }

      // Batch fetch all players for all sessions in a single query
      const sessionIds = sessionsData.map(s => s.id);
      const { data: allPlayersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, group_player_id, session_id')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: true });

      if (playersError) {
        throw playersError;
      }

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
      const sessionsWithPlayers = sessionsData.map((session: any) => {
        const players = playersBySessionId.get(session.id) || [];
        return this.mapRowToSession(session, players);
      });

      return sessionsWithPlayers;
    } catch (error) {
      console.error('[SessionService] Error fetching all sessions:', error);
      throw new Error('Failed to fetch sessions');
    }
  }

  /**
   * Get a single session by ID with its players
   */
  static async getSessionById(sessionId: string): Promise<Session | null> {
    try {
      const supabase = createSupabaseClient();
      
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        if (sessionError.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw sessionError;
      }

      if (!sessionData) {
        return null;
      }

      const players = await this.getPlayersBySessionId(sessionId);
      return this.mapRowToSession(sessionData as any, players);
    } catch (error) {
      console.error('[SessionService] Error fetching session:', error);
      throw new Error('Failed to fetch session');
    }
  }

  /**
   * Create or update a session with players (upsert)
   */
  static async createSession(
    session: Session,
    roundRobinCount?: number | null
  ): Promise<Session> {
    try {
      const supabase = createSupabaseClient();
      
      console.log('[SessionService.createSession] Saving session:', {
        id: session.id,
        name: session.name,
        groupId: session.groupId,
        groupIdType: typeof session.groupId,
        hasGroupId: !!session.groupId,
      });

      // Upsert session (insert or update if exists)
      const sessionData = {
        id: session.id,
        name: session.name || null,
        date: session.date.toISOString(),
        organizer_id: session.organizerId,
        court_cost_type: session.courtCostType,
        court_cost_value: session.courtCostValue,
        bird_cost_total: session.birdCostTotal,
        bet_per_player: session.betPerPlayer,
        game_mode: session.gameMode,
        round_robin_count: roundRobinCount || null,
        group_id: session.groupId || null,
        betting_enabled: session.bettingEnabled ?? true,
      };
      
      console.log('[SessionService.createSession] Session data to save:', {
        ...sessionData,
        group_id: sessionData.group_id,
        has_group_id: !!sessionData.group_id,
      });

      const { error: sessionError, data: savedData } = await supabase
        .from('sessions')
        .upsert(sessionData, {
          onConflict: 'id',
        })
        .select();
      
      if (savedData) {
        console.log('[SessionService.createSession] Session saved:', {
          id: savedData[0]?.id,
          group_id: savedData[0]?.group_id,
        });
      }

      if (sessionError) {
        throw sessionError;
      }

      // Upsert players (insert or update if exists)
      if (session.players.length > 0) {
        // Ensure all players have names (assign defaults if missing)
        const playersData = session.players.map((player, index) => ({
          id: player.id,
          session_id: session.id,
          name: (player.name && player.name.trim()) || `Player ${index + 1}`,
          group_player_id: player.groupPlayerId || null,
        }));

        const { error: playersError } = await supabase
          .from('players')
          .upsert(playersData, {
            onConflict: 'id',
          });

        if (playersError) {
          throw playersError;
        }
      }

      return session;
    } catch (error) {
      console.error('[SessionService] Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Delete a session (cascade will delete players and games)
   */
  static async deleteSession(sessionId: string): Promise<void> {
    try {
      const supabase = createSupabaseClient();
      
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('[SessionService] Error deleting session:', error);
      throw new Error('Failed to delete session');
    }
  }

  /**
   * Get players for a session
   */
  static async getPlayersBySessionId(sessionId: string): Promise<Player[]> {
    try {
      const supabase = createSupabaseClient();
      
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, group_player_id')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (playersError) {
        throw playersError;
      }

      return (playersData || []).map((row) => ({
        id: row.id,
        name: row.name,
        groupPlayerId: row.group_player_id || undefined,
      }));
    } catch (error) {
      console.error('[SessionService] Error fetching players:', error);
      return [];
    }
  }

  /**
   * Get sessions by group ID
   */
  static async getSessionsByGroupId(groupId: string): Promise<Session[]> {
    try {
      const supabase = createSupabaseClient();
      
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('group_id', groupId)
        .order('date', { ascending: false });

      if (sessionsError) {
        throw sessionsError;
      }

      if (!sessionsData) {
        return [];
      }

      const sessionsWithPlayers = await Promise.all(
        sessionsData.map(async (session) => {
          const players = await this.getPlayersBySessionId(session.id);
          return this.mapRowToSession(session as any, players);
        })
      );

      return sessionsWithPlayers;
    } catch (error) {
      console.error('[SessionService] Error fetching sessions by group:', error);
      throw new Error('Failed to fetch sessions');
    }
  }

  /**
   * Get lightweight session summaries (for dashboard/list views)
   * Returns only: id, name, date, playerCount, gameMode, groupId
   * Much faster than getAllSessions since it doesn't fetch full player data
   */
  static async getSessionSummaries(): Promise<Array<{
    id: string;
    name: string | null;
    date: Date;
    playerCount: number;
    gameMode: string;
    groupId: string | null;
  }>> {
    try {
      const supabase = createSupabaseClient();
      
      // Fetch all sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, name, date, game_mode, group_id')
        .order('created_at', { ascending: false });

      if (sessionsError) {
        throw sessionsError;
      }

      if (!sessionsData || sessionsData.length === 0) {
        return [];
      }

      // Batch fetch player counts for all sessions in a single query
      const sessionIds = sessionsData.map(s => s.id);
      const { data: allPlayersData, error: playersError } = await supabase
        .from('players')
        .select('session_id')
        .in('session_id', sessionIds);

      if (playersError) {
        throw playersError;
      }

      // Count players per session
      const playerCountsBySessionId = new Map<string, number>();
      (allPlayersData || []).forEach((player: any) => {
        const sessionId = player.session_id;
        playerCountsBySessionId.set(sessionId, (playerCountsBySessionId.get(sessionId) || 0) + 1);
      });

      // Map to summary format
      return sessionsData.map((session: any) => ({
        id: session.id,
        name: session.name,
        date: new Date(session.date),
        playerCount: playerCountsBySessionId.get(session.id) || 0,
        gameMode: session.game_mode,
        groupId: session.group_id,
      }));
    } catch (error) {
      console.error('[SessionService] Error fetching session summaries:', error);
      throw new Error('Failed to fetch session summaries');
    }
  }

  /**
   * Map database row to Session type
   */
  private static mapRowToSession(
    row: any,
    players: Player[]
  ): Session {
    return {
      id: row.id,
      name: row.name || undefined,
      date: new Date(row.date),
      players,
      organizerId: row.organizer_id,
      courtCostType: row.court_cost_type as 'per_person' | 'total',
      courtCostValue: parseFloat(String(row.court_cost_value || 0)),
      birdCostTotal: parseFloat(String(row.bird_cost_total || 0)),
      betPerPlayer: parseFloat(String(row.bet_per_player || 0)),
      gameMode: row.game_mode as 'doubles' | 'singles',
      groupId: row.group_id || undefined,
      bettingEnabled: row.betting_enabled ?? true,
    };
  }
}

