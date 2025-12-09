"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/contexts/SessionContext";
import {
  calculateFinalSettlement,
  formatCurrency,
  generateShareableText,
} from "@/lib/calculations";
import Link from "next/link";

export default function SummaryPage() {
  const params = useParams();
  const router = useRouter();
  const { session, games } = useSession();
  const [copied, setCopied] = useState(false);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">No session found</p>
        <Link href="/create-session" className="ml-4 text-blue-600">
          Create Session
        </Link>
      </div>
    );
  }

  const settlement = calculateFinalSettlement(session, games);
  const shareableText = generateShareableText(settlement);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareableText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Final Summary
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {session.name || "Badminton Session"} • {games.length} games played
          </p>
        </div>

        {/* Stats Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    W/L
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Net
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Pay Organizer
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {settlement.map((s) => (
                  <tr key={s.playerId}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {s.playerName}
                      {s.playerId === session.organizerId && (
                        <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                          (Organizer)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400">
                      {s.wins}-{s.losses}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm text-center font-medium ${
                        s.gamblingNet > 0
                          ? "text-green-600 dark:text-green-400"
                          : s.gamblingNet < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {s.gamblingNet > 0 && "+"}
                      {formatCurrency(s.gamblingNet)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(s.amountToPayOrganizer)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shareable Text */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Shareable Text
            </h2>
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="bg-gray-50 dark:bg-gray-900 rounded p-3 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
            {shareableText}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href={`/session/${session.id}`}
            className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors text-center"
          >
            Back to Session
          </Link>
          <Link
            href="/create-session"
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-center"
          >
            New Session
          </Link>
        </div>
      </div>
    </div>
  );
}

