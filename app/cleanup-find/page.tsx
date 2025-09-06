"use client";

import { useState } from "react";

type Record = {
  id: number;
  output_url: string;
  high_res_url?: string | null;
  user_id: string;
  created_at: string;
  display_name?: string | null;
  preset_label?: string | null;
};

export default function FindCleanupPage() {
  const [url, setUrl] = useState("https://replicate.delivery/xezq/YZNvwmRtUyayKx3LdB4SYDunekQtTcVTBUpKLWMrDXEW3QpKA/tmpk9cg9e4z.jpeg");
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  const findRecords = async () => {
    if (!url.trim()) {
      setMessage("Please enter a URL");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/cleanup/find?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      
      if (data.ok) {
        setRecords(data.records);
        setMessage(`Found ${data.found} records with this URL`);
      } else {
        setMessage("Error: " + data.error);
      }
    } catch (error) {
      setMessage("Error searching for records");
    } finally {
      setLoading(false);
    }
  };

  const deleteRecords = async () => {
    if (records.length === 0) {
      setMessage("No records to delete");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${records.length} records with this URL? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setMessage("");
    try {
      const response = await fetch("/api/cleanup/find", { 
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      
      if (data.ok) {
        setMessage(`Successfully deleted ${data.deleted} records`);
        setRecords([]);
      } else {
        setMessage("Error: " + data.error);
      }
    } catch (error) {
      setMessage("Error deleting records");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold mb-6">Find & Delete Records by URL</h1>
      
      <div className="bg-[var(--muted)] rounded-xl p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Search by URL</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Image URL:</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full p-3 border border-[var(--line)] rounded-lg bg-[var(--bg)] text-[var(--fg)]"
              placeholder="Enter the image URL to search for..."
            />
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={findRecords}
              disabled={loading}
              className="btn"
            >
              {loading ? "Searching..." : "Find Records"}
            </button>
            
            {records.length > 0 && (
              <button
                onClick={deleteRecords}
                disabled={deleting}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                {deleting ? "Deleting..." : `Delete ${records.length} Records`}
              </button>
            )}
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-lg mt-4 ${message.includes("Error") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
            {message}
          </div>
        )}
      </div>

      {records.length > 0 && (
        <div className="bg-[var(--muted)] rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Found Records ({records.length})</h3>
          
          <div className="space-y-3">
            {records.map((record) => (
              <div 
                key={record.id} 
                className="bg-[var(--bg)] rounded-lg p-4 border border-[var(--line)]"
              >
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
                    {record.high_res_url && record.high_res_url !== record.output_url && (
                      <div className="text-xs opacity-70 break-all max-w-xs mt-1">
                        High-res: {record.high_res_url}
                      </div>
                    )}
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
