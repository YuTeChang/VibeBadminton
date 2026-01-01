import { createSupabaseClient } from '@/lib/supabase';
import { PairingStatsService } from './pairingStatsService';

/**
 * ELO Rating Service
 * 
 * Implements the ELO rating system for badminton players.
 * - Starting rating: 1500
 * - K-factor: 32 (standard for casual play)
 * - For doubles: team rating = average of both players' ELO
 * - Both teammates receive the same rating change
 */
export class EloService {
  private static readonly DEFAULT_ELO = 1500;
  private static readonly K_FACTOR = 32;

  /**
   * Calculate expected score (probability of winning)
   * E = 1 / (1 + 10^((opponentRating - playerRating) / 400))
   */
  static calculateExpectedScore(playerRating: number, opponentRating: number): number {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  }

  /**
   * Calculate new ELO rating after a game
   * newRating = oldRating + K * (actualScore - expectedScore)
   * actualScore: 1 for win, 0 for loss
   */
  static calculateNewRating(
    currentRating: number,
    opponentRating: number,
    won: boolean
  ): number {
    const expectedScore = this.calculateExpectedScore(currentRating, opponentRating);
    const actualScore = won ? 1 : 0;
    const newRating = Math.round(currentRating + this.K_FACTOR * (actualScore - expectedScore));
    // Ensure rating doesn't go below 100
    return Math.max(100, newRating);
  }

  /**
   * Calculate team rating (average for doubles)
   */
  static calculateTeamRating(ratings: number[]): number {
    if (ratings.length === 0) return this.DEFAULT_ELO;
    return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  }

  /**
   * Get current ELO ratings for group players by their IDs
   */
  static async getPlayerRatings(groupPlayerIds: string[]): Promise<Map<string, number>> {
    const supabase = createSupabaseClient();
    const ratings = new Map<string, number>();

    if (groupPlayerIds.length === 0) {
      return ratings;
    }

    const { data, error } = await supabase
      .from('group_players')
      .select('id, elo_rating')
      .in('id', groupPlayerIds);

    if (error) {
      console.error('[EloService] Error fetching ratings:', error);
      throw new Error('Failed to fetch player ratings');
    }

    (data || []).forEach((player) => {
      ratings.set(player.id, player.elo_rating || this.DEFAULT_ELO);
    });

    // Set default rating for any missing players
    groupPlayerIds.forEach((id) => {
      if (!ratings.has(id)) {
        ratings.set(id, this.DEFAULT_ELO);
      }
    });

    return ratings;
  }

  /**
   * Update ELO ratings for a single player
   */
  static async updatePlayerRating(groupPlayerId: string, newRating: number): Promise<void> {
    const supabase = createSupabaseClient();

    const { error } = await supabase
      .from('group_players')
      .update({ elo_rating: newRating })
      .eq('id', groupPlayerId);

    if (error) {
      console.error('[EloService] Error updating rating:', error);
      throw new Error('Failed to update player rating');
    }
  }

  /**
   * Update ELO ratings for multiple players
   */
  static async updatePlayerRatings(updates: { groupPlayerId: string; newRating: number }[]): Promise<void> {
    const supabase = createSupabaseClient();

    // Batch update using upsert with conflict handling
    for (const update of updates) {
      const { error } = await supabase
        .from('group_players')
        .update({ elo_rating: update.newRating })
        .eq('id', update.groupPlayerId);

      if (error) {
        console.error('[EloService] Error updating rating for', update.groupPlayerId, error);
        // Continue with other updates even if one fails
      }
    }
  }

