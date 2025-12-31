import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-japandi-background-primary flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-japandi-background-card rounded-card border border-japandi-border-light p-8 shadow-soft text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-japandi-text-primary mb-2">404</h1>
        <p className="text-japandi-text-secondary mb-6">
          This page could not be found.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-japandi-accent-primary hover:bg-japandi-accent-hover text-white font-semibold rounded-full transition-all shadow-button"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}

