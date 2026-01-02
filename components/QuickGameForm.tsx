"use client";

import { useState, useEffect } from "react";
import { Player, Game } from "@/types";
import { useSession } from "@/contexts/SessionContext";

interface QuickGameFormProps {
  players: Player[];
  onGameSaved: () => void;
  initialTeamA?: [string, string] | [string];
  initialTeamB?: [string, string] | [string];
  gameToUpdate?: Game | null;
}

export default function QuickGameForm({
  players,
  onGameSaved,
  initialTeamA,
  initialTeamB,
  gameToUpdate,
}: QuickGameFormProps) {
  const { addGame, updateGame, session } = useSession();
  const gameMode = session?.gameMode || "doubles";
  const isSingles = gameMode === "singles";
  const hasOnlyTwoPlayers = isSingles && players.length === 2;
  
  // For singles: [string | null], for doubles: [string | null, string | null]
  // Auto-assign players if singles with exactly 2 players
  const [teamA, setTeamA] = useState<[string | null, string | null] | [string | null]>(
    isSingles 
      ? (initialTeamA ? [initialTeamA[0]] : (hasOnlyTwoPlayers ? [players[0]?.id || null] : [null]))
      : (initialTeamA || [null, null])
  );
  const [teamB, setTeamB] = useState<[string | null, string | null] | [string | null]>(
    isSingles
      ? (initialTeamB ? [initialTeamB[0]] : (hasOnlyTwoPlayers ? [players[1]?.id || null] : [null]))
      : (initialTeamB || [null, null])
  );
  
  // Reset form when initial teams change
  useEffect(() => {
    if (initialTeamA && initialTeamB) {
      if (isSingles) {
        setTeamA([initialTeamA[0]]);
        setTeamB([initialTeamB[0]]);
      } else {
        setTeamA(initialTeamA);
        setTeamB(initialTeamB);
      }
    }
  }, [initialTeamA, initialTeamB, isSingles]);

  // Auto-assign players when singles mode has exactly 2 players (and not updating a game)
  useEffect(() => {
    if (hasOnlyTwoPlayers && !gameToUpdate && !initialTeamA && !initialTeamB) {
      if (players.length === 2) {
        setTeamA([players[0].id]);
        setTeamB([players[1].id]);
      }
    }
  }, [hasOnlyTwoPlayers, players, gameToUpdate, initialTeamA, initialTeamB]);
  const [winningTeam, setWinningTeam] = useState<"A" | "B" | null>(null);
  const [teamAScore, setTeamAScore] = useState<string>("");
  const [teamBScore, setTeamBScore] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlayerSelect = (
    team: "A" | "B",
    position: 0 | 1,
    playerId: string
  ) => {
    if (isSingles) {
      // Singles mode: only position 0 exists
      if (team === "A") {
        setTeamA([teamA[0] === playerId ? null : playerId]);
      } else {
        setTeamB([teamB[0] === playerId ? null : playerId]);
      }
    } else {
      // Doubles mode
    if (team === "A") {
        const newTeamA: [string | null, string | null] = [...(teamA as [string | null, string | null])];
      newTeamA[position] = newTeamA[position] === playerId ? null : playerId;
      setTeamA(newTeamA);
    } else {
        const newTeamB: [string | null, string | null] = [...(teamB as [string | null, string | null])];
      newTeamB[position] = newTeamB[position] === playerId ? null : playerId;
      setTeamB(newTeamB);
    }
    }
  };

  // Auto-select last player when 3 of 4 players are selected in doubles mode
  useEffect(() => {
    if (!isSingles && players.length === 4 && !gameToUpdate) {
      const selectedPlayers = [
        ...(teamA as [string | null, string | null]),
        ...(teamB as [string | null, string | null])
      ].filter(p => p !== null);
      
      if (selectedPlayers.length === 3) {
        // Find the unselected player
        const unselectedPlayer = players.find(p => !selectedPlayers.includes(p.id));
        if (unselectedPlayer) {
          // Determine which team and position needs the player
          const teamAArray = teamA as [string | null, string | null];
          const teamBArray = teamB as [string | null, string | null];
          
          if (!teamAArray[0] || !teamAArray[1]) {
            const pos = teamAArray[0] ? 1 : 0;
            setTeamA([...teamAArray.slice(0, pos), unselectedPlayer.id, ...teamAArray.slice(pos + 1)] as [string | null, string | null]);
          } else if (!teamBArray[0] || !teamBArray[1]) {
            const pos = teamBArray[0] ? 1 : 0;
            setTeamB([...teamBArray.slice(0, pos), unselectedPlayer.id, ...teamBArray.slice(pos + 1)] as [string | null, string | null]);
          }
        }
      }
    }
  }, [teamA, teamB, players, isSingles, gameToUpdate]);

  const isPlayerSelected = (playerId: string): boolean => {
    return (
      (Array.isArray(teamA) ? teamA.includes(playerId) : teamA[0] === playerId) ||
      (Array.isArray(teamB) ? teamB.includes(playerId) : teamB[0] === playerId) ||
      false
    );
  };

  // Teams are complete if:
  // - Singles with 2 players: always complete (auto-assigned)
  // - Singles with 3+ players: both players selected and different
  // - Doubles: all 4 players selected and no duplicates
  const teamsComplete = hasOnlyTwoPlayers || (
    isSingles
      ? teamA[0] && teamB[0] && teamA[0] !== teamB[0]
      : (teamA as [string | null, string | null])[0] &&
        (teamA as [string | null, string | null])[1] &&
        (teamB as [string | null, string | null])[0] &&
        (teamB as [string | null, string | null])[1] &&
        (teamA as [string | null, string | null])[0] !== (teamA as [string | null, string | null])[1] &&
        (teamB as [string | null, string | null])[0] !== (teamB as [string | null, string | null])[1] &&
        !(teamA as [string | null, string | null]).includes((teamB as [string | null, string | null])[0] as string) &&
        !(teamA as [string | null, string | null]).includes((teamB as [string | null, string | null])[1] as string)
  );

  const canSave = teamsComplete && winningTeam !== null;

  const handleSave = async () => {
    if (!canSave) return;

    setIsSubmitting(true);
    try {
      // If we're updating an existing game (from round robin schedule)
      if (gameToUpdate) {
        updateGame(gameToUpdate.id, {
          winningTeam: winningTeam!,
          teamAScore: teamAScore ? parseInt(teamAScore) : undefined,
          teamBScore: teamBScore ? parseInt(teamBScore) : undefined,
        });
      } else {
        // Create a new game
        if (isSingles) {
          addGame({
            teamA: [teamA[0]!],
            teamB: [teamB[0]!],
            winningTeam: winningTeam!,
            teamAScore: teamAScore ? parseInt(teamAScore) : undefined,
            teamBScore: teamBScore ? parseInt(teamBScore) : undefined,
          });
        } else {
        addGame({
            teamA: [(teamA as [string | null, string | null])[0]!, (teamA as [string | null, string | null])[1]!],
            teamB: [(teamB as [string | null, string | null])[0]!, (teamB as [string | null, string | null])[1]!],
          winningTeam: winningTeam!,
          teamAScore: teamAScore ? parseInt(teamAScore) : undefined,
          teamBScore: teamBScore ? parseInt(teamBScore) : undefined,
        });
        }
      }

      // Reset form
      if (isSingles) {
        setTeamA([null]);
        setTeamB([null]);
      } else {
      setTeamA([null, null]);
      setTeamB([null, null]);
      }
      setWinningTeam(null);
      setTeamAScore("");
      setTeamBScore("");
      onGameSaved();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUpdatingScheduledGame = !!gameToUpdate;

  // Get player names for winner selection in singles mode
  const getPlayerName = (playerId: string | null): string => {
    if (!playerId) return "";
    const player = players.find(p => p.id === playerId);
    return player?.name || "";
  };

  // Show message if no players exist
  if (players.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-japandi-background-card border-2 border-japandi-accent-primary rounded-card p-6 text-center">
          <h3 className="text-lg font-semibold text-japandi-text-primary mb-2">
            No Players Added
          </h3>
          <p className="text-sm text-japandi-text-secondary mb-4">
            You need to add players to this session before you can record games.
          </p>
          <p className="text-xs text-japandi-text-muted">
            Please add players using the &quot;Edit Session&quot; button in the Stats tab.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {isSingles ? (
        // Simplified UI for singles mode
        <>
          {hasOnlyTwoPlayers ? (
            // Skip player selection when exactly 2 players - auto-assigned
            <>
              {/* Winner Selection - Show player names instead of Team A/B */}
              <div>
                <h3 className="text-base font-semibold text-japandi-text-primary mb-4">
                  Winner
                </h3>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setWinningTeam("A")}
                    className={`flex-1 px-4 sm:px-5 py-3 sm:py-4 rounded-full font-semibold transition-all active:scale-95 touch-manipulation ${
                      winningTeam === "A"
                        ? "bg-japandi-accent-primary text-white shadow-button"
                        : "bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-primary"
                    }`}
                  >
                    {getPlayerName((teamA as [string | null])[0])}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWinningTeam("B")}
                    className={`flex-1 px-4 sm:px-5 py-3 sm:py-4 rounded-full font-semibold transition-all active:scale-95 touch-manipulation ${
                      winningTeam === "B"
                        ? "bg-japandi-accent-primary text-white shadow-button"
                        : "bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-primary"
                    }`}
                  >
                    {getPlayerName((teamB as [string | null])[0])}
                  </button>
                </div>
              </div>
            </>
          ) : (
            // Show player selection when 3+ players
            <>
              {/* Select Players */}
              <div>
                <h3 className="text-base font-semibold text-japandi-text-primary mb-4">
                  Select Players
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-japandi-text-muted mb-2">
                      Player 1
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {players.map((player) => {
                        const isSelected = (teamA as [string | null])[0] === player.id;
                        const isDisabled = isPlayerSelected(player.id) && !isSelected;

                        return (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => handlePlayerSelect("A", 0, player.id)}
                            disabled={isDisabled || isUpdatingScheduledGame}
                            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all active:scale-95 touch-manipulation ${
                              isSelected
                                ? "bg-japandi-accent-primary text-white shadow-button"
                                : isDisabled || isUpdatingScheduledGame
                                ? "bg-japandi-background-primary text-japandi-text-muted cursor-not-allowed opacity-50"
                                : "bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-primary"
                            }`}
                          >
                            {player.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-japandi-text-muted mb-2">
                      Player 2
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {players.map((player) => {
                        const isSelected = (teamB as [string | null])[0] === player.id;
                        const isDisabled = isPlayerSelected(player.id) && !isSelected;

                        return (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => handlePlayerSelect("B", 0, player.id)}
                            disabled={isDisabled || isUpdatingScheduledGame}
                            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all active:scale-95 touch-manipulation ${
                              isSelected
                                ? "bg-japandi-accent-primary text-white shadow-button"
                                : isDisabled || isUpdatingScheduledGame
                                ? "bg-japandi-background-primary text-japandi-text-muted cursor-not-allowed opacity-50"
                                : "bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-primary"
                            }`}
                          >
                            {player.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Winner Selection - Show player names instead of Team A/B */}
              {teamsComplete && (
                <div>
                  <h3 className="text-base font-semibold text-japandi-text-primary mb-4">
                    Winner
                  </h3>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setWinningTeam("A")}
                      className={`flex-1 px-4 sm:px-5 py-3 sm:py-4 rounded-full font-semibold transition-all active:scale-95 touch-manipulation ${
                        winningTeam === "A"
                          ? "bg-japandi-accent-primary text-white shadow-button"
                          : "bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-primary"
                      }`}
                    >
                      {getPlayerName((teamA as [string | null])[0])}
                    </button>
                    <button
                      type="button"
                      onClick={() => setWinningTeam("B")}
                      className={`flex-1 px-4 sm:px-5 py-3 sm:py-4 rounded-full font-semibold transition-all active:scale-95 touch-manipulation ${
                        winningTeam === "B"
                          ? "bg-japandi-accent-primary text-white shadow-button"
                          : "bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-primary"
                      }`}
                    >
                      {getPlayerName((teamB as [string | null])[0])}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        // Doubles mode - keep existing UI
        <>
          {/* Team A */}
          <div>
            <h3 className="text-base font-semibold text-japandi-text-primary mb-4">
              Team A
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[0, 1].map((position) => (
                <div key={position}>
                  <div className="text-sm text-japandi-text-muted mb-2">
                    Player {position + 1}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {players.map((player) => {
                      const isSelected = (teamA as [string | null, string | null])[position] === player.id;
                      const isDisabled = isPlayerSelected(player.id) && !isSelected;

                      return (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => handlePlayerSelect("A", position as 0 | 1, player.id)}
                          disabled={isDisabled || isUpdatingScheduledGame}
                          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all active:scale-95 touch-manipulation ${
                            isSelected
                              ? "bg-japandi-accent-primary text-white shadow-button"
                              : isDisabled || isUpdatingScheduledGame
                              ? "bg-japandi-background-primary text-japandi-text-muted cursor-not-allowed opacity-50"
                              : "bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-primary"
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
            <h3 className="text-base font-semibold text-japandi-text-primary mb-4">
              Team B
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[0, 1].map((position) => (
                <div key={position}>
                  <div className="text-sm text-japandi-text-muted mb-2">
                    Player {position + 1}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {players.map((player) => {
                      const isSelected = (teamB as [string | null, string | null])[position] === player.id;
                      const isDisabled = isPlayerSelected(player.id) && !isSelected;

                      return (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => handlePlayerSelect("B", position as 0 | 1, player.id)}
                          disabled={isDisabled || isUpdatingScheduledGame}
                          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all active:scale-95 touch-manipulation ${
                            isSelected
                              ? "bg-japandi-accent-primary text-white shadow-button"
                              : isDisabled || isUpdatingScheduledGame
                              ? "bg-japandi-background-primary text-japandi-text-muted cursor-not-allowed opacity-50"
                              : "bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-primary"
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

          {/* Winner Selection - Show when teams are complete */}
          {teamsComplete && (
            <div>
              <h3 className="text-base font-semibold text-japandi-text-primary mb-4">
                Winner
              </h3>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setWinningTeam("A")}
                  className={`flex-1 px-4 sm:px-5 py-3 sm:py-4 rounded-full font-semibold transition-all active:scale-95 touch-manipulation ${
                    winningTeam === "A"
                      ? "bg-japandi-accent-primary text-white shadow-button"
                      : "bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-primary"
                  }`}
                >
                  Team A
                </button>
                <button
                  type="button"
                  onClick={() => setWinningTeam("B")}
                  className={`flex-1 px-4 sm:px-5 py-3 sm:py-4 rounded-full font-semibold transition-all active:scale-95 touch-manipulation ${
                    winningTeam === "B"
                      ? "bg-japandi-accent-primary text-white shadow-button"
                      : "bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-primary"
                  }`}
                >
                  Team B
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Scores - Show when teams are complete */}
      {teamsComplete && (
        <div>
          <h3 className="text-base font-semibold text-japandi-text-primary mb-4">
            Scores (Optional)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-japandi-text-muted mb-2">
                {isSingles 
                  ? `${getPlayerName((teamA as [string | null])[0])} Score`
                  : "Team A Score"}
              </label>
              <input
                type="number"
                min="0"
                value={teamAScore}
                onChange={(e) => setTeamAScore(e.target.value)}
                placeholder="e.g., 21"
                className="w-full px-4 py-3 border border-japandi-border-light rounded-card bg-japandi-background-card text-japandi-text-primary text-base focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all"
                aria-label={isSingles ? `${getPlayerName((teamA as [string | null])[0])} score` : "Team A score"}
              />
            </div>
            <div>
              <label className="block text-sm text-japandi-text-muted mb-2">
                {isSingles 
                  ? `${getPlayerName((teamB as [string | null])[0])} Score`
                  : "Team B Score"}
              </label>
              <input
                type="number"
                min="0"
                value={teamBScore}
                onChange={(e) => setTeamBScore(e.target.value)}
                placeholder="e.g., 19"
                className="w-full px-4 py-3 border border-japandi-border-light rounded-card bg-japandi-background-card text-japandi-text-primary text-base focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all"
                aria-label={isSingles ? `${getPlayerName((teamB as [string | null])[0])} score` : "Team B score"}
              />
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      {canSave && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting}
          className="w-full px-6 py-4 bg-japandi-accent-primary hover:bg-japandi-accent-hover active:scale-95 disabled:bg-japandi-text-muted disabled:cursor-not-allowed disabled:active:scale-100 text-white font-semibold rounded-full transition-all shadow-button touch-manipulation"
        >
          {isSubmitting ? "Saving..." : "Save Game"}
        </button>
      )}
    </div>
  );
}

