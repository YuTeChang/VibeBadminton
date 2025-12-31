"use client";

import { useState, useEffect, useCallback } from "react";
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

  const loadGroupData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [fetchedGroup, fetchedPlayers, fetchedSessions] = await Promise.all([
        ApiClient.getGroup(groupId),
        ApiClient.getGroupPlayers(groupId),
        ApiClient.getGroupSessions(groupId),
      ]);
      setGroup(fetchedGroup);
      setPlayers(fetchedPlayers);
      setSessions(fetchedSessions);

      // Calculate simple stats for now (statsService is server-side only)
      // We'll calculate client-side stats from the sessions data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load group");
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  // Refresh data when pathname changes (e.g., when navigating back to this page)
  useEffect(() => {
    if (pathname === `/group/${groupId}`) {
      loadGroupData();
    }
  }, [pathname, groupId, loadGroupData]);

  // Refresh data when page becomes visible (e.g., when navigating back from creating a session)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadGroupData();
      }
    };

    const handleFocus = () => {
      loadGroupData();
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
            href="/"
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
            href="/"
            className="text-japandi-accent-primary hover:text-japandi-accent-hover text-sm transition-colors"
          >
            ← Back to Home
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-japandi-text-primary mt-4">
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
                        {session.name || formatDate(session.date)}
                      </h3>
                      <span className="text-xs text-japandi-accent-primary bg-japandi-background-primary px-2 py-1 rounded-full">
                        {session.players.length} players
                      </span>
                    </div>
                    <div className="text-sm text-japandi-text-muted">
                      {formatDate(session.date)} • {session.gameMode === "singles" ? "Singles" : "Doubles"}
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


