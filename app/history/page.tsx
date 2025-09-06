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
  high_res_url?: string | null;
  aspect_ratio?: string | null;
  display_name?: string | null;
  website?: string | null;
  social_handle?: string | null;
  preset_label?: string | null;
  user_id: string;  // Add back user_id as it's needed for filtering
  created_at?: string;
};

export default function HistoryPage() {
  const [community, setCommunity] = useState<CommunityRow[]>([]);
  const [localItems, setLocalItems] = useState<LocalGen[]>([]);
  const [userHistory, setUserHistory] = useState<CommunityRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedUserImage, setSelectedUserImage] = useState<{ image: CommunityRow; index: number } | null>(null);
  const [selectedCommunityImage, setSelectedCommunityImage] = useState<{ image: CommunityRow; index: number } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Get current user ID
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user?.id || null;
      setCurrentUserId(userId);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id || null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Only load data when we have a definitive user state
    if (authLoading || currentUserId === null) {
      // Still loading user state, don't load data yet
      return;
    }

    // load community
    (async () => {
      try {
        const res = await fetch("/api/community", { cache: "no-store" });
        const j = await res.json();
        if (j?.ok && Array.isArray(j.items)) {
          setCommunity(j.items);
          
          // Filter history based on user authentication status
          if (currentUserId) {
            // Show only user's images if logged in, sorted by created_at ascending (oldest first)
            const userImages = j.items
              .filter((item: CommunityRow) => item.user_id === currentUserId)
              .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
            console.log(`[history] Loading ${userImages.length} images for user: ${currentUserId}`);
            setUserHistory(userImages);
          } else {
            // Show anonymous images if not logged in, sorted by created_at ascending (oldest first)
            const anonymousImages = j.items
              .filter((item: CommunityRow) => item.user_id === "00000000-0000-0000-0000-000000000000")
              .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
            console.log(`[history] Loading ${anonymousImages.length} anonymous images`);
            setUserHistory(anonymousImages);
          }
        }
      } catch (e) {
        console.error("[history] Error loading community data:", e);
      }
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
  }, [currentUserId, authLoading]); // Re-run when user ID or auth loading state changes

  const hasCommunity = community.length > 0;
  const hasUserHistory = userHistory.length > 0;
  const hasLocal = localItems.length > 0;

  // Delete image function
  const deleteImage = async (imageId: number) => {
    if (!currentUserId) return;
    
    setDeletingId(imageId);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const response = await fetch("/api/history/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ id: imageId })
      });

      const result = await response.json();
      
      if (result.ok) {
        // Remove from local state
        setUserHistory(prev => prev.filter(img => img.id !== imageId));
        setCommunity(prev => prev.filter(img => img.id !== imageId));
      } else {
        alert(result.error || "Failed to delete image");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete image");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-5xl p-6 grid gap-10">
      {selectedUserImage && (
        <Lightbox
          images={userHistory}
          initialIndex={selectedUserImage.index}
          onClose={() => setSelectedUserImage(null)}
        />
      )}
      {selectedCommunityImage && (
        <Lightbox
          images={community}
          initialIndex={selectedCommunityImage.index}
          onClose={() => setSelectedCommunityImage(null)}
        />
      )}
      <section className="grid gap-4">
        <h1 className="text-2xl font-bold">Your History</h1>
        {authLoading ? (
          <p className="text-sm opacity-60">Loading your history...</p>
        ) : hasUserHistory ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {userHistory.map((it, index) => {
              const isFirstImage = index === 0; // First image in chronological order
              // Double-check that this image belongs to the current user
              const isOwner = currentUserId && it.user_id === currentUserId;
              const canDelete = isOwner && !isFirstImage;
              
              return (
                <div key={it.id} className="relative group">
                  <button
                    onClick={() => setSelectedUserImage({ image: it, index: userHistory.indexOf(it) })}
                    className="w-full rounded-xl overflow-hidden border border-white/10 bg-white/2 relative"
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
                  
                  {/* First image indicator */}
                  {isFirstImage && isOwner && (
                    <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      First
                    </div>
                  )}
                  
                  {/* Subtle delete button for logged-in users (except first image) */}
                  {canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Are you sure you want to delete this image?")) {
                          deleteImage(it.id);
                        }
                      }}
                      disabled={deletingId === it.id}
                      className="absolute top-2 right-2 w-5 h-5 bg-black/20 hover:bg-red-500/80 text-white/70 hover:text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all duration-200 disabled:opacity-50"
                      title="Delete image"
                    >
                      {deletingId === it.id ? "..." : "×"}
                    </button>
                  )}
                </div>
              );
            })}
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
              <button
                key={it.id}
                onClick={() => setSelectedCommunityImage({ image: it, index: community.indexOf(it) })}
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
        ) : (
          <p className="opacity-70">No public images yet.</p>
        )}
      </section>
    </main>
  );
}

