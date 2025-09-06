"use client";

import { useEffect, useState } from "react";

interface LightboxProps {
  images: Array<{
    id?: string | number;
    output_url: string;
    display_name?: string | null;
    website?: string | null;
    social_handle?: string | null;
    preset_label?: string | null;
    high_res_url?: string | null;
    aspect_ratio?: string | null;
  }>;
  initialIndex?: number;
  onClose: () => void;
}

export default function Lightbox({ images, initialIndex = 0, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  useEffect(() => {
    // Handle keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setCurrentIndex(i => (i > 0 ? i - 1 : images.length - 1));
      if (e.key === "ArrowRight") setCurrentIndex(i => (i < images.length - 1 ? i + 1 : 0));
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, onClose]);

  const currentImage = images[currentIndex];
  if (!currentImage) return null;

  const download = async () => {
    try {
      // Use high-res URL if available, otherwise fallback to regular URL
      const downloadUrl = currentImage.high_res_url || currentImage.output_url;
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pet-portrait-${currentImage.id || 'download'}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
         onClick={onClose}>
      <div className="relative max-w-7xl mx-auto p-4" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-0 right-0 m-4 p-2 text-white/80 hover:text-white z-10"
        >
          ✕
        </button>

        {/* Navigation buttons */}
        <button
          onClick={() => setCurrentIndex(i => (i > 0 ? i - 1 : images.length - 1))}
          className="absolute left-0 top-1/2 -translate-y-1/2 p-4 text-white/80 hover:text-white"
        >
          ←
        </button>
        <button
          onClick={() => setCurrentIndex(i => (i < images.length - 1 ? i + 1 : 0))}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-4 text-white/80 hover:text-white"
        >
          →
        </button>

        {/* Style label */}
        {currentImage.preset_label && (
          <div className="absolute top-4 left-4 text-white/60 text-sm bg-black/30 px-3 py-1 rounded-full">
            {currentImage.preset_label}
          </div>
        )}

        {/* Image */}
        <div className="relative">
          <div className="flex items-center justify-center">
            <div className={`relative ${currentImage.aspect_ratio ? `aspect-[${currentImage.aspect_ratio.replace(':', '/')}]` : ''} max-w-full max-h-[90vh]`}>
              <img
                src={currentImage.high_res_url || currentImage.output_url}
                alt="Pet portrait"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
          </div>
          
          {/* Bottom toolbar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent flex justify-between items-center">
            <div className="text-white flex gap-4">
              {currentImage.display_name && (
                <span>{currentImage.display_name}</span>
              )}
              {currentImage.social_handle && (
                <span>{currentImage.social_handle}</span>
              )}
              {currentImage.website && (
                <a
                  href={currentImage.website || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Visit Creator
                </a>
              )}
            </div>
            <button
              onClick={download}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg"
            >
              Download
            </button>
          </div>
        </div>

        {/* Image counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80">
          {currentIndex + 1} / {images.length}
        </div>
      </div>
    </div>
  );
}
