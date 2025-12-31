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

  // Load sessions and groups from API (primary) or localStorage (fallback) on mount
  useEffect(() => {
    const loadData = async () => {
      if (typeof window === "undefined") return;
      
      // Prevent duplicate calls
      if (isLoadingDataRef.current) return;
      isLoadingDataRef.current = true;

      try {
        // Check if API is available
        const apiReady = await isApiAvailable();
        setApiAvailable(apiReady);

        if (apiReady) {
          // Load all sessions and groups from database
          try {
            const [sessions, fetchedGroups] = await Promise.all([
              ApiClient.getAllSessions(),
              ApiClient.getAllGroups(),
            ]);
            setAllSessions(sessions);
            setGroups(fetchedGroups);
            
            // Cache groups to localStorage
            localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(fetchedGroups));
            
            // Try to load the active session from localStorage first (for immediate UI)
            const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);
            if (savedSession) {
              const parsedSession = JSON.parse(savedSession);
              parsedSession.date = new Date(parsedSession.date);
              if (!parsedSession.gameMode) {
                parsedSession.gameMode = "doubles";
              }
              if (parsedSession.bettingEnabled === undefined) {
                parsedSession.bettingEnabled = true;
              }
              
              // Verify session exists in database, or use the one from localStorage
              const dbSession = sessions.find(s => s.id === parsedSession.id);
              if (dbSession) {
                setSessionState(dbSession);
                // Load games from API
                try {
                  const dbGames = await ApiClient.getGames(dbSession.id);
                  setGames(dbGames);
                } catch (error) {
                  console.warn('[SessionContext] Failed to load games from API, using localStorage fallback');
                  loadGamesFromLocalStorage(dbSession.id);
                }
              } else {
                // Session not in database, use localStorage version
                setSessionState(parsedSession);
                loadGamesFromLocalStorage(parsedSession.id);
              }
            }
          } catch (error) {
            console.warn('[SessionContext] Failed to load sessions from API, using localStorage fallback');
            loadFromLocalStorage();
          }
        } else {
          // API not available, use localStorage
          loadFromLocalStorage();
        }
      } catch (error) {
        console.error('[SessionContext] Error loading data:', error);
        loadFromLocalStorage();
      } finally {
        setIsLoaded(true);
      }
    };

    loadData();
  }, []);

  const loadFromLocalStorage = () => {
    try {
      // Load groups
      const savedGroups = localStorage.getItem(STORAGE_KEY_GROUPS);
      if (savedGroups) {
        const parsedGroups = JSON.parse(savedGroups);
        setGroups(parsedGroups);
      }

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

  // Sync session to API and localStorage whenever it changes
  useEffect(() => {
    if (!isLoaded || typeof window === "undefined" || !session) return;

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

    // Sync to API if available (don't await to avoid blocking UI)
    if (apiAvailable) {
      ApiClient.createSession(session).catch((error) => {
        console.warn('[SessionContext] Failed to sync session to API:', error);
      });
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
    // Ensure bettingEnabled has a default
    const sessionWithDefaults = {
      ...newSession,
      bettingEnabled: newSession.bettingEnabled ?? true,
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
        // Determine roundRobinCount from initialGames length if applicable
        const roundRobinCount = initialGames && initialGames.length > 0 ? initialGames.length : null;
        await ApiClient.createSession(sessionWithDefaults, initialGames, roundRobinCount);
        
        // If we created initial games, reload them from API to get proper IDs
        if (initialGames && initialGames.length > 0) {
          try {
            const dbGames = await ApiClient.getGames(sessionWithDefaults.id);
            setGames(dbGames);
          } catch (error) {
            console.warn('[SessionContext] Failed to reload games from API');
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
    (gamesData: Omit<Game, "id" | "sessionId" | "gameNumber">[]) => {
      if (!session) return;

      setGames((prev) => {
        const timestamp = Date.now();
        const newGames: Game[] = gamesData.map((gameData, index) => ({
          id: `game-${timestamp}-${index}-${Math.random()}`,
          sessionId: session.id,
          gameNumber: prev.length + index + 1,
          ...gameData,
        }));
        return [...prev, ...newGames];
      });
    },
    [session]
  );

  const updateGame = useCallback(async (gameId: string, updates: Partial<Game>) => {
    // Optimistically update UI
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
  }, [apiAvailable, session]);

  const removeLastGame = useCallback(() => {
    setGames((prev) => {
      if (prev.length === 0) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    // Prevent duplicate simultaneous calls for the same session
    if (loadingGamesRef.current.has(sessionId)) {
      return;
    }
    
    // First check if session is already in allSessions
    let sessionToLoad = allSessions.find((s) => s.id === sessionId);
    
    // If not in allSessions, fetch it from API
    if (!sessionToLoad && apiAvailable) {
      try {
        sessionToLoad = await ApiClient.getSession(sessionId);
        // Add to allSessions cache for future use
        if (sessionToLoad) {
          setAllSessions(prev => {
            // Avoid duplicates
            if (prev.find(s => s.id === sessionId)) return prev;
            return [sessionToLoad!, ...prev];
          });
        }
      } catch (error) {
        console.warn('[SessionContext] Failed to fetch session from API:', error);
        // Try localStorage as fallback
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
    
    if (sessionToLoad) {
      setSessionState(sessionToLoad);
      // Save as active session
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionToLoad));
      }
      
      // Load games from API if available, otherwise from localStorage
      if (apiAvailable) {
        loadingGamesRef.current.add(sessionId);
        try {
          const dbGames = await ApiClient.getGames(sessionId);
          setGames(dbGames);
          // Also save to localStorage for offline support
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY_GAMES, JSON.stringify(dbGames));
          }
        } catch (error) {
          console.warn('[SessionContext] Failed to load games from API, using localStorage fallback');
          loadGamesFromLocalStorage(sessionId);
        } finally {
          loadingGamesRef.current.delete(sessionId);
        }
      } else {
        loadGamesFromLocalStorage(sessionId);
      }
    }
  }, [allSessions, apiAvailable]);

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

