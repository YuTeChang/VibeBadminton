import { Player, Game, Session } from "@/types";

export interface PlayerStats {
  playerId: string;
  wins: number;
  losses: number;
  gamblingNet: number;
}

export interface NonBettingStats {
  playerId: string;
  playerName: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winRate: number;
  pointsScored: number;
  pointsConceded: number;
  pointDifferential: number;
}

export interface FinalSettlement {
  playerId: string;
  playerName: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winRate: number;
  pointsScored: number;
  pointsConceded: number;
  pointDifferential: number;
  gamblingNet: number;
  evenSharePerPlayer: number;
  fairTotal: number;
  amountToPayOrganizer: number;
}

/**
 * Calculate wins, losses, and gambling net for each player
 */
export function calculatePlayerStats(
  games: Game[],
  players: Player[],
  betPerPlayer: number
): PlayerStats[] {
  const statsMap = new Map<string, PlayerStats>();

  // Initialize stats for all players
  players.forEach((player) => {
    statsMap.set(player.id, {
      playerId: player.id,
      wins: 0,
      losses: 0,
      gamblingNet: 0,
    });
  });

  // Process each game (skip unplayed games with null winningTeam)
  games.forEach((game) => {
    if (game.winningTeam === null) return; // Skip unplayed round robin games

    const winningTeam = game.winningTeam === "A" ? game.teamA : game.teamB;
    const losingTeam = game.winningTeam === "A" ? game.teamB : game.teamA;

    // Update stats for winning team
    winningTeam.forEach((playerId) => {
      const stats = statsMap.get(playerId);
      if (stats) {
        stats.wins += 1;
        stats.gamblingNet += betPerPlayer;
      }
    });

    // Update stats for losing team
    losingTeam.forEach((playerId) => {
      const stats = statsMap.get(playerId);
      if (stats) {
        stats.losses += 1;
        stats.gamblingNet -= betPerPlayer;
      }
    });
  });

  return Array.from(statsMap.values());
}

/**
 * Calculate non-betting stats (universal stats shown regardless of betting toggle)
 */
export function calculateNonBettingStats(
  games: Game[],
  players: Player[]
): NonBettingStats[] {
  const statsMap = new Map<string, NonBettingStats>();

  // Initialize stats for all players
  players.forEach((player) => {
    statsMap.set(player.id, {
      playerId: player.id,
      playerName: player.name,
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
      winRate: 0,
      pointsScored: 0,
      pointsConceded: 0,
      pointDifferential: 0,
    });
  });

  // Process each game (skip unplayed games with null winningTeam)
  games.forEach((game) => {
    if (game.winningTeam === null) return; // Skip unplayed round robin games

    const teamAScore = game.teamAScore || 0;
    const teamBScore = game.teamBScore || 0;

    // Process team A
    game.teamA.forEach((playerId) => {
      const stats = statsMap.get(playerId);
      if (stats) {
        stats.gamesPlayed += 1;
        stats.pointsScored += teamAScore;
        stats.pointsConceded += teamBScore;
        if (game.winningTeam === "A") {
          stats.wins += 1;
        } else {
          stats.losses += 1;
        }
      }
    });

    // Process team B
    game.teamB.forEach((playerId) => {
      const stats = statsMap.get(playerId);
      if (stats) {
        stats.gamesPlayed += 1;
        stats.pointsScored += teamBScore;
        stats.pointsConceded += teamAScore;
        if (game.winningTeam === "B") {
          stats.wins += 1;
        } else {
          stats.losses += 1;
        }
      }
    });
  });

  // Calculate win rate and point differential
  return Array.from(statsMap.values()).map((stats) => ({
    ...stats,
    winRate: stats.gamesPlayed > 0 ? (stats.wins / stats.gamesPlayed) * 100 : 0,
    pointDifferential: stats.pointsScored - stats.pointsConceded,
  }));
}

/**
 * Calculate total shared cost
 */
export function calculateTotalSharedCost(session: Session): number {
  let courtCostTotal: number;

  if (session.courtCostType === "per_person") {
    courtCostTotal = session.courtCostValue * session.players.length;
  } else {
    courtCostTotal = session.courtCostValue;
  }

  return courtCostTotal + session.birdCostTotal;
}

/**
 * Calculate final settlement for all players (includes both betting and non-betting stats)
 */
