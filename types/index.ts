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
  gameMode: "doubles" | "singles"; // doubles or singles mode
}

export interface Game {
  id: string;
  sessionId: string;
  gameNumber: number;
  teamA: [string, string] | [string]; // player IDs - doubles: [string, string], singles: [string]
  teamB: [string, string] | [string]; // player IDs - doubles: [string, string], singles: [string]
  winningTeam: "A" | "B" | null; // null for unplayed round robin games
  teamAScore?: number;
  teamBScore?: number;
}

