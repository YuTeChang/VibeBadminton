"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-japandi-background-primary flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-japandi-background-card rounded-card border border-japandi-border-light p-8 shadow-soft text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-japandi-text-primary mb-2">Something went wrong!</h1>
        <p className="text-japandi-text-secondary mb-6">
          {error.message || "An unexpected error occurred"}
        </p>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full px-6 py-3 bg-japandi-accent-primary hover:bg-japandi-accent-hover text-white font-semibold rounded-full transition-all shadow-button"
          >
            Try again
          </button>
          <Link
            href="/"
            className="block w-full px-6 py-3 bg-japandi-background-primary hover:bg-japandi-background-card text-japandi-text-primary border border-japandi-border-light font-semibold rounded-full transition-all text-center"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

