"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { Session, Player, Game } from "@/types";
import Link from "next/link";
import { generateRoundRobinGames } from "@/lib/roundRobin";

export default function CreateSession() {
  const router = useRouter();
  const { setSession } = useSession();
  const [sessionName, setSessionName] = useState("");
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [gameMode, setGameMode] = useState<"doubles" | "singles">("doubles");
  const [players, setPlayers] = useState<Player[]>([
    { id: "player-1", name: "" },
    { id: "player-2", name: "" },
    { id: "player-3", name: "" },
    { id: "player-4", name: "" },
  ]);
  const [organizerId, setOrganizerId] = useState<string>("");
  const [courtCostType, setCourtCostType] = useState<"per_person" | "total">(
    "per_person"
  );
  // Default values (all set to 0)
  const DEFAULT_COURT_COST_PER_PERSON = 0;
  const DEFAULT_COURT_COST_TOTAL = 0;
  const DEFAULT_BIRD_COST = 0;
  const DEFAULT_BET_PER_PLAYER = 0;

  const [courtCostValue, setCourtCostValue] = useState("");
  const [birdCostTotal, setBirdCostTotal] = useState("");
  const [betPerPlayer, setBetPerPlayer] = useState("");
  const [enableRoundRobin, setEnableRoundRobin] = useState(false);
  const [roundRobinGameCount, setRoundRobinGameCount] = useState("");

  const addPlayer = () => {
    if (players.length < 6) {
      setPlayers([
        ...players,
        { id: `player-${Date.now()}`, name: "" },
      ]);
    }
  };

  const removePlayer = (index: number) => {
    const minRequired = gameMode === "singles" ? 2 : 4;
    if (players.length > minRequired) {
      setPlayers(players.filter((_, i) => i !== index));
      if (organizerId === players[index].id) {
        setOrganizerId("");
      }
    }
  };

  const updatePlayerName = (index: number, name: string) => {
    const updated = [...players];
    updated[index].name = name;
    setPlayers(updated);
  };

  const validPlayerCount = players.filter((p) => p.name.trim() !== "").length;
  const minPlayersRequired = gameMode === "singles" ? 2 : 4;
  const hasValidOrganizer = organizerId !== "";
  const isValidCourtCost = courtCostValue === "" || (!isNaN(parseFloat(courtCostValue)) && parseFloat(courtCostValue) >= 0);
  const isValidBirdCost = birdCostTotal === "" || (!isNaN(parseFloat(birdCostTotal)) && parseFloat(birdCostTotal) >= 0);
  const isValidBet = betPerPlayer === "" || (!isNaN(parseFloat(betPerPlayer)) && parseFloat(betPerPlayer) >= 0);
  const isValidRoundRobinCount = !enableRoundRobin || 
    (roundRobinGameCount === "" || (!isNaN(parseInt(roundRobinGameCount)) && parseInt(roundRobinGameCount) > 0));

  const canSubmit =
    validPlayerCount >= minPlayersRequired &&
    hasValidOrganizer &&
    isValidCourtCost &&
    isValidBirdCost &&
    isValidBet &&
    isValidRoundRobinCount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    // Assign default names to players without names, and include all players up to the number of valid players
    // We need at least minPlayersRequired players with names (or we'll use defaults)
    const minRequired = gameMode === "singles" ? 2 : 4;
    const playersWithDefaults = players.map((p, index) => ({
      ...p,
      name: p.name.trim() || `Player ${index + 1}`,
    }));
    
    // Take the first minRequired players (or all if more are provided)
    const allPlayers = playersWithDefaults.slice(0, Math.max(minRequired, validPlayerCount));
    
    // Use default values if fields are empty
    const finalCourtCostValue = courtCostValue === "" 
      ? (courtCostType === "per_person" ? DEFAULT_COURT_COST_PER_PERSON : DEFAULT_COURT_COST_TOTAL)
      : parseFloat(courtCostValue) || 0;
    const finalBirdCostTotal = birdCostTotal === "" 
      ? DEFAULT_BIRD_COST 
      : parseFloat(birdCostTotal) || 0;
    const finalBetPerPlayer = betPerPlayer === "" 
      ? DEFAULT_BET_PER_PLAYER 
      : parseFloat(betPerPlayer) || 0;
    
    // Default session name to formatted date if not provided
    const formattedDate = new Date(sessionDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const finalSessionName = sessionName.trim() || formattedDate;

    const session: Session = {
      id: `session-${Date.now()}`,
      name: finalSessionName,
      date: new Date(sessionDate),
      players: allPlayers,
      organizerId,
      courtCostType,
      courtCostValue: finalCourtCostValue,
      birdCostTotal: finalBirdCostTotal,
      betPerPlayer: finalBetPerPlayer,
      gameMode,
    };

    // If round robin is enabled, generate games first
    let roundRobinGamesToAdd: Omit<Game, "id" | "sessionId" | "gameNumber">[] = [];
    if (enableRoundRobin) {
      const maxGames = roundRobinGameCount === "" 
        ? undefined 
        : (isNaN(parseInt(roundRobinGameCount)) ? undefined : parseInt(roundRobinGameCount));
      const roundRobinGames = generateRoundRobinGames(allPlayers, maxGames, gameMode);
      if (roundRobinGames.length > 0) {
        roundRobinGamesToAdd = roundRobinGames.map((game) => ({
          teamA: game.teamA,
          teamB: game.teamB,
          winningTeam: null as "A" | "B" | null, // Unplayed games
        }));
      }
    }

    // Set session with initial games if round robin is enabled
    setSession(session, roundRobinGamesToAdd.length > 0 ? roundRobinGamesToAdd : undefined);

    router.push(`/session/${session.id}`);
  };

  return (
    <div className="min-h-screen bg-japandi-background-primary py-4 sm:py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <Link
            href="/"
            className="text-japandi-accent-primary hover:text-japandi-accent-hover text-sm transition-colors"
          >
            ← Back to Home
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-japandi-text-primary mt-4 sm:mt-6">
            Create New Session
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Session Name */}
          <div>
            <label className="block text-base font-medium text-japandi-text-primary mb-3">
              Session Name (Optional)
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g., Friday Night Session"
              className="w-full px-4 py-3 border border-japandi-border-light rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all"
              aria-label="Session name (optional)"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-base font-medium text-japandi-text-primary mb-3">
              Date
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-4 py-3 border border-japandi-border-light rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all"
              aria-label="Session date"
            />
          </div>

          {/* Game Mode Toggle */}
          <div>
            <label className="block text-base font-medium text-japandi-text-primary mb-3">
              Game Mode
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setGameMode("doubles");
                  // Ensure we have at least 4 players for doubles
                  if (players.length < 4) {
                    setPlayers([
                      { id: "player-1", name: "" },
                      { id: "player-2", name: "" },
                      { id: "player-3", name: "" },
                      { id: "player-4", name: "" },
                    ]);
                  }
                }}
                className={`flex-1 px-4 py-3 rounded-full font-medium transition-all active:scale-95 touch-manipulation ${
                  gameMode === "doubles"
                    ? "bg-japandi-accent-primary text-white shadow-button"
                    : "bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-primary"
                }`}
              >
                Doubles
              </button>
              <button
                type="button"
                onClick={() => {
                  setGameMode("singles");
                  // For singles, we only need 2 players minimum
                  if (players.length > 4) {
                    setPlayers(players.slice(0, 4));
                  }
                }}
                className={`flex-1 px-4 py-3 rounded-full font-medium transition-all active:scale-95 touch-manipulation ${
                  gameMode === "singles"
                    ? "bg-japandi-accent-primary text-white shadow-button"
                    : "bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-primary"
                }`}
              >
                Singles
              </button>
            </div>
          </div>

          {/* Players */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-base font-medium text-japandi-text-primary">
                Players ({gameMode === "singles" ? "2-6" : "4-6"} players)
              </label>
              {players.length < 6 && (
                <button
                  type="button"
                  onClick={addPlayer}
                  className="text-sm text-japandi-accent-primary hover:text-japandi-accent-hover active:scale-95 transition-all touch-manipulation"
                >
                  + Add Player
                </button>
              )}
            </div>
            <div className="space-y-3">
              {players.map((player, index) => (
                <div key={player.id} className="flex gap-3">
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => updatePlayerName(index, e.target.value)}
                    placeholder={`Player ${index + 1} name (default: Player ${index + 1})`}
                    className="flex-1 px-4 py-3 border border-japandi-border-light rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all"
                  />
                  {players.length > (gameMode === "singles" ? 2 : 4) && (
                    <button
                      type="button"
                      onClick={() => removePlayer(index)}
                      className="px-4 py-3 text-japandi-text-secondary hover:bg-japandi-background-card active:scale-95 rounded-card transition-all touch-manipulation"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {validPlayerCount < minPlayersRequired && (
              <p className="mt-2 text-sm text-red-600">
                At least {minPlayersRequired} players are required for {gameMode} mode
              </p>
            )}
          </div>

          {/* Organizer */}
          <div>
            <label className="block text-base font-medium text-japandi-text-primary mb-3">
              Organizer (who prepaid costs)
            </label>
            <select
              value={organizerId}
              onChange={(e) => setOrganizerId(e.target.value)}
              className="w-full px-4 py-3 border border-japandi-border-light rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all"
            >
              <option value="">Select organizer...</option>
              {players
                .filter((p) => p.name.trim() !== "")
                .map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
            </select>
            {!hasValidOrganizer && validPlayerCount >= 4 && (
              <p className="mt-2 text-sm text-red-600">
                Please select an organizer
              </p>
            )}
          </div>

          {/* Court Cost */}
          <div>
            <label className="block text-base font-medium text-japandi-text-primary mb-3">
              Court Cost
            </label>
            <div className="flex gap-3 mb-3">
              <button
                type="button"
                onClick={() => setCourtCostType("per_person")}
                className={`flex-1 px-4 py-3 rounded-full font-medium transition-all active:scale-95 touch-manipulation ${
                  courtCostType === "per_person"
                    ? "bg-japandi-accent-primary text-white shadow-button"
                    : "bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-primary"
                }`}
              >
                Per Person
              </button>
              <button
                type="button"
                onClick={() => setCourtCostType("total")}
                className={`flex-1 px-4 py-3 rounded-full font-medium transition-all active:scale-95 touch-manipulation ${
                  courtCostType === "total"
                    ? "bg-japandi-accent-primary text-white shadow-button"
                    : "bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-primary"
                }`}
              >
                Total
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-japandi-text-secondary">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={courtCostValue}
                onChange={(e) => setCourtCostValue(e.target.value)}
                placeholder={courtCostType === "per_person" ? `${DEFAULT_COURT_COST_PER_PERSON.toFixed(2)} (default)` : `${DEFAULT_COURT_COST_TOTAL.toFixed(2)} (default)`}
                className={`w-full pl-8 pr-4 py-3 border rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all ${
                  !isValidCourtCost ? "border-red-300" : "border-japandi-border-light"
                }`}
              />
            </div>
            {!isValidCourtCost && (
              <p className="mt-2 text-sm text-red-600">
                Please enter a valid number (0 or greater)
              </p>
            )}
          </div>

          {/* Bird Cost */}
          <div>
            <label className="block text-base font-medium text-japandi-text-primary mb-3">
              Bird/Shuttle Cost (Total)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-japandi-text-secondary">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={birdCostTotal}
                onChange={(e) => setBirdCostTotal(e.target.value)}
                placeholder={`${DEFAULT_BIRD_COST.toFixed(2)} (default)`}
                className={`w-full pl-8 pr-4 py-3 border rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all ${
                  !isValidBirdCost ? "border-red-300" : "border-japandi-border-light"
                }`}
              />
            </div>
            {!isValidBirdCost && (
              <p className="mt-2 text-sm text-red-600">
                Please enter a valid number (0 or greater)
              </p>
            )}
          </div>

          {/* Bet Per Player */}
          <div>
            <label className="block text-base font-medium text-japandi-text-primary mb-3">
              Bet Per Player Per Game
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-japandi-text-secondary">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={betPerPlayer}
                onChange={(e) => setBetPerPlayer(e.target.value)}
                placeholder={`${DEFAULT_BET_PER_PLAYER.toFixed(2)} (default)`}
                className={`w-full pl-8 pr-4 py-3 border rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all ${
                  !isValidBet ? "border-red-300" : "border-japandi-border-light"
                }`}
              />
            </div>
            {!isValidBet && (
              <p className="mt-2 text-sm text-red-600">
                Please enter a valid number (0 or greater)
              </p>
            )}
          </div>

          {/* Round Robin Option */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableRoundRobin}
                onChange={(e) => setEnableRoundRobin(e.target.checked)}
                className="w-5 h-5 rounded border-japandi-border-light text-japandi-accent-primary focus:ring-2 focus:ring-japandi-accent-primary"
              />
              <div className="flex-1">
                <span className="block text-base font-medium text-japandi-text-primary">
                  Generate Round Robin Schedule
                </span>
                <span className="block text-sm text-japandi-text-muted mt-1">
                  Automatically create game combinations so everyone plays with different partners
                </span>
              </div>
            </label>
            
            {enableRoundRobin && (
              <div className="mt-4 ml-8">
                <label className="block text-sm font-medium text-japandi-text-primary mb-2">
                  Number of Games (leave empty for all possible games)
                </label>
                <input
                  type="number"
                  min="1"
                  value={roundRobinGameCount}
                  onChange={(e) => setRoundRobinGameCount(e.target.value)}
                  placeholder="Auto"
                  className={`w-full px-4 py-3 border rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all ${
                    !isValidRoundRobinCount ? "border-red-300" : "border-japandi-border-light"
                  }`}
                />
                {validPlayerCount >= minPlayersRequired && (
                  <p className="mt-2 text-sm text-japandi-text-muted">
                    {roundRobinGameCount 
                      ? `Will generate up to ${parseInt(roundRobinGameCount) || 0} games`
                      : `Will generate ${generateRoundRobinGames(players.filter((p) => p.name.trim() !== "").map((p, i) => ({ ...p, name: p.name || `Player ${i + 1}` })), undefined, gameMode).length} games (all possible)`}
                  </p>
                )}
                {!isValidRoundRobinCount && (
                  <p className="mt-2 text-sm text-red-600">
                    Please enter a valid number (1 or greater)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full px-6 py-4 bg-japandi-accent-primary hover:bg-japandi-accent-hover active:scale-95 disabled:bg-japandi-text-muted disabled:cursor-not-allowed disabled:active:scale-100 text-white font-semibold rounded-full transition-all shadow-button touch-manipulation"
          >
            Start Session
          </button>
        </form>
      </div>
    </div>
  );
}
