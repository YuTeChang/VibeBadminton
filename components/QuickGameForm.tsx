"use client";

import { useState } from "react";
import { Player } from "@/types";
import { useSession } from "@/contexts/SessionContext";

interface QuickGameFormProps {
  players: Player[];
  onGameSaved: () => void;
}

export default function QuickGameForm({
  players,
  onGameSaved,
}: QuickGameFormProps) {
  const { addGame } = useSession();
  const [teamA, setTeamA] = useState<[string | null, string | null]>([
    null,
    null,
  ]);
  const [teamB, setTeamB] = useState<[string | null, string | null]>([
    null,
    null,
  ]);
  const [winningTeam, setWinningTeam] = useState<"A" | "B" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlayerSelect = (
    team: "A" | "B",
    position: 0 | 1,
    playerId: string
  ) => {
    if (team === "A") {
      const newTeamA: [string | null, string | null] = [...teamA];
      newTeamA[position] = newTeamA[position] === playerId ? null : playerId;
      setTeamA(newTeamA);
    } else {
      const newTeamB: [string | null, string | null] = [...teamB];
      newTeamB[position] = newTeamB[position] === playerId ? null : playerId;
      setTeamB(newTeamB);
    }
  };

  const isPlayerSelected = (playerId: string): boolean => {
    return (
      teamA.includes(playerId) ||
      teamB.includes(playerId) ||
      false
    );
  };

  const canSave =
    teamA[0] &&
    teamA[1] &&
    teamB[0] &&
    teamB[1] &&
    teamA[0] !== teamA[1] &&
    teamB[0] !== teamB[1] &&
    !teamA.includes(teamB[0] as string) &&
    !teamA.includes(teamB[1] as string) &&
    winningTeam !== null;

  const handleSave = async () => {
    if (!canSave) return;

    setIsSubmitting(true);
    try {
      addGame({
        teamA: [teamA[0]!, teamA[1]!],
        teamB: [teamB[0]!, teamB[1]!],
        winningTeam: winningTeam!,
      });

      // Reset form
      setTeamA([null, null]);
      setTeamB([null, null]);
      setWinningTeam(null);
      onGameSaved();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Team A */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Team A
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map((position) => (
            <div key={position}>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Player {position + 1}
              </div>
              <div className="flex flex-wrap gap-2">
                {players.map((player) => {
                  const isSelected = teamA[position] === player.id;
                  const isDisabled =
                    isPlayerSelected(player.id) && !isSelected;

                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() =>
                        handlePlayerSelect("A", position as 0 | 1, player.id)
                      }
                      disabled={isDisabled}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : isDisabled
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {player.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team B */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Team B
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map((position) => (
            <div key={position}>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Player {position + 1}
              </div>
              <div className="flex flex-wrap gap-2">
                {players.map((player) => {
                  const isSelected = teamB[position] === player.id;
                  const isDisabled =
                    isPlayerSelected(player.id) && !isSelected;

                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() =>
                        handlePlayerSelect("B", position as 0 | 1, player.id)
                      }
                      disabled={isDisabled}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-green-600 text-white"
                          : isDisabled
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {player.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Winner Selection */}
      {canSave && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Winner
          </h3>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setWinningTeam("A")}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                winningTeam === "A"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Team A
            </button>
            <button
              type="button"
              onClick={() => setWinningTeam("B")}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                winningTeam === "B"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Team B
            </button>
          </div>
        </div>
      )}

      {/* Save Button */}
      {canSave && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
        >
          {isSubmitting ? "Saving..." : "Save Game"}
        </button>
      )}
    </div>
  );
}

