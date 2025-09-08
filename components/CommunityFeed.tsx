"use client";

import { useEffect, useState, useCallback } from "react";
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

export default function CommunityFeed() {
  const [items, setItems] = useState<Item[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const fetchCommunityData = async (showRefresh = false, pageNum = 1, append = false) => {
    console.log('[CommunityFeed] Fetching data:', { showRefresh, pageNum, append });
    if (showRefresh) setRefreshing(true);
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
            return newItems;
          });
        } else {
          setItems(j.items);
          console.log('[CommunityFeed] Setting initial items:', j.items.length);
        }
        // Use hasMore from API response, fallback to checking item count
        const newHasMore = j.hasMore !== undefined ? j.hasMore : j.items.length === 20;
        console.log('[CommunityFeed] Setting hasMore to:', newHasMore);
        setHasMore(newHasMore);
        setLastFetchTime(Date.now());
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
    } else {
      console.log("[CommunityFeed] Logged in, API failed, showing empty");
      setItems([]);
    }
    
    if (showRefresh) setRefreshing(false);
    setLoading(false);
  };

  const loadMore = useCallback(() => {
    if (!loading && hasMore && !refreshing) {
      const nextPage = page + 1;
      console.log('[CommunityFeed] Loading more, page:', nextPage);
      setPage(nextPage);
      fetchCommunityData(false, nextPage, true);
    }
  }, [loading, hasMore, refreshing, page]);

  useEffect(() => {
    fetchCommunityData();
    
    // Refresh every 10 seconds to catch new images (less frequent than before)
    const interval = setInterval(() => {
      // Only refresh if it's been more than 10 seconds since last fetch
      if (Date.now() - lastFetchTime > 10000) {
        fetchCommunityData(true);
      }
    }, 10000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Infinite scroll effect
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleScroll = () => {
      // Debounce scroll events to prevent multiple rapid calls
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.offsetHeight;
        
        console.log('[CommunityFeed] Scroll check:', { 
          scrollTop, 
          windowHeight, 
          documentHeight, 
          distanceFromBottom: documentHeight - (scrollTop + windowHeight),
          loading, 
          hasMore 
        });
        
        // Load more when user is 500px from bottom (reduced from 1000px)
        if (scrollTop + windowHeight >= documentHeight - 500) {
          console.log('[CommunityFeed] Triggering loadMore from scroll');
          loadMore();
        }
      }, 100); // 100ms debounce
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [loading, hasMore, page, loadMore]);

  if (loading && items.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg overflow-hidden border border-white/10 bg-white/2 aspect-square animate-pulse">
            <div className="w-full h-full bg-gradient-to-r from-gray-300/20 via-gray-200/20 to-gray-300/20 animate-shimmer"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <CommunityGrid items={items} />
      {loading && items.length > 0 && hasMore && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`loading-${i}`} className="rounded-lg overflow-hidden border border-white/10 bg-white/2 aspect-square animate-pulse">
              <div className="w-full h-full bg-gradient-to-r from-gray-300/20 via-gray-200/20 to-gray-300/20 animate-shimmer"></div>
            </div>
          ))}
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
