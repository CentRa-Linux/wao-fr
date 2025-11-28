import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { OgpData } from "@/types";
import { ExternalLink } from "lucide-react";
import { TwitterEmbed, isTwitterUrl } from "@/components/TwitterEmbed";

interface LinkPreviewProps {
  url: string;
}

// URL種別に応じて適切なプレビューコンポーネントを選択
export function LinkPreview({ url }: LinkPreviewProps) {
  // Twitter/X の場合は専用コンポーネントを使用
  if (isTwitterUrl(url)) {
    return <TwitterEmbed url={url} />;
  }

  // その他のURLは通常のOGPプレビュー
  return <OgpPreview url={url} />;
}

function OgpPreview({ url }: LinkPreviewProps) {
  const [ogp, setOgp] = useState<OgpData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchOgp = async () => {
      setIsLoading(true);
      setError(false);

      try {
        const data = await api.getOgp(url);
        if (!cancelled) {
          setOgp(data);
        }
      } catch (e) {
        console.error("Failed to fetch OGP:", e);
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchOgp();

    return () => {
      cancelled = true;
    };
  }, [url]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (isLoading) {
    return (
      <div className="border border-border rounded-lg p-3 bg-muted/30 animate-pulse">
        <div className="flex gap-3">
          <div className="w-24 h-16 bg-muted rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !ogp || (!ogp.title && !ogp.description)) {
    // Show simple link fallback
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="flex items-center gap-1 text-primary hover:underline text-sm break-all"
      >
        <ExternalLink className="w-3 h-3 flex-shrink-0" />
        {url}
      </a>
    );
  }

  const displayUrl = new URL(url).hostname;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="block border border-border rounded-lg overflow-hidden hover:bg-muted/50 transition-colors"
    >
      <div className="flex">
        {ogp.image && (
          <div className="w-28 h-20 flex-shrink-0 bg-muted">
            <img
              src={ogp.image}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
        <div className="flex-1 p-3 min-w-0">
          <p className="text-xs text-muted-foreground mb-1 truncate">
            {ogp.siteName || displayUrl}
          </p>
          <p className="text-sm font-medium text-foreground line-clamp-1">
            {ogp.title || url}
          </p>
          {ogp.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {ogp.description}
            </p>
          )}
        </div>
      </div>
    </a>
  );
}

// URL抽出用のユーティリティ関数
const URL_REGEX = /https?:\/\/[^\s<>\[\]()「」『』【】]+/g;

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  if (!matches) return [];

  // 重複除去
  return [...new Set(matches)];
}
