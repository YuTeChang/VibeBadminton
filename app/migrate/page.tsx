"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface MigrationStatus {
  migrationNeeded: boolean;
  groupsTableExists: boolean;
  automaticMigrationAvailable: boolean;
  message: string;
  error?: string;
}

export default function MigratePage() {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/migrate');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      setStatus({
        migrationNeeded: true,
        groupsTableExists: false,
        automaticMigrationAvailable: false,
        message: 'Failed to check migration status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runMigration = async () => {
    setIsRunning(true);
    setMigrationResult(null);
    
    try {
      const response = await fetch('/api/migrate', {
        method: 'POST',
      });
      const result = await response.json();
      setMigrationResult(result);
      
      // Refresh status after migration
      if (result.success) {
        setTimeout(() => {
          checkStatus();
        }, 1000);
      }
    } catch (error) {
      setMigrationResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-japandi-background-primary py-4 sm:py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <Link
            href="/"
            className="text-japandi-accent-primary hover:text-japandi-accent-hover text-sm transition-colors"
          >
            ← Back to Home
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-japandi-text-primary mt-4 sm:mt-6">
            Database Migration Status
          </h1>
          <p className="text-japandi-text-secondary mt-2">
            Check and run database migrations for the Groups feature
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-japandi-background-card rounded-card border border-japandi-border-light p-6 shadow-soft mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-japandi-text-primary">Current Status</h2>
            <button
              onClick={checkStatus}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm bg-japandi-background-primary hover:bg-japandi-background-card border border-japandi-border-light rounded-card transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Checking...' : 'Refresh'}
            </button>
          </div>

          {isLoading ? (
            <div className="text-japandi-text-secondary">Loading status...</div>
          ) : status ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${status.groupsTableExists ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium text-japandi-text-primary">
                  Groups Table: {status.groupsTableExists ? 'Exists ✓' : 'Missing ✗'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${status.automaticMigrationAvailable ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="text-sm font-medium text-japandi-text-primary">
                  Automatic Migration: {status.automaticMigrationAvailable ? 'Available ✓' : 'Not Available (need POSTGRES_URL)'}
                </span>
              </div>

              <div className="mt-4 p-3 bg-japandi-background-primary rounded-card">
                <p className="text-sm text-japandi-text-secondary">{status.message}</p>
                {status.error && (
                  <p className="text-sm text-red-600 mt-2">Error: {status.error}</p>
                )}
              </div>

              {status.migrationNeeded && status.automaticMigrationAvailable && (
                <button
                  onClick={runMigration}
                  disabled={isRunning}
                  className="w-full mt-4 px-6 py-3 bg-japandi-accent-primary hover:bg-japandi-accent-hover disabled:bg-japandi-text-muted text-white font-semibold rounded-full transition-all shadow-button"
                >
                  {isRunning ? 'Running Migration...' : 'Run Migration Now'}
                </button>
              )}

              {status.migrationNeeded && !status.automaticMigrationAvailable && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-card">
                  <p className="text-sm text-yellow-800 font-medium mb-2">Manual Migration Required</p>
                  <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
                    <li>Go to your Supabase project dashboard</li>
                    <li>Navigate to SQL Editor</li>
                    <li>Copy the contents of <code className="bg-yellow-100 px-1 rounded">scripts/migrate-add-groups.sql</code></li>
                    <li>Paste and run in SQL Editor</li>
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div className="text-red-600">Failed to load status</div>
          )}
        </div>

        {/* Migration Result */}
        {migrationResult && (
          <div className={`bg-japandi-background-card rounded-card border p-6 shadow-soft mb-6 ${
            migrationResult.success ? 'border-green-200' : 'border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {migrationResult.success ? (
                <>
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-green-700">Migration Successful!</h3>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-red-700">Migration Failed</h3>
                </>
              )}
            </div>
            
            <p className={`text-sm mb-3 ${migrationResult.success ? 'text-green-700' : 'text-red-700'}`}>
              {migrationResult.message || migrationResult.error}
            </p>

            {migrationResult.success && (
              <div className="mt-4 space-y-2">
                {migrationResult.tablesCreated && (
                  <div>
                    <p className="text-xs font-medium text-japandi-text-secondary mb-1">Tables Created:</p>
                    <ul className="text-sm text-japandi-text-primary list-disc list-inside">
                      {migrationResult.tablesCreated.map((table: string) => (
                        <li key={table}>{table}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {migrationResult.columnsAdded && (
                  <div>
                    <p className="text-xs font-medium text-japandi-text-secondary mb-1">Columns Added:</p>
                    <ul className="text-sm text-japandi-text-primary list-disc list-inside">
                      {migrationResult.columnsAdded.map((col: string) => (
                        <li key={col}>{col}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {migrationResult.success && (
              <Link
                href="/create-group"
                className="inline-block mt-4 px-4 py-2 bg-japandi-accent-primary hover:bg-japandi-accent-hover text-white text-sm font-semibold rounded-full transition-all"
              >
                Create Your First Group →
              </Link>
            )}
          </div>
        )}

        {/* Additional Info */}
        <div className="bg-japandi-background-card rounded-card border border-japandi-border-light p-6 shadow-soft">
          <h3 className="text-base font-semibold text-japandi-text-primary mb-3">How to Verify in Supabase</h3>
          <ol className="text-sm text-japandi-text-secondary space-y-2 list-decimal list-inside">
            <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-japandi-accent-primary hover:underline">Supabase Dashboard</a></li>
            <li>Select your project</li>
            <li>Navigate to <strong>Table Editor</strong> in the left sidebar</li>
            <li>You should see <code className="bg-japandi-background-primary px-1 rounded">groups</code> and <code className="bg-japandi-background-primary px-1 rounded">group_players</code> tables</li>
            <li>Check that <code className="bg-japandi-background-primary px-1 rounded">sessions</code> table has <code className="bg-japandi-background-primary px-1 rounded">group_id</code> and <code className="bg-japandi-background-primary px-1 rounded">betting_enabled</code> columns</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

