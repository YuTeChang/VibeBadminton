import { Player, Game, Session } from "@/types";

export interface PlayerStats {
  playerId: string;
  wins: number;
  losses: number;
  gamblingNet: number;
}

export interface FinalSettlement {
  playerId: string;
  playerName: string;
  wins: number;
  losses: number;
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

  // Process each game
  games.forEach((game) => {
    const winningTeam = game.winningTeam === "A" ? game.teamA : game.teamB;
    const losingTeam = game.winningTeam === "A" ? game.teamB : game.teamA;

    // Update stats for winning team
    winningTeam.forEach((playerId) => {
      const stats = statsMap.get(playerId)!;
      stats.wins += 1;
      stats.gamblingNet += betPerPlayer;
    });

    // Update stats for losing team
    losingTeam.forEach((playerId) => {
      const stats = statsMap.get(playerId)!;
      stats.losses += 1;
      stats.gamblingNet -= betPerPlayer;
    });
  });

  return Array.from(statsMap.values());
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
 * Calculate final settlement for all players
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
    session.betPerPlayer
  );

  return session.players.map((player) => {
    const stats = playerStats.find((s) => s.playerId === player.id)!;
    const fairTotal = evenSharePerPlayer - stats.gamblingNet;
    const amountToPayOrganizer =
      player.id === session.organizerId ? 0 : fairTotal;

    return {
      playerId: player.id,
      playerName: player.name,
      wins: stats.wins,
      losses: stats.losses,
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
 * Generate shareable text snippet for final settlement
 */
export function generateShareableText(
  settlement: FinalSettlement[]
): string {
  return settlement
    .map((s) => `${s.playerName} → ${formatCurrency(s.amountToPayOrganizer)}`)
    .join("\n");
}

