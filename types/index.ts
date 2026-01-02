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
  eloRating?: number; // ELO rating, defaults to 1500
  wins?: number; // Total wins across all sessions
  losses?: number; // Total losses across all sessions
  totalGames?: number; // Total games played (wins + losses)
  createdAt?: Date;
}

export interface Player {
  id: string;
  name: string;
  groupPlayerId?: string; // Links to group player pool
  isGuest?: boolean; // True if explicitly added as guest (one-time player)
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

// Leaderboard entry for group stats
export interface LeaderboardEntry {
  groupPlayerId: string;
  playerName: string;
  eloRating: number;
  rank: number;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  recentForm: ('W' | 'L')[]; // Last 5 games
  trend: 'up' | 'down' | 'stable'; // ELO trend direction
}

// Partner statistics
export interface PartnerStats {
  partnerId: string;
  partnerName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  games?: RecentGame[]; // Game history with this partner
}

// Opponent statistics
export interface OpponentStats {
  opponentId: string;
  opponentName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  games?: RecentGame[]; // Game history against this opponent
}

// Recent game result for display
export interface RecentGame {
  teamANames: string[];
  teamBNames: string[];
  teamAScore?: number;
  teamBScore?: number;
  won: boolean;
  date?: Date;
  pointDifferential?: number; // Winner score - loser score
}

// Unlucky game (lost by 1-2 points)
export interface UnluckyGame extends RecentGame {
  margin: number; // 1 or 2
}

// Extended Group Overview Statistics
export interface GroupOverviewStats {
  // Basic counts
  totalGames: number;
  totalSessions: number;
  totalPlayers: number;
  
  // Competitiveness
  avgPointDifferential: number | null; // Average (winner score - loser score)
  gamesPerSession: number;
  
  // Closest Rivalry (existing)
  closestMatchup: {
    team1Player1Name: string;
    team1Player2Name: string;
    team2Player1Name: string;
    team2Player2Name: string;
    team1Wins: number;
    team2Wins: number;
    totalGames: number;
  } | null;
  
  // Records
  highestElo: { name: string; rating: number } | null;
  eloSpread: number | null; // Max - Min ELO
  bestWinStreak: { name: string; streak: number } | null;
  mostGamesPlayed: { name: string; games: number } | null;
  
  // Dream Team - Best pairing
  dreamTeam: { 
    player1Name: string; 
    player2Name: string; 
    winRate: number; 
    gamesPlayed: number;
  } | null;
  
  // Unlucky stats - most games lost by 1-2 points
  unluckyPlayer: { name: string; count: number } | null;
  unluckyPairing: { player1Name: string; player2Name: string; count: number } | null;
  
  // History
  firstSessionDate: Date | null;
  daysSinceFirstSession: number | null;
}

// Detailed player statistics for player profile
export interface PlayerDetailedStats {
  groupPlayerId: string;
  playerName: string;
  eloRating: number;
  rank: number;
  totalPlayers: number;
  
  // Core stats
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  pointsScored: number;
  pointsConceded: number;
  pointDifferential: number;
  
  // Sessions
  sessionsPlayed: number;
  
  // Form & streaks
  recentForm: ('W' | 'L')[]; // Last 5-10 games
  currentStreak: number; // Positive = wins, negative = losses
  bestWinStreak: number; // Best win streak ever
  
  // Partner synergy (doubles only)
  partnerStats: PartnerStats[];
  
  // Opponent matchups
  opponentStats: OpponentStats[];
  
  // Recent games with details
  recentGames?: RecentGame[];
  
  // Unlucky games - games lost by 1-2 points
  unluckyGames?: UnluckyGame[];
  unluckyCount?: number;
}

// ============================================================================
// Pairing Stats Types (for doubles team combinations)
// ============================================================================

// Stats for a specific pair of players (team of 2)
export interface PairingStats {
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  eloRating?: number; // Pairing-specific ELO (treats pair as one unit)
  currentStreak?: number; // Positive = wins, negative = losses
  bestWinStreak?: number;
  pointsFor?: number;
  pointsAgainst?: number;
  pointDifferential?: number;
  isQualified?: boolean; // Has enough games (5+) to be considered for rankings
}

// Head-to-head stats between two pairings
export interface PairingMatchup {
  // Your pairing
  pairingPlayer1Id: string;
  pairingPlayer1Name: string;
  pairingPlayer2Id: string;
  pairingPlayer2Name: string;
  // Opponent pairing
  opponentPlayer1Id: string;
  opponentPlayer1Name: string;
  opponentPlayer2Id: string;
  opponentPlayer2Name: string;
  // Stats (from your pairing's perspective)
  wins: number;
  losses: number;
  gamesPlayed: number;
  winRate: number;
  // Points stats
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  // Game history for this matchup
  games: RecentGame[];
}

// Detailed stats for a specific pairing (when clicking on a pair)
export interface PairingDetailedStats {
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  // Core stats
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  // ELO rating for this pairing
  eloRating: number;
  // Point differential
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  // Streaks
  currentStreak: number;
  bestWinStreak: number;
  // Recent form
  recentForm: ('W' | 'L')[];
  // Recent games with details
  recentGames?: RecentGame[];
  // Head-to-head against other pairings
  matchups: PairingMatchup[];
  // Unlucky games - games lost by 1-2 points
  unluckyGames?: UnluckyGame[];
  unluckyCount?: number;
}
