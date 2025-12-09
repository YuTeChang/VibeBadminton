"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { Session, Player, Game } from "@/types";
import Link from "next/link";
import { generateRoundRobinGames } from "@/lib/roundRobin";

export default function CreateSession() {
  const router = useRouter();
  const { setSession, addGames } = useSession();
  const [sessionName, setSessionName] = useState("");
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
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
  const [courtCostValue, setCourtCostValue] = useState("");
  const [birdCostTotal, setBirdCostTotal] = useState("0");
  const [betPerPlayer, setBetPerPlayer] = useState("");
  const [enableRoundRobin, setEnableRoundRobin] = useState(false);

  const addPlayer = () => {
    if (players.length < 6) {
      setPlayers([
        ...players,
        { id: `player-${Date.now()}`, name: "" },
      ]);
    }
  };

  const removePlayer = (index: number) => {
    if (players.length > 4) {
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

  const canSubmit =
    players.filter((p) => p.name.trim() !== "").length >= 4 &&
    organizerId !== "" &&
    courtCostValue !== "" &&
    !isNaN(parseFloat(courtCostValue)) &&
    parseFloat(courtCostValue) >= 0 &&
    !isNaN(parseFloat(birdCostTotal || "0")) &&
    parseFloat(birdCostTotal || "0") >= 0 &&
    betPerPlayer !== "" &&
    !isNaN(parseFloat(betPerPlayer)) &&
    parseFloat(betPerPlayer) >= 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const validPlayers = players.filter((p) => p.name.trim() !== "");
    const session: Session = {
      id: `session-${Date.now()}`,
      name: sessionName.trim() || undefined,
      date: new Date(sessionDate),
      players: validPlayers,
      organizerId,
      courtCostType,
      courtCostValue: parseFloat(courtCostValue) || 0,
      birdCostTotal: parseFloat(birdCostTotal || "0") || 0,
      betPerPlayer: parseFloat(betPerPlayer) || 0,
    };

    // If round robin is enabled, generate games first
    let roundRobinGamesToAdd: Omit<Game, "id" | "sessionId" | "gameNumber">[] = [];
    if (enableRoundRobin) {
      const roundRobinGames = generateRoundRobinGames(validPlayers);
      if (roundRobinGames.length > 0) {
        roundRobinGamesToAdd = roundRobinGames.map((game) => ({
          teamA: game.teamA,
          teamB: game.teamB,
          winningTeam: null as "A" | "B" | null, // Unplayed games
        }));
      }
    }

    setSession(session);

    // Add round robin games after session is set
    if (roundRobinGamesToAdd.length > 0) {
      // Use setTimeout to ensure session state is updated in context
      setTimeout(() => {
        addGames(roundRobinGamesToAdd);
      }, 100);
    }

    router.push(`/session/${session.id}`);
  };

  return (
    <div className="min-h-screen bg-japandi-background-primary py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <Link
            href="/"
            className="text-japandi-accent-primary hover:text-japandi-accent-hover text-sm transition-colors"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-japandi-text-primary mt-6">
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
            />
          </div>

          {/* Players */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-base font-medium text-japandi-text-primary">
                Players (4-6 players)
              </label>
              {players.length < 6 && (
                <button
                  type="button"
                  onClick={addPlayer}
                  className="text-sm text-japandi-accent-primary hover:text-japandi-accent-hover transition-colors"
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
                    placeholder={`Player ${index + 1} name`}
                    className="flex-1 px-4 py-3 border border-japandi-border-light rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all"
                  />
                  {players.length > 4 && (
                    <button
                      type="button"
                      onClick={() => removePlayer(index)}
                      className="px-4 py-3 text-japandi-text-secondary hover:bg-japandi-background-card rounded-card transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
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
                className={`flex-1 px-4 py-3 rounded-full font-medium transition-colors ${
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
                className={`flex-1 px-4 py-3 rounded-full font-medium transition-colors ${
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
                placeholder={courtCostType === "per_person" ? "14.40" : "72.00"}
                className="w-full pl-8 pr-4 py-3 border border-japandi-border-light rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all"
              />
            </div>
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
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 border border-japandi-border-light rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all"
              />
            </div>
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
                placeholder="2.00"
                className="w-full pl-8 pr-4 py-3 border border-japandi-border-light rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all"
              />
            </div>
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
              <div>
                <span className="block text-base font-medium text-japandi-text-primary">
                  Generate Round Robin Schedule
                </span>
                <span className="block text-sm text-japandi-text-muted mt-1">
                  Automatically create game combinations so everyone plays with different partners
                </span>
                {enableRoundRobin && players.filter((p) => p.name.trim() !== "").length >= 4 && (
                  <div className="mt-2 p-3 bg-japandi-background-card rounded-card border border-japandi-border-light">
                    <p className="text-sm text-japandi-text-secondary">
                      Will generate {generateRoundRobinGames(players.filter((p) => p.name.trim() !== "")).length} games
                    </p>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full px-6 py-4 bg-japandi-accent-primary hover:bg-japandi-accent-hover disabled:bg-japandi-text-muted disabled:cursor-not-allowed text-white font-semibold rounded-full transition-colors shadow-button"
          >
            Start Session
          </button>
        </form>
      </div>
    </div>
  );
}
