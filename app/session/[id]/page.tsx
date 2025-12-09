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

  // Wait a moment for localStorage to load, then check if session exists
  useEffect(() => {
    if (params.id) {
      // Give localStorage time to load (SessionContext loads on mount)
      const timer = setTimeout(() => {
        if (!session || session.id !== params.id) {
          router.push("/create-session");
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [session, params.id, router]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-japandi-background-primary">
        <p className="text-japandi-text-secondary">Loading session...</p>
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
    <div className="min-h-screen bg-japandi-background-primary pb-20">
      <SessionHeader session={session} />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-japandi-text-primary">
              Live Stats
            </h2>
            <div className="space-y-4">
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
              <div className="mt-8">
                <h3 className="text-base font-semibold text-japandi-text-primary mb-4">
                  Recent Games
                </h3>
                <div className="space-y-3">
                  {games
                    .slice(-5)
                    .reverse()
                    .map((game) => {
                      const getPlayerName = (id: string) =>
                        session.players.find((p) => p.id === id)?.name || "";
                      const teamA = game.teamA.map(getPlayerName).join(" & ");
                      const teamB = game.teamB.map(getPlayerName).join(" & ");
                      
                      if (game.winningTeam === null) {
                        return (
                          <div
                            key={game.id}
                            className="bg-japandi-background-card border border-japandi-border-light border-dashed rounded-card p-4 text-base shadow-soft opacity-75"
                          >
                            <span className="font-medium text-japandi-text-primary">
                              Game {game.gameNumber}:
                            </span>{" "}
                            <span className="text-japandi-text-muted">
                              {teamA} vs {teamB} (Not played)
                            </span>
                          </div>
                        );
                      }
                      
                      const winner = game.winningTeam === "A" ? teamA : teamB;

                      return (
                        <div
                          key={game.id}
                          className="bg-japandi-background-card border border-japandi-border-light rounded-card p-4 text-base shadow-soft"
                        >
                          <span className="font-medium text-japandi-text-primary">
                            Game {game.gameNumber}:
                          </span>{" "}
                          <span className="text-japandi-text-secondary">
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
            <h2 className="text-2xl font-bold text-japandi-text-primary mb-8">
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

