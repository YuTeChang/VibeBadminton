"use client";

import Link from "next/link";
import { useSession } from "@/contexts/SessionContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Group } from "@/types";
import { ApiClient } from "@/lib/api/client";

export default function Home() {
  const router = useRouter();
  const { session, games, allSessions, loadSession } = useSession();
  const [isLoaded, setIsLoaded] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupSessionCounts, setGroupSessionCounts] = useState<Record<string, number>>({});
  const [sessionGameCounts, setSessionGameCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load groups from API
        const fetchedGroups = await ApiClient.getAllGroups();
        setGroups(fetchedGroups);
        
        // Load session counts for each group
        const counts: Record<string, number> = {};
        for (const group of fetchedGroups) {
          try {
            const sessions = await ApiClient.getGroupSessions(group.id);
            counts[group.id] = sessions.length;
          } catch {
            counts[group.id] = 0;
          }
        }
        setGroupSessionCounts(counts);
      } catch (error) {
        console.warn('[Home] Failed to load groups:', error);
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
    };

    loadData();
  }, []);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleSessionClick = (sessionId: string) => {
    loadSession(sessionId);
    router.push(`/session/${sessionId}`);
  };

  // Filter standalone sessions (no group)
  const standaloneSessions = allSessions.filter(s => !s.groupId);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-japandi-text-primary">
          PoweredByPace
        </h1>
        <p className="text-base sm:text-lg text-japandi-text-secondary px-4">
          Track your badminton games and automatically calculate who owes what
        </p>

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
        {isLoaded && standaloneSessions.length > 0 && (
          <div className="space-y-3 text-left">
            <h2 className="text-lg font-semibold text-japandi-text-primary mb-3">
              Standalone Sessions
            </h2>
            {standaloneSessions
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((s) => {
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
                        {s.name || formatDate(s.date)}
                      </h3>
                      {isActive && (
                        <span className="text-xs text-japandi-accent-primary bg-japandi-background-primary px-2 py-1 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-japandi-text-muted mb-3">
                      {formatDate(s.date)} • {s.players.length} players • {s.gameMode === "singles" ? "Singles" : "Doubles"}
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

        {/* Continue Active Session Card (if different from list) */}
        {isLoaded && session && !allSessions.find(s => s.id === session.id) && (
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
          <Link
            href="/migrate"
            className="inline-block w-full text-sm text-japandi-text-muted hover:text-japandi-text-primary text-center py-2 transition-colors"
          >
            Database Migration Status
          </Link>
        </div>
      </div>
    </main>
  );
}

