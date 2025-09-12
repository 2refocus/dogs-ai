"use client";

import { useState } from "react";
import ProgressiveImage from "./ProgressiveImage";

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

interface CommunityGridProps {
  items: Item[];
  onImageClick?: (item: Item) => void;
}

// Loading skeleton using your unified system
const ImageSkeleton = () => (
  <div className="skeleton-pattern aspect-square rounded-lg" />
);

export default function CommunityGrid({ items, onImageClick }: CommunityGridProps) {
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  
  const handleImageError = (idx: number) => {
    setFailedImages(prev => new Set(prev).add(idx));
    console.log(`[CommunityGrid] Image ${idx} failed to load:`, items[idx]?.output_url);
  };

  if (!items || items.length === 0) {
    return <p className="text-sm opacity-60">No public images yet.</p>;
  }
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {items.map((it, idx) => {
        if (failedImages.has(idx)) return null;
        
        return (
          <div
            key={String(it.id ?? idx)}
            data-index={idx}
            className="rounded-lg overflow-hidden border border-[var(--line)] bg-[var(--muted)] aspect-square relative group"
            title={it.created_at || ""}
          >
            <ProgressiveImage
              src={it.output_url}
              alt={it.display_name || "community"}
              className="w-full h-full"
              onClick={() => onImageClick?.(it)}
              onError={() => handleImageError(idx)}
            />
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span className="text-white text-sm font-medium">View</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}