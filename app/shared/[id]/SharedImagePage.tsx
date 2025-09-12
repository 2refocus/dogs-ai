"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Lightbox from "@/components/Lightbox";

interface SharedImagePageProps {
  imageId: string;
}

export default function SharedImagePage({ imageId }: SharedImagePageProps) {
  const [imageData, setImageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadImage = async () => {
      try {
        setLoading(true);
        console.log('[SharedImagePage] Loading image with ID:', imageId);
        
        // Try to load from community API
        const response = await fetch(`/api/community/${imageId}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[SharedImagePage] Loaded image:', data);
          setImageData(data);
          setShowLightbox(true);
        } else {
          throw new Error('Image not found');
        }
      } catch (err) {
        console.error('[SharedImagePage] Failed to load image:', err);
        
        // Try to find in local history
        try {
          const localHistory = JSON.parse(localStorage.getItem('localHistory') || '[]');
          const localImage = localHistory.find((item: any) => item.id === imageId);
          
          if (localImage) {
            console.log('[SharedImagePage] Found in local history:', localImage);
            setImageData(localImage);
            setShowLightbox(true);
          } else {
            setError('Image not found');
          }
        } catch (localError) {
          setError('Image not found');
        }
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [imageId]);

  const handleClose = () => {
    // Redirect to home page when lightbox is closed
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="text-center">
          <div className="skeleton-pattern w-32 h-32 rounded-xl mx-auto mb-4"></div>
          <p className="text-[var(--fg)]/60">Loading pet portrait...</p>
        </div>
      </div>
    );
  }

  if (error || !imageData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">🐾</div>
          <h1 className="text-xl font-semibold text-[var(--fg)] mb-2">Image Not Found</h1>
          <p className="text-[var(--fg)]/60 mb-6">
            This pet portrait could not be found. It may have been removed or the link is invalid.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-[var(--brand-ink)] px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Go to Pet Portrait Studio
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Show lightbox immediately when image loads */}
      {showLightbox && imageData && (
        <Lightbox
          images={[imageData]}
          initialIndex={0}
          onClose={handleClose}
        />
      )}
      
      {/* Fallback content (hidden behind lightbox) */}
      <div className="min-h-screen bg-[var(--bg)] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[var(--fg)] mb-2">Pet Portrait</h1>
            <p className="text-[var(--fg)]/60">Click to view in lightbox</p>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={() => setShowLightbox(true)}
              className="relative group rounded-xl overflow-hidden border border-[var(--line)] bg-[var(--muted)]"
            >
              <img
                src={imageData.output_url}
                alt="Pet Portrait"
                className="w-full max-w-lg h-auto object-contain"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-lg font-medium">View in Lightbox</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
