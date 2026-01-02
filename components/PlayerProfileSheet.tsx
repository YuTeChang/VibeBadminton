"use client";

import { useState } from "react";
import { PlayerDetailedStats, PartnerStats, OpponentStats, ClutchGame, UnluckyGame } from "@/types";
import { formatPercentage } from "@/lib/calculations";
import { PlayerMatchupDetailSheet } from "./PlayerMatchupDetailSheet";

interface PlayerProfileSheetProps {
  stats: PlayerDetailedStats;
  onClose: () => void;
}

type SelectedMatchup = {
  type: 'partner';
  data: PartnerStats;
} | {
  type: 'opponent';
  data: OpponentStats;
} | null;

export function PlayerProfileSheet({ stats, onClose }: PlayerProfileSheetProps) {
  const [selectedMatchup, setSelectedMatchup] = useState<SelectedMatchup>(null);
  const [showAllGames, setShowAllGames] = useState(false);
  const [showUnluckyGames, setShowUnluckyGames] = useState(false);
  const [showClutchGames, setShowClutchGames] = useState(false);
  const [showAllPartners, setShowAllPartners] = useState(false);
  const [showAllOpponents, setShowAllOpponents] = useState(false);
  
  // Show 3 by default, all when expanded
  const displayedPartners = showAllPartners ? stats.partnerStats : stats.partnerStats.slice(0, 3);
  const displayedOpponents = showAllOpponents ? stats.opponentStats : stats.opponentStats.slice(0, 3);
  
  // Best and worst matchups
  const bestPartner = stats.partnerStats.length > 0 
    ? stats.partnerStats.reduce((a, b) => a.winRate > b.winRate ? a : b)
    : null;
  const worstPartner = stats.partnerStats.length > 1
    ? stats.partnerStats.reduce((a, b) => a.winRate < b.winRate ? a : b)
    : null;
  const nemesis = stats.opponentStats.length > 0
    ? stats.opponentStats.reduce((a, b) => a.winRate < b.winRate ? a : b)
    : null;
  const dominates = stats.opponentStats.length > 0
    ? stats.opponentStats.reduce((a, b) => a.winRate > b.winRate ? a : b)
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
            <h2 className="text-xl font-bold text-japandi-text-primary">{stats.playerName}</h2>
            <p className="text-sm text-japandi-text-muted">
              ELO: {stats.eloRating} • Rank #{stats.rank} of {stats.totalPlayers}
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
                  {stats.totalGames}
                </div>
                <div className="text-xs text-japandi-text-muted mt-1">Games</div>
              </div>
              <div className="bg-japandi-background-primary rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-japandi-text-primary">
                  {stats.sessionsPlayed}
                </div>
                <div className="text-xs text-japandi-text-muted mt-1">Sessions</div>
              </div>
              <div className="bg-japandi-background-primary rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-japandi-text-primary">
                  {stats.wins}-{stats.losses}
                </div>
                <div className="text-xs text-japandi-text-muted mt-1">W-L</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-japandi-background-primary rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-japandi-text-primary">
                  {formatPercentage(stats.winRate)}
                </div>
                <div className="text-xs text-japandi-text-muted mt-1">Win Rate</div>
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
                  {stats.pointsScored}
                </div>
                <div className="text-xs text-japandi-text-muted mt-1">Pts For</div>
              </div>
              <div className="bg-japandi-background-primary rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-red-500">
                  {stats.pointsConceded}
                </div>
                <div className="text-xs text-japandi-text-muted mt-1">Pts Against</div>
              </div>
              <div className="bg-japandi-background-primary rounded-xl p-3 text-center">
                <div className={`text-lg font-bold ${stats.pointDifferential >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {stats.pointDifferential >= 0 ? '+' : ''}{stats.pointDifferential}
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

          {/* Close Games - Clutch & Unlucky */}
          {((stats.clutchGames && stats.clutchGames.length > 0) || (stats.unluckyGames && stats.unluckyGames.length > 0)) && (
            <div>
              <h3 className="text-sm font-semibold text-japandi-text-muted uppercase tracking-wide mb-3">
                Close Games
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-2">
                {/* Clutch tile */}
                <button
                  onClick={() => stats.clutchGames && stats.clutchGames.length > 0 && setShowClutchGames(!showClutchGames)}
                  disabled={!stats.clutchGames || stats.clutchGames.length === 0}
                  className={`bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center transition-colors ${
                    stats.clutchGames && stats.clutchGames.length > 0 
                      ? 'hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer' 
                      : 'opacity-50 cursor-default'
                  }`}
                >
                  <div className="text-lg font-bold text-green-600">
                    🎯 {stats.clutchCount || 0}
                  </div>
                  <div className="text-xs text-japandi-text-muted mt-1">Clutch (won by 1-2)</div>
                  {stats.clutchGames && stats.clutchGames.length > 0 && (
                    <div className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                      tap to view
                      <svg 
                        className={`w-3 h-3 transition-transform ${showClutchGames ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  )}
                </button>
                
                {/* Unlucky tile */}
                <button
                  onClick={() => stats.unluckyGames && stats.unluckyGames.length > 0 && setShowUnluckyGames(!showUnluckyGames)}
                  disabled={!stats.unluckyGames || stats.unluckyGames.length === 0}
                  className={`bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center transition-colors ${
                    stats.unluckyGames && stats.unluckyGames.length > 0 
                      ? 'hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer' 
                      : 'opacity-50 cursor-default'
                  }`}
                >
                  <div className="text-lg font-bold text-red-500">
                    💔 {stats.unluckyCount || 0}
                  </div>
                  <div className="text-xs text-japandi-text-muted mt-1">Unlucky (lost by 1-2)</div>
                  {stats.unluckyGames && stats.unluckyGames.length > 0 && (
                    <div className="text-xs text-red-500 mt-1 flex items-center justify-center gap-1">
                      tap to view
                      <svg 
                        className={`w-3 h-3 transition-transform ${showUnluckyGames ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
              
              {/* Clutch Games Expanded */}
              {showClutchGames && stats.clutchGames && stats.clutchGames.length > 0 && (
                <div className="mt-2 space-y-2">
                  {stats.clutchGames.map((game, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-3 bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30"
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
                          <div className="text-lg font-bold text-green-600">
                            {game.teamAScore}-{game.teamBScore}
                          </div>
                          <div className="text-xs text-green-500">
                            Won by {game.margin}
                          </div>
                          {game.date && (
                            <div className="text-xs text-japandi-text-muted mt-1">
                              {new Date(game.date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Unlucky Games Expanded */}
              {showUnluckyGames && stats.unluckyGames && stats.unluckyGames.length > 0 && (
                <div className="mt-2 space-y-2">
                  {stats.unluckyGames.map((game, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-3 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30"
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
                          <div className="text-lg font-bold text-red-500">
                            {game.teamAScore}-{game.teamBScore}
                          </div>
                          <div className="text-xs text-red-400">
                            Lost by {game.margin}
                          </div>
                          {game.date && (
                            <div className="text-xs text-japandi-text-muted mt-1">
                              {new Date(game.date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Partner Stats (for doubles) */}
          {stats.partnerStats.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-japandi-text-muted uppercase tracking-wide">
                  Partners ({stats.partnerStats.length})
                </h3>
                {stats.partnerStats.length > 3 && (
                  <button
                    onClick={() => setShowAllPartners(!showAllPartners)}
                    className="text-xs text-japandi-accent-primary hover:text-japandi-accent-hover transition-colors"
                  >
                    {showAllPartners ? 'Show Less' : `Show All (${stats.partnerStats.length})`}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {displayedPartners.map((partner, i) => (
                  <button
                    key={partner.partnerId}
                    onClick={() => setSelectedMatchup({ type: 'partner', data: partner })}
                    className="w-full text-left flex items-center justify-between bg-japandi-background-primary rounded-xl p-3 hover:bg-japandi-background-primary/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        i === 0 && !showAllPartners ? 'bg-yellow-100 text-yellow-700' : 'bg-japandi-background-card text-japandi-text-muted'
                      }`}>
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-medium text-japandi-text-primary">{partner.partnerName}</div>
                        <div className="text-xs text-japandi-text-muted">
                          {partner.wins}-{partner.losses} ({partner.gamesPlayed} games)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-semibold ${
                        partner.winRate >= 60 ? 'text-green-600' : 
                        partner.winRate >= 40 ? 'text-japandi-text-primary' : 
                        'text-red-600'
                      }`}>
                        {formatPercentage(partner.winRate)}
                      </div>
                      <svg className="w-4 h-4 text-japandi-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
              {bestPartner && bestPartner.winRate >= 70 && bestPartner.gamesPlayed >= 3 && (
                <p className="text-sm text-green-600 mt-2">
                  🔥 Hot duo with {bestPartner.partnerName}!
                </p>
              )}
              {worstPartner && worstPartner !== bestPartner && worstPartner.winRate < 40 && worstPartner.gamesPlayed >= 3 && (
                <p className="text-sm text-japandi-text-muted mt-1">
                  ⚠️ Struggles with {worstPartner.partnerName}
                </p>
              )}
            </div>
          )}

          {/* Opponent Stats */}
          {stats.opponentStats.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-japandi-text-muted uppercase tracking-wide">
                  Opponents ({stats.opponentStats.length})
                </h3>
                {stats.opponentStats.length > 3 && (
                  <button
                    onClick={() => setShowAllOpponents(!showAllOpponents)}
                    className="text-xs text-japandi-accent-primary hover:text-japandi-accent-hover transition-colors"
                  >
                    {showAllOpponents ? 'Show Less' : `Show All (${stats.opponentStats.length})`}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {displayedOpponents.map((opponent, i) => (
                  <button
                    key={opponent.opponentId}
                    onClick={() => setSelectedMatchup({ type: 'opponent', data: opponent })}
                    className="w-full text-left flex items-center justify-between bg-japandi-background-primary rounded-xl p-3 hover:bg-japandi-background-primary/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        i === 0 && !showAllOpponents ? 'bg-yellow-100 text-yellow-700' : 'bg-japandi-background-card text-japandi-text-muted'
                      }`}>
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-medium text-japandi-text-primary">{opponent.opponentName}</div>
                        <div className="text-xs text-japandi-text-muted">
                          {opponent.wins}-{opponent.losses} ({opponent.gamesPlayed} games)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-semibold ${
                        opponent.winRate >= 60 ? 'text-green-600' : 
                        opponent.winRate >= 40 ? 'text-japandi-text-primary' : 
                        'text-red-600'
                      }`}>
                        {formatPercentage(opponent.winRate)}
                      </div>
                      <svg className="w-4 h-4 text-japandi-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
              {dominates && dominates.winRate >= 70 && dominates.gamesPlayed >= 3 && (
                <p className="text-sm text-green-600 mt-2">
                  💪 Dominates vs {dominates.opponentName}
                </p>
              )}
              {nemesis && nemesis !== dominates && nemesis.winRate < 30 && nemesis.gamesPlayed >= 3 && (
                <p className="text-sm text-red-500 mt-1">
                  😰 Nemesis: {nemesis.opponentName}
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
                        {game.date && (
                          <div className="text-xs text-japandi-text-muted mt-1">
                            {new Date(game.date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sessions */}
          <div className="text-center text-sm text-japandi-text-muted pt-2 border-t border-japandi-border-light">
            {stats.sessionsPlayed} sessions • {stats.totalGames} games played
          </div>
        </div>
      </div>
      
      {/* Player Matchup Detail Sheet */}
      {selectedMatchup && (
        <PlayerMatchupDetailSheet
          playerName={stats.playerName}
          matchupName={selectedMatchup.type === 'partner' ? selectedMatchup.data.partnerName : selectedMatchup.data.opponentName}
          matchupType={selectedMatchup.type}
          wins={selectedMatchup.data.wins}
          losses={selectedMatchup.data.losses}
          gamesPlayed={selectedMatchup.data.gamesPlayed}
          winRate={selectedMatchup.data.winRate}
          games={selectedMatchup.data.games || []}
          onClose={() => setSelectedMatchup(null)}
        />
      )}
    </div>
  );
}