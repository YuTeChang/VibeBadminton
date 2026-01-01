import { Session, Game, Group, GroupPlayer } from '@/types';

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
   * Groups API
   */
  static async getAllGroups(): Promise<Group[]> {
    return this.fetch<Group[]>('/groups');
  }

  static async getGroup(groupId: string): Promise<Group> {
    return this.fetch<Group>(`/groups/${groupId}`);
  }

  static async getGroupByShareableLink(link: string): Promise<Group> {
    return this.fetch<Group>(`/groups/shareable/${link}`);
  }

  static async createGroup(name: string): Promise<{ success: boolean; group: Group }> {
    return this.fetch<{ success: boolean; group: Group }>('/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  static async deleteGroup(groupId: string): Promise<{ success: boolean }> {
    return this.fetch<{ success: boolean }>(`/groups/${groupId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Group Players API
   */
  static async getGroupPlayers(groupId: string): Promise<GroupPlayer[]> {
    return this.fetch<GroupPlayer[]>(`/groups/${groupId}/players`);
  }

  static async addGroupPlayer(groupId: string, name: string): Promise<{ success: boolean; player: GroupPlayer }> {
    return this.fetch<{ success: boolean; player: GroupPlayer }>(`/groups/${groupId}/players`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  static async addGroupPlayers(groupId: string, names: string[]): Promise<{ success: boolean; players: GroupPlayer[] }> {
    return this.fetch<{ success: boolean; players: GroupPlayer[] }>(`/groups/${groupId}/players`, {
      method: 'POST',
      body: JSON.stringify({ names }),
    });
  }

  static async removeGroupPlayer(groupId: string, playerId: string): Promise<{ success: boolean }> {
    return this.fetch<{ success: boolean }>(`/groups/${groupId}/players`, {
      method: 'DELETE',
      body: JSON.stringify({ playerId }),
    });
  }

  /**
   * Group Sessions API
   */
  static async getGroupSessions(groupId: string): Promise<Session[]> {
    console.log('[ApiClient.getGroupSessions] Fetching sessions for group:', groupId);
    const result = await this.fetch<Session[]>(`/groups/${groupId}/sessions`);
    console.log('[ApiClient.getGroupSessions] Received sessions:', {
      count: result.length,
      sessions: result.map(s => ({ id: s.id, name: s.name, groupId: s.groupId })),
    });
    return result;
  }

  /**
   * Sessions API
   */
  static async getAllSessions(): Promise<Session[]> {
    return this.fetch<Session[]>('/sessions');
  }

  static async getSessionSummaries(): Promise<Array<{
    id: string;
    name: string | null;
    date: Date;
    playerCount: number;
    gameMode: string;
    groupId: string | null;
  }>> {
    return this.fetch<Array<{
      id: string;
      name: string | null;
      date: Date;
      playerCount: number;
      gameMode: string;
      groupId: string | null;
    }>>('/sessions/summary');
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
 * Uses lightweight health check endpoint instead of fetching all sessions
 */
export async function isApiAvailable(): Promise<boolean> {
  try {
    // Use health check endpoint instead of getAllSessions to avoid expensive call
    const response = await fetch(`${API_BASE}/health/db`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

