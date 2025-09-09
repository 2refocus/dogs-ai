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
    input_url?: string | null;
    aspect_ratio?: string | null;
  }>;
  initialIndex?: number;
  onClose: () => void;
}

export default function Lightbox({ images, initialIndex = 0, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showOriginal, setShowOriginal] = useState(false);
  const [sharing, setSharing] = useState(false);
  
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

  // Debug: Log the current image data
  console.log("[Lightbox] Current image data:", {
    id: currentImage.id,
    preset_label: currentImage.preset_label,
    input_url: currentImage.input_url,
    output_url: currentImage.output_url,
    showOriginal: showOriginal,
    all_keys: Object.keys(currentImage)
  });

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

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    
    // Generate shareable URL with image ID
    const baseUrl = window.location.origin;
    const imageId = currentImage.id;
    const shareableUrl = `${baseUrl}/?image=${imageId}`;
    const shareText = `Check out this amazing pet portrait! 🐾✨`;
    
    console.log('[Lightbox] Starting share with URL:', shareableUrl);
    
    // Simple approach: try clipboard first, then open in new tab
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareableUrl}`);
      console.log('[Lightbox] Clipboard success');
      
      // Show success notification
      const notification = document.createElement('div');
      notification.textContent = 'Shareable link copied to clipboard!';
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50 shadow-lg';
      document.body.appendChild(notification);
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 3000);
      
    } catch (clipboardError) {
      console.log('[Lightbox] Clipboard failed, opening in new tab:', clipboardError);
      window.open(shareableUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setSharing(false);
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

        {/* Image container with style label */}
        <div className="relative">
          {/* Style label - now clickable */}
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="absolute top-4 left-4 text-white text-sm bg-black/60 hover:bg-black/80 px-3 py-1 rounded-full border border-white/20 z-[60] transition-all cursor-pointer"
            title={showOriginal ? "Show generated image" : "Show original image"}
          >
            {showOriginal ? "Original" : (currentImage.preset_label || "No Style Info")}
          </button>

          {/* Image */}
          <img
            src={showOriginal ? (currentImage.input_url || currentImage.high_res_url || currentImage.output_url) : (currentImage.high_res_url || currentImage.output_url)}
            alt={showOriginal ? "Original image" : "Pet portrait"}
            className="max-h-[90vh] mx-auto rounded-lg"
          />
          
          {/* Bottom toolbar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent flex justify-between items-center">
            <div className="text-white flex gap-4">
              {currentImage.display_name && currentImage.website ? (
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (currentImage.website) {
                      // Ensure URL has proper protocol
                      let url = currentImage.website;
                      if (!url.startsWith('http://') && !url.startsWith('https://')) {
                        url = `https://${url}`;
                      }
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }
                  }}
                >
                  {currentImage.display_name}
                </a>
              ) : currentImage.display_name ? (
                <span>{currentImage.display_name}</span>
              ) : null}
              {currentImage.social_handle && (
                <span>{currentImage.social_handle}</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={share}
                disabled={sharing}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sharing ? 'Sharing...' : 'Share'}
              </button>
              <button
                onClick={download}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Download
              </button>
            </div>
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
