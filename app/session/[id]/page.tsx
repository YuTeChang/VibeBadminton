"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import SessionHeader from "@/components/SessionHeader";
import LiveStatsCard from "@/components/LiveStatsCard";
import QuickGameForm from "@/components/QuickGameForm";
import GameHistoryList from "@/components/GameHistoryList";
import BottomTabNav from "@/components/BottomTabNav";
import FloatingActionButton from "@/components/FloatingActionButton";
import { calculatePlayerStats } from "@/lib/calculations";

type Tab = "stats" | "record" | "history";

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const { session, games, setSession } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("stats");

  // For MVP: If no session, create a mock session for testing
  // In production, this would fetch from context or redirect
  useEffect(() => {
    if (!session && params.id) {
      // This is a placeholder - in real app, session would be loaded from context
      // For now, redirect to create session if no session exists
      router.push("/create-session");
    }
  }, [session, params.id, router]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading session...</p>
      </div>
    );
  }

  const playerStats = calculatePlayerStats(
    games,
    session.players,
    session.betPerPlayer
  );

  const handleGameSaved = () => {
    // Switch to stats tab to show updated stats
    setActiveTab("stats");
  };

  const handleFABClick = () => {
    setActiveTab("record");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <SessionHeader session={session} />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Live Stats
            </h2>
            <div className="space-y-3">
              {session.players.map((player) => {
                const stats = playerStats.find(
                  (s) => s.playerId === player.id
                );
                if (!stats) return null;
                return (
                  <LiveStatsCard
                    key={player.id}
                    stats={stats}
                    player={player}
                  />
                );
              })}
            </div>

            {/* Mini Game List */}
            {games.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Recent Games
                </h3>
                <div className="space-y-2">
                  {games
                    .slice(-5)
                    .reverse()
                    .map((game) => {
                      const getPlayerName = (id: string) =>
                        session.players.find((p) => p.id === id)?.name || "";
                      const teamA = game.teamA.map(getPlayerName).join(" & ");
                      const teamB = game.teamB.map(getPlayerName).join(" & ");
                      const winner =
                        game.winningTeam === "A" ? teamA : teamB;

                      return (
                        <div
                          key={game.id}
                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm"
                        >
                          <span className="font-medium text-gray-900 dark:text-white">
                            Game {game.gameNumber}:
                          </span>{" "}
                          <span className="text-gray-600 dark:text-gray-400">
                            {winner} won
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* FAB for quick record */}
            <FloatingActionButton
              onClick={handleFABClick}
              label="Record Game"
            />
          </div>
        )}

        {/* Record Tab */}
        {activeTab === "record" && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Record Game
            </h2>
            <QuickGameForm
              players={session.players}
              onGameSaved={handleGameSaved}
            />
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div>
            <GameHistoryList games={games} players={session.players} />
          </div>
        )}
      </div>

      <BottomTabNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        gameCount={games.length}
      />
    </div>
  );
}

