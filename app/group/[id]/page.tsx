"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Group, GroupPlayer, Session } from "@/types";
import { ApiClient } from "@/lib/api/client";
import { formatPercentage } from "@/lib/calculations";

interface GroupPlayerStats {
  groupPlayerId: string;
  playerName: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  sessionsPlayed: number;
}

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [players, setPlayers] = useState<GroupPlayer[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"sessions" | "players" | "stats">("sessions");
  const [playerStats, setPlayerStats] = useState<GroupPlayerStats[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadGroupData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('[GroupPage] Loading group data for groupId:', groupId);
      
      const [fetchedGroup, fetchedPlayers, fetchedSessions] = await Promise.all([
        ApiClient.getGroup(groupId).catch(err => {
          console.error('[GroupPage] Error fetching group:', err);
          throw err;
        }),
        ApiClient.getGroupPlayers(groupId).catch(err => {
          console.error('[GroupPage] Error fetching players:', err);
          return [];
        }),
        ApiClient.getGroupSessions(groupId).catch(err => {
          console.error('[GroupPage] Error fetching sessions:', err);
          console.error('[GroupPage] Error details:', err.message, err.stack);
          return [];
        }),
      ]);
      
      console.log('[GroupPage] Loaded data:', {
        group: fetchedGroup?.name,
        playersCount: fetchedPlayers?.length,
        sessionsCount: fetchedSessions?.length,
        sessions: fetchedSessions?.map(s => ({ id: s.id, name: s.name, groupId: s.groupId })),
      });
      
      setGroup(fetchedGroup);
      setPlayers(fetchedPlayers || []);
      setSessions(fetchedSessions || []);
      
      console.log('[GroupPage] State updated. Sessions state:', fetchedSessions?.length || 0);

      // Calculate simple stats for now (statsService is server-side only)
      // We'll calculate client-side stats from the sessions data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load group");
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  // Track last load time to prevent duplicate calls
  const lastLoadRef = useRef<number>(0);
  const REFRESH_DEBOUNCE_MS = 500; // Don't refresh more than once per 500ms

  // Single effect to load data on mount and when groupId changes
  useEffect(() => {
    const now = Date.now();
    if (now - lastLoadRef.current < REFRESH_DEBOUNCE_MS) {
      console.log('[GroupPage] Skipping duplicate load (too soon after last load)');
      return;
    }
    lastLoadRef.current = now;
    console.log('[GroupPage] Loading data (mount or groupId change)');
    loadGroupData();
  }, [groupId, loadGroupData]);

  // Refresh data when pathname changes (only if different from initial load)
  const prevPathnameRef = useRef<string | null>(null);
  useEffect(() => {
    if (pathname === `/group/${groupId}` && prevPathnameRef.current !== pathname) {
      const now = Date.now();
      if (now - lastLoadRef.current > REFRESH_DEBOUNCE_MS) {
        console.log('[GroupPage] Pathname changed, refreshing data...');
        lastLoadRef.current = now;
        const timer = setTimeout(() => {
          loadGroupData();
        }, 100);
        prevPathnameRef.current = pathname;
        return () => clearTimeout(timer);
      }
    }
  }, [pathname, groupId, loadGroupData]);

  // Refresh data when page becomes visible (with debounce)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastLoadRef.current > REFRESH_DEBOUNCE_MS) {
          console.log('[GroupPage] Page became visible, refreshing data...');
          lastLoadRef.current = now;
          loadGroupData();
        }
      }
    };

    const handleFocus = () => {
      const now = Date.now();
      if (now - lastLoadRef.current > REFRESH_DEBOUNCE_MS) {
        console.log('[GroupPage] Window focused, refreshing data...');
        lastLoadRef.current = now;
        loadGroupData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadGroupData]);

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;

    setIsAddingPlayer(true);
    try {
      const result = await ApiClient.addGroupPlayer(groupId, newPlayerName.trim());
      setPlayers([...players, result.player]);
      setNewPlayerName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add player");
    } finally {
      setIsAddingPlayer(false);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    try {
      await ApiClient.removeGroupPlayer(groupId, playerId);
      setPlayers(players.filter((p) => p.id !== playerId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove player");
    }
  };

  const getShareableUrl = () => {
    if (!group) return "";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/group/shareable/${group.shareableLink}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareableUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-japandi-background-primary flex items-center justify-center">
        <div className="text-japandi-text-secondary">Loading group...</div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-japandi-background-primary py-8">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-japandi-text-primary mb-4">Group Not Found</h1>
          <p className="text-japandi-text-secondary mb-6">{error || "This group does not exist."}</p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-japandi-accent-primary hover:bg-japandi-accent-hover text-white font-semibold rounded-full transition-all"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-japandi-background-primary pb-24">
      {/* Header */}
      <div className="bg-japandi-background-card border-b border-japandi-border-light py-4 sm:py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/dashboard"
            className="text-japandi-accent-primary hover:text-japandi-accent-hover text-sm transition-colors"
          >
            ← Back to Home
          </Link>
          <div className="flex items-start justify-between mt-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-japandi-text-primary">
                {group.name}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-japandi-text-muted">Share:</span>
                <code className="text-sm text-japandi-accent-primary bg-japandi-background-primary px-2 py-1 rounded">
                  {group.shareableLink}
                </code>
                <button
                  onClick={handleCopyLink}
                  className="text-sm text-japandi-accent-primary hover:text-japandi-accent-hover transition-colors"
                >
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
            </div>
            <button
              onClick={async () => {
                const confirmed = window.confirm("Are you sure you want to delete this group? This will also delete all sessions in this group. This action cannot be undone.");
                if (!confirmed) return;
                setIsDeleting(true);
                try {
                  await ApiClient.deleteGroup(groupId);
                  router.push("/dashboard");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to delete group");
                  setIsDeleting(false);
                }
              }}
              disabled={isDeleting}
              className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded transition-colors disabled:opacity-50 touch-manipulation"
            >
              {isDeleting ? "Deleting..." : "Delete Group"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-japandi-background-card border-b border-japandi-border-light">
        <div className="max-w-2xl mx-auto px-4 flex">
          <button
            onClick={() => {
              setActiveTab("sessions");
              loadGroupData(); // Refresh when switching to sessions tab
            }}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "sessions"
                ? "border-japandi-accent-primary text-japandi-accent-primary"
                : "border-transparent text-japandi-text-muted hover:text-japandi-text-primary"
            }`}
          >
            Sessions ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab("players")}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "players"
                ? "border-japandi-accent-primary text-japandi-accent-primary"
                : "border-transparent text-japandi-text-muted hover:text-japandi-text-primary"
            }`}
          >
            Players ({players.length})
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Sessions Tab */}
        {activeTab === "sessions" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-japandi-text-primary">Sessions</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => loadGroupData()}
                  className="px-3 py-2 bg-japandi-background-card hover:bg-japandi-background-primary text-japandi-text-primary text-sm font-medium rounded-full border border-japandi-border-light transition-all"
                  title="Refresh sessions list"
                >
                  ↻ Refresh
                </button>
                <Link
                  href={`/create-session?groupId=${groupId}`}
                  className="px-4 py-2 bg-japandi-accent-primary hover:bg-japandi-accent-hover text-white text-sm font-semibold rounded-full transition-all"
                >
                  + New Session
                </Link>
              </div>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-12 text-japandi-text-muted">
                <p className="mb-4">No sessions yet</p>
                <Link
                  href={`/create-session?groupId=${groupId}`}
                  className="text-japandi-accent-primary hover:text-japandi-accent-hover"
                >
                  Create your first session
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/session/${session.id}`}
                    className="block bg-japandi-background-card border border-japandi-border-light rounded-card p-4 shadow-soft hover:border-japandi-accent-primary transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-japandi-text-primary">
                        {session.name || formatDateWithTime(session.date)}
                      </h3>
                      <span className="text-xs text-japandi-accent-primary bg-japandi-background-primary px-2 py-1 rounded-full">
                        {session.players.length} players
                      </span>
                    </div>
                    <div className="text-sm text-japandi-text-muted">
                      {formatDateWithTime(session.date)} • {session.gameMode === "singles" ? "Singles" : "Doubles"}
                      {session.bettingEnabled && " • Betting"}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Players Tab */}
        {activeTab === "players" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-japandi-text-primary">Player Pool</h2>
            <p className="text-sm text-japandi-text-muted">
              Add players to your group. They will appear as suggestions when creating sessions.
            </p>

            {/* Add player form */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Enter player name"
                className="flex-1 px-4 py-2 border border-japandi-border-light rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all"
                onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
              />
              <button
                onClick={handleAddPlayer}
                disabled={!newPlayerName.trim() || isAddingPlayer}
                className="px-4 py-2 bg-japandi-accent-primary hover:bg-japandi-accent-hover disabled:bg-japandi-text-muted text-white text-sm font-semibold rounded-card transition-all"
              >
                {isAddingPlayer ? "..." : "Add"}
              </button>
            </div>

            {/* Players list */}
            {players.length === 0 ? (
              <div className="text-center py-8 text-japandi-text-muted">
                No players yet. Add your first player above!
              </div>
            ) : (
              <div className="space-y-2">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between bg-japandi-background-card border border-japandi-border-light rounded-card p-3"
                  >
                    <span className="text-japandi-text-primary">{player.name}</span>
                    <button
                      onClick={() => handleRemovePlayer(player.id)}
                      className="text-red-500 hover:text-red-700 text-sm transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


