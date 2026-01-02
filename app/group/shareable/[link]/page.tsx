"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ApiClient } from "@/lib/api/client";
import { Group } from "@/types";

export default function ShareableLinkPage() {
  const params = useParams();
  const router = useRouter();
  const link = params.link as string;

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const lookupGroup = async () => {
      try {
        const group = await ApiClient.getGroupByShareableLink(link);
        // Redirect to the actual group page
        router.replace(`/group/${group.id}`);
      } catch (err) {
        setError("Group not found or link is invalid.");
        setIsLoading(false);
      }
    };

    lookupGroup();
  }, [link, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-japandi-background-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-japandi-text-secondary mb-2">Looking up group...</div>
          <div className="text-sm text-japandi-text-muted">Code: {link}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-japandi-background-primary py-8">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <div className="bg-japandi-background-card rounded-card border border-japandi-border-light p-8 shadow-soft">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-japandi-text-primary mb-2">Group Not Found</h1>
          <p className="text-japandi-text-secondary mb-6">
            The shareable link <code className="bg-japandi-background-primary px-2 py-1 rounded text-japandi-accent-primary">{link}</code> does not match any group.
          </p>
          <div className="space-y-3">
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-japandi-accent-primary hover:bg-japandi-accent-hover text-white font-semibold rounded-full transition-all"
            >
              Go to Home
            </Link>
            <p className="text-sm text-japandi-text-muted">
              Want to create your own group?{" "}
              <Link href="/create-group" className="text-japandi-accent-primary hover:text-japandi-accent-hover">
                Create one here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