  /**
   * Process ELO changes after a game
   * Also updates win/loss stats for each player
   * 
   * @param teamAGroupPlayerIds - Group player IDs for team A
   * @param teamBGroupPlayerIds - Group player IDs for team B
   * @param winningTeam - 'A' or 'B'
   * @returns Object with old and new ratings for each player
   */
  static async processGameResult(
    teamAGroupPlayerIds: string[],
    teamBGroupPlayerIds: string[],
    winningTeam: 'A' | 'B'
  ): Promise<{
    updates: { groupPlayerId: string; oldRating: number; newRating: number; change: number }[];
  }> {
    // Filter out null/undefined IDs
    const validTeamA = teamAGroupPlayerIds.filter(id => id != null);
    const validTeamB = teamBGroupPlayerIds.filter(id => id != null);

    // If no valid group player IDs, no ELO to update
    if (validTeamA.length === 0 && validTeamB.length === 0) {
      return { updates: [] };
    }

    // Get current ratings
    const allIds = [...validTeamA, ...validTeamB];
    const currentRatings = await this.getPlayerRatings(allIds);

    // Calculate team ratings
    const teamARatings = validTeamA.map(id => currentRatings.get(id) || this.DEFAULT_ELO);
    const teamBRatings = validTeamB.map(id => currentRatings.get(id) || this.DEFAULT_ELO);
    
    const teamARating = this.calculateTeamRating(teamARatings);
    const teamBRating = this.calculateTeamRating(teamBRatings);

    const updates: { groupPlayerId: string; oldRating: number; newRating: number; change: number }[] = [];

    // Calculate new ratings for team A
    for (const playerId of validTeamA) {
      const oldRating = currentRatings.get(playerId) || this.DEFAULT_ELO;
      const won = winningTeam === 'A';
      const newRating = this.calculateNewRating(teamARating, teamBRating, won);
      // Adjust for individual - add the change to their personal rating
      const ratingChange = newRating - teamARating;
      const personalNewRating = Math.max(100, oldRating + ratingChange);
      
      updates.push({
        groupPlayerId: playerId,
        oldRating,
        newRating: personalNewRating,
        change: personalNewRating - oldRating,
      });
    }

    // Calculate new ratings for team B
    for (const playerId of validTeamB) {
      const oldRating = currentRatings.get(playerId) || this.DEFAULT_ELO;
      const won = winningTeam === 'B';
      const newRating = this.calculateNewRating(teamBRating, teamARating, won);
      // Adjust for individual - add the change to their personal rating
      const ratingChange = newRating - teamBRating;
      const personalNewRating = Math.max(100, oldRating + ratingChange);
      
      updates.push({
        groupPlayerId: playerId,
        oldRating,
        newRating: personalNewRating,
        change: personalNewRating - oldRating,
      });
    }

    // Apply the ELO updates and win/loss stats
    await this.updatePlayerRatingsAndStats(updates.map(u => ({
      groupPlayerId: u.groupPlayerId,
      newRating: u.newRating,
      won: u.change > 0 || (u.change === 0 && validTeamA.includes(u.groupPlayerId) ? winningTeam === 'A' : winningTeam === 'B'),
    })), winningTeam, validTeamA, validTeamB);

    return { updates };
  }

  /**
   * Update ELO ratings AND win/loss stats for multiple players
   */
  static async updatePlayerRatingsAndStats(
    updates: { groupPlayerId: string; newRating: number; won: boolean }[],
    winningTeam: 'A' | 'B',
    teamAIds: string[],
    teamBIds: string[]
  ): Promise<void> {
    const supabase = createSupabaseClient();

    for (const update of updates) {
      const isTeamA = teamAIds.includes(update.groupPlayerId);
      const won = isTeamA ? winningTeam === 'A' : winningTeam === 'B';

      try {
        // Get current stats - handle case where record doesn't exist or columns are null
        const { data: player, error: fetchError } = await supabase
          .from('group_players')
          .select('wins, losses, total_games')
          .eq('id', update.groupPlayerId)
          .single();

        if (fetchError) {
          console.error('[EloService] Error fetching player stats for', update.groupPlayerId, fetchError);
          // Try to update ELO only if we can't get current stats
          await supabase
            .from('group_players')
            .update({ elo_rating: update.newRating })
            .eq('id', update.groupPlayerId);
          continue;
        }

        // Ensure we have valid numbers (handle null/undefined from DB)
        const currentWins = typeof player?.wins === 'number' ? player.wins : 0;
        const currentLosses = typeof player?.losses === 'number' ? player.losses : 0;

        const newWins = won ? currentWins + 1 : currentWins;
        const newLosses = won ? currentLosses : currentLosses + 1;
        const newTotalGames = newWins + newLosses;

        console.log(`[EloService] Updating stats for ${update.groupPlayerId}: ELO=${update.newRating}, wins=${currentWins}->${newWins}, losses=${currentLosses}->${newLosses}, won=${won}`);

        const { error: updateError } = await supabase
          .from('group_players')
          .update({ 
            elo_rating: update.newRating,
            wins: newWins,
            losses: newLosses,
            total_games: newTotalGames,
          })
          .eq('id', update.groupPlayerId);

        if (updateError) {
          console.error('[EloService] Error updating rating/stats for', update.groupPlayerId, updateError);
        }
      } catch (err) {
        console.error('[EloService] Exception updating stats for', update.groupPlayerId, err);
      }
    }
  }

