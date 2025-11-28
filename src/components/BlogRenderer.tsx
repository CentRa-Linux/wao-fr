import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MarkdownIt from "markdown-it";
import type { Post } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { applyStandardMarkdownPlugins } from "@/lib/markdownPlugins";
import { SlideViewer } from "@/components/SlideViewer";
import { ImageLightbox } from "@/components/ImageLightbox";
import { SensitiveMediaGate } from "@/components/SensitiveMediaGate";
import { api } from "@/lib/api";
import { Lock } from "lucide-react";
import "highlight.js/styles/github-dark.css";

// Twitter widgets.jsをグローバルに一度だけロード
let twitterWidgetsPromise: Promise<void> | null = null;

function loadTwitterWidgets(): Promise<void> {
  if (twitterWidgetsPromise) return twitterWidgetsPromise;

  twitterWidgetsPromise = new Promise((resolve, reject) => {
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

  return twitterWidgetsPromise;
}

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface BlogRendererProps {
  post: Post;
}

// カスタムMarkdownレンダラーの作成
const createBlogMarkdownRenderer = (customEmoji?: Array<{ emoji: string; shortcode?: string | null }>) => {
  const md = new MarkdownIt({
    html: false, // セキュリティのため
    breaks: true,
    linkify: true,
    typographer: true,
  });

  // プラグインを適用（カスタム絵文字データも渡す）
  applyStandardMarkdownPlugins(md, customEmoji);

  return md;
};

export const BlogRenderer = ({ post }: BlogRendererProps) => {
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const md = useMemo(() => createBlogMarkdownRenderer(post.user?.customEmoji), [post.user?.customEmoji]);
  const renderedHTML = useMemo(() => md.render(post.content), [md, post.content]);
  const avatarSrc = post.user.icon ? `${BASE_URL}${post.user.icon}` : undefined;
  const avatarInitial = post.user.name[0]?.toUpperCase() || "U";
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Twitter埋め込みとOGPプレビューの処理
  useEffect(() => {
    // DOMが完全にレンダリングされるのを待つ
    const timeoutId = setTimeout(() => {
      if (!contentRef.current) return;
      processEmbeds();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [renderedHTML]);

  const processEmbeds = async () => {
    // Twitter埋め込みの処理（createTweetを使用）
    const processTwitterEmbeds = async () => {
      if (!contentRef.current) return;

      const twitterContainers = contentRef.current.querySelectorAll<HTMLElement>(".twitter-embed[data-tweet-id]");

      for (const container of twitterContainers) {
        const tweetId = container.dataset.tweetId;
        if (!tweetId) continue;

        // 既に処理済みの場合はスキップ
        if (container.querySelector("iframe")) continue;

        try {
          await loadTwitterWidgets();

          const loadingEl = container.querySelector(".twitter-embed-loading");
          const isDark = document.documentElement.classList.contains("dark");

          // @ts-expect-error Twitter global
          const el = await window.twttr?.widgets?.createTweet(tweetId, container, {
            theme: isDark ? "dark" : "light",
            conversation: "none",
            dnt: true,
          });

          // ローディング表示を削除
          if (loadingEl && el) {
            loadingEl.remove();
          } else if (loadingEl && !el) {
            // 埋め込み失敗時はフォールバック表示
            loadingEl.innerHTML = `<a href="https://twitter.com/i/status/${tweetId}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">ツイートを表示</a>`;
            loadingEl.classList.remove("animate-pulse");
          }
        } catch (e) {
          console.error("Failed to render tweet:", e);
        }
      }
    };

    // OGPプレビューの処理
    const processUrlPreviews = async () => {
      if (!contentRef.current) return;

      const urlPreviews = contentRef.current.querySelectorAll<HTMLElement>(".url-preview[data-url]");

      for (const preview of urlPreviews) {
        const url = preview.dataset.url;
        if (!url) continue;

        try {
          const ogp = await api.getOgp(url);
          const contentEl = preview.querySelector(".url-preview-content");
          const loadingEl = preview.querySelector(".url-preview-loading");
          const fallbackEl = preview.querySelector(".url-preview-fallback");

          if (!contentEl || !loadingEl || !fallbackEl) continue;

          if (ogp && (ogp.title || ogp.description)) {
            // OGPデータが取得できた場合
            const hostname = new URL(url).hostname;
            contentEl.innerHTML = `
              <div class="flex">
                ${ogp.image ? `
                  <div class="w-28 h-20 flex-shrink-0 bg-muted">
                    <img src="${ogp.image}" alt="" class="w-full h-full object-cover" onerror="this.style.display='none'" />
                  </div>
                ` : ''}
                <div class="flex-1 p-3 min-w-0">
                  <p class="text-xs text-muted-foreground mb-1 truncate">${ogp.siteName || hostname}</p>
                  <p class="text-sm font-medium text-foreground line-clamp-1">${ogp.title || url}</p>
                  ${ogp.description ? `<p class="text-xs text-muted-foreground mt-1 line-clamp-2">${ogp.description}</p>` : ''}
                </div>
              </div>
            `;
          } else {
            // OGPデータが取得できない場合はフォールバック表示
            loadingEl.classList.add("hidden");
            fallbackEl.classList.remove("hidden");
          }
        } catch (e) {
          console.error("Failed to fetch OGP:", e);
          // エラー時はフォールバック表示
          const loadingEl = preview.querySelector(".url-preview-loading");
          const fallbackEl = preview.querySelector(".url-preview-fallback");
          if (loadingEl && fallbackEl) {
            loadingEl.classList.add("hidden");
            fallbackEl.classList.remove("hidden");
          }
        }
      }
    };

    processTwitterEmbeds();
    processUrlPreviews();
  };

  const handleAuthorClick = () => {
    navigate(`/profile/${post.user.uniqueid}`);
  };
  const resolveMediaType = (url: string, explicit?: string | null) => {
    if (explicit) return explicit;
    const lower = url.toLowerCase();
    if (lower.endsWith(".pdf")) return "slide";
    if (lower.match(/\.(mp4|webm|mov)$/)) return "video";
    return "image";
  };
  const resolveSrc = (path: string) =>
    path.startsWith("http://") || path.startsWith("https://") ? path : `${BASE_URL}${path}`;

  const imageEntries = useMemo(() => {
    return (post.attachedMedia || [])
      .filter((media) => resolveMediaType(media.url, media.mediaType) === "image")
      .map((media) => ({
        id: media.id,
        src: resolveSrc(media.url),
        alt: media.altText || post.title || "Attachment",
      }));
  }, [post.attachedMedia, post.title]);

  const imageIndexMap = useMemo(() => {
    const map = new Map<number, number>();
    imageEntries.forEach((entry, index) => map.set(entry.id, index));
    return map;
  }, [imageEntries]);

  const openLightbox = (mediaId: number) => {
    const index = imageIndexMap.get(mediaId);
    if (index !== undefined) {
      setLightboxIndex(index);
    }
  };

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      {/* ヘッダー */}
      <header className="mb-12">
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          {post.title || "タイトルなし"}
        </h1>
        {post.visibility === "followers" && (
          <div className="inline-flex items-center gap-2 text-sm text-amber-600 dark:text-amber-300 mb-6">
            <Lock className="w-4 h-4" />
            フォロワー限定
          </div>
        )}

        {/* メタデータ */}
        <button
          type="button"
          onClick={handleAuthorClick}
          className="flex items-center gap-4 text-muted-foreground mb-6 focus:outline-none"
        >
          <Avatar className="w-12 h-12">
            {avatarSrc ? (
              <AvatarImage src={avatarSrc} alt={post.user.name} />
            ) : (
              <AvatarFallback>{avatarInitial}</AvatarFallback>
            )}
          </Avatar>
          <div className="text-left">
            <div className="font-medium text-foreground">{post.user.name}</div>
            <div className="text-sm">
              {formatDistanceToNow(new Date(post.createdAt * 1000), {
                addSuffix: true,
                locale: ja,
              })}
            </div>
          </div>
        </button>

        {/* 区切り線 */}
        <hr className="border-border" />
      </header>

      {/* コンテンツ */}
      <div
        ref={contentRef}
        className="prose prose-lg dark:prose-invert max-w-none
          prose-headings:font-bold
          prose-h1:text-4xl prose-h1:mb-4
          prose-h2:text-3xl prose-h2:mb-3 prose-h2:mt-8
          prose-h3:text-2xl prose-h3:mb-2 prose-h3:mt-6
          prose-p:leading-relaxed prose-p:mb-4
          prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
          prose-strong:font-bold
          prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
          prose-pre:bg-gray-900 prose-pre:text-gray-100
          prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic
          prose-ul:list-disc prose-ul:pl-6
          prose-ol:list-decimal prose-ol:pl-6
          prose-li:mb-2"
        dangerouslySetInnerHTML={{ __html: renderedHTML }}
      />

      {post.attachedMedia?.length ? (
        <section className="mt-12 space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">添付ファイル</h2>
          <div className="space-y-6">
            {post.attachedMedia.map((media) => {
              const mediaType = resolveMediaType(media.url, media.mediaType);
              const mediaSrc = resolveSrc(media.url);
              if (mediaType === "slide") {
                return (
                  <div key={media.id} className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
                    <SlideViewer src={mediaSrc} minHeight={320} />
                    {media.altText && (
                      <div className="px-4 py-2 text-sm text-muted-foreground border-t border-border">{media.altText}</div>
                    )}
                  </div>
                );
              }
              if (mediaType === "video") {
                return (
                  <div key={media.id} className="border border-border rounded-xl overflow-hidden">
                    <video src={mediaSrc} controls className="w-full max-h-[420px] object-contain bg-black">
                      {media.altText}
                    </video>
                    {media.altText && (
                      <div className="px-4 py-2 text-sm text-muted-foreground border-t border-border">{media.altText}</div>
                    )}
                  </div>
                );
              }
              return (
                <figure key={media.id} className="border border-border rounded-xl overflow-hidden">
                  <SensitiveMediaGate mediaId={media.id} isSensitive={media.isSensitive}>
                    <button
                      type="button"
                      className="block w-full focus:outline-none"
                      onClick={() => openLightbox(media.id)}
                    >
                      <img src={mediaSrc} alt={media.altText || "Attachment"} className="w-full object-contain" />
                    </button>
                  </SensitiveMediaGate>
                  {media.altText && (
                    <figcaption className="px-4 py-2 text-sm text-muted-foreground border-t border-border">{media.altText}</figcaption>
                  )}
                </figure>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* フッター */}
      <footer className="mt-16 pt-8 border-t border-border">
        <button
          type="button"
          onClick={handleAuthorClick}
          className="flex items-center gap-4 text-left focus:outline-none"
        >
          <Avatar className="w-16 h-16">
            {avatarSrc ? (
              <AvatarImage src={avatarSrc} alt={post.user.name} />
            ) : (
              <AvatarFallback>{avatarInitial}</AvatarFallback>
            )}
          </Avatar>
          <div>
            <div className="font-bold text-lg text-foreground">{post.user.name}</div>
            <div className="text-muted-foreground">@{post.user.uniqueid}</div>
            {post.user.bio && (
              <div className="text-sm text-muted-foreground mt-1">{post.user.bio}</div>
            )}
          </div>
        </button>
      </footer>
      <ImageLightbox
        images={imageEntries}
        openIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={(index) => setLightboxIndex(index)}
      />
    </article>
  );
};
