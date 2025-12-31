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
  created_at: Date;
  updated_at: Date;
}

export interface PlayerRow {
  id: string;
  session_id: string;
  name: string;
  created_at: Date;
}

/**
 * Service layer for session database operations
 * Follows repository pattern for better separation of concerns
 */
export class SessionService {
  /**
   * Get all sessions with their players
   */
  static async getAllSessions(): Promise<Session[]> {
    try {
      const supabase = createSupabaseClient();
      
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });

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
   * Create a new session with players
   */
  static async createSession(
    session: Session,
    roundRobinCount?: number | null
  ): Promise<Session> {
    try {
      const supabase = createSupabaseClient();
      
      // Insert session
      const { error: sessionError } = await supabase
        .from('sessions')
        .insert({
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
        });

      if (sessionError) {
        throw sessionError;
      }

      // Insert players in batch
      if (session.players.length > 0) {
        const playersData = session.players.map(player => ({
          id: player.id,
          session_id: session.id,
          name: player.name,
        }));

        const { error: playersError } = await supabase
          .from('players')
          .insert(playersData);

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
        .select('id, name')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (playersError) {
        throw playersError;
      }

      return (playersData || []).map((row) => ({
        id: row.id,
        name: row.name,
      }));
    } catch (error) {
      console.error('[SessionService] Error fetching players:', error);
      return [];
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
    };
  }
}

