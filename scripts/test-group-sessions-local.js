#!/usr/bin/env node
/**
 * Test script to check group sessions locally
 * Usage: node scripts/test-group-sessions-local.js <groupId>
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const groupId = process.argv[2] || 'group-1767206463941';

async function testGroupSessions() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('Testing group sessions for groupId:', groupId);
  console.log('Using service role key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('');

  // Test 1: Get all sessions to see what group_ids exist
  console.log('=== Test 1: Get all sessions ===');
  const { data: allSessions, error: allError } = await supabase
    .from('sessions')
    .select('id, name, group_id, date, created_at')
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (allError) {
    console.error('Error fetching all sessions:', allError);
  } else {
    console.log(`Found ${allSessions.length} recent sessions:`);
    allSessions.forEach(s => {
      console.log(`  - ${s.id}: group_id="${s.group_id}" (type: ${typeof s.group_id}), name="${s.name}", date=${s.date}`);
    });
  }
  console.log('');

  // Test 2: Get sessions for this specific group
  console.log(`=== Test 2: Get sessions for groupId="${groupId}" ===`);
  const { data: groupSessions, error: groupError } = await supabase
    .from('sessions')
    .select('*')
    .eq('group_id', groupId);
  
  if (groupError) {
    console.error('Error fetching group sessions:', groupError);
  } else {
    console.log(`Found ${groupSessions?.length || 0} sessions for this group:`);
    if (groupSessions && groupSessions.length > 0) {
      groupSessions.forEach(s => {
        console.log(`  - ${s.id}: name="${s.name}", date=${s.date}, group_id="${s.group_id}"`);
      });
    } else {
      console.log('  No sessions found!');
    }
  }
  console.log('');

  // Test 3: Check if group exists
  console.log(`=== Test 3: Check if group exists ===`);
  const { data: group, error: groupCheckError } = await supabase
    .from('groups')
    .select('id, name')
    .eq('id', groupId)
    .single();
  
  if (groupCheckError) {
    console.error('Error checking group:', groupCheckError);
  } else if (group) {
    console.log(`Group exists: ${group.name} (${group.id})`);
  } else {
    console.log('Group does not exist!');
  }
  console.log('');

  // Test 4: Try with different query variations
  console.log(`=== Test 4: Try different query variations ===`);
  
  // Try with IS NOT NULL
  const { data: withNotNull, error: notNullError } = await supabase
    .from('sessions')
    .select('id, group_id')
    .eq('group_id', groupId)
    .not('group_id', 'is', null);
  console.log(`Query with .not('group_id', 'is', null): ${withNotNull?.length || 0} results`);
  
  // Try with text search
  const { data: withTextSearch, error: textError } = await supabase
    .from('sessions')
    .select('id, group_id')
    .ilike('group_id', groupId);
  console.log(`Query with .ilike('group_id', ...): ${withTextSearch?.length || 0} results`);
  
  // Try getting all sessions with this group_id pattern
  const { data: withPattern, error: patternError } = await supabase
    .from('sessions')
    .select('id, group_id')
    .like('group_id', `group-%`);
  console.log(`Query with .like('group_id', 'group-%'): ${withPattern?.length || 0} results`);
  if (withPattern && withPattern.length > 0) {
    console.log('  Sample group_ids:', withPattern.slice(0, 5).map(s => s.group_id));
  }
}

testGroupSessions().catch(console.error);

