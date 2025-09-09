"use client";

import { useEffect, useState } from "react";
import Lightbox from "./Lightbox";

interface CommunityLightboxProps {
  onClose: () => void;
  initialImageId: number;
}

export default function CommunityLightbox({ onClose, initialImageId }: CommunityLightboxProps) {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialIndex, setInitialIndex] = useState(0);

  useEffect(() => {
    const fetchCommunityData = async () => {
      try {
        const res = await fetch('/api/community?limit=100', { cache: "no-store" });
        const data = await res.json();
        
        if (data.ok && Array.isArray(data.items)) {
          setImages(data.items);
          
          // Find the index of the target image
          const targetIndex = data.items.findIndex((item: any) => item.id === initialImageId);
          if (targetIndex !== -1) {
            setInitialIndex(targetIndex);
          }
        }
      } catch (error) {
        console.error('Failed to fetch community data for lightbox:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityData();
  }, [initialImageId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="text-white">Image not found</div>
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
