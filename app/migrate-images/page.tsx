"use client";

import { useState } from "react";

export default function MigrateImagesPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [specificIds, setSpecificIds] = useState<string>("");

  const checkMigration = async (showAll = false, checkAccessible = false) => {
    setLoading(true);
    try {
      let url = "/api/migrate-images";
      if (showAll) url += "?all=true";
      if (checkAccessible) url += showAll ? "&check=true" : "?check=true";
      
      const res = await fetch(url);
      const data = await res.json();
      setPreview(data);
    } catch (error) {
      console.error("Error checking migration:", error);
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async (limit: number = 5) => {
    setLoading(true);
    try {
      const body: any = { limit };
      
      // If specific IDs are provided, use those
      if (specificIds.trim()) {
        const ids = specificIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        if (ids.length > 0) {
          body.ids = ids;
        }
      }
      
      const res = await fetch("/api/migrate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error("Error running migration:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold mb-6 text-[var(--fg)]">Image Migration Tool</h1>
      
      <div className="grid gap-6">
        {/* Check Migration Status */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4 text-[var(--fg)]">Check Migration Status</h2>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => checkMigration(false)}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "Checking..." : "Check Recent (48h)"}
            </button>
            <button
              onClick={() => checkMigration(true)}
              disabled={loading}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50"
            >
              {loading ? "Checking..." : "Check All"}
            </button>
            <button
              onClick={() => checkMigration(false, true)}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? "Testing..." : "Check Accessible Only"}
            </button>
          </div>
          
          {preview && (
            <div className="mt-4 p-4 bg-[var(--muted)]/10 rounded-lg border border-[var(--border)]">
              <h3 className="font-semibold text-[var(--fg)]">Migration Status:</h3>
              <p className="text-[var(--fg)]">
                {preview.filter === 'all' ? 'All' : 'Recent'} rows: <strong>{preview.count}</strong>
                {preview.totalCount && preview.totalCount !== preview.count && (
                  <span className="text-[var(--muted-foreground)]"> (Total: {preview.totalCount})</span>
                )}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">Filter: {preview.filter}</p>
              {preview.filter === 'accessible only' && preview.count === 0 && (
                <div className="mt-2 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-200 text-sm">
                  <strong>No accessible images found.</strong> Check the browser console for detailed logs showing which URLs were tested and why they failed.
                </div>
              )}
              {preview.rows && preview.rows.length > 0 && (
                <div className="mt-2">
                  <h4 className="font-medium text-[var(--fg)]">Sample rows:</h4>
                  <ul className="text-sm text-[var(--muted-foreground)]">
                    {preview.rows.map((row: any) => (
                      <li key={row.id}>
                        ID {row.id}: {row.output_url?.substring(0, 50)}...
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Run Migration */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4 text-[var(--fg)]">Run Migration</h2>
          <p className="text-[var(--muted-foreground)] mb-4">
            This will download images from Replicate CDN and store them permanently in Supabase Storage.
          </p>
          
          {/* Specific IDs input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--fg)] mb-2">
              Or specify exact IDs (comma-separated):
            </label>
            <input
              type="text"
              value={specificIds}
              onChange={(e) => setSpecificIds(e.target.value)}
              placeholder="e.g., 96, 79, 77, 75"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--fg)]"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Paste the IDs of the 12 images from your SQL query
            </p>
          </div>
          
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => runMigration(1)}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? "Migrating..." : "Migrate 1 Image"}
            </button>
            <button
              onClick={() => runMigration(5)}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? "Migrating..." : "Migrate 5 Images"}
            </button>
            <button
              onClick={() => runMigration(10)}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? "Migrating..." : "Migrate 10 Images"}
            </button>
          </div>
          
          {results && (
            <div className="mt-4 p-4 bg-[var(--muted)]/10 rounded-lg border border-[var(--border)]">
              <h3 className="font-semibold text-[var(--fg)]">Migration Results:</h3>
              <p className="text-[var(--fg)]">Processed: <strong>{results.processed}</strong> images</p>
              {results.results && (
                <div className="mt-2">
                  <h4 className="font-medium text-[var(--fg)]">Details:</h4>
                  <ul className="text-sm">
                    {results.results.map((result: any) => (
                      <li key={result.id} className={
                        result.status === 'success' ? 'text-green-600' : 
                        result.status === 'expired' ? 'text-yellow-600' : 
                        'text-red-600'
                      }>
                        ID {result.id}: {result.status} {result.error && `(${result.error})`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4 text-[var(--fg)]">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-[var(--muted-foreground)]">
            <li>First, click "Check Status" to see how many images need migration</li>
            <li>Start with "Migrate 1 Image" to test the process</li>
            <li>If successful, migrate in small batches (5-10 images at a time)</li>
            <li>Monitor the results to ensure images are being stored correctly</li>
            <li>Once all images are migrated, old Replicate URLs will be replaced with permanent Supabase URLs</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
