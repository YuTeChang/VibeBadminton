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
    const session: Session = body.session;
    const initialGames: Omit<Game, 'id' | 'sessionId' | 'gameNumber'>[] = body.initialGames || [];
    const roundRobinCount = body.roundRobinCount || null;

    // Create session
    await SessionService.createSession(session, roundRobinCount);

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

