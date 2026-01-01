"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
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
  const { session, games, loadSession, setSession } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("stats");
  const [prefillGame, setPrefillGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [localSession, setLocalSession] = useState<Session | null>(null);
  const [localGames, setLocalGames] = useState<Game[]>([]);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSessionName, setEditSessionName] = useState("");
  const [editSessionDate, setEditSessionDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Track loading state to prevent duplicate calls
  const isLoadingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  // Load session using context's loadSession (which handles API calls)
  useEffect(() => {
    const sessionId = params.id as string;
    if (!sessionId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    // Skip if already loading this session
    if (isLoadingRef.current && sessionIdRef.current === sessionId) {
      return;
    }

    // Skip if session is already loaded and matches
    if (session && session.id === sessionId && games.length >= 0) {
      setLocalSession(session);
      setLocalGames(games);
      setIsLoading(false);
      return;
    }

    // Load session via context (handles API calls and caching)
    const loadData = async () => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      sessionIdRef.current = sessionId;
      
      try {
        await loadSession(sessionId);
        // After loadSession completes, sync local state
        // We'll use the sync effect below to update local state
      } catch (error) {
        console.warn('[SessionPage] Failed to load session:', error);
        setNotFound(true);
        setIsLoading(false);
      } finally {
        isLoadingRef.current = false;
      }
    };

    // Small delay to allow context to hydrate first
    const timer = setTimeout(loadData, 100);
    return () => clearTimeout(timer);
  }, [params.id, loadSession, session, games]);

  // Sync local state with context when context updates (after loadSession completes)
  useEffect(() => {
    const sessionId = params.id as string;
    if (session && session.id === sessionId) {
      setLocalSession(session);
      setLocalGames(games);
      setIsLoading(false);
      setNotFound(false);
    } else if (sessionId && !session) {
      // Session not found after loading
      setNotFound(true);
      setIsLoading(false);
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

  const handleEditClick = () => {
    if (currentSession) {
      setEditSessionName(currentSession.name || "");
      const date = new Date(currentSession.date);
      setEditSessionDate(date.toISOString().split('T')[0]);
      setShowEditModal(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!currentSession || !editSessionName.trim()) return;
    setIsSaving(true);
    try {
      const updatedSession: Session = {
        ...currentSession,
        name: editSessionName.trim(),
        date: new Date(`${editSessionDate}T${new Date(currentSession.date).toTimeString().slice(0, 5)}`),
      };
      await setSession(updatedSession);
      setLocalSession(updatedSession);
      setShowEditModal(false);
    } catch (error) {
      console.error('[SessionPage] Failed to update session:', error);
      alert('Failed to update session. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Get all unplayed scheduled games
  const scheduledGames = currentGames.filter(game => game.winningTeam === null);
  
  // Get first unplayed round robin game (next game)
  const nextUnplayedGame = scheduledGames[0] || null;
  
  // Get upcoming games (excluding the next game, show 3 initially, all if expanded)
  const allUpcomingGames = scheduledGames.slice(1);
  const upcomingGames = showAllUpcoming ? allUpcomingGames : allUpcomingGames.slice(0, 3);
  const hasMoreUpcoming = allUpcomingGames.length > 3;
  
  // Get only played games for Recent Games section
  const playedGames = currentGames.filter(game => game.winningTeam !== null);

  return (
    <div className="min-h-screen bg-japandi-background-primary pb-20">
      <SessionHeader session={currentSession} />
      
      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-japandi-background-card rounded-card p-6 max-w-md w-full shadow-soft">
            <h2 className="text-xl font-bold text-japandi-text-primary mb-4">Edit Session</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-japandi-text-primary mb-2">
                  Session Name
                </label>
                <input
                  type="text"
                  value={editSessionName}
                  onChange={(e) => setEditSessionName(e.target.value)}
                  className="w-full px-4 py-2 bg-japandi-background-primary border border-japandi-border-light rounded-full text-japandi-text-primary focus:outline-none focus:border-japandi-accent-primary"
                  placeholder="Session name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-japandi-text-primary mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={editSessionDate}
                  onChange={(e) => setEditSessionDate(e.target.value)}
                  className="w-full px-4 py-2 bg-japandi-background-primary border border-japandi-border-light rounded-full text-japandi-text-primary focus:outline-none focus:border-japandi-accent-primary"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-japandi-background-primary text-japandi-text-primary border border-japandi-border-light rounded-full hover:bg-japandi-background-card transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editSessionName.trim()}
                  className="flex-1 px-4 py-2 bg-japandi-accent-primary text-white rounded-full hover:bg-japandi-accent-hover transition-colors disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-japandi-text-primary">
                Live Stats
              </h2>
              <button
                onClick={handleEditClick}
                className="px-4 py-2 bg-japandi-background-card hover:bg-japandi-background-primary text-japandi-text-primary border border-japandi-border-light rounded-full text-sm font-medium transition-colors"
              >
                Edit Session
              </button>
            </div>
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
                  {hasMoreUpcoming && (
                    <button
                      onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                      className="text-xs sm:text-sm text-japandi-accent-primary hover:text-japandi-accent-hover transition-colors touch-manipulation"
                    >
                      {showAllUpcoming ? "Show Less" : `Show More (${allUpcomingGames.length - 3} more)`}
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