export function calculateFinalSettlement(
  session: Session,
  games: Game[]
): FinalSettlement[] {
  const totalSharedCost = calculateTotalSharedCost(session);
  const evenSharePerPlayer = totalSharedCost / session.players.length;
  const playerStats = calculatePlayerStats(
    games,
    session.players,
    session.bettingEnabled ? session.betPerPlayer : 0
  );
  const nonBettingStats = calculateNonBettingStats(games, session.players);

  return session.players.map((player) => {
    const stats = playerStats.find((s) => s.playerId === player.id)!;
    const nbStats = nonBettingStats.find((s) => s.playerId === player.id)!;
    const fairTotal = evenSharePerPlayer - stats.gamblingNet;
    const amountToPayOrganizer =
      player.id === session.organizerId ? 0 : fairTotal;

    return {
      playerId: player.id,
      playerName: player.name,
      wins: stats.wins,
      losses: stats.losses,
      gamesPlayed: nbStats.gamesPlayed,
      winRate: nbStats.winRate,
      pointsScored: nbStats.pointsScored,
      pointsConceded: nbStats.pointsConceded,
      pointDifferential: nbStats.pointDifferential,
      gamblingNet: stats.gamblingNet,
      evenSharePerPlayer,
      fairTotal,
      amountToPayOrganizer,
    };
  });
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Extended shareable text options
 */
export interface ShareableTextOptions {
  sessionName?: string;
  groupName?: string | null;
  groupLink?: string | null;
  games?: Game[];
  players?: Player[];
}

/**
 * Find unluckiest player/pair (most games lost by 1-2 points)
 */
function findUnluckiestFromGames(games: Game[], players: Player[]): { name: string; count: number } | null {
  const playerMap = new Map(players.map(p => [p.id, p.name]));
  const unluckyCount = new Map<string, number>(); // player ID or pair key -> count

  games.forEach(game => {
    if (!game.winningTeam || game.teamAScore === undefined || game.teamBScore === undefined) return;
    
    const margin = Math.abs(game.teamAScore - game.teamBScore);
    if (margin >= 1 && margin <= 2) {
      // This was a close game
      const losingTeam = game.winningTeam === 'A' ? game.teamB : game.teamA;
      
      if (losingTeam.length === 2) {
        // Pairs - track as pair
        const pairKey = losingTeam.sort().join('|');
        const pairName = losingTeam.map(id => playerMap.get(id) || 'Unknown').join(' & ');
        unluckyCount.set(pairKey, (unluckyCount.get(pairKey) || 0) + 1);
      } else {
        // Singles - track individual
        losingTeam.forEach(id => {
          unluckyCount.set(id, (unluckyCount.get(id) || 0) + 1);
        });
      }
    }
  });

  if (unluckyCount.size === 0) return null;

  // Find the most unlucky
  let maxKey = '';
  let maxCount = 0;
  unluckyCount.forEach((count, key) => {
    if (count > maxCount) {
      maxCount = count;
      maxKey = key;
    }
  });

  if (maxCount === 0) return null;

  // Get the name
  let name: string;
  if (maxKey.includes('|')) {
    // It's a pair
    const ids = maxKey.split('|');
    name = ids.map(id => playerMap.get(id) || 'Unknown').join(' & ');
  } else {
    name = playerMap.get(maxKey) || 'Unknown';
  }

  return { name, count: maxCount };
}

/**
 * Find most clutch player/pair (most games won by 1-2 points)
 */
function findClutchFromGames(games: Game[], players: Player[]): { name: string; count: number } | null {
  const playerMap = new Map(players.map(p => [p.id, p.name]));
  const clutchCount = new Map<string, number>();

  games.forEach(game => {
    if (!game.winningTeam || game.teamAScore === undefined || game.teamBScore === undefined) return;
    
    const margin = Math.abs(game.teamAScore - game.teamBScore);
    if (margin >= 1 && margin <= 2) {
      // This was a close game
      const winningTeam = game.winningTeam === 'A' ? game.teamA : game.teamB;
      
      if (winningTeam.length === 2) {
        // Pairs
        const pairKey = winningTeam.sort().join('|');
        clutchCount.set(pairKey, (clutchCount.get(pairKey) || 0) + 1);
      } else {
        // Singles
        winningTeam.forEach(id => {
          clutchCount.set(id, (clutchCount.get(id) || 0) + 1);
        });
      }
    }
  });

  if (clutchCount.size === 0) return null;

  let maxKey = '';
  let maxCount = 0;
  clutchCount.forEach((count, key) => {
    if (count > maxCount) {
      maxCount = count;
      maxKey = key;
    }
  });

  if (maxCount === 0) return null;

  let name: string;
  if (maxKey.includes('|')) {
    const ids = maxKey.split('|');
    name = ids.map(id => playerMap.get(id) || 'Unknown').join(' & ');
  } else {
    name = playerMap.get(maxKey) || 'Unknown';
  }

  return { name, count: maxCount };
}

/**
 * Generate shareable text snippet for final settlement
 */
export function generateShareableText(
  settlement: FinalSettlement[],
  bettingEnabled: boolean = true,
  options: ShareableTextOptions = {}
): string {
  const lines: string[] = [];
  
  // Session header
  if (options.sessionName) {
    lines.push(`📊 ${options.sessionName}`);
    if (options.groupName) {
      lines.push(`🏸 ${options.groupName}`);
    }
    lines.push('');
  }

  // Player results
  if (bettingEnabled) {
    lines.push('💰 Settlement:');
    settlement.forEach(s => {
      lines.push(`${s.playerName} → ${formatCurrency(s.amountToPayOrganizer)}`);
    });
  } else {
    lines.push('📈 Results:');
    settlement.forEach(s => {
      lines.push(`${s.playerName}: ${s.wins}W-${s.losses}L (${formatPercentage(s.winRate)})`);
    });
  }

  // Add clutch and unlucky info if games are provided
  if (options.games && options.players && options.games.length > 0) {
    const unlucky = findUnluckiestFromGames(options.games, options.players);
    const clutch = findClutchFromGames(options.games, options.players);
    
    if (unlucky || clutch) {
      lines.push('');
      if (clutch && clutch.count > 0) {
        lines.push(`🎯 Most Clutch: ${clutch.name} (${clutch.count} close win${clutch.count > 1 ? 's' : ''})`);
      }
      if (unlucky && unlucky.count > 0) {
        lines.push(`😰 Unluckiest: ${unlucky.name} (${unlucky.count} close loss${unlucky.count > 1 ? 'es' : ''})`);
      }
    }
  }

  // Add link
  if (options.groupLink) {
    lines.push('');
    lines.push(`🔗 ${options.groupLink}`);
  }

  return lines.join('\n');
}

