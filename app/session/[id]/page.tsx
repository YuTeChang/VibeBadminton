"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { ApiClient } from "@/lib/api/client";
import SessionHeader from "@/components/SessionHeader";
import LiveStatsCard from "@/components/LiveStatsCard";
import QuickGameForm from "@/components/QuickGameForm";
import GameHistoryList from "@/components/GameHistoryList";
import BottomTabNav from "@/components/BottomTabNav";
import { calculatePlayerStats } from "@/lib/calculations";
import { Game, Session } from "@/types";
import Link from "next/link";

type Tab = "stats" | "record" | "history";

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const { session, games, setSession, loadSession, allSessions } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("stats");
  const [prefillGame, setPrefillGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [localSession, setLocalSession] = useState<Session | null>(null);
  const [localGames, setLocalGames] = useState<Game[]>([]);

  // Load session from API if not in context
  useEffect(() => {
    const loadSessionData = async () => {
      const sessionId = params.id as string;
      if (!sessionId) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      // Check if session is already loaded in context
      if (session && session.id === sessionId) {
        setLocalSession(session);
        setLocalGames(games);
        setIsLoading(false);
        return;
      }

      // Check if session exists in allSessions (already fetched)
      const existingSession = allSessions.find(s => s.id === sessionId);
      if (existingSession) {
        loadSession(sessionId);
        setLocalSession(existingSession);
        // Games will be loaded by loadSession, but we need to wait
        try {
          const apiGames = await ApiClient.getGames(sessionId);
          setLocalGames(apiGames);
        } catch {
          // Games might not be loaded yet, use empty array
          setLocalGames([]);
        }
        setIsLoading(false);
        return;
      }

      // Try to fetch from API
      try {
        const apiSession = await ApiClient.getSession(sessionId);
        if (apiSession) {
          setLocalSession(apiSession);
          // Also fetch games
          try {
            const apiGames = await ApiClient.getGames(sessionId);
            setLocalGames(apiGames);
          } catch {
            setLocalGames([]);
          }
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.warn('[SessionPage] Failed to fetch session from API:', error);
      }

      // Session not found anywhere
      setNotFound(true);
      setIsLoading(false);
    };

    // Small delay to allow context to hydrate first
    const timer = setTimeout(loadSessionData, 300);
    return () => clearTimeout(timer);
  }, [params.id, session, games, allSessions, loadSession]);

  // Sync local state with context when context updates
  useEffect(() => {
    if (session && session.id === params.id) {
      setLocalSession(session);
      setLocalGames(games);
    }
  }, [session, games, params.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-japandi-background-primary">
        <p className="text-japandi-text-secondary">Loading session...</p>
      </div>
    );
  }

  if (notFound || !localSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-japandi-background-primary gap-4">
        <p className="text-japandi-text-secondary">Session not found</p>
        <Link href="/create-session" className="text-japandi-accent-primary hover:text-japandi-accent-hover transition-colors">
          Create New Session
        </Link>
      </div>
    );
  }

  // Use local state for rendering (more reliable than context during loading)
  const currentSession = localSession;
  const currentGames = localGames;

  const playerStats = calculatePlayerStats(
    currentGames,
    currentSession.players,
    currentSession.betPerPlayer
  );

  const handleGameSaved = () => {
    // Switch to stats tab to show updated stats
    setActiveTab("stats");
    setPrefillGame(null); // Clear prefill
  };


  // Get all unplayed scheduled games
  const scheduledGames = currentGames.filter(game => game.winningTeam === null);
  
  // Get first unplayed round robin game (next game)
  const nextUnplayedGame = scheduledGames[0] || null;
  
  // Get upcoming games (excluding the next game, show up to 10 for better visibility)
  const upcomingGames = scheduledGames.slice(1, 11);
  
  // Get only played games for Recent Games section
  const playedGames = currentGames.filter(game => game.winningTeam !== null);

  return (
    <div className="min-h-screen bg-japandi-background-primary pb-20">
      <SessionHeader session={currentSession} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-japandi-text-primary">
              Live Stats
            </h2>
            <div className="space-y-4">
              {currentSession.players.map((player) => {
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

            {/* Next Game - Show first unplayed round robin game */}
            {nextUnplayedGame && (
              <div className="mt-6 sm:mt-8">
                <h3 className="text-base font-semibold text-japandi-text-primary mb-3 sm:mb-4">
                  Next Game
                </h3>
                <div className="bg-japandi-background-card border-2 border-japandi-accent-primary rounded-card p-4 sm:p-5 shadow-soft">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-base sm:text-lg font-semibold text-japandi-text-primary mb-1">
                        Game {nextUnplayedGame.gameNumber}
                      </div>
                      <div className="text-sm sm:text-base text-japandi-text-secondary break-words">
                        {currentSession.gameMode === "singles" ? (
                          <>
                            {currentSession.players.find(p => p.id === nextUnplayedGame.teamA[0])?.name}
                            {" vs "}
                            {currentSession.players.find(p => p.id === nextUnplayedGame.teamB[0])?.name}
                          </>
                        ) : (
                          <>
                        {currentSession.players.find(p => p.id === nextUnplayedGame.teamA[0])?.name} & {currentSession.players.find(p => p.id === nextUnplayedGame.teamA[1])?.name}
                        {" vs "}
                        {currentSession.players.find(p => p.id === nextUnplayedGame.teamB[0])?.name} & {currentSession.players.find(p => p.id === nextUnplayedGame.teamB[1])?.name}
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setPrefillGame(nextUnplayedGame);
                        setActiveTab("record");
                      }}
                      className="w-full sm:w-auto ml-0 sm:ml-4 px-5 py-2.5 bg-japandi-accent-primary hover:bg-japandi-accent-hover active:scale-95 text-white font-semibold rounded-full transition-all shadow-button whitespace-nowrap touch-manipulation"
                    >
                      Record Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming Games - Show next few scheduled games */}
            {scheduledGames.length > 1 && (
              <div className="mt-4 sm:mt-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-base font-semibold text-japandi-text-primary">
                    Upcoming Games
                  </h3>
                  {scheduledGames.length > 11 && (
                    <button
                      onClick={() => setActiveTab("record")}
                      className="text-xs sm:text-sm text-japandi-accent-primary hover:text-japandi-accent-hover transition-colors touch-manipulation"
                    >
                      View All ({scheduledGames.length})
                    </button>
                  )}
                </div>
                {upcomingGames.length > 0 ? (
                  <div className="space-y-2">
                    {upcomingGames.map((game) => {
                      const getPlayerName = (id: string) =>
                        currentSession.players.find((p) => p.id === id)?.name || "";
                      const teamA = currentSession.gameMode === "singles" 
                        ? getPlayerName(game.teamA[0])
                        : game.teamA.map(getPlayerName).join(" & ");
                      const teamB = currentSession.gameMode === "singles"
                        ? getPlayerName(game.teamB[0])
                        : game.teamB.map(getPlayerName).join(" & ");

                      return (
                        <div
                          key={game.id}
                          className="bg-japandi-background-card border border-japandi-border-light rounded-card p-3 sm:p-3.5 shadow-soft hover:border-japandi-border transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs sm:text-sm font-medium text-japandi-text-primary whitespace-nowrap">
                                  Game {game.gameNumber}
                                </span>
                              </div>
                              <div className="text-xs sm:text-sm text-japandi-text-secondary break-words">
                                {teamA} vs {teamB}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setPrefillGame(game);
                                setActiveTab("record");
                              }}
                              className="ml-2 sm:ml-3 px-3 py-1.5 text-xs font-medium bg-japandi-background-primary text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-card active:scale-95 rounded-full transition-all whitespace-nowrap flex-shrink-0 touch-manipulation"
                            >
                              Use
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-japandi-text-muted py-2">
                    No more scheduled games.
                  </div>
                )}
              </div>
            )}

            {/* Recent Games - Only show played games */}
            {playedGames.length > 0 && (
              <div className="mt-6 sm:mt-8">
                <h3 className="text-base font-semibold text-japandi-text-primary mb-3 sm:mb-4">
                  Recent Games
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  {playedGames
                    .slice(-5)
                    .reverse()
                    .map((game) => {
                      const getPlayerName = (id: string) =>
                        currentSession.players.find((p) => p.id === id)?.name || "";
                      const teamA = currentSession.gameMode === "singles" 
                        ? getPlayerName(game.teamA[0])
                        : game.teamA.map(getPlayerName).join(" & ");
                      const teamB = currentSession.gameMode === "singles"
                        ? getPlayerName(game.teamB[0])
                        : game.teamB.map(getPlayerName).join(" & ");
                      const winner = game.winningTeam === "A" ? teamA : teamB;

                      return (
                        <div
                          key={game.id}
                          className="bg-japandi-background-card border border-japandi-border-light rounded-card p-3 sm:p-4 text-sm sm:text-base shadow-soft"
                        >
                          <span className="font-medium text-japandi-text-primary">
                            Game {game.gameNumber}:
                          </span>{" "}
                          <span className="text-japandi-text-secondary break-words">
                            {winner} won
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            
            {/* Empty State - No games played yet */}
            {playedGames.length === 0 && scheduledGames.length === 0 && (
              <div className="mt-8 text-center py-12">
                <p className="text-japandi-text-muted text-base">
                  No games recorded yet. Start by recording your first game!
                </p>
              </div>
            )}

          </div>
        )}

        {/* Record Tab */}
        {activeTab === "record" && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-japandi-text-primary mb-6 sm:mb-8">
              Record Game
            </h2>
            
            {/* Scheduled Games Section */}
            {scheduledGames.length > 0 && (
              <div className="mb-6 sm:mb-8">
                <h3 className="text-base sm:text-lg font-semibold text-japandi-text-primary mb-3 sm:mb-4">
                  Scheduled Games ({scheduledGames.length})
                </h3>
                <div className="space-y-2 sm:space-y-3 max-h-64 overflow-y-auto">
                  {scheduledGames.map((game) => {
                    const getPlayerName = (id: string) =>
                      currentSession.players.find((p) => p.id === id)?.name || "";
                    const teamA = game.teamA.map(getPlayerName).join(" & ");
                    const teamB = game.teamB.map(getPlayerName).join(" & ");
                    const isPrefilled = prefillGame?.id === game.id;

                    return (
                      <div
                        key={game.id}
                        className={`bg-japandi-background-card border rounded-card p-3 sm:p-4 transition-all ${
                          isPrefilled
                            ? "border-2 border-japandi-accent-primary shadow-soft"
                            : "border-japandi-border-light hover:border-japandi-border"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm sm:text-base font-medium text-japandi-text-primary">
                              Game {game.gameNumber}
                            </div>
                            <div className="text-xs sm:text-sm text-japandi-text-secondary mt-1 break-words">
                              {teamA} vs {teamB}
                            </div>
                          </div>
                          <button
                            onClick={() => setPrefillGame(game)}
                            className={`w-full sm:w-auto ml-0 sm:ml-4 px-4 py-2 text-sm font-medium rounded-full transition-all active:scale-95 touch-manipulation ${
                              isPrefilled
                                ? "bg-japandi-accent-primary text-white"
                                : "bg-japandi-background-primary text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-card"
                            }`}
                          >
                            {isPrefilled ? "Selected" : "Use This"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <QuickGameForm
              players={currentSession.players}
              onGameSaved={handleGameSaved}
              initialTeamA={prefillGame?.teamA}
              initialTeamB={prefillGame?.teamB}
              gameToUpdate={prefillGame || undefined}
            />
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div>
            <GameHistoryList games={currentGames} players={currentSession.players} />
          </div>
        )}
      </div>

      <BottomTabNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        gameCount={currentGames.length}
      />
    </div>
  );
}

