
// components/CommunityFeed.tsx
"use client";
import React, { useEffect, useState } from "react";
import CommunityGrid, { type Item } from "./CommunityGrid";

export default function CommunityFeed() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/community", { cache: "no-store" });
        const j = await r.json();
        if (!cancelled && j?.ok && Array.isArray(j.items)) {
          setItems(j.items.filter((x: any) => x?.output_url));
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  return <CommunityGrid items={items} />;
}
