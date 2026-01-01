"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Session, Game, Group } from "@/types";
import { ApiClient, isApiAvailable } from "@/lib/api/client";

interface SessionContextType {
  session: Session | null;
  games: Game[];
  allSessions: Session[];
  groups: Group[];
  setSession: (session: Session, initialGames?: Omit<Game, "id" | "sessionId" | "gameNumber">[]) => void;
  addGame: (game: Omit<Game, "id" | "sessionId" | "gameNumber">) => void;
  addGames: (games: Omit<Game, "id" | "sessionId" | "gameNumber">[]) => void;
  updateGame: (gameId: string, updates: Partial<Game>) => void;
  removeLastGame: () => void;
  clearSession: () => void;
  loadSession: (sessionId: string) => void;
  refreshGroups: () => Promise<void>;
  ensureSessionsAndGroupsLoaded: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const STORAGE_KEY_SESSION = "poweredbypace_session";
const STORAGE_KEY_GAMES = "poweredbypace_games";
const STORAGE_KEY_ALL_SESSIONS = "poweredbypace_all_sessions";
const STORAGE_KEY_GROUPS = "poweredbypace_groups";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  
  // Track loading state to prevent duplicate calls
  const isLoadingDataRef = useRef(false);
  const loadingGamesRef = useRef<Set<string>>(new Set());
  const isLoadingSessionsRef = useRef(false);
  const isLoadingGroupsRef = useRef(false);
  const hasLoadedSessionsRef = useRef(false);
  const hasLoadedGroupsRef = useRef(false);

