import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/lib/services/sessionService';
import { Session } from '@/types';

// GET /api/sessions/[id] - Get a specific session
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const session = await SessionService.getSessionById(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('[API] Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

// PUT /api/sessions/[id] - Update a session (including players)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const body = await request.json();
    const sessionData = body.session;
    
    // Parse date string back to Date object
    const session: Session = {
      ...sessionData,
      id: sessionId, // Ensure ID matches
      date: new Date(sessionData.date),
      groupId: sessionData.groupId || undefined,
      bettingEnabled: sessionData.bettingEnabled ?? true,
    };

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

    // Update session (createSession uses upsert, so it will update if exists)
    await SessionService.createSession(session);
    
    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('[API] Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions/[id] - Delete a session
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    await SessionService.deleteSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}

