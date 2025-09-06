/* app/history/page.tsx — Community + Guest history (no login required)
   - Loads public generations from Supabase via /api/community
   - Falls back to local guest history if API returns empty
*/
"use client";
import { useEffect, useState } from "react";

type LocalGen = {
  output_url: string;
  input_url?: string | null;
  preset_label?: string | null;
  prompt?: string | null;
  created_at: string;
  // note: no `id` for local items
};

type CommunityRow = {
  id: number;
  output_url: string;
  created_at: string;
};

export default function HistoryPage() {
  const [community, setCommunity] = useState<CommunityRow[]>([]);
  const [localItems, setLocalItems] = useState<LocalGen[]>([]);
  const [userHistory, setUserHistory] = useState<CommunityRow[]>([]);

  useEffect(() => {
    // load community
    (async () => {
      try {
        const res = await fetch("/api/community", { cache: "no-store" });
        const j = await res.json();
        if (j?.ok && Array.isArray(j.items)) {
          setCommunity(j.items);
          // Use community data as user history since it contains all generated images
          setUserHistory(j.items);
        }
      } catch {}
    })();

    // load guest history as fallback (only for items not in Supabase)
    try {
      const raw = localStorage.getItem("guest_history_v1");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          const filtered = arr.filter((x:any)=>x && typeof x.output_url === "string");
          setLocalItems(filtered);
        }
      }
    } catch {}
  }, []);

  const hasCommunity = community.length > 0;
  const hasUserHistory = userHistory.length > 0;
  const hasLocal = localItems.length > 0;

  return (
    <main className="mx-auto max-w-5xl p-6 grid gap-10">
      <section className="grid gap-4">
        <h1 className="text-2xl font-bold">Your History</h1>
        {hasUserHistory ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {userHistory.map((it) => (
              <div
                key={it.id}
                className="rounded-xl overflow-hidden border border-white/10 bg-white/2"
              >
                <img
                  src={it.output_url}
                  alt=""
                  className="w-full aspect-square object-cover"
                />
              </div>
            ))}
          </div>
        ) : hasLocal ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {localItems.map((it, idx) => (
              <div
                key={`${it.created_at || idx}-${it.output_url}`}
                className="rounded-xl overflow-hidden border border-white/10 bg-white/2"
              >
                <img
                  src={it.output_url}
                  alt=""
                  className="w-full aspect-square object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="opacity-70">Nothing yet. Generate your first portrait on the home page.</p>
        )}
      </section>

      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">Community</h2>
        {hasCommunity ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {community.map((it) => (
              <div
                key={it.id}
                className="rounded-xl overflow-hidden border border-white/10 bg-white/2"
              >
                <img
                  src={it.output_url}
                  alt=""
                  className="w-full aspect-square object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="opacity-70">No public images yet.</p>
        )}
      </section>
    </main>
  );
}
