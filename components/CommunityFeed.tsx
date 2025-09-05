// components/CommunityFeed.tsx
"use client";

import { useEffect, useState } from "react";

type Item = { id: string; output_url: string; created_at: string };

export default function CommunityFeed() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/community", { cache: "no-store" });
        const j = await r.json();
        if (alive && j?.ok && Array.isArray(j.items)) setItems(j.items);
      } catch {}
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {loading && (
        <div className="col-span-full text-sm opacity-60">Loading…</div>
      )}
      {items.map((it) => (
        <div key={it.id} className="rounded-xl overflow-hidden border border-white/10 bg-white/2">
          <div className="aspect-square bg-black/10">
            <img
              src={it.output_url}
              alt="community generation"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      ))}
      {!loading && items.length === 0 && (
        <div className="col-span-full text-sm opacity-60">No items yet.</div>
      )}
    </div>
  );
}