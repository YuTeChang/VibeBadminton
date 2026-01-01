import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/lib/services/sessionService';
import { GameService } from '@/lib/services/gameService';
import { Session } from '@/types';
import { Game } from '@/types';

// GET /api/sessions - Get all sessions
export async function GET() {
  try {
    const sessions = await SessionService.getAllSessions();
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('[API] Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

// POST /api/sessions - Create a new session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionData = body.session;
    // Parse date string back to Date object and ensure defaults
    const session: Session = {
      ...sessionData,
      date: new Date(sessionData.date),
      groupId: sessionData.groupId || undefined,
      bettingEnabled: sessionData.bettingEnabled ?? true,
    };
    const initialGames: Omit<Game, 'id' | 'sessionId' | 'gameNumber'>[] = body.initialGames || [];
    const roundRobinCount = body.roundRobinCount || null;

    console.log('[API /sessions POST] Creating session:', {
      id: session.id,
      name: session.name,
      groupId: session.groupId,
      hasGroupId: !!session.groupId,
      playerCount: session.players?.length || 0,
    });

    // Validate that session has players
    if (!session.players || session.players.length === 0) {
      return NextResponse.json(
        { error: 'Session must have at least one player' },
        { status: 400 }
      );
    }

    // Validate minimum players based on game mode
    // Note: Default names are assigned on the client side, so we just check player count
    const minPlayers = session.gameMode === 'singles' ? 2 : 4;
    if (session.players.length < minPlayers) {
      return NextResponse.json(
        { error: `Session must have at least ${minPlayers} players for ${session.gameMode} mode` },
        { status: 400 }
      );
    }

    // Create session
    await SessionService.createSession(session, roundRobinCount);
    
    console.log('[API /sessions POST] Session created successfully');

    // Create initial games if provided
    if (initialGames.length > 0) {
      await GameService.createGames(session.id, initialGames);
    }

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('[API] Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

