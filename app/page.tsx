import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          VibeBadminton
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Track your badminton doubles games and automatically calculate who owes what
        </p>
        <div className="pt-8">
          <Link
            href="/create-session"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Create New Session
          </Link>
        </div>
      </div>
    </main>
  );
}

