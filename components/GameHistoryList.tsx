"use client";

import { Game, Player } from "@/types";
import { useSession } from "@/contexts/SessionContext";

interface GameHistoryListProps {
  games: Game[];
  players: Player[];
  onEditGame?: (game: Game) => void;
}

export default function GameHistoryList({
  games,
  players,
  onEditGame,
}: GameHistoryListProps) {
  const { removeLastGame, session } = useSession();
  const gameMode = session?.gameMode || "doubles";
  const isSingles = gameMode === "singles";
  
  // Only show played games in history (filter out unplayed round robin games)
  const playedGames = games.filter(game => game.winningTeam !== null);

  const getPlayerName = (playerId: string): string => {
    return players.find((p) => p.id === playerId)?.name || "Unknown";
  };

  const formatGameResult = (game: Game): string => {
    const teamANames = isSingles 
      ? getPlayerName(game.teamA[0])
      : game.teamA.map(getPlayerName).join(" & ");
    const teamBNames = isSingles
      ? getPlayerName(game.teamB[0])
      : game.teamB.map(getPlayerName).join(" & ");
    
    if (game.winningTeam === null) {
      return `${teamANames} vs ${teamBNames}`;
    }
    
    const winnerNames =
      game.winningTeam === "A" ? teamANames : teamBNames;
    const loserNames = game.winningTeam === "A" ? teamBNames : teamANames;

    let result = `${winnerNames} def. ${loserNames}`;
    
    // Add scores if available
    if (game.teamAScore !== undefined && game.teamBScore !== undefined) {
      const winnerScore = game.winningTeam === "A" ? game.teamAScore : game.teamBScore;
      const loserScore = game.winningTeam === "A" ? game.teamBScore : game.teamAScore;
      result += ` (${winnerScore}-${loserScore})`;
    }

    return result;
  };

  const formatTimestamp = (date: Date | undefined): string => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    if (isToday) {
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {playedGames.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-semibold text-japandi-text-primary">
            Game History ({playedGames.length})
          </h3>
          <button
            onClick={removeLastGame}
            className="px-4 py-2 text-sm bg-japandi-background-card text-japandi-text-secondary hover:bg-japandi-background-primary active:scale-95 border border-japandi-border-light rounded-full transition-all touch-manipulation"
          >
            Undo Last Game
          </button>
        </div>
      )}

      {playedGames.length === 0 ? (
        <div className="text-center py-12 sm:py-16 text-japandi-text-muted">
          <p className="text-base">No games played yet.</p>
          <p className="text-sm mt-3">Switch to Record tab to log your first game!</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {[...playedGames].reverse().map((game) => (
            <div
              key={game.id}
              className="bg-japandi-background-card border border-japandi-border-light rounded-card p-4 sm:p-5 shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-base sm:text-lg font-semibold text-japandi-text-primary">
                      Game {game.gameNumber}
                    </div>
                    {game.createdAt && (
                      <span className="text-xs text-japandi-text-muted">
                        {formatTimestamp(game.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm sm:text-base text-japandi-text-secondary mt-2 break-words">
                    {formatGameResult(game)}
                  </div>
                </div>
                {onEditGame && (
                  <button
                    onClick={() => onEditGame(game)}
                    className="px-3 py-1.5 text-xs sm:text-sm bg-japandi-background-primary text-japandi-text-secondary hover:bg-japandi-background-card hover:text-japandi-text-primary active:scale-95 border border-japandi-border-light rounded-full transition-all touch-manipulation whitespace-nowrap"
                    title="Edit game"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

