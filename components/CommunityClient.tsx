/* components/CommunityClient.tsx — client fetch of public gens */
"use client";

import { useEffect, useState } from "react";

type Item = { id: number; output_url: string; created_at?: string };

export default function CommunityClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/community", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
        setItems(j.items || []);
      } catch (e: any) {
        setErr(e?.message || "Failed to load community");
      }
    })();
  }, []);

  if (err) return <div className="text-sm opacity-60">{err}</div>;
  if (items.length === 0) return <div className="text-sm opacity-60">No public images yet.</div>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {items.map((it) => (
        <a key={it.id} href={it.output_url} target="_blank" rel="noreferrer"
           className="rounded-lg overflow-hidden border border-white/10 hover:border-white/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={it.output_url} alt="community" className="w-full h-40 object-cover" />
        </a>
      ))}
    </div>
  );
}