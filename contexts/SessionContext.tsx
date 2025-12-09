"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
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

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [games, setGames] = useState<Game[]>([]);

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

