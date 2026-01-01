"use client";

import Link from "next/link";
import { Session } from "@/types";
import { formatCurrency } from "@/lib/calculations";
import { useSession } from "@/contexts/SessionContext";
import { useRouter } from "next/navigation";

interface SessionHeaderProps {
  session: Session;
}

export default function SessionHeader({ session }: SessionHeaderProps) {
  const router = useRouter();
  const { clearSession } = useSession();
  const formattedDate = new Date(session.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleDeleteSession = async () => {
    const confirmed = window.confirm("Are you sure you want to delete this session? This action cannot be undone.");
    if (!confirmed) return;
    try {
      const { ApiClient } = await import("@/lib/api/client");
      await ApiClient.deleteSession(session.id);
      clearSession();
      setTimeout(() => {
        router.push("/");
      }, 100);
    } catch (error) {
      console.error('[SessionHeader] Failed to delete session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  return (
    <div className="bg-japandi-background-card border-b border-japandi-border-light sticky top-0 z-10 shadow-soft">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex items-start justify-between mb-3">
          <Link
            href="/"
            className="text-japandi-accent-primary hover:text-japandi-accent-hover active:opacity-70 text-sm transition-all flex items-center gap-1 touch-manipulation"
          >
            ← Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDeleteSession}
              className="text-sm text-red-600 hover:text-red-700 active:opacity-70 transition-all touch-manipulation"
            >
              Delete
            </button>
          </div>
        </div>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-japandi-text-primary">
              {session.name || "Badminton Session"}
            </h1>
            <p className="text-sm sm:text-base text-japandi-text-secondary mt-1 sm:mt-2">
              {formattedDate}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm text-japandi-text-muted">
                {session.players.length} players
              </span>
              <span className="text-sm text-japandi-text-muted">
                •
              </span>
              <span className="text-sm text-japandi-text-muted">
                {formatCurrency(session.betPerPlayer)} per game
              </span>
            </div>
          </div>
          <Link
            href={`/session/${session.id}/summary`}
            className="px-4 sm:px-5 py-2 sm:py-2.5 bg-japandi-accent-primary hover:bg-japandi-accent-hover text-white text-xs sm:text-sm font-semibold rounded-full transition-colors shadow-button whitespace-nowrap"
          >
            View Summary
          </Link>
        </div>
      </div>
    </div>
  );
}

