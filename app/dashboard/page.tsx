"use client";

import Link from "next/link";
import { useSession } from "@/contexts/SessionContext";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { ApiClient } from "@/lib/api/client";
import { Group } from "@/types";

type SessionSummary = {
  id: string;
  name: string | null;
  date: Date;
  playerCount: number;
  gameMode: string;
  groupId: string | null;
};

export default function Dashboard() {
  const pathname = usePathname();
  const { session, games, loadSession } = useSession();
  const [isLoaded, setIsLoaded] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [sessionSummaries, setSessionSummaries] = useState<SessionSummary[]>([]);
  const [groupSessionCounts, setGroupSessionCounts] = useState<Record<string, number>>({});
  const [sessionGameCounts, setSessionGameCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [isDeletingGroup, setIsDeletingGroup] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const hasLoadedDataRef = useRef(false);
  const isLoadingSummariesRef = useRef(false);
  
  // Track pathname changes to detect when returning to dashboard
  const prevPathnameRef = useRef<string | null>(null);
  const lastLoadRef = useRef<number>(0);
  const REFRESH_DEBOUNCE_MS = 500;

  useEffect(() => {
    // Prevent duplicate calls
    if (hasLoadedDataRef.current) {
      return;
    }
    
    // Double-check we're actually on the dashboard page (prevent prefetch calls)
    if (typeof window !== "undefined" && window.location.pathname !== '/dashboard') {
      return;
    }
    
    const loadData = async () => {
      try {
        // Load groups and summaries in parallel for better performance
        // This avoids the expensive getAllSessions() call from ensureSessionsAndGroupsLoaded()
        const [fetchedGroups, summaries] = await Promise.all([
          ApiClient.getAllGroups(),
          (async () => {
            // Prevent duplicate summary calls
            if (isLoadingSummariesRef.current) {
              return [];
            }
            isLoadingSummariesRef.current = true;
            try {
              return await ApiClient.getSessionSummaries();
            } finally {
              isLoadingSummariesRef.current = false;
            }
          })()
        ]);
        
        setGroups(fetchedGroups);
        const summariesWithDates = summaries.map(s => ({ ...s, date: new Date(s.date) }));
        setSessionSummaries(summariesWithDates);
        
        // Calculate session counts from summaries
        if (fetchedGroups && fetchedGroups.length > 0 && summaries.length > 0) {
          const counts: Record<string, number> = {};
          fetchedGroups.forEach((group) => {
            // Explicitly filter out standalone sessions (null/undefined groupId)
            const groupSessions = summaries.filter(s => 
              s.groupId != null && s.groupId === group.id
            );
            counts[group.id] = groupSessions.length;
          });
          setGroupSessionCounts(counts);
        }
      } catch {
        // Silently handle data loading errors
      }
      
      setIsLoaded(true);
      hasLoadedDataRef.current = true;
    };

    loadData();
  }, []);

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    hasLoadedDataRef.current = false; // Allow reload
    try {
      const [fetchedGroups, summaries] = await Promise.all([
        ApiClient.getAllGroups(),
        ApiClient.getSessionSummaries(),
      ]);
      
      setGroups(fetchedGroups);
      const summariesWithDates = summaries.map(s => ({ ...s, date: new Date(s.date) }));
      setSessionSummaries(summariesWithDates);
      
      // Recalculate group session counts
      if (fetchedGroups && fetchedGroups.length > 0 && summariesWithDates.length > 0) {
        const counts: Record<string, number> = {};
        fetchedGroups.forEach((group) => {
          const groupSessions = summariesWithDates.filter(s => 
            s.groupId != null && s.groupId === group.id
          );
          counts[group.id] = groupSessions.length;
        });
        setGroupSessionCounts(counts);
      }
    } catch {
      // Silently handle refresh errors
    } finally {
      setIsRefreshing(false);
      hasLoadedDataRef.current = true;
    }
  };

  // Detect when returning to dashboard and refresh automatically
  useEffect(() => {
    let refreshTimer: NodeJS.Timeout | null = null;
    
    if (pathname === '/dashboard') {
      const prevPath = prevPathnameRef.current;
      if (prevPath !== null && prevPath !== pathname) {
        // Check if we're coming from create-session or session page
        const isReturningFromSession = 
          prevPath === '/create-session' || 
          prevPath?.startsWith('/create-session') ||
          prevPath?.startsWith('/session/');
        
        const now = Date.now();
        const timeSinceLastLoad = now - lastLoadRef.current;
        
        if (isReturningFromSession || timeSinceLastLoad > REFRESH_DEBOUNCE_MS) {
          lastLoadRef.current = now;
          
          // If returning from session-related page, add delay for database replication
          if (isReturningFromSession) {
            refreshTimer = setTimeout(() => {
              handleRefresh();
            }, 500);
          } else {
            handleRefresh();
          }
        }
      }
      prevPathnameRef.current = pathname;
    } else {
      // Track that we've navigated away
      prevPathnameRef.current = pathname;
    }
    
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [pathname]);

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
    window.location.href = `/session/${sessionId}`;
  };

  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    const group = groups.find(g => g.id === groupId);
    const sessionCount = groupSessionCounts[groupId] || 0;
    
    const confirmed = window.confirm(
      `⚠️ DELETE GROUP: "${group?.name}"\n\n` +
      `This will permanently delete:\n` +
      `• The group\n` +
      `• ${sessionCount} session(s)\n` +
      `• All players, games, and stats\n\n` +
      `This action CANNOT be undone!\n\n` +
      `Type the group name to confirm deletion.`
    );
    if (!confirmed) return;
    
    // Extra confirmation by typing group name
    const typedName = prompt(`Type the group name "${group?.name}" to confirm deletion:`);
    if (typedName !== group?.name) {
      alert('Group name does not match. Deletion cancelled.');
      return;
    }

    setIsDeletingGroup(prev => ({ ...prev, [groupId]: true }));
    
    // OPTIMISTIC UPDATE: Immediately remove from UI
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setGroupSessionCounts(prev => {
      const updated = { ...prev };
      delete updated[groupId];
      return updated;
    });
    // Remove all sessions belonging to this group
    setSessionSummaries(prev => prev.filter(s => s.groupId !== groupId));
    
    try {
      const result = await ApiClient.deleteGroup(groupId);
      if (!result.success) {
        throw new Error('Deletion failed: API returned unsuccessful response');
      }
      
      // Background refresh to ensure consistency
      try {
        const [refreshedGroups, refreshedSummaries] = await Promise.all([
          ApiClient.getAllGroups(),
          ApiClient.getSessionSummaries(),
        ]);
        setGroups(refreshedGroups);
        const summariesWithDates = refreshedSummaries.map(s => ({ ...s, date: new Date(s.date) }));
        setSessionSummaries(summariesWithDates);
        
        // Recalculate counts
        const counts: Record<string, number> = {};
        refreshedGroups.forEach((g) => {
          const groupSessions = summariesWithDates.filter(s => s.groupId === g.id);
          counts[g.id] = groupSessions.length;
        });
        setGroupSessionCounts(counts);
      } catch {
        console.warn('Background refresh after group delete failed');
      }
    } catch (error) {
      alert('Failed to delete group. Please try again.');
      // Reload data to restore state
      handleRefresh();
    } finally {
      setIsDeletingGroup(prev => {
        const updated = { ...prev };
        delete updated[groupId];
        return updated;
      });
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    const confirmed = window.confirm("⚠️ Delete this session?\n\nThis will permanently delete all games and cannot be undone.");
    if (!confirmed) return;

    setIsDeleting(prev => ({ ...prev, [sessionId]: true }));
    
    // Store the deleted session info for potential rollback
    const deletedSession = sessionSummaries.find(s => s.id === sessionId);
    
    // OPTIMISTIC UPDATE: Immediately remove from UI for instant feedback
    setSessionSummaries(prev => prev.filter(s => s.id !== sessionId));
    if (deletedSession?.groupId) {
      setGroupSessionCounts(prev => ({
        ...prev,
        [deletedSession.groupId!]: Math.max(0, (prev[deletedSession.groupId!] || 0) - 1)
      }));
    }
    
    try {
      // Delete from API and verify response
      const result = await ApiClient.deleteSession(sessionId);
      if (!result.success) {
        throw new Error('Deletion failed: API returned unsuccessful response');
      }
      
      // Background refresh from API to ensure eventual consistency
      // This runs after optimistic update, so even if API returns stale data, we filter it out
      try {
        const refreshedSummaries = await ApiClient.getSessionSummaries();
        // Filter out the deleted session in case API returns stale data
        const filteredSummaries = refreshedSummaries.filter(s => s.id !== sessionId);
        const summariesWithDates = filteredSummaries.map(s => ({ ...s, date: new Date(s.date) }));
        setSessionSummaries(summariesWithDates);
        
        // Recalculate group counts from refreshed summaries
        if (groups.length > 0 && summariesWithDates.length > 0) {
          const counts: Record<string, number> = {};
          groups.forEach((group) => {
            const groupSessions = summariesWithDates.filter(s => 
              s.groupId != null && s.groupId === group.id
            );
            counts[group.id] = groupSessions.length;
          });
          setGroupSessionCounts(counts);
        } else {
          setGroupSessionCounts({});
        }
      } catch {
        // Optimistic update already done, so just log and continue
        console.warn('Background refresh after delete failed, relying on optimistic update');
      }
    } catch {
      // ROLLBACK: Restore the session to the list since deletion failed
      if (deletedSession) {
        setSessionSummaries(prev => [...prev, deletedSession].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
        if (deletedSession.groupId) {
          setGroupSessionCounts(prev => ({
            ...prev,
            [deletedSession.groupId!]: (prev[deletedSession.groupId!] || 0) + 1
          }));
        }
      }
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
  // Explicitly check for null/undefined/empty string to catch all standalone sessions
  const filteredStandaloneSessions = sessionSummaries
    .filter(s => {
      // Explicitly check for standalone sessions (null, undefined, or empty string)
      const isStandalone = s.groupId == null || s.groupId === '' || s.groupId === undefined;
      return isStandalone;
    })
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
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="text-japandi-accent-primary hover:text-japandi-accent-hover active:opacity-70 text-sm transition-all flex items-center gap-1 touch-manipulation"
          >
            ← Back to Home
          </Link>
        </div>
        <div className="flex items-center justify-between w-full">
          <h1 className="text-3xl sm:text-4xl font-bold text-japandi-text-primary">
            Sessions & Groups
          </h1>
          <div className="flex items-center gap-2">
            {isLoaded && (
              <>
                <button
                  onClick={() => setAdminMode(!adminMode)}
                  className={`px-3 py-2 text-sm font-medium rounded-full border transition-all touch-manipulation ${
                    adminMode
                      ? 'bg-red-500 text-white border-red-600 hover:bg-red-600'
                      : 'bg-japandi-background-card hover:bg-japandi-background-primary text-japandi-text-primary border-japandi-border-light'
                  }`}
                  title={adminMode ? "Exit Admin Mode" : "Enter Admin Mode (Delete)"}
                >
                  {adminMode ? "🗑️ Admin" : "Admin"}
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="px-3 py-2 bg-japandi-background-card hover:bg-japandi-background-primary text-japandi-text-primary text-sm font-medium rounded-full border border-japandi-border-light transition-all disabled:opacity-50 touch-manipulation"
                  title="Refresh sessions list"
                >
                  {isRefreshing ? "..." : "↻"}
                </button>
              </>
            )}
          </div>
        </div>
        
        {adminMode && (
          <div className="bg-red-50 border border-red-200 rounded-card p-3 text-left">
            <p className="text-sm text-red-800">
              <strong>⚠️ Admin Mode Active:</strong> Delete buttons are now visible. Use with caution - deletions cannot be undone!
            </p>
          </div>
        )}

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
              <div
                key={group.id}
                className="bg-japandi-background-card border border-japandi-border-light rounded-card p-4 sm:p-5 shadow-soft hover:border-japandi-accent-primary transition-colors"
              >
                <Link
                  href={`/group/${group.id}`}
                  prefetch={false}
                  className="block"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-base font-semibold text-japandi-text-primary flex-1">
                      {group.name}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-japandi-accent-primary bg-japandi-background-primary px-2 py-1 rounded-full whitespace-nowrap">
                        {groupSessionCounts[group.id] || 0} sessions
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-japandi-text-muted">
                    Share link: {group.shareableLink}
                  </div>
                </Link>
                {adminMode && (
                  <button
                    onClick={(e) => handleDeleteGroup(group.id, e)}
                    disabled={isDeletingGroup[group.id]}
                    className="mt-3 w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-full transition-all disabled:opacity-50 touch-manipulation"
                    title="Delete group and all its data"
                  >
                    {isDeletingGroup[group.id] ? "Deleting..." : "Delete Group"}
                  </button>
                )}
              </div>
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
                      {adminMode && (
                        <button
                          onClick={(e) => handleDeleteSession(s.id, e)}
                          disabled={isDeleting[s.id]}
                          className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded transition-all disabled:opacity-50 touch-manipulation"
                          title="Delete session"
                        >
                          {isDeleting[s.id] ? "..." : "Delete"}
                        </button>
                      )}
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
        {/* Only show if active session is NOT already in the standalone sessions list */}
        {isLoaded && session && !filteredStandaloneSessions.find(s => s.id === session.id) && (
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
