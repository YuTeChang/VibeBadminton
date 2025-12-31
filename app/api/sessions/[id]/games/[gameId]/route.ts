import { NextRequest, NextResponse } from 'next/server';
import { GameService } from '@/lib/services/gameService';
import { Game } from '@/types';

// PUT /api/sessions/[id]/games/[gameId] - Update a game
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; gameId: string } }
) {
  try {
    const sessionId = params.id;
    const gameId = params.gameId;
    const updates: Partial<Game> = await request.json();

    const updatedGame = await GameService.updateGame(sessionId, gameId, updates);
    return NextResponse.json(updatedGame);
  } catch (error) {
    console.error('[API] Error updating game:', error);
    if (error instanceof Error && error.message === 'No fields to update') {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update game' },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions/[id]/games/[gameId] - Delete a game
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; gameId: string } }
) {
  try {
    const sessionId = params.id;
    const gameId = params.gameId;

    await GameService.deleteGame(sessionId, gameId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting game:', error);
    return NextResponse.json(
      { error: 'Failed to delete game' },
      { status: 500 }
    );
  }
}

