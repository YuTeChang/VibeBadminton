import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';

/**
 * Initialize database schema
 * Call this endpoint once after setting up Vercel Postgres
 */
export async function POST() {
  try {
    await initDatabase();
    return NextResponse.json({ success: true, message: 'Database initialized' });
  } catch (error) {
    console.error('[API] Error initializing database:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

