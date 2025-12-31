import { sql } from '@/lib/db';
import { Game } from '@/types';

export interface GameRow {
  id: string;
  session_id: string;
  game_number: number;
  team_a: string; // JSON string
  team_b: string; // JSON string
  winning_team: string | null;
  team_a_score: number | null;
  team_b_score: number | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Service layer for game database operations
 */
export class GameService {
  /**
   * Get all games for a session
   */
  static async getGamesBySessionId(sessionId: string): Promise<Game[]> {
    try {
      const result = await sql<GameRow>`
        SELECT * FROM games
        WHERE session_id = ${sessionId}
        ORDER BY game_number ASC
      `;

      return result.rows.map((row) => this.mapRowToGame(row));
    } catch (error) {
      console.error('[GameService] Error fetching games:', error);
      throw new Error('Failed to fetch games');
    }
  }

  /**
   * Create a new game
   */
  static async createGame(
    sessionId: string,
    game: Omit<Game, 'id' | 'sessionId' | 'gameNumber'>,
    gameNumber?: number
  ): Promise<Game> {
    try {
      // Get current max game number if not provided
      let nextGameNumber = gameNumber;
      if (!nextGameNumber) {
        const maxResult = await sql<{ max_number: number | null }>`
          SELECT MAX(game_number) as max_number FROM games
          WHERE session_id = ${sessionId}
        `;
        nextGameNumber = (maxResult.rows[0]?.max_number || 0) + 1;
      }

      const gameId = `${sessionId}-game-${nextGameNumber}`;

      await sql`
        INSERT INTO games (
          id, session_id, game_number, team_a, team_b,
          winning_team, team_a_score, team_b_score
        ) VALUES (
          ${gameId},
          ${sessionId},
          ${nextGameNumber},
          ${JSON.stringify(game.teamA)},
          ${JSON.stringify(game.teamB)},
          ${game.winningTeam || null},
          ${game.teamAScore || null},
          ${game.teamBScore || null}
        )
      `;

      return {
        id: gameId,
        sessionId,
        gameNumber: nextGameNumber,
        teamA: game.teamA,
        teamB: game.teamB,
        winningTeam: game.winningTeam,
        teamAScore: game.teamAScore,
        teamBScore: game.teamBScore,
      };
    } catch (error) {
      console.error('[GameService] Error creating game:', error);
      throw new Error('Failed to create game');
    }
  }

  /**
   * Create multiple games in batch
   */
  static async createGames(
    sessionId: string,
    games: Omit<Game, 'id' | 'sessionId' | 'gameNumber'>[]
  ): Promise<Game[]> {
    try {
      const createdGames: Game[] = [];

      // Insert games one by one (Vercel Postgres doesn't support batch inserts easily)
      for (let i = 0; i < games.length; i++) {
        const game = games[i];
        const gameNumber = i + 1;
        const gameId = `${sessionId}-game-${gameNumber}`;

        await sql`
          INSERT INTO games (
            id, session_id, game_number, team_a, team_b,
            winning_team, team_a_score, team_b_score
          ) VALUES (
            ${gameId},
            ${sessionId},
            ${gameNumber},
            ${JSON.stringify(game.teamA)},
            ${JSON.stringify(game.teamB)},
            ${game.winningTeam || null},
            ${game.teamAScore || null},
            ${game.teamBScore || null}
          )
        `;

        createdGames.push({
          id: gameId,
          sessionId,
          gameNumber,
          teamA: game.teamA,
          teamB: game.teamB,
          winningTeam: game.winningTeam,
          teamAScore: game.teamAScore,
          teamBScore: game.teamBScore,
        });
      }

      return createdGames;
    } catch (error) {
      console.error('[GameService] Error creating games:', error);
      throw new Error('Failed to create games');
    }
  }

  /**
   * Update a game
   */
  static async updateGame(
    sessionId: string,
    gameId: string,
    updates: Partial<Game>
  ): Promise<Game> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];

      if (updates.teamA !== undefined) {
        updateFields.push(`team_a = $${values.length + 1}`);
        values.push(JSON.stringify(updates.teamA));
      }
      if (updates.teamB !== undefined) {
        updateFields.push(`team_b = $${values.length + 1}`);
        values.push(JSON.stringify(updates.teamB));
      }
      if (updates.winningTeam !== undefined) {
        updateFields.push(`winning_team = $${values.length + 1}`);
        values.push(updates.winningTeam);
      }
      if (updates.teamAScore !== undefined) {
        updateFields.push(`team_a_score = $${values.length + 1}`);
        values.push(updates.teamAScore);
      }
      if (updates.teamBScore !== undefined) {
        updateFields.push(`team_b_score = $${values.length + 1}`);
        values.push(updates.teamBScore);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(gameId, sessionId);

      const query = `
        UPDATE games
        SET ${updateFields.join(', ')}
        WHERE id = $${values.length - 1} AND session_id = $${values.length}
        RETURNING *
      `;

      const result = await sql.query(query, values);
      const row = result.rows[0] as GameRow;

      return this.mapRowToGame(row);
    } catch (error) {
      console.error('[GameService] Error updating game:', error);
      throw new Error('Failed to update game');
    }
  }

  /**
   * Delete a game
   */
  static async deleteGame(sessionId: string, gameId: string): Promise<void> {
    try {
      await sql`
        DELETE FROM games
        WHERE id = ${gameId} AND session_id = ${sessionId}
      `;
    } catch (error) {
      console.error('[GameService] Error deleting game:', error);
      throw new Error('Failed to delete game');
    }
  }

  /**
   * Map database row to Game type
   */
  private static mapRowToGame(row: GameRow): Game {
    return {
      id: row.id,
      sessionId: row.session_id,
      gameNumber: row.game_number,
      teamA: JSON.parse(row.team_a) as [string, string] | [string],
      teamB: JSON.parse(row.team_b) as [string, string] | [string],
      winningTeam: row.winning_team as 'A' | 'B' | null,
      teamAScore: row.team_a_score || undefined,
      teamBScore: row.team_b_score || undefined,
    };
  }
}

