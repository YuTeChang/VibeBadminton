import { NextResponse } from 'next/server';

/**
 * Database initialization endpoint
 * 
 * Note: Database schema should be initialized via Supabase SQL Editor.
 * Run the SQL from scripts/init-db-schema.sql in Supabase Dashboard.
 * 
 * This endpoint is kept for backwards compatibility but does nothing.
 */
export async function POST() {
  return NextResponse.json({ 
    success: true, 
    message: 'Database schema should be initialized via Supabase SQL Editor. See scripts/init-db-schema.sql',
    note: 'This endpoint is deprecated. Use Supabase SQL Editor instead.'
  });
}

