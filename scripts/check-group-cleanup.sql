-- Check if group deletion cleaned up all data
-- INSTRUCTIONS:
-- 1. Replace 'YOUR_GROUP_ID' with your actual group ID (e.g., 'group-1767446086003')
-- 2. Run this AFTER deleting a group to see if any orphaned data remains

-- REPLACE THIS with your group ID:
-- Example: WHERE group_id = 'group-1767446086003'

-- Check for orphaned group_players (should be 0 after deletion)
SELECT 'Orphaned group_players' as check_name, COUNT(*) as count
FROM group_players 
WHERE group_id = 'YOUR_GROUP_ID';

-- Check for orphaned sessions (should be 0 after deletion)
SELECT 'Orphaned sessions' as check_name, COUNT(*) as count
FROM sessions 
WHERE group_id = 'YOUR_GROUP_ID';

-- Check for orphaned partner_stats (should be 0 after deletion)
SELECT 'Orphaned partner_stats' as check_name, COUNT(*) as count
FROM partner_stats 
WHERE group_id = 'YOUR_GROUP_ID';

-- Check for orphaned pairing_matchups (should be 0 after deletion)
SELECT 'Orphaned pairing_matchups' as check_name, COUNT(*) as count
FROM pairing_matchups 
WHERE group_id = 'YOUR_GROUP_ID';

-- Check for players with NULL group_player_id (expected after migration 007)
-- These will be cleaned up when their session is deleted
SELECT 'Players with NULL group_player_id' as check_name, COUNT(*) as count
FROM players 
WHERE group_player_id IS NULL;

-- Check if the group itself still exists (should be 0)
SELECT 'Group still exists' as check_name, COUNT(*) as count
FROM groups 
WHERE id = 'YOUR_GROUP_ID';

