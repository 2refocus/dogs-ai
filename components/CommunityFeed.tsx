"use client";

import { useEffect, useState } from "react";
import CommunityGrid from "./CommunityGrid";
import { readLocal } from "@/lib/localHistory";

type Item = {
  id?: string | number;
  output_url: string;
  high_res_url?: string | null;
  aspect_ratio?: string | null;
  created_at?: string;
  display_name?: string | null;
  website?: string | null;
  preset_label?: string | null;
};

export default function CommunityFeed() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/community", { cache: "no-store" });
        const j = await res.json().catch(() => ({ ok: false }));
        if (j?.ok && Array.isArray(j.items)) {
          // Filter for valid output_url on frontend
          const validItems = j.items.filter((x: any) => 
            x.output_url && 
            typeof x.output_url === "string" && 
            x.output_url.startsWith("http")
          );
          if (alive) setItems(validItems);
          return;
        }
      } catch (e) {
        console.error("Community API error:", e);
      }
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
