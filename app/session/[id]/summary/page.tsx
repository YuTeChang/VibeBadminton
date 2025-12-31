"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "@/contexts/SessionContext";
import { ApiClient } from "@/lib/api/client";
import {
  calculateFinalSettlement,
  formatCurrency,
  generateShareableText,
} from "@/lib/calculations";
import Link from "next/link";
import { Session, Game } from "@/types";

export default function SummaryPage() {
  const params = useParams();
  const router = useRouter();
  const { session, games, clearSession, loadSession, allSessions } = useSession();
  const [copied, setCopied] = useState(false);
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
        try {
          const apiGames = await ApiClient.getGames(sessionId);
          setLocalGames(apiGames);
        } catch {
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
        console.warn('[SummaryPage] Failed to fetch session from API:', error);
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

  // Use local state for rendering
  const currentSession = localSession;
  const currentGames = localGames;

  const settlement = calculateFinalSettlement(currentSession, currentGames);
  const shareableText = generateShareableText(settlement);

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

  const handleEndSession = () => {
    const confirmed = window.confirm("Are you sure you want to end this session? This will clear all data.");
    if (confirmed) {
      clearSession();
      // Use setTimeout to ensure state updates before navigation
      setTimeout(() => {
      router.push("/");
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-japandi-background-primary">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="mb-8">
          <Link
            href="/"
            className="text-japandi-accent-primary hover:text-japandi-accent-hover active:opacity-70 text-sm transition-all flex items-center gap-1 mb-4 inline-block touch-manipulation"
          >
            ← Back to Home
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-japandi-text-primary mb-3">
            Final Summary
          </h1>
          <p className="text-base text-japandi-text-secondary">
            {currentSession.name || "Badminton Session"} • {currentGames.filter(g => g.winningTeam !== null).length} games played
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
                  <th className="px-4 sm:px-5 py-3 sm:py-4 text-center text-xs font-semibold text-japandi-text-primary uppercase tracking-wider">
                      W/L
                    </th>
                  <th className="px-4 sm:px-5 py-3 sm:py-4 text-center text-xs font-semibold text-japandi-text-primary uppercase tracking-wider">
                      Net
                    </th>
                  <th className="px-4 sm:px-5 py-3 sm:py-4 text-right text-xs font-semibold text-japandi-text-primary uppercase tracking-wider">
                      Pay Organizer
                    </th>
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
                    <td className="px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-center text-japandi-text-secondary">
                        {s.wins}-{s.losses}
                      </td>
                      <td
                      className={`px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-center font-semibold ${
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
                    <td className="px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-right font-semibold text-japandi-text-primary">
                        {formatCurrency(s.amountToPayOrganizer)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        </div>

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
              href="/"
              className="flex-1 px-5 py-3 bg-japandi-background-card hover:bg-japandi-background-primary active:scale-95 text-japandi-text-primary border border-japandi-border-light font-semibold rounded-full transition-all text-center touch-manipulation"
            >
              Back to Home
            </Link>
          </div>
          <div className="pt-2">
            <Link
              href="/create-session"
              className="block w-full px-5 py-3 bg-japandi-accent-primary hover:bg-japandi-accent-hover active:scale-95 text-white font-semibold rounded-full transition-all text-center shadow-button touch-manipulation"
            >
              New Session
            </Link>
          </div>
          <div className="pt-1">
            <button
              type="button"
              onClick={handleEndSession}
              className="w-full px-5 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold rounded-full transition-all shadow-button touch-manipulation"
            >
              End Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

