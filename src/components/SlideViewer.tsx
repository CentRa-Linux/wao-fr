import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";

GlobalWorkerOptions.workerSrc = pdfWorker;

interface SlideViewerProps {
  src: string;
  className?: string;
  initialPage?: number;
  minHeight?: number;
}

export function SlideViewer({ src, className, initialPage = 1, minHeight = 280 }: SlideViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [scale, setScale] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setPdfDoc(null);
    setPageCount(0);
    setCurrentPage(initialPage);

    getDocument(src)
      .promise.then((pdf) => {
        if (cancelled) {
          pdf.destroy();
          return;
        }
        setPdfDoc(pdf);
        setPageCount(pdf.numPages);
        setStatus("idle");
      })
      .catch((err) => {
        console.error("Failed to load slide:", err);
        setStatus("error");
      });

    return () => {
      cancelled = true;
      setPdfDoc((prev) => {
        prev?.destroy();
        return null;
      });
    };
  }, [src, initialPage]);

  useEffect(() => {
    if (!pdfDoc || status === "error") return;

    let cancelled = false;
    const renderPage = async () => {
      const page = await pdfDoc.getPage(currentPage);
      if (!canvasRef.current) return;

      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderTask = page.render({ canvasContext: context, viewport });
      try {
        await renderTask.promise;
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to render slide:", error);
        }
      }
    };

    renderPage();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage, scale, status]);

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < pageCount;

  const stopPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      className={`w-full flex flex-col border border-border rounded-lg bg-card shadow-sm ${className ?? ""}`}
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
      onPointerDown={stopPropagation}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/60">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            className="p-1 rounded disabled:opacity-30 hover:bg-muted transition-colors"
            aria-label="前のページ"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-foreground">
            {pageCount > 0 ? `${currentPage} / ${pageCount}` : "読み込み中..."}
          </span>
          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => setCurrentPage((prev) => Math.min(pageCount, prev + 1))}
            className="p-1 rounded disabled:opacity-30 hover:bg-muted transition-colors"
            aria-label="次のページ"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScale((prev) => Math.max(0.5, prev - 0.1))}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label="ズームアウト"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setScale((prev) => Math.min(2, prev + 0.1))}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label="ズームイン"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="relative flex-1" style={{ minHeight }}>
        {status === "error" ? (
          <div className="flex items-center justify-center h-full text-sm text-red-500 p-4">
            スライドを読み込めませんでした
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain rounded-b-lg bg-muted"
          />
        )}
      </div>
      <div className="flex items-center justify-end px-3 py-2 border-t border-border text-xs text-muted-foreground">
        <a href={src} target="_blank" rel="noopener noreferrer" className="underline text-primary">
          PDFを開く
        </a>
      </div>
    </div>
  );
}
