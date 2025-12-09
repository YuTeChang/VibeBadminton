"use client";

import { Game, Player } from "@/types";
import { useSession } from "@/contexts/SessionContext";

interface GameHistoryListProps {
  games: Game[];
  players: Player[];
}

export default function GameHistoryList({
  games,
  players,
}: GameHistoryListProps) {
  const { removeLastGame } = useSession();

  const getPlayerName = (playerId: string): string => {
    return players.find((p) => p.id === playerId)?.name || "Unknown";
  };

  const formatGameResult = (game: Game): string => {
    const teamANames = game.teamA.map(getPlayerName).join(" & ");
    const teamBNames = game.teamB.map(getPlayerName).join(" & ");
    const winnerNames =
      game.winningTeam === "A" ? teamANames : teamBNames;
    const loserNames = game.winningTeam === "A" ? teamBNames : teamANames;

    return `${winnerNames} def. ${loserNames}`;
  };

  return (
    <div className="space-y-4">
      {games.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Game History ({games.length})
          </h3>
          <button
            onClick={removeLastGame}
            className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors"
          >
            Undo Last Game
          </button>
        </div>
      )}

      {games.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>No games logged yet.</p>
          <p className="text-sm mt-2">Switch to Record tab to log your first game!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...games].reverse().map((game) => (
            <div
              key={game.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Game {game.gameNumber}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {formatGameResult(game)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

