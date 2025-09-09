"use client";

import { useEffect, useState } from "react";
import CommunityGrid from "./CommunityGrid";
import { readLocal } from "@/lib/localHistory";
import { supabase } from "@/lib/supabaseClient";

type Item = {
  id?: string | number;
  output_url: string;
  high_res_url?: string | null;
  input_url?: string | null;
  aspect_ratio?: string | null;
  created_at?: string;
  display_name?: string | null;
  website?: string | null;
  preset_label?: string | null;
};

interface CommunityFeedProps {
  onImageClick?: (index: number) => void;
  targetImageId?: number | null;
  onItemsChange?: (items: Item[]) => void;
}

export default function CommunityFeed({ onImageClick, targetImageId, onItemsChange }: CommunityFeedProps = {}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [openedImageId, setOpenedImageId] = useState<number | null>(null);

  // Function to fetch community data
  async function fetchCommunityData(pageNum = 1, append = false) {
    console.log('[CommunityFeed] Fetching data:', { pageNum, append });
    if (!append) setLoading(true);
    
    try {
      const res = await fetch(`/api/community?page=${pageNum}&limit=20`, { cache: "no-store" });
      const j = await res.json().catch(() => ({ ok: false }));
      
      console.log('[CommunityFeed] API response:', { pageNum, itemsCount: j.items?.length, hasMore: j.hasMore, ok: j.ok });
      
      if (j?.ok && Array.isArray(j.items)) {
        if (append) {
          setItems(prev => {
            const newItems = [...prev, ...j.items];
            console.log('[CommunityFeed] Appending items, total now:', newItems.length);
            onItemsChange?.(newItems);
            return newItems;
          });
        } else {
          setItems(j.items);
          onItemsChange?.(j.items);
          console.log('[CommunityFeed] Setting initial items:', j.items.length);
        }
        
        // Use hasMore from API response, fallback to checking item count
        const newHasMore = j.hasMore !== undefined ? j.hasMore : j.items.length === 20;
        console.log('[CommunityFeed] Setting hasMore to:', newHasMore);
        setHasMore(newHasMore);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.error("Community API error:", e);
    }
    
    // Fallback: show guest local history ONLY if user is not logged in
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      // Using local fallback for non-logged-in users
      const loc = readLocal().map((x) => ({
        output_url: x.output_url,
        created_at: x.created_at,
      }));
      setItems(loc);
      setHasMore(false); // No more items if API failed
    } else {
      console.log("[CommunityFeed] Logged in, API failed, showing empty");
      setItems([]);
      setHasMore(false); // No more items if API failed
    }
    
    setLoading(false);
  }

  // Initial fetch - only run once
  useEffect(() => {
    fetchCommunityData();
  }, []);

  // Handle target image ID from URL
  useEffect(() => {
    if (targetImageId && items.length > 0 && onImageClick && openedImageId !== targetImageId) {
      const targetIndex = items.findIndex(item => item.id === targetImageId);
      if (targetIndex !== -1) {
        console.log('[CommunityFeed] Found target image, opening lightbox at index:', targetIndex);
        setOpenedImageId(targetImageId);
        onImageClick(targetIndex);
      }
    }
  }, [targetImageId, items.length, openedImageId, onImageClick]);

  // Load more function
  function loadMore() {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      console.log('[CommunityFeed] Loading more, page:', nextPage);
      setPage(nextPage);
      fetchCommunityData(nextPage, true);
    }
  }

  // Debug logging
  console.log('[CommunityFeed] Rendering with items:', items.length, 'loading:', loading, 'hasMore:', hasMore, 'page:', page);
  
  return (
    <div>
      <CommunityGrid items={items} onImageClick={onImageClick} />
      
      {/* Load More Button - show if there are items and more to load */}
      {hasMore && items.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-3 bg-[var(--brand)] text-white rounded-lg font-medium hover:bg-[var(--brand)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
      
      {!hasMore && items.length > 0 && (
        <div className="mt-4 text-center text-sm opacity-60">
          No more images to load
        </div>
      )}
    </div>
  );
}