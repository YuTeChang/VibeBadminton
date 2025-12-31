import { Session, Game } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

/**
 * API Client for making requests to the backend
 * Provides type-safe methods for all API endpoints
 */
export class ApiClient {
  /**
   * Generic fetch wrapper with error handling
   */
  private static async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error(`[ApiClient] Error fetching ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Sessions API
   */
  static async getAllSessions(): Promise<Session[]> {
    return this.fetch<Session[]>('/sessions');
  }

  static async getSession(sessionId: string): Promise<Session> {
    return this.fetch<Session>(`/sessions/${sessionId}`);
  }

  static async createSession(
    session: Session,
    initialGames?: Omit<Game, 'id' | 'sessionId' | 'gameNumber'>[],
    roundRobinCount?: number | null
  ): Promise<{ success: boolean; session: Session }> {
    return this.fetch<{ success: boolean; session: Session }>('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        session,
        initialGames: initialGames || [],
        roundRobinCount: roundRobinCount || null,
      }),
    });
  }

  static async deleteSession(sessionId: string): Promise<{ success: boolean }> {
    return this.fetch<{ success: boolean }>(`/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Games API
   */
  static async getGames(sessionId: string): Promise<Game[]> {
    return this.fetch<Game[]>(`/sessions/${sessionId}/games`);
  }

  static async createGame(
    sessionId: string,
    game: Omit<Game, 'id' | 'sessionId' | 'gameNumber'>,
    gameNumber?: number
  ): Promise<Game> {
    return this.fetch<Game>(`/sessions/${sessionId}/games`, {
      method: 'POST',
      body: JSON.stringify({ game, gameNumber }),
    });
  }

  static async updateGame(
    sessionId: string,
    gameId: string,
    updates: Partial<Game>
  ): Promise<Game> {
    return this.fetch<Game>(`/sessions/${sessionId}/games/${gameId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  static async deleteGame(
    sessionId: string,
    gameId: string
  ): Promise<{ success: boolean }> {
    return this.fetch<{ success: boolean }>(
      `/sessions/${sessionId}/games/${gameId}`,
      {
        method: 'DELETE',
      }
    );
  }
}

/**
 * Check if API is available (database connected)
 */
export async function isApiAvailable(): Promise<boolean> {
  try {
    await ApiClient.getAllSessions();
    return true;
  } catch (error) {
    return false;
  }
}

