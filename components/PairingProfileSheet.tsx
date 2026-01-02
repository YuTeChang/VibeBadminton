"use client";

import { useState } from "react";
import { PairingDetailedStats } from "@/types";
import { formatPercentage } from "@/lib/calculations";

interface PairingProfileSheetProps {
  stats: PairingDetailedStats;
  onClose: () => void;
}

export function PairingProfileSheet({ stats, onClose }: PairingProfileSheetProps) {
  const [showAllGames, setShowAllGames] = useState(false);
  
  // Get top matchups (sorted by games played)
  const topMatchups = stats.matchups.slice(0, 5);
  
  // Best and worst matchups
  const bestMatchup = stats.matchups.length > 0
    ? stats.matchups.reduce((a, b) => a.winRate > b.winRate ? a : b)
    : null;
  const worstMatchup = stats.matchups.length > 1
    ? stats.matchups.reduce((a, b) => a.winRate < b.winRate ? a : b)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="relative w-full max-w-lg max-h-[90vh] bg-japandi-background-card rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-xl animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-japandi-background-card border-b border-japandi-border-light px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-japandi-text-primary">
              {stats.player1Name} & {stats.player2Name}
            </h2>
            <p className="text-sm text-japandi-text-muted">
              Doubles Pairing Stats
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-japandi-background-primary rounded-full transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-japandi-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 space-y-6">
          {/* Overview Stats */}
          <div>
            <h3 className="text-sm font-semibold text-japandi-text-muted uppercase tracking-wide mb-3">Overview</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-japandi-background-primary rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-japandi-text-primary">
                  {stats.wins}-{stats.losses}
                </div>
                <div className="text-xs text-japandi-text-muted mt-1">W-L</div>
              </div>
              <div className="bg-japandi-background-primary rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-japandi-text-primary">
                  {formatPercentage(stats.winRate)}
                </div>
                <div className="text-xs text-japandi-text-muted mt-1">Win Rate</div>
              </div>
              <div className="bg-japandi-background-primary rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-japandi-text-primary">
                  {stats.gamesPlayed}
                </div>
                <div className="text-xs text-japandi-text-muted mt-1">Games</div>
              </div>
            </div>
            
            {/* Extended Stats Row */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-japandi-background-primary rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-japandi-accent-primary">
                  {stats.eloRating}
                </div>
                <div className="text-xs text-japandi-text-muted mt-1">Pair ELO</div>
              </div>
              <div className="bg-japandi-background-primary rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-japandi-text-primary">
                  {stats.bestWinStreak}
                </div>
                <div className="text-xs text-japandi-text-muted mt-1">Best Streak</div>
              </div>
            </div>
            
            {/* Points Section */}
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="bg-japandi-background-primary rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-green-600">
                  {stats.pointsFor}
                </div>
                <div className="text-xs text-japandi-text-muted mt-1">Pts For</div>
              </div>
              <div className="bg-japandi-background-primary rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-red-500">
                  {stats.pointsAgainst}
                </div>
                <div className="text-xs text-japandi-text-muted mt-1">Pts Against</div>
              </div>
              <div className="bg-japandi-background-primary rounded-xl p-3 text-center">
                <div className={`text-lg font-bold ${stats.pointDifferential >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {stats.pointDifferential > 0 ? '+' : ''}{stats.pointDifferential}
                </div>
                <div className="text-xs text-japandi-text-muted mt-1">Pts +/-</div>
              </div>
            </div>
          </div>

          {/* Recent Form */}
          {stats.recentForm.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-japandi-text-muted uppercase tracking-wide mb-3">
                Recent Form (Last {stats.recentForm.length})
              </h3>
              <div className="flex gap-2">
                {stats.recentForm.map((result, i) => (
                  <div
                    key={i}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                      result === 'W'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {result}
                  </div>
                ))}
              </div>
              {stats.currentStreak !== 0 && (
                <p className="text-sm text-japandi-text-muted mt-2">
                  {stats.currentStreak > 0 
                    ? `🔥 ${stats.currentStreak} game win streak!`
                    : `😢 ${Math.abs(stats.currentStreak)} game losing streak`
                  }
                </p>
              )}
            </div>
          )}

          {/* Head-to-Head Matchups */}
          {topMatchups.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-japandi-text-muted uppercase tracking-wide mb-3">
                vs Opponent Pairings
              </h3>
              <div className="space-y-2">
                {topMatchups.map((matchup, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-japandi-background-primary rounded-xl p-3"
                  >
                    <div>
                      <div className="font-medium text-japandi-text-primary">
                        {matchup.opponentPlayer1Name} & {matchup.opponentPlayer2Name}
                      </div>
                      <div className="text-xs text-japandi-text-muted">
                        {matchup.wins}-{matchup.losses} ({matchup.gamesPlayed} games)
                      </div>
                    </div>
                    <div className={`text-sm font-semibold ${
                      matchup.winRate >= 60 ? 'text-green-600' : 
                      matchup.winRate >= 40 ? 'text-japandi-text-primary' : 
                      'text-red-600'
                    }`}>
                      {formatPercentage(matchup.winRate)}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Best/Worst matchups callouts */}
              {bestMatchup && bestMatchup.winRate >= 70 && bestMatchup.gamesPlayed >= 2 && (
                <p className="text-sm text-green-600 mt-2">
                  💪 Dominates vs {bestMatchup.opponentPlayer1Name} & {bestMatchup.opponentPlayer2Name}
                </p>
              )}
              {worstMatchup && worstMatchup !== bestMatchup && worstMatchup.winRate < 30 && worstMatchup.gamesPlayed >= 2 && (
                <p className="text-sm text-red-500 mt-1">
                  😰 Struggles vs {worstMatchup.opponentPlayer1Name} & {worstMatchup.opponentPlayer2Name}
                </p>
              )}
            </div>
          )}

          {/* Recent Games */}
          {stats.recentGames && stats.recentGames.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-japandi-text-muted uppercase tracking-wide">
                  Recent Games ({stats.recentGames.length})
                </h3>
                {stats.recentGames.length > 3 && (
                  <button
                    onClick={() => setShowAllGames(!showAllGames)}
                    className="text-xs text-japandi-accent-primary hover:text-japandi-accent-hover transition-colors"
                  >
                    {showAllGames ? 'Show Less' : `Show All (${stats.recentGames.length})`}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {(showAllGames ? stats.recentGames : stats.recentGames.slice(0, 3)).map((game, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-3 border ${
                      game.won 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-japandi-text-primary truncate">
                          {game.teamANames.join(' & ')}
                        </div>
                        <div className="text-xs text-japandi-text-muted">vs</div>
                        <div className="text-sm text-japandi-text-primary truncate">
                          {game.teamBNames.join(' & ')}
                        </div>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        {game.teamAScore !== undefined && game.teamBScore !== undefined ? (
                          <div className="text-lg font-bold text-japandi-text-primary">
                            {game.teamAScore}-{game.teamBScore}
                          </div>
                        ) : (
                          <div className={`text-sm font-bold ${game.won ? 'text-green-600' : 'text-red-600'}`}>
                            {game.won ? 'WIN' : 'LOSS'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.matchups.length === 0 && (
            <div className="text-center py-4 text-japandi-text-muted">
              No head-to-head matchups recorded yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

