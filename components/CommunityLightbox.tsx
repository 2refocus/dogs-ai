"use client";

import { useEffect, useState } from "react";
import Lightbox from "./Lightbox";

interface CommunityLightboxProps {
  onClose: () => void;
  initialImageId: number;
  images: any[];
}

export default function CommunityLightbox({ onClose, initialImageId, images }: CommunityLightboxProps) {
  const [initialIndex, setInitialIndex] = useState(0);

  useEffect(() => {
    // Find the index of the target image
    const targetIndex = images.findIndex(item => item.id === initialImageId);
    if (targetIndex !== -1) {
      setInitialIndex(targetIndex);
      console.log('[CommunityLightbox] Found target image at index:', targetIndex, 'for id:', initialImageId);
    } else {
      console.log('[CommunityLightbox] Could not find image with id:', initialImageId);
    }
  }, [initialImageId, images]);

  if (images.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="text-white">No images available</div>
        <button 
          onClick={onClose}
          className="ml-4 px-4 py-2 bg-white text-black rounded"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <Lightbox
      images={images}
      initialIndex={initialIndex}
      onClose={onClose}
    />
  );
}