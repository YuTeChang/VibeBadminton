"use client";

import { PlayerStats } from "@/lib/calculations";
import { Player } from "@/types";
import { formatCurrency } from "@/lib/calculations";

interface LiveStatsCardProps {
  stats: PlayerStats;
  player: Player;
  bettingEnabled?: boolean;
  pointsScored?: number;
  pointsConceded?: number;
}

export default function LiveStatsCard({ 
  stats, 
  player, 
  bettingEnabled = true,
  pointsScored = 0,
  pointsConceded = 0,
}: LiveStatsCardProps) {
  const isPositive = stats.gamblingNet > 0;
  const isNegative = stats.gamblingNet < 0;
  const isGuest = player.isGuest || (!player.groupPlayerId && player.name);
  const pointDifferential = pointsScored - pointsConceded;

  return (
    <div className={`bg-japandi-background-card rounded-card border p-4 sm:p-6 shadow-soft transition-shadow hover:shadow-md ${
      isGuest ? 'border-dashed border-yellow-300' : 'border-japandi-border-light'
    }`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-japandi-text-primary truncate">
              {player.name}
            </h3>
            {isGuest && (
              <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                Guest
              </span>
            )}
            {player.groupPlayerId && (
              <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                Linked
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 sm:gap-4 mt-2 sm:mt-3">
            <div className="text-sm sm:text-base">
              <span className="text-japandi-text-secondary">W/L: </span>
              <span className="font-medium text-japandi-text-primary">
                {stats.wins}-{stats.losses}
              </span>
            </div>
            {/* Show points differential when betting is disabled */}
            {!bettingEnabled && (
              <div className="text-sm sm:text-base">
                <span className="text-japandi-text-secondary">+/-: </span>
                <span className={`font-medium ${
                  pointDifferential > 0 ? 'text-green-600' : 
                  pointDifferential < 0 ? 'text-red-500' : 
                  'text-japandi-text-primary'
                }`}>
                  {pointDifferential > 0 && '+'}{pointDifferential}
                </span>
              </div>
            )}
          </div>
        </div>
        {/* Only show net $ when betting is enabled */}
        {bettingEnabled && (
          <div className="text-right flex-shrink-0">
            <div
              className={`text-lg sm:text-xl font-bold ${
                isPositive
                  ? "text-japandi-accent-primary"
                  : isNegative
                  ? "text-japandi-text-secondary"
                  : "text-japandi-text-muted"
              }`}
            >
              {isPositive && "+"}
              {formatCurrency(stats.gamblingNet)}
            </div>
            <div className="text-xs sm:text-sm text-japandi-text-muted mt-1">
              Net
            </div>
          </div>
        )}
        {/* Show points when betting is disabled */}
        {!bettingEnabled && (
          <div className="text-right flex-shrink-0">
            <div className="text-sm text-japandi-text-secondary">
              <span className="text-green-600">{pointsScored}</span>
              {' / '}
              <span className="text-red-500">{pointsConceded}</span>
            </div>
            <div className="text-xs text-japandi-text-muted mt-1">
              Pts For / Against
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

