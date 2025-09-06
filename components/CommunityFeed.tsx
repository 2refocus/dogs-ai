"use client";

import { useEffect, useState } from "react";
import CommunityGrid from "./CommunityGrid";
import { readLocal } from "@/lib/localHistory";
import { supabase } from "@/lib/supabaseClient";

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
        console.log("[CommunityFeed] Fetching community data...");
        const res = await fetch("/api/community", { cache: "no-store" });
        const j = await res.json().catch(() => ({ ok: false }));
        console.log("[CommunityFeed] API response:", { ok: j?.ok, itemsCount: j?.items?.length });
        
        if (j?.ok && Array.isArray(j.items)) {
          console.log("[CommunityFeed] Raw items:", j.items.slice(0, 2));
          // Items are already filtered by the API, so use them directly
          if (alive) setItems(j.items);
          return;
        }
      } catch (e) {
        console.error("Community API error:", e);
      }
      
      // Fallback: show guest local history ONLY if user is not logged in
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        console.log("[CommunityFeed] Using local fallback (not logged in)");
        const loc = readLocal().map((x) => ({
          output_url: x.output_url,
          created_at: x.created_at,
        }));
        if (alive) setItems(loc);
      } else {
        console.log("[CommunityFeed] Logged in, not using local fallback");
        if (alive) setItems([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return <CommunityGrid items={items} />;
}
