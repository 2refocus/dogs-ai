"use client";

import { useState } from "react";

type OrphanedRecord = {
  id: number;
  output_url: string;
  high_res_url?: string | null;
  user_id: string;
  created_at: string;
  status: number | string;
  statusText: string;
};

type CleanupSummary = {
  total: number;
  valid: number;
  orphaned: number;
};

export default function CleanupPage() {
  const [summary, setSummary] = useState<CleanupSummary | null>(null);
  const [orphaned, setOrphaned] = useState<OrphanedRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  const checkOrphaned = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/cleanup");
      const data = await response.json();
      
      if (data.ok) {
        setSummary(data.summary);
        setOrphaned(data.orphaned);
        setMessage(`Found ${data.summary.orphaned} orphaned records out of ${data.summary.total} total records`);
      } else {
        setMessage("Error: " + data.error);
      }
    } catch (error) {
      setMessage("Error checking for orphaned records");
    } finally {
      setLoading(false);
    }
  };

  const deleteOrphaned = async () => {
    if (!confirm(`Are you sure you want to delete ${orphaned.length} orphaned records? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setMessage("");
    try {
      const response = await fetch("/api/cleanup", { method: "DELETE" });
      const data = await response.json();
      
      if (data.ok) {
        setMessage(`Successfully deleted ${data.deleted} orphaned records`);
        setOrphaned([]);
        setSummary(prev => prev ? { ...prev, orphaned: 0, total: prev.total - data.deleted } : null);
      } else {
        setMessage("Error: " + data.error);
      }
    } catch (error) {
      setMessage("Error deleting orphaned records");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold mb-6">Database Cleanup</h1>
      
      <div className="bg-[var(--muted)] rounded-xl p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Orphaned Records Check</h2>
        <p className="text-sm opacity-70 mb-4">
          This tool checks for database records that point to deleted or inaccessible image files.
        </p>
        
        <div className="flex gap-4 mb-4">
          <button
            onClick={checkOrphaned}
            disabled={loading}
            className="btn"
          >
            {loading ? "Checking..." : "Check for Orphaned Records"}
          </button>
          
          {orphaned.length > 0 && (
            <button
              onClick={deleteOrphaned}
              disabled={deleting}
              className="btn-secondary"
            >
              {deleting ? "Deleting..." : `Delete ${orphaned.length} Orphaned Records`}
            </button>
          )}
        </div>

        {message && (
          <div className={`p-3 rounded-lg ${message.includes("Error") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
            {message}
          </div>
        )}
      </div>

      {summary && (
        <div className="bg-[var(--muted)] rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--brand)]">{summary.total}</div>
              <div className="text-sm opacity-70">Total Records</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{summary.valid}</div>
              <div className="text-sm opacity-70">Valid Records</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{summary.orphaned}</div>
              <div className="text-sm opacity-70">Orphaned Records</div>
            </div>
          </div>
        </div>
      )}

      {orphaned.length > 0 && (
        <div className="bg-[var(--muted)] rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Orphaned Records</h3>
          <div className="space-y-3">
            {orphaned.map((record) => (
              <div key={record.id} className="bg-[var(--bg)] rounded-lg p-4 border border-[var(--line)]">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-mono text-sm">
                      ID: {record.id} | User: {record.user_id.substring(0, 8)}...
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      Created: {new Date(record.created_at).toLocaleString()}
                    </div>
                    <div className="text-xs opacity-70 mt-1 break-all">
                      URL: {record.output_url}
                    </div>
                    <div className="text-xs text-red-400 mt-1">
                      Status: {record.status} - {record.statusText}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
