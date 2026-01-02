"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Group, GroupPlayer, Session, LeaderboardEntry, PlayerDetailedStats, PairingStats, PairingDetailedStats } from "@/types";
import { ApiClient } from "@/lib/api/client";
import { formatPercentage } from "@/lib/calculations";
import { PlayerProfileSheet } from "@/components/PlayerProfileSheet";
import { PairingProfileSheet } from "@/components/PairingProfileSheet";
import { saveRecentGroup } from "@/lib/recentGroups";

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [players, setPlayers] = useState<GroupPlayer[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [pairings, setPairings] = useState<PairingStats[]>([]);
  const [groupStats, setGroupStats] = useState<{
    totalGames: number;
    totalSessions: number;
    totalPlayers: number;
    avgPointDifferential: number | null;
    gamesPerSession: number;
    closestMatchup: {
      team1Player1Name: string;
      team1Player2Name: string;
      team2Player1Name: string;
      team2Player2Name: string;
      team1Wins: number;
      team2Wins: number;
      totalGames: number;
    } | null;
    highestElo: { name: string; rating: number } | null;
    eloSpread: number | null;
    bestWinStreak: { name: string; streak: number } | null;
    mostGamesPlayed: { name: string; games: number } | null;
    dreamTeam: { player1Name: string; player2Name: string; winRate: number; gamesPlayed: number } | null;
    unluckyPlayer: { name: string; count: number } | null;
    unluckyPairing: { player1Name: string; player2Name: string; count: number } | null;
    firstSessionDate: Date | null;
    daysSinceFirstSession: number | null;
  } | null>(null);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [isLoadingPairings, setIsLoadingPairings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null); // For non-fatal errors (remove player, etc)
  const [newPlayerName, setNewPlayerName] = useState("");
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"sessions" | "leaderboard" | "players" | "pairings">("sessions");
  
  // Player profile modal state
  const [selectedPlayerStats, setSelectedPlayerStats] = useState<PlayerDetailedStats | null>(null);
  const [isLoadingPlayerStats, setIsLoadingPlayerStats] = useState(false);
  
  // Pairing profile modal state
  const [selectedPairingStats, setSelectedPairingStats] = useState<PairingDetailedStats | null>(null);
  const [isLoadingPairingStats, setIsLoadingPairingStats] = useState(false);

  // Recent guests state
  const [recentGuests, setRecentGuests] = useState<{
    name: string;
    sessionCount: number;
    lastSessionId: string;
    lastSessionName: string;
    lastSessionDate: string;
  }[]>([]);
  const [isLoadingGuests, setIsLoadingGuests] = useState(false);
  const [promotingGuest, setPromotingGuest] = useState<string | null>(null);
  const guestsLoadedRef = useRef<boolean>(false);

  // Load group and sessions immediately (fast initial render)
  const loadGroupData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Only load group and sessions initially - players/leaderboard load lazily
      const [fetchedGroup, fetchedSessions, fetchedStats] = await Promise.all([
        ApiClient.getGroup(groupId),
        ApiClient.getGroupSessions(groupId).catch(() => []),
        ApiClient.getGroupOverviewStats(groupId).catch(() => null),
      ]);
      
      setGroup(fetchedGroup);
      setSessions(fetchedSessions || []);
      setGroupStats(fetchedStats);
      
      // Save to recent groups for quick access from home page
      if (fetchedGroup?.shareableLink && fetchedGroup?.name) {
        saveRecentGroup(fetchedGroup.shareableLink, fetchedGroup.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load group");
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  // Lazy load players only when Players tab is clicked
  const loadPlayers = useCallback(async () => {
    if (playersLoadedRef.current) return;
    
    playersLoadedRef.current = true;
    setIsLoadingPlayers(true);
    try {
      const fetchedPlayers = await ApiClient.getGroupPlayers(groupId);
      setPlayers(fetchedPlayers || []);
    } catch (err) {
      console.error('[GroupPage] Error fetching players:', err);
      setPlayers([]);
    } finally {
      setIsLoadingPlayers(false);
    }
  }, [groupId]);

  // Lazy load leaderboard only when Leaderboard tab is clicked
  const loadLeaderboard = useCallback(async () => {
    if (leaderboardLoadedRef.current) return;
    
    leaderboardLoadedRef.current = true;
    setIsLoadingLeaderboard(true);
    try {
      const fetchedLeaderboard = await ApiClient.getGroupLeaderboard(groupId);
      setLeaderboard(fetchedLeaderboard || []);
    } catch (err) {
      console.error('[GroupPage] Error fetching leaderboard:', err);
      setLeaderboard([]);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, [groupId]);

  // Load player detailed stats
  const loadPlayerStats = async (playerId: string) => {
    setIsLoadingPlayerStats(true);
    try {
      const stats = await ApiClient.getPlayerDetailedStats(groupId, playerId);
      setSelectedPlayerStats(stats);
    } catch (err) {
      console.error('[GroupPage] Error fetching player stats:', err);
    } finally {
      setIsLoadingPlayerStats(false);
    }
  };

  // Lazy load pairings only when Pairings tab is clicked
  const loadPairings = useCallback(async () => {
    if (pairingsLoadedRef.current) return;
    
    pairingsLoadedRef.current = true;
    setIsLoadingPairings(true);
    try {
      const fetchedPairings = await ApiClient.getPairingLeaderboard(groupId);
      setPairings(fetchedPairings || []);
    } catch (err) {
      console.error('[GroupPage] Error fetching pairings:', err);
      setPairings([]);
    } finally {
      setIsLoadingPairings(false);
    }
  }, [groupId]);

  // Load pairing detailed stats
  const loadPairingStats = async (player1Id: string, player2Id: string) => {
    setIsLoadingPairingStats(true);
    try {
      const stats = await ApiClient.getPairingDetailedStats(groupId, player1Id, player2Id);
      setSelectedPairingStats(stats);
    } catch (err) {
      console.error('[GroupPage] Error fetching pairing stats:', err);
    } finally {
      setIsLoadingPairingStats(false);
    }
  };

  // Load recent guests (lazy load with players tab)
  const loadRecentGuests = useCallback(async () => {
    if (guestsLoadedRef.current) return;
    
    guestsLoadedRef.current = true;
    setIsLoadingGuests(true);
    try {
      const result = await ApiClient.getRecentGuests(groupId);
      setRecentGuests(result.guests || []);
    } catch (err) {
      console.error('[GroupPage] Error fetching guests:', err);
      setRecentGuests([]);
    } finally {
      setIsLoadingGuests(false);
    }
  }, [groupId]);

  // Promote guest to group player
  const handlePromoteGuest = async (guestName: string) => {
    setPromotingGuest(guestName);
    try {
      const result = await ApiClient.promoteGuestToGroup(groupId, guestName);
      // Add new player to list with zero stats (will be computed on reload)
      setPlayers(prev => [...prev, { ...result.player, wins: 0, losses: 0, totalGames: 0 }]);
      // Remove from guests list
      setRecentGuests(prev => prev.filter(g => g.name.toLowerCase() !== guestName.toLowerCase()));
      // Reset all refs to force reload with fresh data
      leaderboardLoadedRef.current = false;
      playersLoadedRef.current = false;
      guestsLoadedRef.current = false;
      // Force reload players with computed stats
      const fetchedPlayers = await ApiClient.getGroupPlayers(groupId);
      setPlayers(fetchedPlayers || []);
      // Force reload guests to ensure linked players don't show
      const guestResult = await ApiClient.getRecentGuests(groupId);
      setRecentGuests(guestResult.guests || []);
    } catch (err: any) {
      if (err?.existingPlayer) {
        alert(`Player "${guestName}" already exists in this group.`);
      } else {
        console.error('[GroupPage] Error promoting guest:', err);
        alert('Failed to add player to group. Please try again.');
      }
    } finally {
      setPromotingGuest(null);
    }
  };

  // Track last load time to prevent duplicate calls
  const lastLoadRef = useRef<number>(0);
  const REFRESH_DEBOUNCE_MS = 500;
  
  // Track if data has been loaded
  const playersLoadedRef = useRef<boolean>(false);
  const leaderboardLoadedRef = useRef<boolean>(false);
  const pairingsLoadedRef = useRef<boolean>(false);

  // Single effect to load data on mount and when groupId changes
  useEffect(() => {
    const needsRefreshKey = `group_${groupId}_needs_refresh`;
    const needsRefresh = typeof window !== "undefined" && sessionStorage.getItem(needsRefreshKey) !== null;
    
    if (needsRefresh) {
      sessionStorage.removeItem(needsRefreshKey);
      setTimeout(() => {
        loadGroupData();
        // Reset lazy load flags on refresh
        leaderboardLoadedRef.current = false;
      }, 500);
      return;
    }
    
    const now = Date.now();
    if (now - lastLoadRef.current >= REFRESH_DEBOUNCE_MS) {
      lastLoadRef.current = now;
      loadGroupData();
    }
  }, [groupId, loadGroupData]);

  // Lazy load data when tabs are clicked
  useEffect(() => {
    if (activeTab === 'players') {
      loadPlayers();
      loadRecentGuests(); // Also load guests on players tab
    } else if (activeTab === 'leaderboard') {
      loadLeaderboard();
    } else if (activeTab === 'pairings') {
      loadPairings();
    }
  }, [activeTab, loadPlayers, loadLeaderboard, loadPairings, loadRecentGuests]);

  // Track navigation for refresh handling
  const hasNavigatedAwayRef = useRef(false);
  const prevPathnameRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (pathname === `/group/${groupId}`) {
      const prevPath = prevPathnameRef.current;
      if (prevPath !== null && prevPath !== pathname) {
        const isReturningFromCreateSession = prevPath === '/create-session' || prevPath?.startsWith('/create-session');
        const now = Date.now();
        const timeSinceLastLoad = now - lastLoadRef.current;
        
        if (isReturningFromCreateSession || timeSinceLastLoad > REFRESH_DEBOUNCE_MS) {
          lastLoadRef.current = now;
          leaderboardLoadedRef.current = false; // Reset leaderboard on return
          if (isReturningFromCreateSession) {
            setTimeout(() => loadGroupData(), 500);
          } else {
            loadGroupData();
          }
        }
      }
      prevPathnameRef.current = pathname;
    } else {
      if (prevPathnameRef.current === `/group/${groupId}`) {
        hasNavigatedAwayRef.current = true;
      }
      prevPathnameRef.current = pathname;
    }
  }, [pathname, groupId, loadGroupData]);

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;

    setIsAddingPlayer(true);
    try {
      const result = await ApiClient.addGroupPlayer(groupId, newPlayerName.trim());
      // Add player with default stats
      const newPlayer = {
        ...result.player,
        wins: 0,
        losses: 0,
        totalGames: 0,
      };
      setPlayers([...players, newPlayer]);
      setNewPlayerName("");
      // Reset leaderboard cache so it reloads with new player
      leaderboardLoadedRef.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add player");
    } finally {
      setIsAddingPlayer(false);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    try {
      setActionError(null);
      await ApiClient.removeGroupPlayer(groupId, playerId);
      setPlayers(players.filter((p) => p.id !== playerId));
      // Reset leaderboard cache
      leaderboardLoadedRef.current = false;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove player";
      setActionError(message);
      // Auto-clear after 5 seconds
      setTimeout(() => setActionError(null), 5000);
    }
  };

  const handleRefreshLeaderboard = () => {
    leaderboardLoadedRef.current = false;
    loadLeaderboard();
  };

  const handleRefreshPairings = () => {
    pairingsLoadedRef.current = false;
    loadPairings();
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

  // Render trend indicator
  const renderTrend = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <span className="text-green-500 text-sm">↑</span>;
    if (trend === 'down') return <span className="text-red-500 text-sm">↓</span>;
    return <span className="text-japandi-text-muted text-sm">-</span>;
  };

  // Calculate streak from recent form and render badge
  const renderStreakBadge = (recentForm: ('W' | 'L')[]) => {
    if (recentForm.length === 0) return null;
    
    let streak = 0;
    const firstResult = recentForm[0];
    for (const result of recentForm) {
      if (result === firstResult) {
        streak++;
      } else {
        break;
      }
    }
    
    // Only show badge for 3+ streaks
    if (streak < 3) return null;
    
    if (firstResult === 'W') {
      return <span className="text-sm" title={`${streak} game win streak`}>🔥</span>;
    } else {
      return <span className="text-sm" title={`${streak} game losing streak`}>❄️</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-japandi-background-primary pb-24">
        {/* Header Skeleton */}
        <div className="bg-japandi-background-card border-b border-japandi-border-light py-4 sm:py-6 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="h-4 w-24 bg-japandi-background-primary rounded animate-pulse" />
            <div className="mt-4">
              <div className="h-8 w-48 bg-japandi-background-primary rounded animate-pulse" />
              <div className="flex items-center gap-2 mt-2">
                <div className="h-4 w-12 bg-japandi-background-primary rounded animate-pulse" />
                <div className="h-6 w-24 bg-japandi-background-primary rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="bg-japandi-background-card border-b border-japandi-border-light">
          <div className="max-w-2xl mx-auto px-4 flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="py-3 px-4">
                <div className="h-4 w-16 bg-japandi-background-primary rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* Group Stats Card Skeleton */}
          <div className="bg-japandi-background-card border border-japandi-border-light rounded-card p-4 shadow-soft">
            <div className="h-4 w-32 bg-japandi-background-primary rounded animate-pulse mb-3" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="h-8 w-16 bg-japandi-background-primary rounded animate-pulse" />
                <div className="h-3 w-20 bg-japandi-background-primary rounded animate-pulse mt-1" />
              </div>
              <div>
                <div className="h-8 w-16 bg-japandi-background-primary rounded animate-pulse" />
                <div className="h-3 w-20 bg-japandi-background-primary rounded animate-pulse mt-1" />
              </div>
            </div>
          </div>

          {/* Sessions Header Skeleton */}
          <div className="flex justify-between items-center">
            <div className="h-6 w-24 bg-japandi-background-primary rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-9 w-20 bg-japandi-background-primary rounded-full animate-pulse" />
              <div className="h-9 w-28 bg-japandi-background-primary rounded-full animate-pulse" />
            </div>
          </div>

          {/* Session Cards Skeleton */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-japandi-background-card border border-japandi-border-light rounded-card p-4 shadow-soft"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="h-5 w-40 bg-japandi-background-primary rounded animate-pulse" />
                <div className="h-6 w-20 bg-japandi-background-primary rounded-full animate-pulse" />
              </div>
              <div className="h-4 w-56 bg-japandi-background-primary rounded animate-pulse" />
            </div>
          ))}
        </div>
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
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-japandi-background-card border-b border-japandi-border-light">
        <div className="max-w-2xl mx-auto px-4 flex">
          <button
            onClick={() => setActiveTab("sessions")}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "sessions"
                ? "border-japandi-accent-primary text-japandi-accent-primary"
                : "border-transparent text-japandi-text-muted hover:text-japandi-text-primary"
            }`}
          >
            Sessions ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "leaderboard"
                ? "border-japandi-accent-primary text-japandi-accent-primary"
                : "border-transparent text-japandi-text-muted hover:text-japandi-text-primary"
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => {
              setActiveTab("players");
              loadRecentGuests(); // Load guests when players tab is clicked
            }}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "players"
                ? "border-japandi-accent-primary text-japandi-accent-primary"
                : "border-transparent text-japandi-text-muted hover:text-japandi-text-primary"
            }`}
          >
            Players
          </button>
          <button
            onClick={() => setActiveTab("pairings")}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "pairings"
                ? "border-japandi-accent-primary text-japandi-accent-primary"
                : "border-transparent text-japandi-text-muted hover:text-japandi-text-primary"
            }`}
          >
            Pairings
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Sessions Tab */}
        {activeTab === "sessions" && (
          <div className="space-y-4">
            {/* Group Stats Card - Expandable with extended stats */}
            <div className="bg-japandi-background-card border border-japandi-border-light rounded-card shadow-soft overflow-hidden">
              {groupStats && (groupStats.totalGames > 0 || groupStats.totalSessions > 0) ? (
                <>
                  {/* Header - Always visible */}
                  <button
                    onClick={() => setIsStatsExpanded(!isStatsExpanded)}
                    className="w-full p-4 text-left hover:bg-japandi-background-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-japandi-text-primary">Group Overview</h3>
                      <span className="text-japandi-text-muted text-xs">
                        {isStatsExpanded ? '▲ Less' : '▼ More'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-japandi-accent-primary">{groupStats.totalGames}</div>
                        <div className="text-xs text-japandi-text-muted">Games</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-japandi-accent-primary">{groupStats.totalSessions}</div>
                        <div className="text-xs text-japandi-text-muted">Sessions</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-japandi-accent-primary">{groupStats.totalPlayers || 0}</div>
                        <div className="text-xs text-japandi-text-muted">Players</div>
                      </div>
                    </div>
                  </button>
                  
                  {/* Expanded Stats */}
                  {isStatsExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-japandi-border-light">
                      {/* Performance Stats */}
                      <div className="pt-3">
                        <div className="text-xs font-medium text-japandi-text-muted uppercase tracking-wide mb-2">Performance</div>
                        <div className="grid grid-cols-2 gap-3">
                          {groupStats.avgPointDifferential !== null && (
                            <div className="bg-japandi-background-primary/50 rounded-lg p-3">
                              <div className="text-lg font-bold text-japandi-text-primary">{groupStats.avgPointDifferential}</div>
                              <div className="text-xs text-japandi-text-muted">Avg Point Diff</div>
                            </div>
                          )}
                          {groupStats.gamesPerSession > 0 && (
                            <div className="bg-japandi-background-primary/50 rounded-lg p-3">
                              <div className="text-lg font-bold text-japandi-text-primary">{groupStats.gamesPerSession}</div>
                              <div className="text-xs text-japandi-text-muted">Games/Session</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Records */}
                      <div>
                        <div className="text-xs font-medium text-japandi-text-muted uppercase tracking-wide mb-2">Records</div>
                        <div className="space-y-2">
                          {groupStats.highestElo && (
                            <div className="flex items-center justify-between bg-japandi-background-primary/50 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-base">👑</span>
                                <div>
                                  <div className="text-sm font-medium text-japandi-text-primary">{groupStats.highestElo.name}</div>
                                  <div className="text-xs text-japandi-text-muted">Highest ELO</div>
                                </div>
                              </div>
                              <div className="text-lg font-bold text-japandi-accent-primary">{groupStats.highestElo.rating}</div>
                            </div>
                          )}
                          {groupStats.bestWinStreak && groupStats.bestWinStreak.streak > 0 && (
                            <div className="flex items-center justify-between bg-japandi-background-primary/50 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-base">🔥</span>
                                <div>
                                  <div className="text-sm font-medium text-japandi-text-primary">{groupStats.bestWinStreak.name}</div>
                                  <div className="text-xs text-japandi-text-muted">Best Win Streak</div>
                                </div>
                              </div>
                              <div className="text-lg font-bold text-japandi-accent-primary">{groupStats.bestWinStreak.streak}</div>
                            </div>
                          )}
                          {groupStats.mostGamesPlayed && (
                            <div className="flex items-center justify-between bg-japandi-background-primary/50 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-base">🎯</span>
                                <div>
                                  <div className="text-sm font-medium text-japandi-text-primary">{groupStats.mostGamesPlayed.name}</div>
                                  <div className="text-xs text-japandi-text-muted">Most Games</div>
                                </div>
                              </div>
                              <div className="text-lg font-bold text-japandi-accent-primary">{groupStats.mostGamesPlayed.games}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pairs */}
                      <div>
                        <div className="text-xs font-medium text-japandi-text-muted uppercase tracking-wide mb-2">Pairs</div>
                        <div className="space-y-2">
                          {groupStats.dreamTeam && (
                            <div className="flex items-center justify-between bg-japandi-background-primary/50 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-base">🤝</span>
                                <div>
                                  <div className="text-sm font-medium text-japandi-text-primary">
                                    {groupStats.dreamTeam.player1Name} & {groupStats.dreamTeam.player2Name}
                                  </div>
                                  <div className="text-xs text-japandi-text-muted">Dream Team ({groupStats.dreamTeam.gamesPlayed}g)</div>
                                </div>
                              </div>
                              <div className="text-lg font-bold text-green-600">{groupStats.dreamTeam.winRate}%</div>
                            </div>
                          )}
                          {groupStats.closestMatchup && (
                            <div className="bg-japandi-background-primary/50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-base">⚔️</span>
                                <div className="text-xs text-japandi-text-muted">Closest Rivalry</div>
                              </div>
                              <div className="text-sm font-medium text-japandi-text-primary">
                                {groupStats.closestMatchup.team1Player1Name} & {groupStats.closestMatchup.team1Player2Name}
                              </div>
                              <div className="text-xs text-japandi-text-muted">vs</div>
                              <div className="text-sm font-medium text-japandi-text-primary">
                                {groupStats.closestMatchup.team2Player1Name} & {groupStats.closestMatchup.team2Player2Name}
                              </div>
                              <div className="text-xs text-japandi-accent-primary mt-1">
                                {groupStats.closestMatchup.team1Wins}-{groupStats.closestMatchup.team2Wins} ({groupStats.closestMatchup.totalGames} games)
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Unlucky Stats */}
                      {(groupStats.unluckyPlayer || groupStats.unluckyPairing) && (
                        <div>
                          <div className="text-xs font-medium text-japandi-text-muted uppercase tracking-wide mb-2">Unlucky (Lost by 1-2 pts)</div>
                          <div className="space-y-2">
                            {groupStats.unluckyPlayer && (
                              <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">💔</span>
                                  <div>
                                    <div className="text-sm font-medium text-japandi-text-primary">{groupStats.unluckyPlayer.name}</div>
                                    <div className="text-xs text-japandi-text-muted">Unluckiest Player</div>
                                  </div>
                                </div>
                                <div className="text-lg font-bold text-red-500">{groupStats.unluckyPlayer.count}</div>
                              </div>
                            )}
                            {groupStats.unluckyPairing && (
                              <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">💔</span>
                                  <div>
                                    <div className="text-sm font-medium text-japandi-text-primary">
                                      {groupStats.unluckyPairing.player1Name} & {groupStats.unluckyPairing.player2Name}
                                    </div>
                                    <div className="text-xs text-japandi-text-muted">Unluckiest Pair</div>
                                  </div>
                                </div>
                                <div className="text-lg font-bold text-red-500">{groupStats.unluckyPairing.count}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* History */}
                      {groupStats.daysSinceFirstSession !== null && groupStats.daysSinceFirstSession > 0 && (
                        <div className="pt-2 border-t border-japandi-border-light">
                          <div className="text-xs text-japandi-text-muted text-center">
                            🎂 {groupStats.daysSinceFirstSession} days since first session
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-japandi-text-primary mb-3">Group Overview</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-japandi-text-muted">0</div>
                      <div className="text-xs text-japandi-text-muted">Games</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-japandi-text-muted">0</div>
                      <div className="text-xs text-japandi-text-muted">Sessions</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-japandi-text-muted">0</div>
                      <div className="text-xs text-japandi-text-muted">Players</div>
                    </div>
                  </div>
                  <p className="text-xs text-japandi-text-muted mt-3 pt-3 border-t border-japandi-border-light">
                    Play some games to see group statistics!
                  </p>
                </div>
              )}
            </div>

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
                    prefetch={false}
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

        {/* Leaderboard Tab */}
        {activeTab === "leaderboard" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-japandi-text-primary">Leaderboard</h2>
              <button
                onClick={handleRefreshLeaderboard}
                className="px-3 py-2 bg-japandi-background-card hover:bg-japandi-background-primary text-japandi-text-primary text-sm font-medium rounded-full border border-japandi-border-light transition-all"
                title="Refresh leaderboard"
              >
                ↻ Refresh
              </button>
            </div>

            {isLoadingLeaderboard ? (
              <div className="space-y-2">
                {/* Skeleton rows that match actual leaderboard item height */}
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="bg-japandi-background-card border border-japandi-border-light rounded-xl p-4 shadow-soft"
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank skeleton */}
                      <div className="w-10 h-10 rounded-full bg-japandi-background-primary animate-pulse flex-shrink-0" />
                      {/* Player info skeleton */}
                      <div className="flex-1 min-w-0">
                        <div className="h-5 w-32 bg-japandi-background-primary rounded animate-pulse" />
                        <div className="h-4 w-24 bg-japandi-background-primary rounded animate-pulse mt-1" />
                      </div>
                      {/* Recent form skeleton */}
                      <div className="flex gap-1 flex-shrink-0">
                        {[1, 2, 3].map((j) => (
                          <div key={j} className="w-6 h-6 rounded bg-japandi-background-primary animate-pulse" />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12 text-japandi-text-muted">
                <p className="mb-2">No players yet</p>
                <p className="text-sm">Add players and play some games to see the leaderboard!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <button
                    key={entry.groupPlayerId}
                    onClick={() => loadPlayerStats(entry.groupPlayerId)}
                    className="w-full text-left bg-japandi-background-card border border-japandi-border-light rounded-xl p-4 shadow-soft hover:border-japandi-accent-primary transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-600' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-japandi-background-primary text-japandi-text-muted'
                      }`}>
                        #{entry.rank}
                      </div>
                      
                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-japandi-text-primary truncate">
                            {entry.playerName}
                          </span>
                          {renderStreakBadge(entry.recentForm)}
                          {renderTrend(entry.trend)}
                        </div>
                        <div className="text-sm text-japandi-text-muted">
                          {entry.wins}-{entry.losses} • {formatPercentage(entry.winRate)}
                        </div>
                      </div>
                      
                      {/* Recent Form - Last 3 on mobile, last 5 on desktop */}
                      {entry.recentForm.length > 0 ? (
                        <div className="flex gap-1 flex-shrink-0">
                          {/* Mobile: show last 3 */}
                          <div className="flex gap-1 sm:hidden">
                            {entry.recentForm.slice(0, 3).map((result, i) => (
                              <div
                                key={i}
                                className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center ${
                                  result === 'W'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {result}
                              </div>
                            ))}
                          </div>
                          {/* Desktop: show last 5 */}
                          <div className="hidden sm:flex gap-1">
                            {entry.recentForm.slice(0, 5).map((result, i) => (
                              <div
                                key={i}
                                className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center ${
                                  result === 'W'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {result}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-japandi-text-muted flex-shrink-0">
                          No games
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            <p className="text-center text-xs text-japandi-text-muted pt-4">
              Tap a player to see detailed stats
            </p>
          </div>
        )}

        {/* Players Tab */}
        {activeTab === "players" && (
          <div className="space-y-4">
            {/* Action error toast */}
            {actionError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-card text-sm">
                {actionError}
              </div>
            )}
            
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
                className="flex-1 px-4 py-2 border border-japandi-border-light rounded-card bg-japandi-background-card text-japandi-text-primary text-base focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all"
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

            {/* Players list with skeleton loading */}
            {isLoadingPlayers ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-japandi-background-card border border-japandi-border-light rounded-card p-3"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-5 w-28 bg-japandi-background-primary rounded animate-pulse" />
                      <div className="h-4 w-16 bg-japandi-background-primary rounded animate-pulse" />
                    </div>
                    <div className="h-4 w-16 bg-japandi-background-primary rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : players.length === 0 ? (
              <div className="text-center py-8 text-japandi-text-muted">
                No players yet. Add your first player above!
              </div>
            ) : (
              <div className="space-y-2">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between bg-japandi-background-card border border-japandi-border-light rounded-card p-3 hover:border-japandi-accent-primary transition-colors"
                  >
                    <button
                      onClick={() => loadPlayerStats(player.id)}
                      className="flex-1 flex items-center gap-3 text-left"
                    >
                      <span className="text-japandi-text-primary font-medium">{player.name}</span>
                      {(player.totalGames ?? 0) > 0 ? (
                        <span className="text-sm text-japandi-text-muted">
                          <span className="text-green-600">{player.wins ?? 0}W</span>
                          {" - "}
                          <span className="text-red-500">{player.losses ?? 0}L</span>
                        </span>
                      ) : (
                        <span className="text-xs text-japandi-text-muted">No games yet</span>
                      )}
                    </button>
                    <button
                      onClick={() => handleRemovePlayer(player.id)}
                      className="text-red-500 hover:text-red-700 text-sm transition-colors ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-center text-xs text-japandi-text-muted pt-2">
              Tap a player to see detailed stats
            </p>

            {/* Recent Guests Section */}
            {(recentGuests.length > 0 || isLoadingGuests) && (
              <div className="mt-8 pt-6 border-t border-japandi-border-light">
                <h3 className="text-base font-semibold text-japandi-text-primary mb-2">
                  Recent Guests
                </h3>
                <p className="text-sm text-japandi-text-muted mb-4">
                  Players who joined sessions but aren&apos;t in your group yet
                </p>
                
                {isLoadingGuests ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-yellow-50 border border-dashed border-yellow-300 rounded-card p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 bg-yellow-200 rounded animate-pulse" />
                            <div className="h-5 w-24 bg-yellow-200 rounded animate-pulse" />
                            <div className="h-5 w-12 bg-yellow-200 rounded-full animate-pulse" />
                          </div>
                          <div className="h-3 w-32 bg-yellow-200 rounded animate-pulse mt-2" />
                        </div>
                        <div className="h-8 w-16 bg-yellow-200 rounded-full animate-pulse ml-3" />
                      </div>
                    ))}
                  </div>
                ) : recentGuests.length === 0 ? (
                  <div className="text-center py-4 text-japandi-text-muted text-sm">
                    No recent guests
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentGuests.map((guest) => (
                      <div
                        key={guest.name}
                        className="flex items-center justify-between bg-yellow-50 border border-dashed border-yellow-300 rounded-card p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-600">👤</span>
                            <span className="text-japandi-text-primary font-medium truncate">
                              {guest.name}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full flex-shrink-0">
                              Guest
                            </span>
                          </div>
                          <div className="text-xs text-japandi-text-muted mt-1">
                            {guest.sessionCount} session{guest.sessionCount !== 1 ? 's' : ''} • Last: {new Date(guest.lastSessionDate).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => handlePromoteGuest(guest.name)}
                          disabled={promotingGuest === guest.name}
                          className="ml-3 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-sm font-medium rounded-full transition-colors disabled:opacity-50 flex-shrink-0"
                        >
                          {promotingGuest === guest.name ? '...' : '+ Add'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pairings Tab */}
        {activeTab === "pairings" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-japandi-text-primary">Best Pairings</h2>
                <p className="text-sm text-japandi-text-muted mt-1">
                  Doubles team combinations ranked by win rate
                </p>
              </div>
              <button
                onClick={handleRefreshPairings}
                className="px-3 py-2 bg-japandi-background-card hover:bg-japandi-background-primary text-japandi-text-primary text-sm font-medium rounded-full border border-japandi-border-light transition-all"
                title="Refresh pairings"
              >
                ↻ Refresh
              </button>
            </div>

            {isLoadingPairings ? (
              <div className="space-y-2">
                {/* Skeleton rows that match actual pairing item height */}
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-japandi-background-card border border-japandi-border-light rounded-xl p-4 shadow-soft"
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank skeleton */}
                      <div className="w-10 h-10 rounded-full bg-japandi-background-primary animate-pulse flex-shrink-0" />
                      {/* Pairing info skeleton */}
                      <div className="flex-1 min-w-0">
                        <div className="h-5 w-40 bg-japandi-background-primary rounded animate-pulse" />
                        <div className="h-4 w-28 bg-japandi-background-primary rounded animate-pulse mt-1" />
                      </div>
                      {/* Win rate skeleton */}
                      <div className="text-right flex-shrink-0">
                        <div className="h-6 w-14 bg-japandi-background-primary rounded animate-pulse" />
                        <div className="h-3 w-16 bg-japandi-background-primary rounded animate-pulse mt-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : pairings.length === 0 ? (
              <div className="text-center py-12 text-japandi-text-muted">
                <p className="mb-2">No pairings yet</p>
                <p className="text-sm">Play some doubles games to see pairing stats!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pairings.map((pairing, index) => (
                  <button
                    key={`${pairing.player1Id}-${pairing.player2Id}`}
                    onClick={() => loadPairingStats(pairing.player1Id, pairing.player2Id)}
                    className={`w-full text-left bg-japandi-background-card border rounded-xl p-4 shadow-soft hover:border-japandi-accent-primary transition-colors ${
                      pairing.isQualified ? 'border-japandi-border-light' : 'border-dashed border-japandi-border-light'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        !pairing.isQualified ? 'bg-japandi-background-primary text-japandi-text-muted' :
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-600' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-japandi-background-primary text-japandi-text-muted'
                      }`}>
                        {pairing.isQualified ? `#${index + 1}` : '—'}
                      </div>
                      
                      {/* Pairing Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-japandi-text-primary truncate">
                          {pairing.player1Name} & {pairing.player2Name}
                        </div>
                        <div className="text-sm text-japandi-text-muted">
                          {pairing.wins}-{pairing.losses} • {pairing.gamesPlayed} game{pairing.gamesPlayed !== 1 ? 's' : ''}
                          {!pairing.isQualified && <span className="text-yellow-600 ml-1" title="Need 5+ games to qualify">*</span>}
                        </div>
                      </div>
                      
                      {/* Win Rate */}
                      <div className="text-right flex-shrink-0">
                        <div className={`text-lg font-bold ${
                          !pairing.isQualified ? 'text-japandi-text-muted' :
                          pairing.winRate >= 60 ? 'text-green-600' :
                          pairing.winRate >= 40 ? 'text-japandi-text-primary' :
                          'text-red-500'
                        }`}>
                          {formatPercentage(pairing.winRate)}{!pairing.isQualified && '*'}
                        </div>
                        <div className="text-xs text-japandi-text-muted">Win Rate</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            <p className="text-center text-xs text-japandi-text-muted pt-4">
              Tap a pairing to see head-to-head matchups<br />
              <span className="text-yellow-600">*</span> = Less than 5 games played
            </p>
          </div>
        )}
      </div>

      {/* Player Profile Sheet */}
      {selectedPlayerStats && (
        <PlayerProfileSheet
          stats={selectedPlayerStats}
          onClose={() => setSelectedPlayerStats(null)}
        />
      )}

      {/* Loading overlay for player stats */}
      {isLoadingPlayerStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-japandi-background-card rounded-xl px-6 py-4 shadow-lg">
            <div className="text-japandi-text-secondary">Loading player stats...</div>
          </div>
        </div>
      )}

      {/* Pairing Profile Sheet */}
      {selectedPairingStats && (
        <PairingProfileSheet
          stats={selectedPairingStats}
          onClose={() => setSelectedPairingStats(null)}
        />
      )}

      {/* Loading overlay for pairing stats */}
      {isLoadingPairingStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-japandi-background-card rounded-xl px-6 py-4 shadow-lg">
            <div className="text-japandi-text-secondary">Loading pairing stats...</div>
          </div>
        </div>
      )}
    </div>
  );
}
