"use client";

import { PlayerStats } from "@/lib/calculations";
import { Player } from "@/types";
import { formatCurrency } from "@/lib/calculations";

interface LiveStatsCardProps {
  stats: PlayerStats;
  player: Player;
}

export default function LiveStatsCard({ stats, player }: LiveStatsCardProps) {
  const isPositive = stats.gamblingNet > 0;
  const isNegative = stats.gamblingNet < 0;
  const isNeutral = stats.gamblingNet === 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {player.name}
          </h3>
          <div className="flex items-center gap-4 mt-2">
            <div className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">W/L: </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {stats.wins}-{stats.losses}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div
            className={`text-lg font-bold ${
              isPositive
                ? "text-green-600 dark:text-green-400"
                : isNegative
                ? "text-red-600 dark:text-red-400"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {isPositive && "+"}
            {formatCurrency(stats.gamblingNet)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Net
          </div>
        </div>
      </div>
    </div>
  );
}

