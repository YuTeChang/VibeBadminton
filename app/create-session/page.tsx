"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { Session, Player, Game, Group, GroupPlayer } from "@/types";
import Link from "next/link";
import { generateRoundRobinGames } from "@/lib/roundRobin";
import { ApiClient } from "@/lib/api/client";

function CreateSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGroupId = searchParams.get("groupId");
  
  const { setSession, groups, refreshGroups } = useSession();
  const [localGroups, setLocalGroups] = useState<Group[]>([]);
  const [hasTriedLoadingGroups, setHasTriedLoadingGroups] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const isGroupLocked = !!initialGroupId; // Lock group selection if groupId is in URL
  
  // Load the specific group if groupId is in URL
  useEffect(() => {
    if (initialGroupId && !selectedGroup) {
      // Fetch the group details to display its name
      ApiClient.getGroup(initialGroupId)
        .then((group) => {
          setSelectedGroup(group);
        })
        .catch((error) => {
          console.warn('[CreateSession] Failed to load group details:', error);
          // Try to find in available groups
          const availableGroups = groups.length > 0 ? groups : localGroups;
          const foundGroup = availableGroups.find(g => g.id === initialGroupId);
          if (foundGroup) {
            setSelectedGroup(foundGroup);
          }
        });
    }
  }, [initialGroupId, selectedGroup, groups, localGroups]);
  
  // Load groups if not already loaded (needed for group dropdown when not locked)
  // This ensures groups are available when creating a session from a group page
  useEffect(() => {
    // If groups from context are empty and we haven't tried loading yet, fetch them
    if (groups.length === 0 && localGroups.length === 0 && !hasTriedLoadingGroups && typeof window !== "undefined") {
      setHasTriedLoadingGroups(true);
      
      // First, check localStorage
      try {
        const saved = localStorage.getItem("poweredbypace_groups");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.length > 0) {
            setLocalGroups(parsed);
            // If we have initialGroupId, try to find it in parsed groups
            if (initialGroupId && !selectedGroup) {
              const foundGroup = parsed.find((g: Group) => g.id === initialGroupId);
              if (foundGroup) {
                setSelectedGroup(foundGroup);
              }
            }
            return; // Use localStorage groups
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
      
      // If no localStorage, try to fetch from API
      ApiClient.getAllGroups()
        .then((fetchedGroups) => {
          if (fetchedGroups.length > 0) {
            setLocalGroups(fetchedGroups);
            // Update localStorage for future use
            localStorage.setItem("poweredbypace_groups", JSON.stringify(fetchedGroups));
            // If we have initialGroupId, try to find it in fetched groups
            if (initialGroupId && !selectedGroup) {
              const foundGroup = fetchedGroups.find(g => g.id === initialGroupId);
              if (foundGroup) {
                setSelectedGroup(foundGroup);
              }
            }
            // Try to refresh context groups if refreshGroups is available
            if (refreshGroups) {
              // Wait a bit for apiAvailable to be determined, then refresh
              setTimeout(() => {
                refreshGroups().catch(() => {
                  // Ignore errors - we have localGroups
                });
              }, 500);
            }
          }
        })
        .catch((error) => {
          console.warn('[CreateSession] Failed to load groups from API:', error);
        });
    }
  }, [groups.length, localGroups.length, hasTriedLoadingGroups, refreshGroups, initialGroupId, selectedGroup]);
  
  // Use groups from context if available, otherwise use localGroups
  const availableGroups = groups.length > 0 ? groups : localGroups;
  
  // Helper to format date and time for default session name
  const getDefaultSessionName = (date: Date) => {
    const d = new Date(date);
    const dateStr = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateStr} ${timeStr}`;
  };
  
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [sessionTime, setSessionTime] = useState(
    new Date().toTimeString().slice(0, 5) // HH:MM format
  );
  const [sessionName, setSessionName] = useState("");
  const [gameMode, setGameMode] = useState<"doubles" | "singles">("doubles");
  const [players, setPlayers] = useState<Player[]>([
    { id: "player-1", name: "" },
    { id: "player-2", name: "" },
    { id: "player-3", name: "" },
    { id: "player-4", name: "" },
  ]);
  
  // Group and betting state
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId || "");
  const [groupPlayers, setGroupPlayers] = useState<GroupPlayer[]>([]);
  const [selectedGroupPlayerIds, setSelectedGroupPlayerIds] = useState<Set<string>>(new Set());
  const [bettingEnabled, setBettingEnabled] = useState(false);
  
  // Load group players when group is selected
  useEffect(() => {
    const loadGroupPlayers = async () => {
      if (!selectedGroupId) {
        setGroupPlayers([]);
        setSelectedGroupPlayerIds(new Set());
        return;
      }
      
      try {
        const fetchedPlayers = await ApiClient.getGroupPlayers(selectedGroupId);
        setGroupPlayers(fetchedPlayers);
      } catch (error) {
        console.warn('[CreateSession] Failed to load group players:', error);
        setGroupPlayers([]);
      }
    };
    loadGroupPlayers();
  }, [selectedGroupId]);
  
  // Initialize players based on game mode
  useEffect(() => {
    if (gameMode === "singles") {
      setPlayers((prev) => prev.length > 2 ? prev.slice(0, 2) : prev);
    } else if (gameMode === "doubles") {
      setPlayers((prev) => {
        if (prev.length < 4) {
          const newPlayers = [...prev];
          while (newPlayers.length < 4) {
            newPlayers.push({ id: `player-${Date.now()}-${newPlayers.length}`, name: "" });
          }
          return newPlayers;
        }
        return prev;
      });
    }
  }, [gameMode]);
  
  const [organizerId, setOrganizerId] = useState<string>("");
  const [courtCostType, setCourtCostType] = useState<"per_person" | "total">(
    "per_person"
  );
  // Default values (all set to 0)
  const DEFAULT_COURT_COST_PER_PERSON = 0;
  const DEFAULT_COURT_COST_TOTAL = 0;
  const DEFAULT_BIRD_COST = 0;
  const DEFAULT_BET_PER_PLAYER = 0;

  const [courtCostValue, setCourtCostValue] = useState("");
  const [birdCostTotal, setBirdCostTotal] = useState("");
  const [betPerPlayer, setBetPerPlayer] = useState("");
  const [enableRoundRobin, setEnableRoundRobin] = useState(false);
  const [roundRobinGameCount, setRoundRobinGameCount] = useState("");

  const addPlayer = () => {
    if (players.length < 6) {
      setPlayers([
        ...players,
        { id: `player-${Date.now()}`, name: "" },
      ]);
    }
  };

  const removePlayer = (index: number) => {
    const minRequired = gameMode === "singles" ? 2 : 4;
    if (players.length > minRequired) {
      setPlayers(players.filter((_, i) => i !== index));
      if (organizerId === players[index].id) {
        setOrganizerId("");
      }
    }
  };

  const updatePlayerName = (index: number, name: string) => {
    const updated = [...players];
    updated[index].name = name;
    setPlayers(updated);
  };
  
  // Toggle group player selection
  const toggleGroupPlayer = (groupPlayer: GroupPlayer) => {
    const newSelected = new Set(selectedGroupPlayerIds);
    if (newSelected.has(groupPlayer.id)) {
      newSelected.delete(groupPlayer.id);
      // Remove from players list
      setPlayers(players.filter(p => p.groupPlayerId !== groupPlayer.id));
    } else {
      newSelected.add(groupPlayer.id);
      // Add to players list
      if (players.length < 6) {
        const newPlayer: Player = {
          id: `player-${Date.now()}`,
          name: groupPlayer.name,
          groupPlayerId: groupPlayer.id,
        };
        // Replace empty player slot or add new
        const emptyIndex = players.findIndex(p => p.name.trim() === "" && !p.groupPlayerId);
        if (emptyIndex !== -1) {
          const updated = [...players];
          updated[emptyIndex] = newPlayer;
          setPlayers(updated);
        } else {
          setPlayers([...players, newPlayer]);
        }
      }
    }
    setSelectedGroupPlayerIds(newSelected);
  };

  const minPlayersRequired = gameMode === "singles" ? 2 : 4;
  // Check that we have enough player slots (names will be assigned defaults if empty)
  const hasEnoughPlayers = players.length >= minPlayersRequired;
  // Organizer is valid if selected, or if we have enough players (we'll default to first player)
  const hasValidOrganizer = organizerId !== "" || hasEnoughPlayers;
  const isValidCourtCost = courtCostValue === "" || (!isNaN(parseFloat(courtCostValue)) && parseFloat(courtCostValue) >= 0);
  const isValidBirdCost = birdCostTotal === "" || (!isNaN(parseFloat(birdCostTotal)) && parseFloat(birdCostTotal) >= 0);
  const isValidBet = betPerPlayer === "" || (!isNaN(parseFloat(betPerPlayer)) && parseFloat(betPerPlayer) >= 0);
  const isValidRoundRobinCount = !enableRoundRobin || 
    (roundRobinGameCount === "" || (!isNaN(parseInt(roundRobinGameCount)) && parseInt(roundRobinGameCount) > 0));

  const canSubmit =
    hasEnoughPlayers &&
    hasValidOrganizer &&
    isValidCourtCost &&
    isValidBirdCost &&
    isValidBet &&
    isValidRoundRobinCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    // Assign default names to players without names
    const minRequired = gameMode === "singles" ? 2 : 4;
    const playersWithDefaults = players.map((p, index) => ({
      ...p,
      name: p.name.trim() || `Player ${index + 1}`,
    }));
    
    // Take the first minRequired players (or all if more are provided)
    const allPlayers = playersWithDefaults.slice(0, Math.max(minRequired, players.length));
    
    // If no organizer was selected but we have players, default to first player
    let finalOrganizerId = organizerId;
    if (!finalOrganizerId && allPlayers.length > 0) {
      finalOrganizerId = allPlayers[0].id;
    }
    
    // Use default values if fields are empty
    const finalCourtCostValue = courtCostValue === "" 
      ? (courtCostType === "per_person" ? DEFAULT_COURT_COST_PER_PERSON : DEFAULT_COURT_COST_TOTAL)
      : parseFloat(courtCostValue) || 0;
    const finalBirdCostTotal = birdCostTotal === "" 
      ? DEFAULT_BIRD_COST 
      : parseFloat(birdCostTotal) || 0;
    const finalBetPerPlayer = bettingEnabled && betPerPlayer !== "" 
      ? parseFloat(betPerPlayer) || DEFAULT_BET_PER_PLAYER 
      : DEFAULT_BET_PER_PLAYER;
    
    // Combine date and time for the session date
    const sessionDateTime = new Date(`${sessionDate}T${sessionTime}`);
    
    // Default session name to date and time if not provided
    const defaultSessionName = getDefaultSessionName(sessionDateTime);
    const finalSessionName = sessionName.trim() || defaultSessionName;
    
    // Use initialGroupId if group is locked, otherwise use selectedGroupId
    const finalGroupId = isGroupLocked ? initialGroupId : (selectedGroupId || undefined);
    
    const session: Session = {
      id: `session-${Date.now()}`,
      name: finalSessionName,
      date: sessionDateTime,
      players: allPlayers,
      organizerId: finalOrganizerId,
      courtCostType,
      courtCostValue: finalCourtCostValue,
      birdCostTotal: finalBirdCostTotal,
      betPerPlayer: finalBetPerPlayer,
      gameMode,
      groupId: finalGroupId || undefined,
      bettingEnabled,
    };
    
    console.log('[CreateSession] Creating session:', {
      id: session.id,
      name: session.name,
      initialGroupId,
      selectedGroupId,
      isGroupLocked,
      finalGroupId,
      groupId: session.groupId,
      hasGroupId: !!session.groupId,
    });

    // If round robin is enabled, generate games first
    let roundRobinGamesToAdd: Omit<Game, "id" | "sessionId" | "gameNumber">[] = [];
    if (enableRoundRobin) {
      const maxGames = roundRobinGameCount === "" 
        ? undefined 
        : (isNaN(parseInt(roundRobinGameCount)) ? undefined : parseInt(roundRobinGameCount));
      const roundRobinGames = generateRoundRobinGames(allPlayers, maxGames, gameMode);
      if (roundRobinGames.length > 0) {
        roundRobinGamesToAdd = roundRobinGames.map((game) => ({
          teamA: game.teamA,
          teamB: game.teamB,
          winningTeam: null as "A" | "B" | null, // Unplayed games
        }));
      }
    }

    // Set session with initial games if round robin is enabled
    // Wait for session to be saved before navigating
    try {
      await setSession(session, roundRobinGamesToAdd.length > 0 ? roundRobinGamesToAdd : undefined);
    } catch (error) {
      console.error('[CreateSession] Failed to save session:', error);
      // Continue anyway - session might be saved in background
    }

    // Navigate to session page
    // If created from a group, navigate back to group page to show the new session
    const groupIdToNavigate = finalGroupId || selectedGroupId;
    if (groupIdToNavigate) {
      // Mark in sessionStorage that we're returning from create-session
      // This helps the group page detect when to refresh
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`group_${groupIdToNavigate}_needs_refresh`, Date.now().toString());
        console.log('[CreateSession] Set refresh flag for group:', groupIdToNavigate);
      }
      // Use push (not replace) to ensure pathname change is detected by group page
      // This triggers the refresh logic in group page
      console.log('[CreateSession] Navigating to group page:', groupIdToNavigate);
      router.push(`/group/${groupIdToNavigate}`);
    } else {
      router.push(`/session/${session.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-japandi-background-primary py-4 sm:py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <Link
            href={selectedGroupId ? `/group/${selectedGroupId}` : "/"}
            className="text-japandi-accent-primary hover:text-japandi-accent-hover text-sm transition-colors"
          >
            ← {selectedGroupId ? "Back to Group" : "Back to Home"}
          </Link>
          
          {/* Group badge - only show when locked */}
          {isGroupLocked && selectedGroup && (
            <div className="mt-4 mb-2">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-japandi-background-card border border-japandi-border-light rounded-full text-sm text-japandi-text-secondary">
                <svg className="w-4 h-4 text-japandi-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Group: <span className="font-semibold text-japandi-text-primary">{selectedGroup.name}</span></span>
              </span>
            </div>
          )}
          
          <h1 className="text-2xl sm:text-3xl font-bold text-japandi-text-primary mt-4 sm:mt-6">
            Create New Session
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Selector - only show when NOT locked */}
          {!isGroupLocked && (
            <div>
              <label className="block text-base font-medium text-japandi-text-primary mb-3">
                Group (Optional)
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-4 py-3 border border-japandi-border-light rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all"
              >
                <option value="">No group (standalone session)</option>
                {availableGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-japandi-text-muted">
                Sessions in a group can be tracked together
              </p>
            </div>
          )}

          {/* Session Name */}
          <div>
            <label className="block text-base font-medium text-japandi-text-primary mb-3">
              Session Name (Optional)
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder={(() => {
                const sessionDateTime = new Date(`${sessionDate}T${sessionTime}`);
                return getDefaultSessionName(sessionDateTime);
              })()}
              className="w-full px-4 py-3 border border-japandi-border-light rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all"
              aria-label="Session name (optional)"
            />
            <p className="mt-2 text-sm text-japandi-text-muted">
              {sessionName.trim() 
                ? `Will be saved as: "${sessionName.trim()}"`
                : `Will default to: "${(() => {
                    const sessionDateTime = new Date(`${sessionDate}T${sessionTime}`);
                    return getDefaultSessionName(sessionDateTime);
                  })()}"`}
            </p>
          </div>

          {/* Date */}
          <div>
            <label className="block text-base font-medium text-japandi-text-primary mb-3">
              Date
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-4 py-3 border border-japandi-border-light rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all"
              aria-label="Session date"
            />
          </div>

          {/* Game Mode Toggle */}
          <div>
            <label className="block text-base font-medium text-japandi-text-primary mb-3">
              Game Mode
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setGameMode("doubles")}
                className={`flex-1 px-4 py-3 rounded-full font-medium transition-all active:scale-95 touch-manipulation ${
                  gameMode === "doubles"
                    ? "bg-japandi-accent-primary text-white shadow-button"
                    : "bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-primary"
                }`}
              >
                Doubles
              </button>
              <button
                type="button"
                onClick={() => setGameMode("singles")}
                className={`flex-1 px-4 py-3 rounded-full font-medium transition-all active:scale-95 touch-manipulation ${
                  gameMode === "singles"
                    ? "bg-japandi-accent-primary text-white shadow-button"
                    : "bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-primary"
                }`}
              >
                Singles
              </button>
            </div>
          </div>

          {/* Group Player Suggestions */}
          {selectedGroupId && groupPlayers.length > 0 && (
            <div>
              <label className="block text-base font-medium text-japandi-text-primary mb-3">
                Quick Add from Group
              </label>
              <div className="flex flex-wrap gap-2">
                {groupPlayers.map((gp) => {
                  const isSelected = selectedGroupPlayerIds.has(gp.id);
                  return (
                    <button
                      key={gp.id}
                      type="button"
                      onClick={() => toggleGroupPlayer(gp)}
                      className={`px-3 py-2 rounded-full text-sm font-medium transition-all active:scale-95 touch-manipulation ${
                        isSelected
                          ? "bg-japandi-accent-primary text-white"
                          : "bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-primary"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}{gp.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Players */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-base font-medium text-japandi-text-primary">
                Players ({gameMode === "singles" ? "2-6" : "4-6"} players)
              </label>
              {players.length < 6 && (
                <button
                  type="button"
                  onClick={addPlayer}
                  className="text-sm text-japandi-accent-primary hover:text-japandi-accent-hover active:scale-95 transition-all touch-manipulation"
                >
                  + Add Player
                </button>
              )}
            </div>
            <div className="space-y-3">
              {players.map((player, index) => (
                <div key={player.id} className="flex gap-3">
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => updatePlayerName(index, e.target.value)}
                    placeholder={`Player ${index + 1}`}
                    className="flex-1 px-4 py-3 border border-japandi-border-light rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all"
                  />
                  {players.length > (gameMode === "singles" ? 2 : 4) && (
                    <button
                      type="button"
                      onClick={() => removePlayer(index)}
                      className="px-4 py-3 text-japandi-text-secondary hover:bg-japandi-background-card active:scale-95 rounded-card transition-all touch-manipulation"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!hasEnoughPlayers && (
              <p className="mt-2 text-sm text-red-600">
                At least {minPlayersRequired} players are required for {gameMode} mode
              </p>
            )}
          </div>

          {/* Organizer */}
          <div>
            <label className="block text-base font-medium text-japandi-text-primary mb-3">
              Organizer (who prepaid costs)
            </label>
            <select
              value={organizerId}
              onChange={(e) => setOrganizerId(e.target.value)}
              className="w-full px-4 py-3 border border-japandi-border-light rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all"
            >
              <option value="">Select organizer...</option>
              {players
                .filter((p) => p.name.trim() !== "")
                .map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
            </select>
            {organizerId === "" && hasEnoughPlayers && players.filter((p) => p.name.trim() !== "").length > 0 && (
              <p className="mt-2 text-sm text-japandi-text-muted">
                Organizer will default to first player if not selected
              </p>
            )}
          </div>

          {/* Court Cost */}
          <div>
            <label className="block text-base font-medium text-japandi-text-primary mb-3">
              Court Cost
            </label>
            <div className="flex gap-3 mb-3">
              <button
                type="button"
                onClick={() => setCourtCostType("per_person")}
                className={`flex-1 px-4 py-3 rounded-full font-medium transition-all active:scale-95 touch-manipulation ${
                  courtCostType === "per_person"
                    ? "bg-japandi-accent-primary text-white shadow-button"
                    : "bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-primary"
                }`}
              >
                Per Person
              </button>
              <button
                type="button"
                onClick={() => setCourtCostType("total")}
                className={`flex-1 px-4 py-3 rounded-full font-medium transition-all active:scale-95 touch-manipulation ${
                  courtCostType === "total"
                    ? "bg-japandi-accent-primary text-white shadow-button"
                    : "bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light hover:bg-japandi-background-primary"
                }`}
              >
                Total
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-japandi-text-secondary">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={courtCostValue}
                onChange={(e) => setCourtCostValue(e.target.value)}
                placeholder={courtCostType === "per_person" ? `${DEFAULT_COURT_COST_PER_PERSON.toFixed(2)} (default)` : `${DEFAULT_COURT_COST_TOTAL.toFixed(2)} (default)`}
                className={`w-full pl-8 pr-4 py-3 border rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all ${
                  !isValidCourtCost ? "border-red-300" : "border-japandi-border-light"
                }`}
              />
            </div>
            {!isValidCourtCost && (
              <p className="mt-2 text-sm text-red-600">
                Please enter a valid number (0 or greater)
              </p>
            )}
          </div>

          {/* Bird Cost */}
          <div>
            <label className="block text-base font-medium text-japandi-text-primary mb-3">
              Bird/Shuttle Cost (Total)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-japandi-text-secondary">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={birdCostTotal}
                onChange={(e) => setBirdCostTotal(e.target.value)}
                placeholder={`${DEFAULT_BIRD_COST.toFixed(2)} (default)`}
                className={`w-full pl-8 pr-4 py-3 border rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all ${
                  !isValidBirdCost ? "border-red-300" : "border-japandi-border-light"
                }`}
              />
            </div>
            {!isValidBirdCost && (
              <p className="mt-2 text-sm text-red-600">
                Please enter a valid number (0 or greater)
              </p>
            )}
          </div>

          {/* Betting Toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={bettingEnabled}
                onChange={(e) => setBettingEnabled(e.target.checked)}
                className="w-5 h-5 rounded border-japandi-border-light text-japandi-accent-primary focus:ring-2 focus:ring-japandi-accent-primary"
              />
              <div className="flex-1">
                <span className="block text-base font-medium text-japandi-text-primary">
                  Enable Betting
                </span>
                <span className="block text-sm text-japandi-text-muted mt-1">
                  Track gambling nets and include in settlement calculations
                </span>
              </div>
            </label>
          </div>

          {/* Bet Per Player (only shown when betting is enabled) */}
          {bettingEnabled && (
            <div>
              <label className="block text-base font-medium text-japandi-text-primary mb-3">
                Bet Per Player Per Game
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-japandi-text-secondary">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={betPerPlayer}
                  onChange={(e) => setBetPerPlayer(e.target.value)}
                  placeholder={`${DEFAULT_BET_PER_PLAYER.toFixed(2)} (default)`}
                  className={`w-full pl-8 pr-4 py-3 border rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all ${
                    !isValidBet ? "border-red-300" : "border-japandi-border-light"
                  }`}
                />
              </div>
              {!isValidBet && (
                <p className="mt-2 text-sm text-red-600">
                  Please enter a valid number (0 or greater)
                </p>
              )}
            </div>
          )}

          {/* Round Robin Option */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableRoundRobin}
                onChange={(e) => setEnableRoundRobin(e.target.checked)}
                className="w-5 h-5 rounded border-japandi-border-light text-japandi-accent-primary focus:ring-2 focus:ring-japandi-accent-primary"
              />
              <div className="flex-1">
                <span className="block text-base font-medium text-japandi-text-primary">
                  Generate Round Robin Schedule
                </span>
                <span className="block text-sm text-japandi-text-muted mt-1">
                  Automatically create game combinations so everyone plays with different partners
                </span>
              </div>
            </label>
            
            {enableRoundRobin && (
              <div className="mt-4 ml-8">
                <label className="block text-sm font-medium text-japandi-text-primary mb-2">
                  Number of Games (leave empty for all possible games)
                </label>
                <input
                  type="number"
                  min="1"
                  value={roundRobinGameCount}
                  onChange={(e) => setRoundRobinGameCount(e.target.value)}
                  placeholder="Auto"
                  className={`w-full px-4 py-3 border rounded-card bg-japandi-background-card text-japandi-text-primary focus:ring-2 focus:ring-japandi-accent-primary focus:border-transparent transition-all ${
                    !isValidRoundRobinCount ? "border-red-300" : "border-japandi-border-light"
                  }`}
                />
                {hasEnoughPlayers && (
                  <p className="mt-2 text-sm text-japandi-text-muted">
                    {roundRobinGameCount 
                      ? `Will generate up to ${parseInt(roundRobinGameCount) || 0} games`
                      : `Will generate ${generateRoundRobinGames(players.map((p, i) => ({ ...p, name: p.name.trim() || `Player ${i + 1}` })), undefined, gameMode).length} games (all possible)`}
                  </p>
                )}
                {!isValidRoundRobinCount && (
                  <p className="mt-2 text-sm text-red-600">
                    Please enter a valid number (1 or greater)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full px-6 py-4 bg-japandi-accent-primary hover:bg-japandi-accent-hover active:scale-95 disabled:bg-japandi-text-muted disabled:cursor-not-allowed disabled:active:scale-100 text-white font-semibold rounded-full transition-all shadow-button touch-manipulation"
          >
            Start Session
          </button>
        </form>
      </div>
    </div>
  );
}

// Wrapper component with Suspense boundary for useSearchParams
export default function CreateSession() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-japandi-background-primary flex items-center justify-center">
        <p className="text-japandi-text-secondary">Loading...</p>
      </div>
    }>
      <CreateSessionContent />
    </Suspense>
  );
}
