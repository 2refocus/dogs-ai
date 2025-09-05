"use client";

import { useEffect, useState } from "react";
import CommunityGrid from "./CommunityGrid";
import { readLocal } from "@/lib/localHistory";

type Item = { id?: string | number; output_url: string; created_at?: string };

export default function CommunityFeed() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/community", { cache: "no-store" });
        const j = await res.json().catch(() => ({ ok: false }));
        if (j?.ok && Array.isArray(j.items) && j.items.length > 0) {
          if (alive) setItems(j.items.filter((x: any) => typeof x.output_url === "string"));
          return;
        }
      } catch {}
      // Fallback: show guest local history if community is empty/unavailable
      const loc = readLocal().map((x) => ({
        output_url: x.output_url,
        created_at: x.created_at,
      }));
      if (alive) setItems(loc);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return <CommunityGrid items={items} />;
}