  // Initialize and load saved session on mount (don't load all sessions/groups yet)
  // API availability check is done lazily (non-blocking) for faster initial render
  useEffect(() => {
    const initData = async () => {
      if (typeof window === "undefined") return;
      
      // Prevent duplicate calls
      if (isLoadingDataRef.current) {
        return;
      }
      isLoadingDataRef.current = true;

      try {
        // Check current pathname - don't load session on group pages or dashboard
        const pathname = window.location.pathname;
        const isGroupPage = pathname.startsWith('/group/');
        const isDashboard = pathname === '/dashboard' || pathname === '/';
        // Session pages handle their own loading via loadSession - don't auto-fetch here
        const isSessionPage = pathname.startsWith('/session/');
        
        // Load from localStorage immediately for fast initial render (no API call blocking)
        loadFromLocalStorage();
        
        // Get saved session (if any) - we'll use it conditionally
        const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);
        
        // Only load saved session from localStorage if we're NOT on a group page or dashboard
        // Group pages and dashboard don't need session context
        if (!isGroupPage && !isDashboard && savedSession) {
          try {
            const parsedSession = JSON.parse(savedSession);
            parsedSession.date = new Date(parsedSession.date);
            if (!parsedSession.gameMode) {
              parsedSession.gameMode = "doubles";
            }
            if (parsedSession.bettingEnabled === undefined) {
              parsedSession.bettingEnabled = true;
            }
            
            setSessionState(parsedSession);
            // Load games from localStorage first (fast, no API call)
            loadGamesFromLocalStorage(parsedSession.id);
          } catch {
            // Ignore parse errors for saved session
          }
        }
        
        // Check API availability lazily (non-blocking) - doesn't delay initial render
        // Skip health check on group pages, dashboard, and session pages
        // Session pages handle their own loading, so skip API sync there too
        if (isGroupPage || isDashboard || isSessionPage) {
          // Assume API is available - will fail gracefully if not
          setApiAvailable(true);
          // Skip auto-sync for session pages - they call loadSession() which handles this
        } else {
          // Check API availability for other pages (e.g., create-session)
          isApiAvailable()
            .then((apiReady) => {
              setApiAvailable(apiReady);
              // NOTE: Removed auto-sync here to prevent duplicate API calls
              // Session pages handle their own loading via loadSession()
              // Other pages like create-session don't need to auto-sync
            })
            .catch(() => {
              // API unavailable - use localStorage only
              setApiAvailable(false);
            });
        }
      } catch (error) {
        console.error('[SessionContext] Error initializing:', error);
        loadFromLocalStorage();
      } finally {
        setIsLoaded(true);
        isLoadingDataRef.current = false;
      }
    };

    initData();
  }, []);

  const loadFromLocalStorage = () => {
    try {
      // Load groups (don't mark as loaded - API will override this)
      const savedGroups = localStorage.getItem(STORAGE_KEY_GROUPS);
      if (savedGroups) {
        const parsedGroups = JSON.parse(savedGroups);
        setGroups(parsedGroups);
        // Don't set hasLoadedGroupsRef - let API load override this
      }

      // Load sessions (don't mark as loaded - API will override this)
      const savedAllSessions = localStorage.getItem(STORAGE_KEY_ALL_SESSIONS);
      if (savedAllSessions) {
        const parsedAllSessions = JSON.parse(savedAllSessions);
        const sessionsWithDates = parsedAllSessions.map((s: Session) => ({
          ...s,
          date: new Date(s.date),
          gameMode: s.gameMode || "doubles",
          bettingEnabled: s.bettingEnabled ?? true,
        }));
        setAllSessions(sessionsWithDates);
        // Don't set hasLoadedSessionsRef - let API load override this
      }

      const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);
      const savedGames = localStorage.getItem(STORAGE_KEY_GAMES);
      
      if (savedSession) {
        const parsedSession = JSON.parse(savedSession);
        parsedSession.date = new Date(parsedSession.date);
        if (!parsedSession.gameMode) {
          parsedSession.gameMode = "doubles";
        }
        if (parsedSession.bettingEnabled === undefined) {
          parsedSession.bettingEnabled = true;
        }
        setSessionState(parsedSession);
        
        if (savedGames) {
          const parsedGames = JSON.parse(savedGames);
          const filteredGames = parsedGames.filter(
            (game: Game) => game.sessionId === parsedSession.id
          );
          setGames(filteredGames);
        }
      }
    } catch (error) {
      // Silently handle localStorage errors
    }
  };

  const loadGamesFromLocalStorage = (sessionId: string) => {
    try {
      const savedGames = localStorage.getItem(STORAGE_KEY_GAMES);
      if (savedGames) {
        const parsedGames = JSON.parse(savedGames);
        const filteredGames = parsedGames.filter(
          (game: Game) => game.sessionId === sessionId
        );
        setGames(filteredGames);
      }
    } catch (error) {
      // Silently handle localStorage errors
    }
  };

  // Track if session was just created to prevent duplicate API calls
  const sessionJustCreatedRef = useRef<string | null>(null);
  // Track if session is being loaded (not created) to prevent POST on load
  const isLoadingSessionRef = useRef<string | null>(null);
  // Track if we've already synced this session to prevent duplicate calls when apiAvailable changes
  const hasSyncedSessionRef = useRef<Set<string>>(new Set());

  // Sync session to API and localStorage whenever it changes
  useEffect(() => {
    if (!isLoaded || typeof window === "undefined" || !session) return;

    // Don't sync session on dashboard, home page, or group pages - these pages don't need session sync
    const pathname = window.location.pathname;
    const isGroupPage = pathname.startsWith('/group/');
    const isDashboard = pathname === '/dashboard' || pathname === '/';
    
    if (isDashboard || isGroupPage) {
      // Still save to localStorage for offline support, but don't sync to API
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
      return;
    }

    // Always save to localStorage for offline support
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    
    // Update all sessions list
    setAllSessions((prev) => {
      const existingIndex = prev.findIndex((s) => s.id === session.id);
      let updated: Session[];
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = session;
      } else {
        updated = [...prev, session];
      }
      localStorage.setItem(STORAGE_KEY_ALL_SESSIONS, JSON.stringify(updated));
      return updated;
    });

    // Only sync to API if:
    // 1. API is available
    // 2. Session wasn't just created by setSession (setSession already calls createSession)
    // 3. Session isn't being loaded (to prevent POST when loading existing session)
    // 4. We haven't already synced this session (prevents duplicate calls when apiAvailable changes)
    const shouldSync = apiAvailable && 
        sessionJustCreatedRef.current !== session.id &&
        isLoadingSessionRef.current !== session.id &&
        !hasSyncedSessionRef.current.has(session.id);
    
    if (shouldSync) {
      hasSyncedSessionRef.current.add(session.id);
      
      // First verify the session exists in the database
      // If it doesn't exist (was deleted), remove it from localStorage instead of recreating it
      ApiClient.getSession(session.id)
        .then((existingSession) => {
          // Session exists, sync any changes
          // IMPORTANT: Preserve groupId - prefer existing DB value over potentially stale local value
          // This ensures groupId is never accidentally lost during sync operations
          const sessionToSync = {
            ...session,
            // Use current session's groupId if set, otherwise preserve from DB
            // Never allow groupId to become undefined/null if it existed
            groupId: session.groupId ?? existingSession.groupId,
          };
          return ApiClient.createSession(sessionToSync);
        })
        .catch((error) => {
          // Session doesn't exist (404) - it was deleted, remove from localStorage
          if (error.message?.includes('404') || error.message?.includes('not found')) {
            // Clear the session from state and localStorage
            setSessionState(null);
            setGames([]);
            if (typeof window !== "undefined") {
              localStorage.removeItem(STORAGE_KEY_SESSION);
              localStorage.removeItem(STORAGE_KEY_GAMES);
              // Also remove from all sessions list
              setAllSessions(prev => {
                const updated = prev.filter(s => s.id !== session.id);
                if (updated.length === 0) {
                  localStorage.removeItem(STORAGE_KEY_ALL_SESSIONS);
                } else {
                  localStorage.setItem(STORAGE_KEY_ALL_SESSIONS, JSON.stringify(updated));
                }
                return updated;
              });
            }
            // Remove from synced set since we cleared it
            hasSyncedSessionRef.current.delete(session.id);
          } else {
            // Other error - try to sync anyway (might be network issue)
            // Preserve groupId even on retry
            return ApiClient.createSession(session);
          }
        })
        .catch(() => {
          // Remove from synced set on error so we can retry
          hasSyncedSessionRef.current.delete(session.id);
        });
    }
    
    // Clear the refs after a short delay to allow future updates
    if (sessionJustCreatedRef.current === session.id) {
      setTimeout(() => {
        sessionJustCreatedRef.current = null;
      }, 1000);
    }
    if (isLoadingSessionRef.current === session.id) {
      setTimeout(() => {
        isLoadingSessionRef.current = null;
      }, 1000);
    }
  }, [session, isLoaded, apiAvailable]);

  // Sync games to API and localStorage whenever they change
  useEffect(() => {
    if (!isLoaded || typeof window === "undefined" || !session) return;

    // Always save to localStorage for offline support
    if (games.length > 0) {
      localStorage.setItem(STORAGE_KEY_GAMES, JSON.stringify(games));
    } else {
      localStorage.removeItem(STORAGE_KEY_GAMES);
    }

    // Sync to API if available (don't await to avoid blocking UI)
    if (apiAvailable && session) {
      // Note: Game sync happens in addGame/updateGame callbacks for better control
    }
  }, [games, isLoaded, session, apiAvailable]);

  const setSession = useCallback(async (newSession: Session, initialGames?: Omit<Game, "id" | "sessionId" | "gameNumber">[]) => {
    // Ensure bettingEnabled has a default and preserve groupId
    const sessionWithDefaults = {
      ...newSession,
      bettingEnabled: newSession.bettingEnabled ?? true,
      // Explicitly preserve groupId to ensure it's not lost
      groupId: newSession.groupId,
    };
    
    // Optimistically update UI
    setSessionState(sessionWithDefaults);
    
    // Handle games
    setGames((prev) => {
      // If games belong to a different session, replace them with initial games (or clear if no initial games)
      if (prev.length > 0 && prev[0]?.sessionId !== sessionWithDefaults.id) {
        if (initialGames && initialGames.length > 0) {
          const timestamp = Date.now();
          return initialGames.map((gameData, index) => ({
            id: `game-${timestamp}-${index}-${Math.random()}`,
            sessionId: sessionWithDefaults.id,
            gameNumber: index + 1,
            ...gameData,
          }));
        }
        return [];
      }
      // If this is a new session (no existing games) and we have initial games, add them
      if (prev.length === 0 && initialGames && initialGames.length > 0) {
        const timestamp = Date.now();
        return initialGames.map((gameData, index) => ({
          id: `game-${timestamp}-${index}-${Math.random()}`,
          sessionId: sessionWithDefaults.id,
          gameNumber: index + 1,
          ...gameData,
        }));
      }
      // Keep existing games (same session, no initial games provided)
      return prev;
    });

    // Sync to API if available
    if (apiAvailable) {
      try {
        // Mark this session as just created to prevent duplicate API call in useEffect
        sessionJustCreatedRef.current = sessionWithDefaults.id;
        // Also mark as synced to prevent duplicate calls when apiAvailable changes
        hasSyncedSessionRef.current.add(sessionWithDefaults.id);
        
        // Determine roundRobinCount from initialGames length if applicable
        const roundRobinCount = initialGames && initialGames.length > 0 ? initialGames.length : null;
        await ApiClient.createSession(sessionWithDefaults, initialGames, roundRobinCount);
        
        // If we created initial games, reload them from API to get proper IDs
        if (initialGames && initialGames.length > 0) {
          try {
            const dbGames = await ApiClient.getGames(sessionWithDefaults.id);
            setGames(dbGames);
          } catch {
            // Silently fail - keep local games
          }
        }
      } catch (error) {
        console.error('[SessionContext] Failed to sync session to API:', error);
        // Continue with local state - user can retry later
      }
    }
  }, [apiAvailable]);

  const addGame = useCallback(
    async (gameData: Omit<Game, "id" | "sessionId" | "gameNumber">) => {
      if (!session) return;

      // Optimistically update UI
      const tempId = `game-${Date.now()}-${Math.random()}`;
      const newGame: Game = {
        id: tempId,
        sessionId: session.id,
        gameNumber: games.length + 1,
        ...gameData,
      };
      setGames((prev) => [...prev, newGame]);

      // Sync to API if available
      if (apiAvailable) {
        try {
          const createdGame = await ApiClient.createGame(session.id, gameData);
          // Replace temp game with real one from API
          setGames((prev) => prev.map(g => g.id === tempId ? createdGame : g));
        } catch (error) {
          console.error('[SessionContext] Failed to sync game to API:', error);
          // Keep the optimistic update - user can retry later
        }
      }
    },
    [session, games.length, apiAvailable]
  );

  const addGames = useCallback(
    async (gamesData: Omit<Game, "id" | "sessionId" | "gameNumber">[]) => {
      if (!session) return;

      // Optimistically update UI
      const timestamp = Date.now();
      const newGames: Game[] = gamesData.map((gameData, index) => ({
        id: `game-${timestamp}-${index}-${Math.random()}`,
        sessionId: session.id,
        gameNumber: games.length + index + 1,
        ...gameData,
      }));
      setGames((prev) => [...prev, ...newGames]);

      // Sync to API if available
      if (apiAvailable) {
        try {
          const createdGames = await Promise.all(
            gamesData.map((gameData) => ApiClient.createGame(session.id, gameData))
          );
          // Replace temp games with real ones from API
          setGames((prev) => {
            const updated = [...prev];
            newGames.forEach((tempGame, index) => {
              const realGame = createdGames[index];
              const tempIndex = updated.findIndex((g) => g.id === tempGame.id);
              if (tempIndex >= 0 && realGame) {
                updated[tempIndex] = realGame;
              }
            });
            return updated;
          });
        } catch (error) {
          console.error('[SessionContext] Failed to sync games to API:', error);
          // Keep the optimistic updates - user can retry later
        }
      }
    },
    [session, games.length, apiAvailable]
  );

  const updateGame = useCallback(
    async (gameId: string, updates: Partial<Game>) => {
      setGames((prev) =>
        prev.map((game) => (game.id === gameId ? { ...game, ...updates } : game))
      );

      // Sync to API if available
      if (apiAvailable && session) {
        try {
          await ApiClient.updateGame(session.id, gameId, updates);
        } catch (error) {
          console.error('[SessionContext] Failed to sync game update to API:', error);
          // Keep the optimistic update - user can retry later
        }
      }
    },
    [session, apiAvailable]
  );

  const removeLastGame = useCallback(() => {
    if (games.length === 0) return;

    const lastGame = games[games.length - 1];
    setGames((prev) => prev.slice(0, -1));

    // Delete from API if available
    if (apiAvailable && session && lastGame.id) {
      ApiClient.deleteGame(session.id, lastGame.id).catch((error) => {
        console.error('[SessionContext] Failed to delete game from API:', error);
        // Keep the optimistic update - user can retry later
      });
    }
  }, [games, session, apiAvailable]);

  const loadSession = useCallback(async (sessionId: string) => {
    // Prevent duplicate simultaneous calls for the same session
    if (loadingGamesRef.current.has(sessionId)) {
      return;
    }
    
    // Always fetch fresh session data from API to ensure we have complete data (including players)
    // Don't rely on allSessions cache which might be stale or incomplete
    let sessionToLoad: Session | null = null;
    
    if (apiAvailable) {
      try {
        sessionToLoad = await ApiClient.getSession(sessionId);
        // Update allSessions cache with fresh data
        if (sessionToLoad) {
          setAllSessions(prev => {
            const existingIndex = prev.findIndex(s => s.id === sessionId);
            if (existingIndex >= 0) {
              // Update existing session with fresh data
              const updated = [...prev];
              updated[existingIndex] = sessionToLoad!;
              return updated;
            } else {
              // Add new session to cache
              return [sessionToLoad!, ...prev];
            }
          });
        }
      } catch {
        // Fallback: Try to use cached session from allSessions if available
        const cachedSession = allSessions.find((s) => s.id === sessionId);
        if (cachedSession) {
          sessionToLoad = cachedSession;
        } else {
          // Last resort: Try localStorage
          if (typeof window !== "undefined") {
            const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);
            if (savedSession) {
              try {
                const parsed = JSON.parse(savedSession);
                if (parsed.id === sessionId) {
                  parsed.date = new Date(parsed.date);
                  sessionToLoad = parsed;
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } else {
      // API not available, try cache or localStorage
      const cachedSession = allSessions.find((s) => s.id === sessionId);
      if (cachedSession) {
        sessionToLoad = cachedSession;
      } else if (typeof window !== "undefined") {
        const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            if (parsed.id === sessionId) {
              parsed.date = new Date(parsed.date);
              sessionToLoad = parsed;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
    
    if (sessionToLoad) {
      // Mark that we're loading (not creating) this session to prevent POST on load
      isLoadingSessionRef.current = sessionId;
      
      setSessionState(sessionToLoad);
      // Save as active session
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionToLoad));
      }
      
      // Don't load games if we're on a group page or dashboard - not needed
      const pathname = typeof window !== "undefined" ? window.location.pathname : '';
      const isGroupPage = pathname.startsWith('/group/');
      const isDashboard = pathname === '/dashboard' || pathname === '/';
      
      if (isGroupPage || isDashboard) {
        return;
      }
      
      // Load games from API if available, otherwise from localStorage
      // Only load if we don't already have games for this session (prevent duplicate calls)
      if (apiAvailable && (games.length === 0 || games[0]?.sessionId !== sessionId)) {
        loadingGamesRef.current.add(sessionId);
        try {
          const dbGames = await ApiClient.getGames(sessionId);
          setGames(dbGames);
          // Also save to localStorage for offline support
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY_GAMES, JSON.stringify(dbGames));
          }
        } catch {
          // Fallback to localStorage
          loadGamesFromLocalStorage(sessionId);
        } finally {
          loadingGamesRef.current.delete(sessionId);
        }
      } else if (games.length === 0 || games[0]?.sessionId !== sessionId) {
        // Only load from localStorage if we don't have games for this session
        loadGamesFromLocalStorage(sessionId);
      }
    }
  }, [allSessions, apiAvailable, games]);

  const clearSession = useCallback(async () => {
    const currentSessionId = session?.id;
    
    // Clear local state first
    setSessionState(null);
    setGames([]);
    
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_GAMES);
      // Also remove current session from all sessions list
      setAllSessions((prev) => {
        if (currentSessionId) {
          const updated = prev.filter((s) => s.id !== currentSessionId);
          localStorage.setItem(STORAGE_KEY_ALL_SESSIONS, JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    }
    
    // Delete from database if API is available
    if (apiAvailable && currentSessionId) {
      try {
        await ApiClient.deleteSession(currentSessionId);
      } catch (error) {
        console.error('[SessionContext] Failed to delete session from API:', error);
      }
    }
  }, [session, apiAvailable]);

  const refreshGroups = useCallback(async () => {
    if (apiAvailable) {
      try {
        const fetchedGroups = await ApiClient.getAllGroups();
        setGroups(fetchedGroups);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(fetchedGroups));
        }
      } catch (error) {
        console.error('[SessionContext] Failed to refresh groups:', error);
      }
    }
  }, [apiAvailable]);

  // Lazy load all sessions and groups - only when explicitly needed (e.g., on group pages)
  // NOTE: Dashboard page loads its own data directly, so we skip it here to avoid duplicate calls
  // Always tries API first to ensure fresh data, even if localStorage has cached data
  const ensureSessionsAndGroupsLoaded = useCallback(async () => {
    if (typeof window === "undefined") return;
    
    const pathname = window.location.pathname;
    // Dashboard loads its own data (groups + summaries) - skip to avoid duplicate calls
    if (pathname === '/dashboard') {
      return;
    }
    
    // Only load all sessions/groups if we're on a group page
    // On session/home pages, we don't need all sessions - skip to avoid unnecessary API calls
    if (!pathname.startsWith('/group/')) {
      return;
    }
    
    // Skip if already loaded (prevents unnecessary calls when prefetching or navigating)
    if (hasLoadedSessionsRef.current && hasLoadedGroupsRef.current) {
      return;
    }
    
    // Prevent duplicate simultaneous calls (but allow refresh if data was already loaded)
    if (isLoadingSessionsRef.current) {
      return;
    } else if (apiAvailable) {
      // Double-check pathname before making expensive call
      const currentPathname = window.location.pathname;
      if (currentPathname === '/dashboard') {
        return;
      }
      
      isLoadingSessionsRef.current = true;
      try {
        const sessions = await ApiClient.getAllSessions();
        // Always update state with API response (even if empty - clears stale localStorage data)
        setAllSessions(sessions);
        hasLoadedSessionsRef.current = true;
        if (typeof window !== "undefined") {
          // Update localStorage with fresh API data (or clear if empty)
          if (sessions.length === 0) {
            localStorage.removeItem(STORAGE_KEY_ALL_SESSIONS);
          } else {
            localStorage.setItem(STORAGE_KEY_ALL_SESSIONS, JSON.stringify(sessions));
          }
        }
      } catch {
        // Fallback to localStorage if API fails
        const saved = localStorage.getItem(STORAGE_KEY_ALL_SESSIONS);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setAllSessions(parsed.map((s: any) => ({ ...s, date: new Date(s.date) })));
            hasLoadedSessionsRef.current = true;
          } catch {
            // Ignore parse errors
          }
        } else {
          // No localStorage fallback, set empty array
          setAllSessions([]);
          hasLoadedSessionsRef.current = true;
        }
      } finally {
        isLoadingSessionsRef.current = false;
      }
    }
    
    // Load groups - always try API first (even if already loaded from localStorage)
    if (isLoadingGroupsRef.current) {
      // Already loading, skip
    } else if (apiAvailable) {
      isLoadingGroupsRef.current = true;
      try {
        const fetchedGroups = await ApiClient.getAllGroups();
        // Always update state with API response (even if empty - clears stale localStorage data)
        setGroups(fetchedGroups);
        hasLoadedGroupsRef.current = true;
        if (typeof window !== "undefined") {
          // Update localStorage with fresh API data (or clear if empty)
          if (fetchedGroups.length === 0) {
            localStorage.removeItem(STORAGE_KEY_GROUPS);
          } else {
            localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(fetchedGroups));
          }
        }
      } catch {
        // Fallback to localStorage if API fails
        const saved = localStorage.getItem(STORAGE_KEY_GROUPS);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setGroups(parsed);
            hasLoadedGroupsRef.current = true;
          } catch {
            // Ignore parse errors
          }
        } else {
          // No localStorage fallback, set empty array
          setGroups([]);
          hasLoadedGroupsRef.current = true;
        }
      } finally {
        isLoadingGroupsRef.current = false;
      }
    }
  }, [apiAvailable]); // Only depend on apiAvailable, not on state lengths

  return (
    <SessionContext.Provider
      value={{
        session,
        games,
        allSessions,
        groups,
        setSession,
        addGame,
        addGames,
        updateGame,
        removeLastGame,
        clearSession,
        loadSession,
        refreshGroups,
        ensureSessionsAndGroupsLoaded,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
