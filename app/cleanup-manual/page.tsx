"use client";

import { useState, useEffect } from "react";

type Record = {
  id: number;
  output_url: string;
  high_res_url?: string | null;
  user_id: string;
  created_at: string;
  display_name?: string | null;
  preset_label?: string | null;
};

export default function ManualCleanupPage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  const loadRecords = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/cleanup/manual");
      const data = await response.json();
      
      if (data.ok) {
        setRecords(data.records);
        setMessage(`Loaded ${data.records.length} records`);
      } else {
        setMessage("Error: " + data.error);
      }
    } catch (error) {
      setMessage("Error loading records");
    } finally {
      setLoading(false);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) {
      setMessage("No records selected");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected records? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setMessage("");
    try {
      const response = await fetch("/api/cleanup/manual", { 
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds })
      });
      const data = await response.json();
      
      if (data.ok) {
        setMessage(`Successfully deleted ${data.deleted} records`);
        setSelectedIds([]);
        // Reload records
        await loadRecords();
      } else {
        setMessage("Error: " + data.error);
      }
    } catch (error) {
      setMessage("Error deleting records");
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(records.map(r => r.id));
  };

  const selectNone = () => {
    setSelectedIds([]);
  };

  useEffect(() => {
    loadRecords();
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-bold mb-6">Manual Database Cleanup</h1>
      
      <div className="bg-[var(--muted)] rounded-xl p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">All Records</h2>
        <p className="text-sm opacity-70 mb-4">
          Review all database records and manually select which ones to delete.
        </p>
        
        <div className="flex gap-4 mb-4">
          <button
            onClick={loadRecords}
            disabled={loading}
            className="btn"
          >
            {loading ? "Loading..." : "Reload Records"}
          </button>
          
          <button
            onClick={selectAll}
            className="btn-secondary"
          >
            Select All
          </button>
          
          <button
            onClick={selectNone}
            className="btn-secondary"
          >
            Select None
          </button>
          
          {selectedIds.length > 0 && (
            <button
              onClick={deleteSelected}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
            >
              {deleting ? "Deleting..." : `Delete ${selectedIds.length} Selected`}
            </button>
          )}
        </div>

        {message && (
          <div className={`p-3 rounded-lg ${message.includes("Error") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
            {message}
          </div>
        )}
      </div>

      <div className="bg-[var(--muted)] rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">
          Records ({records.length}) - Selected: {selectedIds.length}
        </h3>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {records.map((record) => (
            <div 
              key={record.id} 
              className={`bg-[var(--bg)] rounded-lg p-4 border transition-colors ${
                selectedIds.includes(record.id) 
                  ? 'border-red-500 bg-red-500/5' 
                  : 'border-[var(--line)] hover:border-[var(--brand)]/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(record.id)}
                  onChange={() => toggleSelection(record.id)}
                  className="mt-1"
                />
                
                {/* Image thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-[var(--line)] bg-[var(--muted)] flex-shrink-0">
                  <img
                    src={record.output_url}
                    alt={`Record ${record.id}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-xs opacity-50">No Image</div>';
                    }}
                  />
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono text-sm">
                        ID: {record.id} | User: {record.user_id.substring(0, 8)}...
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        Created: {new Date(record.created_at).toLocaleString()}
                      </div>
                      {record.display_name && (
                        <div className="text-xs opacity-70">
                          Name: {record.display_name}
                        </div>
                      )}
                      {record.preset_label && (
                        <div className="text-xs opacity-70">
                          Preset: {record.preset_label}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs opacity-70 break-all max-w-xs">
                        {record.output_url}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
