import { NextRequest, NextResponse } from 'next/server';
import { GameService } from '@/lib/services/gameService';
import { Game } from '@/types';

// GET /api/sessions/[id]/games - Get all games for a session
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const games = await GameService.getGamesBySessionId(sessionId);
    return NextResponse.json(games);
  } catch (error) {
    console.error('[API] Error fetching games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}

// POST /api/sessions/[id]/games - Add a new game
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const body = await request.json();
    const game: Omit<Game, 'id' | 'sessionId' | 'gameNumber'> = body.game;
    const gameNumber = body.gameNumber;

    const createdGame = await GameService.createGame(sessionId, game, gameNumber);
    return NextResponse.json(createdGame);
  } catch (error) {
    console.error('[API] Error creating game:', error);
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}

