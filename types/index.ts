export interface Player {
  id: string;
  name: string;
}

export interface Session {
  id: string;
  name?: string;
  date: Date;
  players: Player[];
  organizerId: string;
  courtCostType: "per_person" | "total";
  courtCostValue: number;
  birdCostTotal: number;
  betPerPlayer: number;
}

export interface Game {
  id: string;
  sessionId: string;
  gameNumber: number;
  teamA: [string, string]; // player IDs
  teamB: [string, string]; // player IDs
  winningTeam: "A" | "B" | null; // null for unplayed round robin games
  teamAScore?: number;
  teamBScore?: number;
}