  /**
   * Reverse ELO and stats changes when a game is deleted or result changes
   */
  static async reverseGameResult(
    teamAGroupPlayerIds: string[],
    teamBGroupPlayerIds: string[],
    wasWinningTeam: 'A' | 'B'
  ): Promise<void> {
    const supabase = createSupabaseClient();

    // Filter out null/undefined IDs
    const validTeamA = teamAGroupPlayerIds.filter(id => id != null);
    const validTeamB = teamBGroupPlayerIds.filter(id => id != null);

    // Reverse stats for team A
    for (const playerId of validTeamA) {
      const { data: player } = await supabase
        .from('group_players')
        .select('wins, losses, total_games')
        .eq('id', playerId)
        .single();

      if (player) {
        const wasWin = wasWinningTeam === 'A';
        await supabase
          .from('group_players')
          .update({
            wins: wasWin ? Math.max(0, (player.wins || 0) - 1) : player.wins || 0,
            losses: wasWin ? player.losses || 0 : Math.max(0, (player.losses || 0) - 1),
            total_games: Math.max(0, (player.total_games || 0) - 1),
          })
          .eq('id', playerId);
      }
    }

    // Reverse stats for team B
    for (const playerId of validTeamB) {
      const { data: player } = await supabase
        .from('group_players')
        .select('wins, losses, total_games')
        .eq('id', playerId)
        .single();

      if (player) {
        const wasWin = wasWinningTeam === 'B';
        await supabase
          .from('group_players')
          .update({
            wins: wasWin ? Math.max(0, (player.wins || 0) - 1) : player.wins || 0,
            losses: wasWin ? player.losses || 0 : Math.max(0, (player.losses || 0) - 1),
            total_games: Math.max(0, (player.total_games || 0) - 1),
          })
          .eq('id', playerId);
      }
    }
  }

