import { Player } from "@/types";

export interface RoundRobinGame {
  teamA: [string, string]; // player IDs
  teamB: [string, string]; // player IDs
}

/**
 * Generate round robin game combinations for badminton doubles
 * Ensures each player plays with every other player as a teammate
 * and against every other player as evenly as possible
 */
export function generateRoundRobinGames(players: Player[]): RoundRobinGame[] {
  const playerIds = players.map((p) => p.id);
  let games: RoundRobinGame[] = [];

  if (playerIds.length < 4) {
    return games; // Need at least 4 players for doubles
  }

  if (playerIds.length === 4) {
    // For 4 players, generate all unique pairings (3 games)
    // A&B vs C&D, A&C vs B&D, A&D vs B&C
    games = [
      { teamA: [playerIds[0], playerIds[1]], teamB: [playerIds[2], playerIds[3]] },
      { teamA: [playerIds[0], playerIds[2]], teamB: [playerIds[1], playerIds[3]] },
      { teamA: [playerIds[0], playerIds[3]], teamB: [playerIds[1], playerIds[2]] }
    ];
  } else if (playerIds.length === 5) {
    // For 5 players, rotate who sits out
    // Each player sits out once, generating 3 games per rotation (15 games total)
    for (let i = 0; i < playerIds.length; i++) {
      const sittingOut = playerIds[i];
      const playing = playerIds.filter((id) => id !== sittingOut);
      
      // Generate all pairings of the 4 playing players
      games.push(
        { teamA: [playing[0], playing[1]], teamB: [playing[2], playing[3]] },
        { teamA: [playing[0], playing[2]], teamB: [playing[1], playing[3]] },
        { teamA: [playing[0], playing[3]], teamB: [playing[1], playing[2]] }
      );
    }
  } else if (playerIds.length === 6) {
    // For 6 players, generate balanced round robin
    // Strategy: Ensure each player plays with different partners
    const usedGameKeys = new Set<string>();
    const partnerCount = new Map<string, Map<string, number>>();
    
    // Initialize partner count
    playerIds.forEach((id) => {
      partnerCount.set(id, new Map());
      playerIds.forEach((otherId) => {
        if (id !== otherId) {
          partnerCount.get(id)!.set(otherId, 0);
        }
      });
    });
    
    // Generate all possible unique games
    const allPossibleGames: RoundRobinGame[] = [];
    for (let i = 0; i < playerIds.length; i++) {
      for (let j = i + 1; j < playerIds.length; j++) {
        for (let k = 0; k < playerIds.length; k++) {
          if (k === i || k === j) continue;
          for (let l = k + 1; l < playerIds.length; l++) {
            if (l === i || l === j) continue;
            const gameKey = [
              [playerIds[i], playerIds[j]].sort().join(","),
              [playerIds[k], playerIds[l]].sort().join(",")
            ].sort().join("|");
            
            if (!usedGameKeys.has(gameKey)) {
              usedGameKeys.add(gameKey);
              allPossibleGames.push({
                teamA: [playerIds[i], playerIds[j]],
                teamB: [playerIds[k], playerIds[l]],
              });
            }
          }
        }
      }
    }
    
    // Select games that maximize partner variety (limit to 15)
    const selectedGames: RoundRobinGame[] = [];
    for (const game of allPossibleGames) {
      const [p1, p2] = game.teamA;
      const [p3, p4] = game.teamB;
      
      const count1 = partnerCount.get(p1)!.get(p2)!;
      const count2 = partnerCount.get(p3)!.get(p4)!;
      
      // Prefer games where partners haven't played together much
      if (count1 < 2 && count2 < 2) {
        selectedGames.push(game);
        partnerCount.get(p1)!.set(p2, count1 + 1);
        partnerCount.get(p3)!.set(p4, count2 + 1);
        
        if (selectedGames.length >= 15) break;
      }
    }
    
    games = selectedGames.length > 0 ? selectedGames : allPossibleGames.slice(0, 15);
  }

  return games;
}

/**
 * Get a preview of round robin games (first few games)
 */
export function getRoundRobinPreview(players: Player[], maxGames: number = 5): RoundRobinGame[] {
  const allGames = generateRoundRobinGames(players);
  return allGames.slice(0, maxGames);
}

