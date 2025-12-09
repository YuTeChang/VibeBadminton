"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { Session, Player } from "@/types";
import Link from "next/link";

export default function CreateSession() {
  const router = useRouter();
  const { setSession } = useSession();
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
  const [birdCostTotal, setBirdCostTotal] = useState("");
  const [betPerPlayer, setBetPerPlayer] = useState("");

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
    birdCostTotal !== "" &&
    !isNaN(parseFloat(birdCostTotal)) &&
    betPerPlayer !== "" &&
    !isNaN(parseFloat(betPerPlayer));

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
      courtCostValue: parseFloat(courtCostValue),
      birdCostTotal: parseFloat(birdCostTotal),
      betPerPlayer: parseFloat(betPerPlayer),
    };

    setSession(session);
    router.push(`/session/${session.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            ← Back to Home
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">
            Create New Session
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Session Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Session Name (Optional)
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g., Friday Night Session"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Players */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Players (4-6 players)
              </label>
              {players.length < 6 && (
                <button
                  type="button"
                  onClick={addPlayer}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  + Add Player
                </button>
              )}
            </div>
            <div className="space-y-2">
              {players.map((player, index) => (
                <div key={player.id} className="flex gap-2">
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => updatePlayerName(index, e.target.value)}
                    placeholder={`Player ${index + 1} name`}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {players.length > 4 && (
                    <button
                      type="button"
                      onClick={() => removePlayer(index)}
                      className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Organizer (who prepaid costs)
            </label>
            <select
              value={organizerId}
              onChange={(e) => setOrganizerId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Court Cost
            </label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setCourtCostType("per_person")}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  courtCostType === "per_person"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                Per Person
              </button>
              <button
                type="button"
                onClick={() => setCourtCostType("total")}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  courtCostType === "total"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                Total
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                step="0.01"
                value={courtCostValue}
                onChange={(e) => setCourtCostValue(e.target.value)}
                placeholder={courtCostType === "per_person" ? "14.40" : "72.00"}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Bird Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bird/Shuttle Cost (Total)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                step="0.01"
                value={birdCostTotal}
                onChange={(e) => setBirdCostTotal(e.target.value)}
                placeholder="3.00"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Bet Per Player */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bet Per Player Per Game
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                step="0.01"
                value={betPerPlayer}
                onChange={(e) => setBetPerPlayer(e.target.value)}
                placeholder="2.00"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            Start Session
          </button>
        </form>
      </div>
    </div>
  );
}
