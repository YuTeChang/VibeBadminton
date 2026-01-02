"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadRecentGroups, RecentGroup } from "@/lib/recentGroups";

export default function Home() {
  const router = useRouter();
  const [groupCode, setGroupCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentGroups, setRecentGroups] = useState<RecentGroup[]>([]);

  // Load recent groups from localStorage on mount
  useEffect(() => {
    setRecentGroups(loadRecentGroups());
  }, []);

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const code = groupCode.trim().toLowerCase();
    if (!code) {
      setError("Please enter a group code");
      return;
    }
    
    setIsJoining(true);
    setError(null);
    
    // Navigate to shareable link page which handles lookup and redirect
    router.push(`/group/shareable/${code}`);
  };

  const handleRecentGroupClick = (code: string) => {
    router.push(`/group/shareable/${code}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8 text-center">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-japandi-text-primary">
            PoweredByPace
          </h1>
          <p className="text-base sm:text-lg text-japandi-text-secondary px-4 mt-2">
            Track your badminton games and automatically calculate who owes what
          </p>
        </div>

        {/* Join Group Section */}
        <div className="bg-japandi-background-card rounded-card border border-japandi-border-light p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-japandi-text-primary mb-4">
            Join a Group
          </h2>
          <form onSubmit={handleJoinGroup} className="space-y-3">
            <div>
              <input
                type="text"
                value={groupCode}
                onChange={(e) => {
                  setGroupCode(e.target.value);
                  setError(null);
                }}
                placeholder="Enter group code (e.g., i1lcbcsl)"
                className="w-full px-4 py-3 border border-japandi-border-light rounded-xl bg-japandi-background-primary text-japandi-text-primary text-base text-center font-mono tracking-wider focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
              {error && (
                <p className="text-sm text-red-600 mt-2">{error}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isJoining || !groupCode.trim()}
              className="w-full bg-japandi-accent-primary hover:bg-japandi-accent-hover active:scale-95 disabled:bg-japandi-text-muted disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-full transition-all shadow-button touch-manipulation"
            >
              {isJoining ? "Joining..." : "Join Group"}
            </button>
          </form>
        </div>

        {/* Recent Groups */}
        {recentGroups.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-japandi-text-muted uppercase tracking-wide">
              Recent Groups
            </h3>
            <div className="space-y-2">
              {recentGroups.map((group) => (
                <button
                  key={group.code}
                  onClick={() => handleRecentGroupClick(group.code)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-japandi-background-card hover:bg-japandi-background-primary border border-japandi-border-light rounded-xl transition-all touch-manipulation"
                >
                  <span className="font-medium text-japandi-text-primary truncate">
                    {group.name}
                  </span>
                  <span className="text-xs text-japandi-text-muted font-mono ml-2">
                    {group.code}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-japandi-border-light"></div>
          <span className="text-sm text-japandi-text-muted">or</span>
          <div className="flex-1 h-px bg-japandi-border-light"></div>
        </div>

        {/* Create/Quick Session Buttons */}
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
    </main>
  );
}
