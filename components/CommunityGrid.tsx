'use client';
import { useEffect, useState } from "react";

type Row = {
  id: string;
  output_url: string | null;
  created_at: string;
};

export default function CommunityGrid() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/community", { cache: "no-store" });
        const j = await res.json();
        if (j.ok && Array.isArray(j.rows)) {
          setRows(j.rows);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="my-8">
      <h2 className="text-xl font-semibold mb-4">Community Uploads</h2>
      {loading && <div className="animate-pulse text-sm opacity-70">Loading…</div>}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {rows.map((r) => (
          <div key={r.id} className="aspect-square bg-muted rounded overflow-hidden">
            {r.output_url ? (
              <img src={r.output_url} alt="community" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-muted animate-pulse" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
