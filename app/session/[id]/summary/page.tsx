"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/contexts/SessionContext";
import {
  calculateFinalSettlement,
  formatCurrency,
  generateShareableText,
} from "@/lib/calculations";
import Link from "next/link";

export default function SummaryPage() {
  const params = useParams();
  const router = useRouter();
  const { session, games, clearSession } = useSession();
  const [copied, setCopied] = useState(false);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-japandi-background-primary">
        <p className="text-japandi-text-secondary">No session found</p>
        <Link href="/create-session" className="ml-4 text-japandi-accent-primary hover:text-japandi-accent-hover transition-colors">
          Create Session
        </Link>
      </div>
    );
  }

  const settlement = calculateFinalSettlement(session, games);
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
    if (confirm("Are you sure you want to end this session? This will clear all data.")) {
      clearSession();
      router.push("/");
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
            {session.name || "Badminton Session"} • {games.filter(g => g.winningTeam !== null).length} games played
          </p>
        </div>

        {/* Stats Table */}
        <div className="bg-japandi-background-card rounded-card border border-japandi-border-light overflow-hidden mb-6 shadow-soft">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full">
                <thead className="bg-japandi-background-primary">
                  <tr>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 text-left text-xs font-semibold text-japandi-text-primary uppercase tracking-wider min-w-[120px]">
                      Player
                    </th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 text-center text-xs font-semibold text-japandi-text-primary uppercase tracking-wider">
                      W/L
                    </th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 text-center text-xs font-semibold text-japandi-text-primary uppercase tracking-wider">
                      Net
                    </th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 text-right text-xs font-semibold text-japandi-text-primary uppercase tracking-wider">
                      Pay Organizer
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-japandi-border-light">
                  {settlement.map((s) => (
                    <tr key={s.playerId}>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-base font-medium text-japandi-text-primary max-w-[150px] sm:max-w-none">
                        <div className="flex flex-col sm:block min-w-0">
                          <span className="break-words break-all">{s.playerName}</span>
                          {s.playerId === session.organizerId && (
                            <span className="ml-0 sm:ml-2 text-xs text-japandi-accent-primary block sm:inline whitespace-nowrap">
                              (Organizer)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-center text-japandi-text-secondary">
                        {s.wins}-{s.losses}
                      </td>
                      <td
                        className={`px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-center font-medium ${
                          s.gamblingNet > 0
                            ? "text-japandi-accent-primary"
                            : s.gamblingNet < 0
                            ? "text-japandi-text-secondary"
                            : "text-japandi-text-muted"
                        }`}
                      >
                        {s.gamblingNet > 0 && "+"}
                        {formatCurrency(s.gamblingNet)}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-right font-semibold text-japandi-text-primary">
                        {formatCurrency(s.amountToPayOrganizer)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
          <pre className="bg-japandi-background-primary rounded-card p-4 text-sm text-japandi-text-primary whitespace-pre-wrap font-mono">
            {shareableText}
          </pre>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/session/${session.id}`}
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
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/create-session"
              className="flex-1 px-5 py-3 bg-japandi-accent-primary hover:bg-japandi-accent-hover active:scale-95 text-white font-semibold rounded-full transition-all text-center shadow-button touch-manipulation"
            >
              New Session
            </Link>
            <button
              onClick={handleEndSession}
              className="flex-1 px-5 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold rounded-full transition-all shadow-button touch-manipulation"
            >
              End Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

