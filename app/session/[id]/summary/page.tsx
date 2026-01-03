"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useSession } from "@/contexts/SessionContext";
import {
  calculateFinalSettlement,
  formatCurrency,
  generateShareableText,
  formatPercentage,
} from "@/lib/calculations";
import Link from "next/link";
import { Session, Game } from "@/types";
import { ApiClient } from "@/lib/api/client";

export default function SummaryPage() {
  const params = useParams();
  const router = useRouter();
  const { session, games, loadSession } = useSession();
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [localSession, setLocalSession] = useState<Session | null>(null);
  const [localGames, setLocalGames] = useState<Game[]>([]);
  const [groupName, setGroupName] = useState<string | null>(null);
  
  // Track loading state to prevent duplicate calls
  const isLoadingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  
  // Fetch group name for group sessions
  useEffect(() => {
    if (localSession?.groupId) {
      ApiClient.getGroup(localSession.groupId)
        .then(group => setGroupName(group.name))
        .catch(() => {}); // Fail silently
    }
  }, [localSession?.groupId]);

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
        console.warn('[SummaryPage] Failed to load session:', error);
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

  // Use local state for rendering
  const currentSession = localSession;
  const currentGames = localGames;
  const bettingEnabled = currentSession.bettingEnabled ?? true; // Default to true for backward compatibility
  
  // Determine if this is a group session
  const isGroupSession = !!currentSession.groupId;
  const backLink = isGroupSession ? `/group/${currentSession.groupId}` : "/";
  const backText = isGroupSession 
    ? `← Back to ${groupName || 'Group'}` 
    : "← Back to Home";

  // Build group link for sharing
  const groupLink = isGroupSession && typeof window !== 'undefined'
    ? `${window.location.origin}/group/${currentSession.groupId}`
    : null;

  const settlement = calculateFinalSettlement(currentSession, currentGames);
  const shareableText = generateShareableText(settlement, bettingEnabled, {
    sessionName: currentSession.name || 'Badminton Session',
    groupName: groupName,
    groupLink: groupLink,
    games: currentGames,
    players: currentSession.players,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareableText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Silently fail - clipboard API may not be available in some contexts
      // User can still manually copy the text
    }
  };


  return (
    <div className="min-h-screen bg-japandi-background-primary">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="mb-8">
          <Link
            href={backLink}
            className="text-japandi-accent-primary hover:text-japandi-accent-hover active:opacity-70 text-sm transition-all flex items-center gap-1 mb-4 inline-block touch-manipulation"
          >
            {backText}
          </Link>
          
          {/* Group Session Badge */}
          {isGroupSession && (
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-japandi-accent-primary/10 text-japandi-accent-primary text-xs font-medium rounded-full">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                </svg>
                {groupName || 'Group Session'}
              </span>
            </div>
          )}
          
          <h1 className="text-2xl sm:text-3xl font-bold text-japandi-text-primary mb-3">
            Final Summary
          </h1>
          <p className="text-base text-japandi-text-secondary">
            {currentSession.name || "Badminton Session"} • {currentGames.filter(g => g.winningTeam !== null).length} games played
            {!bettingEnabled && <span className="text-japandi-accent-primary ml-2">(Stats Only)</span>}
          </p>
        </div>

        {/* Stats Table */}
        <div className="bg-japandi-background-card rounded-card border border-japandi-border-light overflow-hidden mb-6 shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-japandi-background-primary">
                <tr>
                  <th className="px-4 sm:px-5 py-3 sm:py-4 text-left text-xs font-semibold text-japandi-text-primary uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-3 sm:px-4 py-3 sm:py-4 text-center text-xs font-semibold text-japandi-text-primary uppercase tracking-wider">
                    W/L
                  </th>
                  <th className="px-3 sm:px-4 py-3 sm:py-4 text-center text-xs font-semibold text-japandi-text-primary uppercase tracking-wider">
                    Win %
                  </th>
                  <th className="px-3 sm:px-4 py-3 sm:py-4 text-center text-xs font-semibold text-japandi-text-primary uppercase tracking-wider">
                    +/-
                  </th>
                  <th className="px-3 sm:px-4 py-3 sm:py-4 text-center text-xs font-semibold text-japandi-text-primary uppercase tracking-wider">
                    Pts For
                  </th>
                  <th className="px-3 sm:px-4 py-3 sm:py-4 text-center text-xs font-semibold text-japandi-text-primary uppercase tracking-wider">
                    Pts Against
                  </th>
                  {bettingEnabled && (
                    <>
                      <th className="px-3 sm:px-4 py-3 sm:py-4 text-center text-xs font-semibold text-japandi-text-primary uppercase tracking-wider">
                        Net
                      </th>
                      <th className="px-3 sm:px-4 py-3 sm:py-4 text-right text-xs font-semibold text-japandi-text-primary uppercase tracking-wider">
                        Pay
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-japandi-border-light">
                {settlement.map((s) => (
                  <tr key={s.playerId}>
                    <td className="px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base font-medium text-japandi-text-primary">
                      <div className="flex flex-col sm:block">
                        <span className="break-words">{s.playerName}</span>
                        {s.playerId === currentSession.organizerId && (
                          <span className="ml-0 sm:ml-2 text-xs text-japandi-accent-primary font-medium block sm:inline whitespace-nowrap">
                            (Organizer)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base text-center text-japandi-text-secondary">
                      {s.wins}-{s.losses}
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base text-center text-japandi-text-secondary">
                      {formatPercentage(s.winRate)}
                    </td>
                    <td
                      className={`px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base text-center font-semibold ${
                        s.pointDifferential > 0
                          ? "text-green-700"
                          : s.pointDifferential < 0
                          ? "text-japandi-text-secondary"
                          : "text-japandi-text-muted"
                      }`}
                    >
                      {s.pointDifferential > 0 && "+"}
                      {s.pointDifferential}
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base text-center text-japandi-text-primary">
                      {s.pointsScored}
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base text-center text-japandi-text-primary">
                      {s.pointsConceded}
                    </td>
                    {bettingEnabled && (
                      <>
                        <td
                          className={`px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base text-center font-semibold ${
                            s.gamblingNet > 0
                              ? "text-green-700"
                              : s.gamblingNet < 0
                              ? "text-japandi-text-secondary"
                              : "text-japandi-text-muted"
                          }`}
                        >
                          {s.gamblingNet > 0 && "+"}
                          {formatCurrency(s.gamblingNet)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base text-right font-semibold text-japandi-text-primary">
                          {formatCurrency(s.amountToPayOrganizer)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cost Summary (only when betting enabled or when there are costs) */}
        {(bettingEnabled || currentSession.courtCostValue > 0 || currentSession.birdCostTotal > 0) && (
          <div className="bg-japandi-background-card rounded-card border border-japandi-border-light p-5 mb-6 shadow-soft">
            <h2 className="text-lg font-semibold text-japandi-text-primary mb-4">
              Cost Breakdown
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-japandi-text-secondary">Court Cost ({currentSession.courtCostType === "per_person" ? "per person" : "total"}):</span>
                <span className="text-japandi-text-primary font-medium">{formatCurrency(currentSession.courtCostValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-japandi-text-secondary">Bird/Shuttle Cost:</span>
                <span className="text-japandi-text-primary font-medium">{formatCurrency(currentSession.birdCostTotal)}</span>
              </div>
              {bettingEnabled && (
                <div className="flex justify-between">
                  <span className="text-japandi-text-secondary">Bet Per Player:</span>
                  <span className="text-japandi-text-primary font-medium">{formatCurrency(currentSession.betPerPlayer)}/game</span>
                </div>
              )}
              <div className="border-t border-japandi-border-light pt-2 mt-2 flex justify-between">
                <span className="text-japandi-text-primary font-medium">Per Person Share:</span>
                <span className="text-japandi-text-primary font-semibold">{formatCurrency(settlement[0]?.evenSharePerPlayer || 0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Shareable Text */}
        <div className="bg-japandi-background-card rounded-card border border-japandi-border-light p-5 mb-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-japandi-text-primary">
              Shareable Text
            </h2>
            <button
              onClick={handleCopy}
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-japandi-accent-primary hover:bg-japandi-accent-hover active:scale-95 text-white text-xs sm:text-sm font-semibold rounded-full transition-all shadow-button touch-manipulation"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="bg-japandi-background-primary rounded-card p-4 text-sm text-japandi-text-primary whitespace-pre-wrap font-mono select-text cursor-text border border-japandi-border-light">
            {shareableText}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/session/${currentSession.id}`}
              className="flex-1 px-5 py-3 bg-japandi-background-card hover:bg-japandi-background-primary active:scale-95 text-japandi-text-primary border border-japandi-border-light font-semibold rounded-full transition-all text-center touch-manipulation"
            >
              Back to Session
            </Link>
            <Link
              href={backLink}
              className="flex-1 px-5 py-3 bg-japandi-background-card hover:bg-japandi-background-primary active:scale-95 text-japandi-text-primary border border-japandi-border-light font-semibold rounded-full transition-all text-center touch-manipulation"
            >
              {isGroupSession ? `Back to ${groupName || 'Group'}` : 'Back to Home'}
            </Link>
          </div>
          <div className="pt-2">
            <Link
              href={isGroupSession ? `/create-session?groupId=${currentSession.groupId}` : "/create-session"}
              className="block w-full px-5 py-3 bg-japandi-accent-primary hover:bg-japandi-accent-hover active:scale-95 text-white font-semibold rounded-full transition-all text-center shadow-button touch-manipulation"
            >
              New Session
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

