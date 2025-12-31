#!/usr/bin/env node
/**
 * Check what sessions exist and their group_ids
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const groupId = process.argv[2] || 'group-1767207376238';

async function checkSessions() {
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

  console.log('=== All Sessions ===');
  const { data: allSessions, error: allError } = await supabase
    .from('sessions')
    .select('id, name, group_id, date, created_at')
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (allError) {
    console.error('Error:', allError);
  } else {
    console.log(`Found ${allSessions.length} sessions:`);
    allSessions.forEach(s => {
      console.log(`  - ${s.id}: group_id="${s.group_id}" (${s.group_id === groupId ? 'MATCHES' : 'different'}), name="${s.name}"`);
    });
  }
  console.log('');

  console.log(`=== Sessions for groupId="${groupId}" ===`);
  const { data: groupSessions, error: groupError } = await supabase
    .from('sessions')
    .select('*')
    .eq('group_id', groupId);
  
  if (groupError) {
    console.error('Error:', groupError);
  } else {
    console.log(`Found ${groupSessions?.length || 0} sessions`);
    if (groupSessions && groupSessions.length > 0) {
      groupSessions.forEach(s => {
        console.log(`  - ${s.id}: name="${s.name}", group_id="${s.group_id}"`);
      });
    }
  }
  console.log('');

  // Check if group exists
  console.log(`=== Group Check ===`);
  const { data: group, error: groupCheckError } = await supabase
    .from('groups')
    .select('id, name')
    .eq('id', groupId)
    .single();
  
  if (groupCheckError) {
    console.error('Error:', groupCheckError);
  } else if (group) {
    console.log(`Group exists: ${group.name} (${group.id})`);
  } else {
    console.log('Group does not exist!');
  }
}

checkSessions().catch(console.error);

