"use client";

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

import { useState } from "react";
import dynamic from "next/dynamic";
const Lightbox = dynamic(() => import("./Lightbox"), { ssr: false });

export default function CommunityGrid({ items }: { items: Item[] }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  if (!items || items.length === 0) {
    return <p className="text-sm opacity-60">No public images yet.</p>;
  }
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((it, idx) => (
          <div
            key={String(it.id ?? idx)}
            className={`rounded-lg overflow-hidden border border-white/10 bg-white/2 ${it.aspect_ratio ? `aspect-[${it.aspect_ratio.replace(':', '/')}]` : 'aspect-square'}`}
            title={it.created_at || ""}
          >
            <button
              onClick={() => setSelectedImageIndex(idx)}
              className="w-full h-full"
            >
              <img
                src={it.output_url}
                alt={it.display_name || "community"}
                className="w-full h-full object-cover"
              />
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
