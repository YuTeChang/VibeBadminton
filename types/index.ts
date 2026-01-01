export interface Group {
  id: string;
  name: string;
  shareableLink: string;
  createdAt?: Date;
}

export interface GroupPlayer {
  id: string;
  groupId: string;
  name: string;
  createdAt?: Date;
}

export interface Player {
  id: string;
  name: string;
  groupPlayerId?: string; // Links to group player pool
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
  gameMode: "doubles" | "singles";
  groupId?: string; // Optional - null for standalone sessions
  bettingEnabled: boolean; // Per-session toggle
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
  createdAt?: Date; // When the game was recorded
  updatedAt?: Date; // When the game was last updated
}

