import { sql } from '@/lib/db';
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
      const sessionsResult = await sql<SessionRow>`
        SELECT * FROM sessions
        ORDER BY created_at DESC
      `;

      const sessionsWithPlayers = await Promise.all(
        sessionsResult.rows.map(async (session) => {
          const players = await this.getPlayersBySessionId(session.id);
          return this.mapRowToSession(session, players);
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
      const result = await sql<SessionRow>`
        SELECT * FROM sessions WHERE id = ${sessionId}
      `;

      if (result.rows.length === 0) {
        return null;
      }

      const sessionRow = result.rows[0];
      const players = await this.getPlayersBySessionId(sessionId);

      return this.mapRowToSession(sessionRow, players);
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
      // Insert session
      await sql`
        INSERT INTO sessions (
          id, name, date, organizer_id, court_cost_type,
          court_cost_value, bird_cost_total, bet_per_player,
          game_mode, round_robin_count
        ) VALUES (
          ${session.id},
          ${session.name || null},
          ${session.date.toISOString()},
          ${session.organizerId},
          ${session.courtCostType},
          ${session.courtCostValue},
          ${session.birdCostTotal},
          ${session.betPerPlayer},
          ${session.gameMode},
          ${roundRobinCount || null}
        )
      `;

      // Insert players in batch
      if (session.players.length > 0) {
        // Insert players one by one (Vercel Postgres doesn't support batch inserts easily)
        for (const player of session.players) {
          await sql`
            INSERT INTO players (id, session_id, name)
            VALUES (${player.id}, ${session.id}, ${player.name})
          `;
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
      await sql`
        DELETE FROM sessions WHERE id = ${sessionId}
      `;
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
      const result = await sql<PlayerRow>`
        SELECT id, name FROM players
        WHERE session_id = ${sessionId}
        ORDER BY created_at
      `;

      return result.rows.map((row) => ({
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
    row: SessionRow,
    players: Player[]
  ): Session {
    return {
      id: row.id,
      name: row.name || undefined,
      date: new Date(row.date),
      players,
      organizerId: row.organizer_id,
      courtCostType: row.court_cost_type as 'per_person' | 'total',
      courtCostValue: parseFloat(row.court_cost_value),
      birdCostTotal: parseFloat(row.bird_cost_total),
      betPerPlayer: parseFloat(row.bet_per_player),
      gameMode: row.game_mode as 'doubles' | 'singles',
    };
  }
}

