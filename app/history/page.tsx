/* app/history/page.tsx — Community + Guest history (no login required)
   - Loads public generations from Supabase via /api/community
   - Falls back to local guest history if API returns empty
*/
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Lightbox from "@/components/Lightbox";

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
  social_url?: string | null;
  display_name?: string | null;
  website?: string | null;
  social_handle?: string | null;
  allow_in_feed: boolean;
  user_id: string;  // Add back user_id as it's needed for filtering
};

export default function HistoryPage() {
  const [community, setCommunity] = useState<CommunityRow[]>([]);
  const [localItems, setLocalItems] = useState<LocalGen[]>([]);
  const [userHistory, setUserHistory] = useState<CommunityRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ image: CommunityRow; index: number } | null>(null);

  // Get current user ID
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user?.id || null;
      setCurrentUserId(userId);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // load community
    (async () => {
      try {
        const res = await fetch("/api/community", { cache: "no-store" });
        const j = await res.json();
        if (j?.ok && Array.isArray(j.items)) {
          setCommunity(j.items);
          
          // Filter history based on user authentication status
          if (currentUserId) {
            // Show only user's images if logged in
            setUserHistory(j.items.filter((item: CommunityRow) => item.user_id === currentUserId));
          } else {
            // Show anonymous images if not logged in
            setUserHistory(j.items.filter((item: CommunityRow) => item.user_id === "00000000-0000-0000-0000-000000000000"));
          }
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
  }, [currentUserId]); // Re-run when user ID changes

  const hasCommunity = community.length > 0;
  const hasUserHistory = userHistory.length > 0;
  const hasLocal = localItems.length > 0;

  return (
    <main className="mx-auto max-w-5xl p-6 grid gap-10">
      {selectedImage && (
        <Lightbox
          images={userHistory}
          initialIndex={selectedImage.index}
          onClose={() => setSelectedImage(null)}
        />
      )}
      <section className="grid gap-4">
        <h1 className="text-2xl font-bold">Your History</h1>
        {hasUserHistory ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {userHistory.map((it) => (
              <button
                key={it.id}
                onClick={() => setSelectedImage({ image: it, index: userHistory.indexOf(it) })}
                className="rounded-xl overflow-hidden border border-white/10 bg-white/2 relative group"
              >
                <img
                  src={it.output_url}
                  alt=""
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white">View</span>
                </div>
              </button>
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
