"use client";

import Link from "next/link";
import { Session } from "@/types";
import { formatCurrency } from "@/lib/calculations";

interface SessionHeaderProps {
  session: Session;
}

export default function SessionHeader({ session }: SessionHeaderProps) {
  const formattedDate = new Date(session.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {session.name || "Badminton Session"}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {formattedDate}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {session.players.length} players
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                •
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ${formatCurrency(session.betPerPlayer)} per game
              </span>
            </div>
          </div>
          <Link
            href={`/session/${session.id}/summary`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            View Summary
          </Link>
        </div>
      </div>
    </div>
  );
}

