import { Session, Game, Group, GroupPlayer, LeaderboardEntry, PlayerDetailedStats, PairingStats, PairingDetailedStats } from '@/types';

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
      // Add cache-busting for GET requests to prevent stale data after deletions
      const isGetRequest = !options?.method || options.method === 'GET';
      const cacheOptions = isGetRequest 
        ? { cache: 'no-store' as RequestCache }
        : {};
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        ...cacheOptions,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        // Create error with message but preserve full response data
        const error = new Error(errorData.error || `HTTP ${response.status}`) as Error & { existingPlayer?: unknown };
        if (errorData.existingPlayer) {
          error.existingPlayer = errorData.existingPlayer;
        }
        throw error;
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
   * Guest Players API
   */
  static async getRecentGuests(groupId: string): Promise<{
    guests: {
      name: string;
      sessionCount: number;
      lastSessionId: string;
      lastSessionName: string;
      lastSessionDate: string;
    }[];
  }> {
    return this.fetch(`/groups/${groupId}/guests`);
  }

  static async promoteGuestToGroup(groupId: string, name: string): Promise<{
    player: GroupPlayer;
    message: string;
  }> {
    return this.fetch(`/groups/${groupId}/guests`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  // Helper method for addPlayerToGroup (used in create-session)
  static async addPlayerToGroup(groupId: string, name: string): Promise<GroupPlayer> {
    const result = await this.addGroupPlayer(groupId, name);
    return result.player;
  }

  /**
   * Group Sessions API
   */
  static async getGroupSessions(groupId: string): Promise<Session[]> {
    return this.fetch<Session[]>(`/groups/${groupId}/sessions`);
  }

  /**
   * Group Stats API (Leaderboard)
   */
  static async getGroupLeaderboard(groupId: string): Promise<LeaderboardEntry[]> {
    return this.fetch<LeaderboardEntry[]>(`/groups/${groupId}/stats`);
  }

  /**
   * Group Overview Stats API
   */
  static async getGroupOverviewStats(groupId: string): Promise<{
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
    highestElo: { name: string; rating: number } | null;
    eloSpread: number | null;
    bestWinStreak: { name: string; streak: number } | null;
    mostGamesPlayed: { name: string; games: number } | null;
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
    return this.fetch(`/groups/${groupId}/overview`);
  }

  /**
   * Player Detailed Stats API
   */
  static async getPlayerDetailedStats(groupId: string, playerId: string): Promise<PlayerDetailedStats> {
    return this.fetch<PlayerDetailedStats>(`/groups/${groupId}/players/${playerId}/stats`);
  }

  /**
   * Pairing Stats API (doubles team combinations)
   */
  static async getPairingLeaderboard(groupId: string): Promise<PairingStats[]> {
    return this.fetch<PairingStats[]>(`/groups/${groupId}/pairings`);
  }

  static async getPairingDetailedStats(
    groupId: string, 
    player1Id: string, 
    player2Id: string
  ): Promise<PairingDetailedStats> {
    return this.fetch<PairingDetailedStats>(`/groups/${groupId}/pairings/${player1Id}/${player2Id}`);
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

  static async updateSession(session: Session): Promise<{ success: boolean; session: Session }> {
    return this.fetch<{ success: boolean; session: Session }>(`/sessions/${session.id}`, {
      method: 'PUT',
      body: JSON.stringify({ session }),
    });
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

