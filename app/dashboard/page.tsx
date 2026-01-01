"use client";

import Link from "next/link";
import { useSession } from "@/contexts/SessionContext";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ApiClient } from "@/lib/api/client";

type SessionSummary = {
  id: string;
  name: string | null;
  date: Date;
  playerCount: number;
  gameMode: string;
  groupId: string | null;
};

export default function Dashboard() {
  const router = useRouter();
  const { session, games, loadSession, groups, ensureSessionsAndGroupsLoaded } = useSession();
  const [isLoaded, setIsLoaded] = useState(false);
  const [sessionSummaries, setSessionSummaries] = useState<SessionSummary[]>([]);
  const [groupSessionCounts, setGroupSessionCounts] = useState<Record<string, number>>({});
  const [sessionGameCounts, setSessionGameCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const hasLoadedDataRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate calls
    if (hasLoadedDataRef.current) return;
    
    // Double-check we're actually on the dashboard page (prevent prefetch calls)
    if (typeof window !== "undefined" && window.location.pathname !== '/dashboard') {
      return; // Not on dashboard, skip
    }
    
    const loadData = async () => {
      try {
        // Load groups first
        if (typeof window !== "undefined" && window.location.pathname === '/dashboard') {
          await ensureSessionsAndGroupsLoaded();
        }
        
        // Load lightweight session summaries (much faster than full sessions)
        const summaries = await ApiClient.getSessionSummaries();
        setSessionSummaries(summaries.map(s => ({ ...s, date: new Date(s.date) })));
        
        // Calculate session counts from summaries
        if (groups && groups.length > 0 && summaries.length > 0) {
          const counts: Record<string, number> = {};
          groups.forEach((group) => {
            const groupSessions = summaries.filter(s => s.groupId === group.id);
            counts[group.id] = groupSessions.length;
          });
          setGroupSessionCounts(counts);
        }
      } catch (error) {
        console.warn('[Dashboard] Failed to load data:', error);
      }

      // Load game counts for all sessions from localStorage
      if (typeof window !== "undefined") {
        try {
          const savedGames = localStorage.getItem("poweredbypace_games");
          if (savedGames) {
            const parsedGames = JSON.parse(savedGames);
            const counts: Record<string, number> = {};
            parsedGames.forEach((game: { sessionId: string }) => {
              counts[game.sessionId] = (counts[game.sessionId] || 0) + 1;
            });
            setSessionGameCounts(counts);
          }
        } catch (error) {
          // Silently handle errors
        }
      }
      
      setIsLoaded(true);
      hasLoadedDataRef.current = true;
    };

    loadData();
  }, [ensureSessionsAndGroupsLoaded, groups]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateWithTime = (date: Date) => {
    const d = new Date(date);
    const dateStr = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateStr} ${timeStr}`;
  };

  const handleSessionClick = (sessionId: string) => {
    loadSession(sessionId);
    router.push(`/session/${sessionId}`);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    const confirmed = window.confirm("Are you sure you want to delete this session? This action cannot be undone.");
    if (!confirmed) return;

    setIsDeleting(prev => ({ ...prev, [sessionId]: true }));
    try {
      await ApiClient.deleteSession(sessionId);
      // Remove from summaries
      setSessionSummaries(prev => prev.filter(s => s.id !== sessionId));
      // Update group counts
      const deletedSession = sessionSummaries.find(s => s.id === sessionId);
      if (deletedSession?.groupId) {
        setGroupSessionCounts(prev => ({
          ...prev,
          [deletedSession.groupId!]: Math.max(0, (prev[deletedSession.groupId!] || 0) - 1)
        }));
      }
    } catch (error) {
      console.error('[Dashboard] Failed to delete session:', error);
      alert('Failed to delete session. Please try again.');
    } finally {
      setIsDeleting(prev => {
        const updated = { ...prev };
        delete updated[sessionId];
        return updated;
      });
    }
  };

  // Filter standalone sessions (no group) and apply search
  const filteredStandaloneSessions = sessionSummaries
    .filter(s => !s.groupId)
    .filter(s => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const name = s.name?.toLowerCase() || '';
      return name.includes(query);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-japandi-text-primary">
          Sessions & Groups
        </h1>

        {/* Search Input */}
        {isLoaded && sessionSummaries.length > 0 && (
          <div className="text-left">
            <input
              type="text"
              placeholder="Search sessions by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 bg-japandi-background-card border border-japandi-border-light rounded-full text-japandi-text-primary placeholder-japandi-text-muted focus:outline-none focus:border-japandi-accent-primary transition-colors"
            />
          </div>
        )}

        {/* Groups Section */}
        {isLoaded && groups.length > 0 && (
          <div className="space-y-3 text-left">
            <h2 className="text-lg font-semibold text-japandi-text-primary mb-3">
              Your Groups
            </h2>
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/group/${group.id}`}
                className="block bg-japandi-background-card border border-japandi-border-light rounded-card p-4 sm:p-5 shadow-soft hover:border-japandi-accent-primary transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold text-japandi-text-primary">
                    {group.name}
                  </h3>
                  <span className="text-xs text-japandi-accent-primary bg-japandi-background-primary px-2 py-1 rounded-full">
                    {groupSessionCounts[group.id] || 0} sessions
                  </span>
                </div>
                <div className="text-sm text-japandi-text-muted">
                  Share link: {group.shareableLink}
                </div>
              </Link>
            ))}
          </div>
        )}
        
        {/* Standalone Sessions List */}
        {isLoaded && filteredStandaloneSessions.length > 0 && (
          <div className="space-y-3 text-left">
            <h2 className="text-lg font-semibold text-japandi-text-primary mb-3">
              Standalone Sessions
            </h2>
            {filteredStandaloneSessions.map((s) => {
              const isActive = session?.id === s.id;
              const gameCount = sessionGameCounts[s.id] || 0;
              return (
                <div
                  key={s.id}
                  className={`bg-japandi-background-card border rounded-card p-4 sm:p-5 shadow-soft ${
                    isActive
                      ? "border-2 border-japandi-accent-primary"
                      : "border-japandi-border-light"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold text-japandi-text-primary">
                      {s.name || formatDateWithTime(s.date)}
                    </h3>
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <span className="text-xs text-japandi-accent-primary bg-japandi-background-primary px-2 py-1 rounded-full">
                          Active
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDeleteSession(s.id, e)}
                        disabled={isDeleting[s.id]}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50 touch-manipulation"
                        title="Delete session"
                      >
                        {isDeleting[s.id] ? "..." : "🗑️"}
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-japandi-text-muted mb-3">
                    {formatDateWithTime(s.date)} • {s.playerCount} players • {s.gameMode === "singles" ? "Singles" : "Doubles"}
                  </div>
                  {gameCount > 0 && (
                    <div className="text-xs text-japandi-text-muted mb-3">
                      {gameCount} {gameCount === 1 ? "game" : "games"} played
                    </div>
                  )}
                  <button
                    onClick={() => handleSessionClick(s.id)}
                    className="w-full bg-japandi-accent-primary hover:bg-japandi-accent-hover active:scale-95 text-white font-semibold py-2.5 px-4 rounded-full transition-all shadow-button touch-manipulation"
                  >
                    {isActive ? "Continue Session" : "Open Session"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* No results message */}
        {isLoaded && searchQuery.trim() && filteredStandaloneSessions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-japandi-text-muted">No sessions found matching &quot;{searchQuery}&quot;</p>
          </div>
        )}

        {/* Continue Active Session Card (if different from list) */}
        {isLoaded && session && !sessionSummaries.find(s => s.id === session.id) && (
          <div className="bg-japandi-background-card border border-japandi-border-light rounded-card p-6 text-left shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-japandi-text-primary">
                Active Session
              </h2>
              <span className="text-xs text-japandi-accent-primary bg-japandi-background-primary px-3 py-1 rounded-full">
                {games.length} {games.length === 1 ? "game" : "games"}
              </span>
            </div>
            <div className="text-base text-japandi-text-primary mb-2">
              {session.name || "Untitled Session"}
            </div>
            <div className="text-sm text-japandi-text-muted mb-4">
              {formatDate(session.date)} • {session.players.length} players
            </div>
            <Link
              href={`/session/${session.id}`}
              className="block w-full bg-japandi-accent-primary hover:bg-japandi-accent-hover active:scale-95 text-white font-semibold py-3 px-6 rounded-full transition-all text-center shadow-button touch-manipulation"
            >
              Continue Session
            </Link>
          </div>
        )}

        {/* Empty State */}
        {isLoaded && groups.length === 0 && filteredStandaloneSessions.length === 0 && !session && (
          <div className="text-center py-8">
            <p className="text-japandi-text-muted mb-6">No groups or sessions yet</p>
            <div className="space-y-3">
              <Link
                href="/create-group"
                className="inline-block w-full bg-japandi-background-card hover:bg-japandi-background-primary active:scale-95 text-japandi-text-primary border border-japandi-border-light font-semibold py-3 px-6 rounded-full transition-all touch-manipulation"
              >
                Create New Group
              </Link>
              <Link
                href="/create-session"
                className="inline-block w-full bg-japandi-accent-primary hover:bg-japandi-accent-hover active:scale-95 text-white font-semibold py-3 px-6 rounded-full transition-all shadow-button touch-manipulation"
              >
                Quick Session (No Group)
              </Link>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isLoaded && (groups.length > 0 || filteredStandaloneSessions.length > 0) && (
          <div className="pt-4 space-y-3">
            <Link
              href="/create-group"
              className="inline-block w-full bg-japandi-background-card hover:bg-japandi-background-primary active:scale-95 text-japandi-text-primary border border-japandi-border-light font-semibold py-3 px-6 rounded-full transition-all touch-manipulation"
            >
              Create New Group
            </Link>
            <Link
              href="/create-session"
              className="inline-block w-full bg-japandi-accent-primary hover:bg-japandi-accent-hover active:scale-95 text-white font-semibold py-3 px-6 rounded-full transition-all shadow-button touch-manipulation"
            >
              Quick Session (No Group)
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
