"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Session, Game, Group } from "@/types";
import { ApiClient } from "@/lib/api/client";

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
  loadSession: (sessionId: string) => Promise<void>;
  refreshGroups: () => Promise<void>;
  ensureSessionsAndGroupsLoaded: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Only store the current session ID for navigation persistence
const CURRENT_SESSION_ID_KEY = "current_session_id";

// Memory limits to prevent unbounded growth
const MAX_CACHED_SESSIONS = 50;
const MAX_CACHED_GROUPS = 20;

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  
  // Track loading state to prevent duplicate calls
  const loadingGamesRef = useRef<Set<string>>(new Set());
  const isLoadingSessionsRef = useRef(false);
  const isLoadingGroupsRef = useRef(false);
  const hasLoadedSessionsRef = useRef(false);
  const hasLoadedGroupsRef = useRef(false);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clear the loading refs Set to release memory
      loadingGamesRef.current.clear();
    };
  }, []);

  // On mount, restore session if we have a session ID stored (for navigation)
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const sessionId = sessionStorage.getItem(CURRENT_SESSION_ID_KEY);
    if (sessionId && window.location.pathname.startsWith('/session/')) {
      // Let the session page handle loading via loadSession
      // We just need to know which session ID to load
    }
  }, []);

  // Store current session ID for navigation persistence (but not the data)
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    if (session?.id) {
      sessionStorage.setItem(CURRENT_SESSION_ID_KEY, session.id);
    } else {
      sessionStorage.removeItem(CURRENT_SESSION_ID_KEY);
    }
  }, [session?.id]);

  const setSession = useCallback(async (newSession: Session, initialGames?: Omit<Game, "id" | "sessionId" | "gameNumber">[]) => {
    const sessionWithDefaults = {
      ...newSession,
      bettingEnabled: newSession.bettingEnabled ?? true,
      groupId: newSession.groupId,
    };
    
    // Optimistically update UI
    setSessionState(sessionWithDefaults);
    
    // Handle initial games
    if (initialGames && initialGames.length > 0) {
      const timestamp = Date.now();
      const tempGames = initialGames.map((gameData, index) => ({
        id: `game-${timestamp}-${index}-${Math.random()}`,
        sessionId: sessionWithDefaults.id,
        gameNumber: index + 1,
        ...gameData,
      }));
      setGames(tempGames);
    } else {
      setGames([]);
    }

    // Sync to API
    try {
      const roundRobinCount = initialGames && initialGames.length > 0 ? initialGames.length : null;
      await ApiClient.createSession(sessionWithDefaults, initialGames, roundRobinCount);
      
      // Reload games from API to get proper IDs
      if (initialGames && initialGames.length > 0) {
        const dbGames = await ApiClient.getGames(sessionWithDefaults.id);
        setGames(dbGames);
      }
      
      // Update allSessions cache with limit enforcement
      setAllSessions((prev) => {
        const existingIndex = prev.findIndex((s) => s.id === sessionWithDefaults.id);
        let updated: Session[];
        if (existingIndex >= 0) {
          updated = [...prev];
          updated[existingIndex] = sessionWithDefaults;
        } else {
          updated = [sessionWithDefaults, ...prev];
        }
        // Enforce max cache size to prevent memory leaks
        return updated.slice(0, MAX_CACHED_SESSIONS);
      });
    } catch (error) {
      console.error('[SessionContext] Failed to create session:', error);
      throw error;
    }
  }, []);

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

      // Sync to API
      try {
        const createdGame = await ApiClient.createGame(session.id, gameData);
        // Replace temp game with real one from API
        setGames((prev) => prev.map(g => g.id === tempId ? createdGame : g));
      } catch (error) {
        console.error('[SessionContext] Failed to create game:', error);
        // Rollback optimistic update
        setGames((prev) => prev.filter(g => g.id !== tempId));
        throw error;
      }
    },
    [session, games.length]
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

      // Sync to API
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
        console.error('[SessionContext] Failed to create games:', error);
        // Rollback optimistic updates
        const tempIds = new Set(newGames.map(g => g.id));
        setGames((prev) => prev.filter(g => !tempIds.has(g.id)));
        throw error;
      }
    },
    [session, games.length]
  );

  const updateGame = useCallback(
    async (gameId: string, updates: Partial<Game>) => {
      if (!session) return;

      // Store old game for rollback
      const oldGame = games.find(g => g.id === gameId);

      // Optimistically update UI
      setGames((prev) =>
        prev.map((game) => (game.id === gameId ? { ...game, ...updates } : game))
      );

      // Sync to API
      try {
        await ApiClient.updateGame(session.id, gameId, updates);
      } catch (error) {
        console.error('[SessionContext] Failed to update game:', error);
        // Rollback to old game
        if (oldGame) {
          setGames((prev) =>
            prev.map((game) => (game.id === gameId ? oldGame : game))
          );
        }
        throw error;
      }
    },
    [session, games]
  );

  const removeLastGame = useCallback(async () => {
    if (games.length === 0 || !session) return;

    const lastGame = games[games.length - 1];
    
    // Optimistically update UI
    setGames((prev) => prev.slice(0, -1));

    // Delete from API
    try {
      await ApiClient.deleteGame(session.id, lastGame.id);
    } catch (error) {
      console.error('[SessionContext] Failed to delete game:', error);
      // Rollback - add game back
      setGames((prev) => [...prev, lastGame]);
      throw error;
    }
  }, [games, session]);

  const loadSession = useCallback(async (sessionId: string) => {
    // Prevent duplicate simultaneous calls
    if (loadingGamesRef.current.has(sessionId)) {
      return;
    }
    
    try {
      // Always fetch fresh from API
      const sessionToLoad = await ApiClient.getSession(sessionId);
      setSessionState(sessionToLoad);
      
      // Update allSessions cache with limit enforcement
      setAllSessions(prev => {
        const existingIndex = prev.findIndex(s => s.id === sessionId);
        let updated: Session[];
        if (existingIndex >= 0) {
          updated = [...prev];
          updated[existingIndex] = sessionToLoad;
        } else {
          updated = [sessionToLoad, ...prev];
        }
        // Enforce max cache size to prevent memory leaks
        return updated.slice(0, MAX_CACHED_SESSIONS);
      });
      
      // Load games
      loadingGamesRef.current.add(sessionId);
      const dbGames = await ApiClient.getGames(sessionId);
      setGames(dbGames);
    } catch (error) {
      console.error('[SessionContext] Failed to load session:', error);
      throw error;
    } finally {
      loadingGamesRef.current.delete(sessionId);
    }
  }, []);

  const clearSession = useCallback(async () => {
    const currentSessionId = session?.id;
    
    // Clear local state
    setSessionState(null);
    setGames([]);
    
    // Delete from database
    if (currentSessionId) {
      try {
        await ApiClient.deleteSession(currentSessionId);
        // Remove from allSessions
        setAllSessions((prev) => prev.filter((s) => s.id !== currentSessionId));
      } catch (error) {
        console.error('[SessionContext] Failed to delete session:', error);
        throw error;
      }
    }
  }, [session]);

  const refreshGroups = useCallback(async () => {
    try {
      const fetchedGroups = await ApiClient.getAllGroups();
      // Enforce max cache size to prevent memory leaks
      setGroups(fetchedGroups.slice(0, MAX_CACHED_GROUPS));
    } catch (error) {
      console.error('[SessionContext] Failed to refresh groups:', error);
      throw error;
    }
  }, []);

  const ensureSessionsAndGroupsLoaded = useCallback(async () => {
    if (typeof window === "undefined") return;
    
    const pathname = window.location.pathname;
    
    // Dashboard loads its own data
    if (pathname === '/dashboard') {
      return;
    }
    
    // Only load on group pages
    if (!pathname.startsWith('/group/')) {
      return;
    }
    
    // Skip if already loaded
    if (hasLoadedSessionsRef.current && hasLoadedGroupsRef.current) {
      return;
    }
    
    // Load sessions
    if (!isLoadingSessionsRef.current && !hasLoadedSessionsRef.current) {
      isLoadingSessionsRef.current = true;
      try {
        const sessions = await ApiClient.getAllSessions();
        // Enforce max cache size to prevent memory leaks
        setAllSessions(sessions.slice(0, MAX_CACHED_SESSIONS));
        hasLoadedSessionsRef.current = true;
      } catch (error) {
        console.error('[SessionContext] Failed to load sessions:', error);
      } finally {
        isLoadingSessionsRef.current = false;
      }
    }
    
    // Load groups
    if (!isLoadingGroupsRef.current && !hasLoadedGroupsRef.current) {
      isLoadingGroupsRef.current = true;
      try {
        const fetchedGroups = await ApiClient.getAllGroups();
        // Enforce max cache size to prevent memory leaks
        setGroups(fetchedGroups.slice(0, MAX_CACHED_GROUPS));
        hasLoadedGroupsRef.current = true;
      } catch (error) {
        console.error('[SessionContext] Failed to load groups:', error);
      } finally {
        isLoadingGroupsRef.current = false;
      }
    }
  }, []);

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
