import { useState, useEffect, useRef, useCallback } from "react";

interface TwitterEmbedProps {
  url: string;
}

// Twitter/XのURLからツイートIDを抽出
function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return match ? match[1] : null;
}

// Twitter widgets.jsをグローバルに一度だけロード
let widgetScriptPromise: Promise<void> | null = null;

function loadTwitterWidgets(): Promise<void> {
  if (widgetScriptPromise) return widgetScriptPromise;

  widgetScriptPromise = new Promise((resolve, reject) => {
    // @ts-expect-error Twitter global
    if (window.twttr?.widgets) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Twitter widgets"));
    document.head.appendChild(script);
  });

  return widgetScriptPromise;
}

export function TwitterEmbed({ url }: TwitterEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tweetId = extractTweetId(url);
  const renderIdRef = useRef<string>("");

  const renderTweet = useCallback(async () => {
    if (!tweetId || !containerRef.current) return;

    // 一意のレンダーIDを生成
    const renderId = `${tweetId}-${Date.now()}`;
    renderIdRef.current = renderId;

    try {
      await loadTwitterWidgets();

      // このコンポーネントがまだアクティブか確認
      if (renderIdRef.current !== renderId || !containerRef.current) return;

      // 既にiframeが存在する場合はスキップ
      if (containerRef.current.querySelector("iframe")) {
        setIsLoading(false);
        return;
      }

      const isDark = document.documentElement.classList.contains("dark");

      // @ts-expect-error Twitter global
      const el = await window.twttr?.widgets?.createTweet(tweetId, containerRef.current, {
        theme: isDark ? "dark" : "light",
        conversation: "none",
        dnt: true,
      });

      if (renderIdRef.current === renderId) {
        setIsLoading(false);
        if (!el) {
          setError(true);
        }
      }
    } catch (e) {
      console.error("Failed to render tweet:", e);
      if (renderIdRef.current === renderId) {
        setError(true);
        setIsLoading(false);
      }
    }
  }, [tweetId]);

  useEffect(() => {
    renderTweet();

    return () => {
      // クリーンアップ時にレンダーIDを無効化
      renderIdRef.current = "";
    };
  }, [renderTweet]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!tweetId) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="text-primary hover:underline text-sm break-all"
      >
        {url}
      </a>
    );
  }

  if (error) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="block border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span className="text-sm text-muted-foreground">ツイートを読み込めませんでした</span>
        </div>
      </a>
    );
  }

  return (
    <div onClick={handleClick} className="twitter-embed">
      {isLoading && (
        <div className="border border-border rounded-lg p-4 bg-muted/30 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-1/4" />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}

// Twitter/X URLかどうかを判定
export function isTwitterUrl(url: string): boolean {
  return /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/.test(url);
}
