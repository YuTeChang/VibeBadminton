"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Session, Game, Player } from "@/types";

interface SessionContextType {
  session: Session | null;
  games: Game[];
  setSession: (session: Session) => void;
  addGame: (game: Omit<Game, "id" | "sessionId" | "gameNumber">) => void;
  removeLastGame: () => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const STORAGE_KEY_SESSION = "vibebadminton_session";
const STORAGE_KEY_GAMES = "vibebadminton_games";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load session and games from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);
        const savedGames = localStorage.getItem(STORAGE_KEY_GAMES);
        
        if (savedSession) {
          const parsedSession = JSON.parse(savedSession);
          // Convert date string back to Date object
          parsedSession.date = new Date(parsedSession.date);
          setSessionState(parsedSession);
        }
        
        if (savedGames) {
          const parsedGames = JSON.parse(savedGames);
          // Convert date strings back to Date objects if needed
          setGames(parsedGames);
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

  const setSession = useCallback((newSession: Session) => {
    setSessionState(newSession);
    setGames([]); // Clear games when setting new session
  }, []);

  const addGame = useCallback(
    (gameData: Omit<Game, "id" | "sessionId" | "gameNumber">) => {
      if (!session) return;

      const newGame: Game = {
        id: `game-${Date.now()}-${Math.random()}`,
        sessionId: session.id,
        gameNumber: games.length + 1,
        ...gameData,
      };

      setGames((prev) => [...prev, newGame]);
    },
    [session, games.length]
  );

  const removeLastGame = useCallback(() => {
    setGames((prev) => {
      if (prev.length === 0) return prev;
      return prev.slice(0, -1);
    });
  }, []);

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
        setSession,
        addGame,
        removeLastGame,
        clearSession,
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

