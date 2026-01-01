import { NextRequest, NextResponse } from 'next/server';
import { GroupService } from '@/lib/services/groupService';

// GET /api/groups/[id] - Get a specific group
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;
    const group = await GroupService.getGroupById(groupId);

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // Add caching headers for better performance
    // Cache for 30 seconds - groups don't change frequently
    const response = NextResponse.json(group);
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=30, stale-while-revalidate=60'
    );
    
    return response;
  } catch (error) {
    console.error('[API] Error fetching group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group' },
      { status: 500 }
    );
  }
}

// Enable Next.js route segment config for caching
export const revalidate = 30; // Revalidate every 30 seconds

// DELETE /api/groups/[id] - Delete a group
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;
    await GroupService.deleteGroup(groupId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting group:', error);
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    );
  }
}


