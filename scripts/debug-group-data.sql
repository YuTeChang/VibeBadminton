-- Debug script: Check all data associated with a group
-- Replace 'YOUR_GROUP_ID' with the actual group ID you want to check
-- Run this in Supabase SQL Editor BEFORE and AFTER deleting a group

-- Set your group ID here
\set group_id 'YOUR_GROUP_ID'

-- 1. Check if group exists
SELECT 'GROUP' as table_name, id, name, shareable_link, created_at
FROM groups 
WHERE id = :'group_id';

-- 2. Check group players
SELECT 'GROUP_PLAYERS' as table_name, id, name, is_active, created_at
FROM group_players 
WHERE group_id = :'group_id';

-- 3. Check sessions linked to this group
SELECT 'SESSIONS' as table_name, id, name, date, group_id, created_at
FROM sessions 
WHERE group_id = :'group_id';

-- 4. Check players in those sessions (via group_player_id)
SELECT 'PLAYERS (via group_player_id)' as table_name, p.id, p.name, p.session_id, p.group_player_id
FROM players p
WHERE p.group_player_id IN (
  SELECT id FROM group_players WHERE group_id = :'group_id'
);

-- 5. Check players in sessions belonging to this group
SELECT 'PLAYERS (via session)' as table_name, p.id, p.name, p.session_id, p.group_player_id
FROM players p
JOIN sessions s ON p.session_id = s.id
WHERE s.group_id = :'group_id';

-- 6. Check games in sessions belonging to this group
SELECT 'GAMES' as table_name, g.id, g.game_number, g.session_id, g.winning_team
FROM games g
JOIN sessions s ON g.session_id = s.id
WHERE s.group_id = :'group_id';

-- 7. Check partner_stats for this group
SELECT 'PARTNER_STATS' as table_name, id, player1_id, player2_id, wins, losses, total_games
FROM partner_stats 
WHERE group_id = :'group_id';

-- 8. Check pairing_matchups for this group
SELECT 'PAIRING_MATCHUPS' as table_name, id, team1_player1_id, team1_player2_id, team1_wins, team2_wins
FROM pairing_matchups 
WHERE group_id = :'group_id';

-- Summary counts
SELECT 
  'SUMMARY' as info,
  (SELECT COUNT(*) FROM groups WHERE id = :'group_id') as groups_count,
  (SELECT COUNT(*) FROM group_players WHERE group_id = :'group_id') as group_players_count,
  (SELECT COUNT(*) FROM sessions WHERE group_id = :'group_id') as sessions_count,
  (SELECT COUNT(*) FROM players WHERE group_player_id IN (SELECT id FROM group_players WHERE group_id = :'group_id')) as players_via_group_player_count,
  (SELECT COUNT(*) FROM players p JOIN sessions s ON p.session_id = s.id WHERE s.group_id = :'group_id') as players_via_session_count,
  (SELECT COUNT(*) FROM games g JOIN sessions s ON g.session_id = s.id WHERE s.group_id = :'group_id') as games_count,
  (SELECT COUNT(*) FROM partner_stats WHERE group_id = :'group_id') as partner_stats_count,
  (SELECT COUNT(*) FROM pairing_matchups WHERE group_id = :'group_id') as pairing_matchups_count;

