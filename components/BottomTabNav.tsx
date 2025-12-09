"use client";

interface BottomTabNavProps {
  activeTab: "stats" | "record" | "history";
  onTabChange: (tab: "stats" | "record" | "history") => void;
  gameCount?: number;
}

export default function BottomTabNav({
  activeTab,
  onTabChange,
  gameCount = 0,
}: BottomTabNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-20">
      <div className="max-w-2xl mx-auto">
        <div className="grid grid-cols-3">
          <button
            onClick={() => onTabChange("stats")}
            className={`flex flex-col items-center justify-center py-3 px-2 transition-colors ${
              activeTab === "stats"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            <svg
              className="w-6 h-6 mb-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span className="text-xs font-medium">Stats</span>
          </button>

          <button
            onClick={() => onTabChange("record")}
            className={`flex flex-col items-center justify-center py-3 px-2 transition-colors ${
              activeTab === "record"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            <svg
              className="w-6 h-6 mb-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="text-xs font-medium">Record</span>
          </button>

          <button
            onClick={() => onTabChange("history")}
            className={`flex flex-col items-center justify-center py-3 px-2 transition-colors relative ${
              activeTab === "history"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            <svg
              className="w-6 h-6 mb-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-xs font-medium">History</span>
            {gameCount > 0 && (
              <span className="absolute top-1 right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {gameCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

