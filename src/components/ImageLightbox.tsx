import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

interface LightboxImage {
  src: string;
  alt?: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  openIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function ImageLightbox({ images, openIndex, onClose, onNavigate }: ImageLightboxProps) {
  if (typeof document === "undefined" || openIndex === null || images.length === 0) {
    return null;
  }

  const safeIndex = Math.min(Math.max(openIndex, 0), images.length - 1);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onNavigate((safeIndex + 1) % images.length);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onNavigate((safeIndex - 1 + images.length) % images.length);
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [safeIndex, images.length, onClose, onNavigate]);

  const currentImage = images[safeIndex];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute top-4 right-4 text-white/80 hover:text-white"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        aria-label="閉じる"
      >
        <X className="w-6 h-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            className="absolute left-6 text-white/70 hover:text-white"
            onClick={(event) => {
              event.stopPropagation();
              onNavigate((safeIndex - 1 + images.length) % images.length);
            }}
            aria-label="前の画像"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            type="button"
            className="absolute right-6 text-white/70 hover:text-white"
            onClick={(event) => {
              event.stopPropagation();
              onNavigate((safeIndex + 1) % images.length);
            }}
            aria-label="次の画像"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      <div
        className="max-h-[90vh] max-w-[90vw] flex items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={currentImage.src}
          alt={currentImage.alt || ""}
          className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
        />
      </div>
    </div>,
    document.body
  );
}