  /**
   * Recalculate all ELO ratings and stats for a group from game history
   * Useful for fixing data or retroactive calculations
   * Returns summary of what was recalculated
   */
  static async recalculateGroupElo(groupId: string): Promise<{
    playersReset: number;
    gamesProcessed: number;
    playersUpdated: string[];
  }> {
    const supabase = createSupabaseClient();
    const result = { playersReset: 0, gamesProcessed: 0, playersUpdated: [] as string[] };

    console.log(`[EloService] Starting recalculation for group ${groupId}`);

    // Reset all players to default ELO and zero stats
    const { data: resetPlayers, error: resetError } = await supabase
      .from('group_players')
      .update({ 
        elo_rating: this.DEFAULT_ELO,
        wins: 0,
        losses: 0,
        total_games: 0,
      })
      .eq('group_id', groupId)
      .select('id, name');

    if (resetError) {
      console.error('[EloService] Error resetting players:', resetError);
      throw new Error('Failed to reset players');
    }

    result.playersReset = resetPlayers?.length || 0;
    console.log(`[EloService] Reset ${result.playersReset} players to default stats`);

    // Get all sessions in the group ordered by date
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id')
      .eq('group_id', groupId)
      .order('date', { ascending: true });

    if (sessionsError || !sessions) {
      throw new Error('Failed to fetch sessions');
    }

    // Get all games from these sessions, ordered by creation time
    const sessionIds = sessions.map(s => s.id);
    if (sessionIds.length === 0) {
      console.log('[EloService] No sessions found, recalculation complete');
      return result;
    }

    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('*')
      .in('session_id', sessionIds)
      .not('winning_team', 'is', null)
      .order('created_at', { ascending: true });

    if (gamesError || !games) {
      throw new Error('Failed to fetch games');
    }

    console.log(`[EloService] Found ${games.length} completed games to process`);

    // Get all group players for auto-linking by name
    const { data: groupPlayersData } = await supabase
      .from('group_players')
      .select('id, name')
      .eq('group_id', groupId);

    const groupPlayersByName = new Map<string, string>();
    const groupPlayerNames = new Map<string, string>();
    (groupPlayersData || []).forEach(gp => {
      groupPlayersByName.set(gp.name.toLowerCase().trim(), gp.id);
      groupPlayerNames.set(gp.id, gp.name);
    });

    // Get player mappings (session player ID -> group player ID)
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, group_player_id, name')
      .in('session_id', sessionIds);

    if (playersError) {
      throw new Error('Failed to fetch players');
    }

    const playerToGroupPlayer = new Map<string, string>();
    const playersToUpdate: { id: string; groupPlayerId: string }[] = [];
    
    (players || []).forEach(p => {
      if (p.group_player_id) {
        playerToGroupPlayer.set(p.id, p.group_player_id);
      } else {
        // Try to auto-link by name match
        const matchedGroupPlayerId = groupPlayersByName.get(p.name.toLowerCase().trim());
        if (matchedGroupPlayerId) {
          playerToGroupPlayer.set(p.id, matchedGroupPlayerId);
          playersToUpdate.push({ id: p.id, groupPlayerId: matchedGroupPlayerId });
        }
      }
    });

    // Update players with missing group_player_id links
    if (playersToUpdate.length > 0) {
      console.log(`[EloService] Auto-linking ${playersToUpdate.length} session players to group players`);
      for (const update of playersToUpdate) {
        await supabase
          .from('players')
          .update({ group_player_id: update.groupPlayerId })
          .eq('id', update.id);
      }
    }

    console.log(`[EloService] Found ${playerToGroupPlayer.size} linked session players (${playersToUpdate.length} auto-linked)`);

    // Track which group players get updated
    const updatedGroupPlayers = new Set<string>();

    // Process each game in order
    for (const game of games) {
      const teamA = this.parseJsonArray(game.team_a);
      const teamB = this.parseJsonArray(game.team_b);
      
      const teamAGroupIds = teamA.map(id => playerToGroupPlayer.get(id)).filter(Boolean) as string[];
      const teamBGroupIds = teamB.map(id => playerToGroupPlayer.get(id)).filter(Boolean) as string[];

      if (teamAGroupIds.length > 0 || teamBGroupIds.length > 0) {
        await this.processGameResult(teamAGroupIds, teamBGroupIds, game.winning_team as 'A' | 'B');
        result.gamesProcessed++;
        teamAGroupIds.forEach(id => updatedGroupPlayers.add(id));
        teamBGroupIds.forEach(id => updatedGroupPlayers.add(id));
      }
    }

    result.playersUpdated = Array.from(updatedGroupPlayers).map(id => groupPlayerNames.get(id) || id);
    console.log(`[EloService] Recalculation complete: ${result.gamesProcessed} games, ${result.playersUpdated.length} players updated`);

    return result;
  }

  /**
   * Parse JSON array from database (handles both string and array formats)
   */
  private static parseJsonArray(value: unknown): string[] {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value as string[];
  }
}

