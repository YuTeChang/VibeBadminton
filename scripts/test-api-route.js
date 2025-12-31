#!/usr/bin/env node
/**
 * Test the actual API route locally
 */

require('dotenv').config({ path: '.env.local' });
const { GroupService } = require('../lib/services/groupService.ts');

const groupId = process.argv[2] || 'group-1767206463941';

async function testAPI() {
  console.log('Testing GroupService.getGroupSessions for groupId:', groupId);
  console.log('');
  
  try {
    const sessions = await GroupService.getGroupSessions(groupId);
    console.log('Result:', {
      count: sessions.length,
      sessions: sessions.map(s => ({
        id: s.id,
        name: s.name,
        groupId: s.groupId,
        date: s.date,
        playersCount: s.players.length,
      })),
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI().catch(console.error);

