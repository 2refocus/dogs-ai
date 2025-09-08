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

export default function CommunityGrid({ items }: { items: Item[] }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  
  // Track which images are loading/loaded
  const handleImageLoad = (idx: number) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(idx);
      return newSet;
    });
    setLoadedImages(prev => new Set(prev).add(idx));
  };
  
  const handleImageStartLoad = (idx: number) => {
    setLoadingImages(prev => new Set(prev).add(idx));
  };

  if (!items || items.length === 0) {
    return <p className="text-sm opacity-60">No public images yet.</p>;
  }
  
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((it, idx) => (
          <div
            key={String(it.id ?? idx)}
            className="rounded-lg overflow-hidden border border-white/10 bg-white/2 aspect-square relative group"
            title={it.created_at || ""}
          >
            {/* Loading skeleton */}
            {loadingImages.has(idx) && !loadedImages.has(idx) && (
              <div className="absolute inset-0 z-10">
                <ImageSkeleton />
              </div>
            )}
            
            <button
              onClick={() => setSelectedImageIndex(idx)}
              className="w-full h-full relative"
            >
              <img
                src={it.output_url}
                alt={it.display_name || "community"}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  loadedImages.has(idx) ? 'opacity-100' : 'opacity-0'
                }`}
                onLoadStart={() => handleImageStartLoad(idx)}
                onLoad={() => handleImageLoad(idx)}
                onError={() => handleImageLoad(idx)} // Remove loading state on error too
              />
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-sm font-medium">View</span>
              </div>
            </button>
          </div>
        ))}
      </div>
      {selectedImageIndex !== null && (
        <Lightbox
          images={items}
          initialIndex={selectedImageIndex}
          onClose={() => setSelectedImageIndex(null)}
        />
      )}
    </>
  );
}
