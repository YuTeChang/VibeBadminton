"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Session, Game, Player } from "@/types";

interface SessionContextType {
  session: Session | null;
  games: Game[];
  allSessions: Session[];
  setSession: (session: Session, initialGames?: Omit<Game, "id" | "sessionId" | "gameNumber">[]) => void;
  addGame: (game: Omit<Game, "id" | "sessionId" | "gameNumber">) => void;
  addGames: (games: Omit<Game, "id" | "sessionId" | "gameNumber">[]) => void;
  updateGame: (gameId: string, updates: Partial<Game>) => void;
  removeLastGame: () => void;
  clearSession: () => void;
  loadSession: (sessionId: string) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const STORAGE_KEY_SESSION = "vibebadminton_session";
const STORAGE_KEY_GAMES = "vibebadminton_games";
const STORAGE_KEY_ALL_SESSIONS = "vibebadminton_all_sessions";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load session and games from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        // Load all sessions
        const savedAllSessions = localStorage.getItem(STORAGE_KEY_ALL_SESSIONS);
        if (savedAllSessions) {
          const parsedAllSessions = JSON.parse(savedAllSessions);
          const sessionsWithDates = parsedAllSessions.map((s: Session) => ({
            ...s,
            date: new Date(s.date),
            gameMode: s.gameMode || "doubles", // backward compatibility
          }));
          setAllSessions(sessionsWithDates);
        }

        const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);
        const savedGames = localStorage.getItem(STORAGE_KEY_GAMES);
        
        if (savedSession) {
          const parsedSession = JSON.parse(savedSession);
          // Convert date string back to Date object
          parsedSession.date = new Date(parsedSession.date);
          // Add default gameMode for backward compatibility
          if (!parsedSession.gameMode) {
            parsedSession.gameMode = "doubles";
          }
          setSessionState(parsedSession);
          
          // Only load games if they belong to this session
          if (savedGames) {
            const parsedGames = JSON.parse(savedGames);
            // Filter games to only include those belonging to the loaded session
            const filteredGames = parsedGames.filter(
              (game: Game) => game.sessionId === parsedSession.id
            );
            setGames(filteredGames);
          }
        } else if (savedGames) {
          // If no session but games exist, clear games
          localStorage.removeItem(STORAGE_KEY_GAMES);
        }
      } catch (error) {
        // Silently handle localStorage errors - may occur in private browsing mode
        // Session will start fresh if localStorage is unavailable
      } finally {
        setIsLoaded(true);
      }
    }
  }, []);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      if (session) {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
        
        // Also save to all sessions list
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
      } else {
        localStorage.removeItem(STORAGE_KEY_SESSION);
      }
    }
  }, [session, isLoaded]);

  // Save games to localStorage whenever they change
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      if (games.length > 0) {
        localStorage.setItem(STORAGE_KEY_GAMES, JSON.stringify(games));
      } else {
        localStorage.removeItem(STORAGE_KEY_GAMES);
      }
    }
  }, [games, isLoaded]);

  const setSession = useCallback((newSession: Session, initialGames?: Omit<Game, "id" | "sessionId" | "gameNumber">[]) => {
    setSessionState(newSession);
    setGames((prev) => {
      // If games belong to a different session, replace them with initial games (or clear if no initial games)
      if (prev.length > 0 && prev[0]?.sessionId !== newSession.id) {
        if (initialGames && initialGames.length > 0) {
          const timestamp = Date.now();
          return initialGames.map((gameData, index) => ({
            id: `game-${timestamp}-${index}-${Math.random()}`,
            sessionId: newSession.id,
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
          sessionId: newSession.id,
          gameNumber: index + 1,
          ...gameData,
        }));
      }
      // Keep existing games (same session, no initial games provided)
      return prev;
    });
  }, []);

  const addGame = useCallback(
    (gameData: Omit<Game, "id" | "sessionId" | "gameNumber">) => {
      if (!session) return;

      setGames((prev) => {
        const newGame: Game = {
          id: `game-${Date.now()}-${Math.random()}`,
          sessionId: session.id,
          gameNumber: prev.length + 1,
          ...gameData,
        };
        return [...prev, newGame];
      });
    },
    [session]
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

  const updateGame = useCallback((gameId: string, updates: Partial<Game>) => {
    setGames((prev) =>
      prev.map((game) => (game.id === gameId ? { ...game, ...updates } : game))
    );
  }, []);

  const removeLastGame = useCallback(() => {
    setGames((prev) => {
      if (prev.length === 0) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  const loadSession = useCallback((sessionId: string) => {
    const sessionToLoad = allSessions.find((s) => s.id === sessionId);
    if (sessionToLoad) {
      setSessionState(sessionToLoad);
      // Save as active session
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionToLoad));
        // Load games for this session
        const savedGames = localStorage.getItem(STORAGE_KEY_GAMES);
        if (savedGames) {
          const parsedGames = JSON.parse(savedGames);
          const filteredGames = parsedGames.filter(
            (game: Game) => game.sessionId === sessionId
          );
          setGames(filteredGames);
        } else {
          setGames([]);
        }
      }
    }
  }, [allSessions]);

  const clearSession = useCallback(() => {
    setSessionState(null);
    setGames([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_GAMES);
    }
  }, []);

  return (
    <SessionContext.Provider
      value={{
        session,
        games,
        allSessions,
        setSession,
        addGame,
        addGames,
        updateGame,
        removeLastGame,
        clearSession,
        loadSession,
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

