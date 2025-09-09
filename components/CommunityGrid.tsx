"use client";

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

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
const Lightbox = dynamic(() => import("./Lightbox"), { ssr: false });

// Loading shimmer component
const ImageSkeleton = () => (
  <div className="rounded-lg overflow-hidden border border-white/10 bg-white/2 aspect-square animate-pulse">
    <div className="w-full h-full bg-gradient-to-r from-gray-300/20 via-gray-200/20 to-gray-300/20 animate-shimmer"></div>
  </div>
);

interface CommunityGridProps {
  items: Item[];
  onImageClick?: (index: number) => void;
}

export default function CommunityGrid({ items, onImageClick }: CommunityGridProps) {
  const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  
  // Filter out failed images to hide empty boxes
  const validItems = items.filter((_, idx) => !failedImages.has(idx));
  
  // Track which images are loading/loaded
  const handleImageLoad = (idx: number) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(idx);
      return newSet;
    });
    setLoadedImages(prev => new Set(prev).add(idx));
  };
  
  const handleImageError = (idx: number) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(idx);
      return newSet;
    });
    setFailedImages(prev => new Set(prev).add(idx));
    const url = items[idx]?.output_url;
    console.log(`[CommunityGrid] Image ${idx} failed to load:`, url);
    
    // Check if it's an expired Replicate URL
    if (url && url.includes('replicate.delivery')) {
      console.log(`[CommunityGrid] This appears to be an expired Replicate URL`);
    }
  };
  
  const handleImageStartLoad = (idx: number) => {
    setLoadingImages(prev => new Set(prev).add(idx));
    console.log(`[CommunityGrid] Starting to load image ${idx}:`, items[idx]?.output_url);
  };

  if (!validItems || validItems.length === 0) {
    return <p className="text-sm opacity-60">No public images yet.</p>;
  }
  
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {validItems.map((it, validIdx) => {
          // Find the original index in the items array
          const originalIdx = items.findIndex(item => item.id === it.id);
          
          return (
            <div
              key={String(it.id ?? validIdx)}
              className="rounded-lg overflow-hidden border border-white/10 bg-white/2 aspect-square relative group"
              title={it.created_at || ""}
            >
              {/* Loading skeleton - only show while actively loading */}
              {loadingImages.has(originalIdx) && !loadedImages.has(originalIdx) && (
                <div className="absolute inset-0 z-10">
                  <ImageSkeleton />
                </div>
              )}
              
              <button
                onClick={() => onImageClick?.(originalIdx)}
                className="w-full h-full relative"
              >
                <img
                  src={it.output_url}
                  alt={it.display_name || "community"}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    loadedImages.has(originalIdx) ? 'opacity-100' : 'opacity-100'
                  }`}
                  onLoadStart={() => handleImageStartLoad(originalIdx)}
                  onLoad={() => handleImageLoad(originalIdx)}
                  onError={() => handleImageError(originalIdx)}
                />
                
                {/* Hover overlay - only show for loaded images */}
                {loadedImages.has(originalIdx) && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-medium">View</span>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
