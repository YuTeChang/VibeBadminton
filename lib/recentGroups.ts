/**
 * Utility for managing recent groups in localStorage
 * Used by home page to display recent groups for quick access
 */

// localStorage key for recent groups
const STORAGE_KEY_RECENT_GROUPS = "poweredbypace_recent_groups";

export interface RecentGroup {
  code: string;
  name: string;
  lastVisited: string;
}

/**
 * Save a group to recent groups list in localStorage
 * Called from group page when a group is successfully loaded
 */
export function saveRecentGroup(code: string, name: string) {
  if (typeof window === "undefined") return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_RECENT_GROUPS);
    let recent: RecentGroup[] = stored ? JSON.parse(stored) : [];
    
    // Remove if already exists (we'll add it fresh)
    recent = recent.filter(g => g.code !== code);
    
    // Add to front
    recent.unshift({
      code,
      name,
      lastVisited: new Date().toISOString(),
    });
    
    // Keep only last 3
    recent = recent.slice(0, 3);
    
    localStorage.setItem(STORAGE_KEY_RECENT_GROUPS, JSON.stringify(recent));
  } catch (e) {
    console.error("Failed to save recent group:", e);
  }
}

/**
 * Load recent groups from localStorage
 */
export function loadRecentGroups(): RecentGroup[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_RECENT_GROUPS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load recent groups:", e);
  }
  
  return [];
}
