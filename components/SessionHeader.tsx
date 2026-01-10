"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Session } from "@/types";
import { formatCurrency } from "@/lib/calculations";
import { useSession } from "@/contexts/SessionContext";
import { useRouter } from "next/navigation";
import { ApiClient } from "@/lib/api/client";

interface SessionHeaderProps {
  session: Session;
}

export default function SessionHeader({ session }: SessionHeaderProps) {
  const router = useRouter();
  const { clearSession } = useSession();
  const [groupName, setGroupName] = useState<string | null>(null);
  const navigationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Determine if this is a group session
  const isGroupSession = !!session.groupId;
  
  // Fetch group name for group sessions
  useEffect(() => {
    if (session.groupId) {
      ApiClient.getGroup(session.groupId)
        .then(group => setGroupName(group.name))
        .catch(() => {}); // Fail silently, fall back to "Group"
    }
  }, [session.groupId]);

  // Cleanup timer on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
    };
  }, []);
  
  // Dynamic back navigation
  const backLink = isGroupSession ? `/group/${session.groupId}` : "/";
  const backText = isGroupSession 
    ? `← Back to ${groupName || 'Group'}` 
    : "← Back to Home";
  
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
      await ApiClient.deleteSession(session.id);
      clearSession();
      navigationTimerRef.current = setTimeout(() => {
        // Redirect to group page for group sessions, home for standalone
        router.push(isGroupSession ? `/group/${session.groupId}` : "/");
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
            href={backLink}
            className="text-japandi-accent-primary hover:text-japandi-accent-hover active:opacity-70 text-sm transition-all flex items-center gap-1 touch-manipulation"
          >
            {backText}
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

