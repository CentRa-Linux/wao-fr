import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Post, SavedReaction } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { parseShortcodes } from "@/lib/shortcodeParser";
import { SlideViewer } from "@/components/SlideViewer";
import { ImageLightbox } from "@/components/ImageLightbox";
import { SensitiveMediaGate } from "@/components/SensitiveMediaGate";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { ReactionBar } from "@/components/ReactionBar";
import { RepostButton } from "@/components/RepostButton";
import { QuotedPost } from "@/components/QuotedPost";
import { Lock, MessageCircle, Repeat2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/authStore";
import { LinkPreview, extractUrls } from "@/components/LinkPreview";

interface PostCardProps {
  post: Post;
  onReply?: (postId: number) => void;
  onReactionsChange?: (
    postId: number,
    reactions: Record<string, number>,
    reactionCount: number
  ) => void;
}

const BLOG_EXCERPT_LENGTH = 180;
// ハッシュタグとメンションを同時にマッチ
const HASHTAG_MENTION_REGEX = /(#[^\s#]+)|(@[a-zA-Z0-9_]+)/gu;

function renderTextWithLinks(text: string) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  const matches = text.matchAll(HASHTAG_MENTION_REGEX);

  for (const match of matches) {
    if (!match.index && match.index !== 0) continue;
    const start = match.index;
    const end = start + match[0].length;

    if (start > lastIndex) {
      nodes.push(
        <span key={`${start}-text`} className="text-current">
          {text.slice(lastIndex, start)}
        </span>,
      );
    }

    const matched = match[0];
    if (matched.startsWith("#")) {
      // ハッシュタグ
      const encoded = encodeURIComponent(matched);
      nodes.push(
        <Link
          key={`${start}-tag`}
          to={`/explore?q=${encoded}`}
          onClick={(event) => event.stopPropagation()}
          className="text-primary hover:underline font-medium"
        >
          {matched}
        </Link>
      );
    } else if (matched.startsWith("@")) {
      // メンション
      const username = matched.slice(1); // @を除去
      nodes.push(
        <Link
          key={`${start}-mention`}
          to={`/profile/${username}`}
          onClick={(event) => event.stopPropagation()}
          className="text-primary hover:underline font-medium"
        >
          {matched}
        </Link>
      );
    }

    lastIndex = end;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <span key={`${lastIndex}-tail`} className="text-current">
        {text.slice(lastIndex)}
      </span>,
    );
  }

  if (nodes.length === 0) {
    return text;
  }

  return nodes;
}

function extractPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*_~`\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const PostCard = ({ post, onReply, onReactionsChange }: PostCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [savedReactions, setSavedReactions] = useState<SavedReaction[]>([]);
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // For simple reposts, show the original post content
  const displayPost = post.postType === "repost" && post.repostedPost ? post.repostedPost : post;
  const isSimpleRepost = post.postType === "repost";
  const isQuoteRepost = post.postType === "quote";

  const loadSavedReactions = async () => {
    try {
      const { reactions } = await api.getSavedReactions();
      setSavedReactions(reactions);
    } catch (error) {
      console.error("Failed to load saved reactions:", error);
    }
  };

  useEffect(() => {
    loadSavedReactions();
  }, []);

  useEffect(() => {
    setAvatarFailed(false);
  }, [displayPost.user?.icon]);

  // Guard against missing user data (must be after hooks)
  if (!displayPost.user) {
    return null;
  }

  const parsedContent = parseShortcodes(
    displayPost.content,
    savedReactions,
    displayPost.user?.customEmoji ?? []
  );

  const resolveMediaType = (media: Post["attachedMedia"][number] | Post["embeddedMedia"][number]) => {
    if (media.mediaType) return media.mediaType;
    const url = media.url.toLowerCase();
    if (url.endsWith(".pdf")) return "slide";
    if (url.match(/\.(mp4|webm|mov)$/)) return "video";
    return "image";
  };

  const blogCover = displayPost.attachedMedia?.find((media) => media.mediaType === "image");
  const blogExcerptText = extractPlainText(displayPost.content).slice(0, BLOG_EXCERPT_LENGTH);
  const parsedBlogExcerpt = parseShortcodes(
    blogExcerptText.length >= BLOG_EXCERPT_LENGTH ? `${blogExcerptText}…` : blogExcerptText,
    savedReactions,
    displayPost.user?.customEmoji ?? []
  );

  const resolveMediaSrc = (path: string) =>
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:")
      ? path
      : `${BASE_URL}${path}`;

  const imageEntries = useMemo(() => {
    const combined = [...(displayPost.attachedMedia || []), ...(displayPost.embeddedMedia || [])];
    return combined
      .filter((media) => resolveMediaType(media) === "image")
      .map((media) => ({
        id: media.id,
        src: resolveMediaSrc(media.url),
        alt: media.altText || `${displayPost.user?.name || ""}の画像`,
      }));
  }, [displayPost.attachedMedia, displayPost.embeddedMedia, displayPost.user?.name]);

  const imageIndexMap = useMemo(() => {
    const mapping = new Map<number, number>();
    imageEntries.forEach((entry, index) => mapping.set(entry.id, index));
    return mapping;
  }, [imageEntries]);

  const openLightbox = (mediaId: number, event?: React.MouseEvent) => {
    event?.stopPropagation();
    const index = imageIndexMap.get(mediaId);
    if (index !== undefined) {
      setLightboxIndex(index);
    }
  };

  const handleCardClick = () => {
    navigate(`/posts/${displayPost.user?.uniqueid}/${displayPost.uuid}`);
  };

  return (
    <>
      <Card
        data-testid="post-card"
        className="mb-4 border-border/70 shadow-sm hover:bg-muted/60 dark:hover:bg-muted/40 transition-colors cursor-pointer"
        onClick={handleCardClick}
      >
      {/* Repost header */}
      {isSimpleRepost && post.user && (
        <div className="px-4 pt-3 pb-0 flex items-center gap-2 text-muted-foreground text-sm">
          <Repeat2 className="w-4 h-4" />
          <Link
            to={`/profile/${post.user.uniqueid}`}
            className="hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            @{post.user.uniqueid}
          </Link>
          <span>がリポスト</span>
        </div>
      )}
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <button
          type="button"
          className="flex items-center gap-3 flex-1 text-left focus:outline-none"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/profile/${displayPost.user.uniqueid}`);
          }}
        >
          <Avatar>
            {displayPost.user.icon && !avatarFailed ? (
              <AvatarImage
                src={`${BASE_URL}${displayPost.user.icon}`}
                alt={displayPost.user.name}
                onError={() => setAvatarFailed(true)}
              />
            ) : null}
            {(!displayPost.user.icon || avatarFailed) && (
              <AvatarFallback>{displayPost.user.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
            )}
          </Avatar>
          <div className="flex flex-col flex-1">
            <span className="font-bold text-sm text-foreground">{displayPost.user.name}</span>
            <span className="text-xs text-muted-foreground">@{displayPost.user.uniqueid}</span>
          </div>
        </button>
        <div className="ml-auto text-xs text-muted-foreground flex flex-col items-end gap-1">
          {displayPost.visibility === "followers" && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-300">
              <Lock className="w-3 h-3" />
              フォロワー限定
            </span>
          )}
          <span>{format(new Date(displayPost.createdAt * 1000), "MMM d, HH:mm")}</span>
        </div>
      </CardHeader>

      <CardContent>
        {displayPost.isLong ? (
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-foreground">
              {displayPost.title || "タイトル未設定"}
            </h3>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              {parsedBlogExcerpt.length > 0 ? (
                <p className="break-words">
                  {parsedBlogExcerpt.map((part, index) => {
                    if (part.type === "text") {
                      return (
                        <span key={index}>
                          {renderTextWithLinks(part.content)}
                        </span>
                      );
                    } else if (part.type === "emoji") {
                      return <span key={index} className="text-xl">{part.content}</span>;
                    } else if (part.type === "image") {
                      return (
                        <img
                          key={index}
                          src={resolveMediaSrc(part.content)}
                          alt={part.altText}
                          className="inline-block w-5 h-5 object-contain mx-0.5 align-middle"
                        />
                      );
                    }
                    return null;
                  })}
                </p>
              ) : (
                <p>本文なし</p>
              )}
            </div>
            {displayPost.attachedMedia?.length ? (
              <div className="space-y-3">
                {displayPost.attachedMedia.slice(0, 2).map((media) => {
                  const mediaType = resolveMediaType(media);
                  const mediaSrc = `${BASE_URL}${media.url}`;
                  if (mediaType === "slide") {
                    return (
                      <div key={media.id} onClick={(event) => event.stopPropagation()}>
                        <SlideViewer src={mediaSrc} minHeight={220} />
                      </div>
                    );
                  }
                  if (mediaType === "video") {
                    return (
                      <video
                        key={media.id}
                        src={mediaSrc}
                        controls
                        className="rounded-lg w-full max-h-60 object-contain"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {media.altText}
                      </video>
                    );
                  }
                  return (
                    <img
                      key={media.id}
                      src={mediaSrc}
                      alt={media.altText || "Blog media"}
                      className="rounded-lg w-full h-48 object-cover"
                      onClick={(event) => event.stopPropagation()}
                    />
                  );
                })}
              </div>
            ) : null}
            {blogCover && (
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={`${BASE_URL}${blogCover.url}`}
                  alt={blogCover.altText || "Blog cover"}
                  className="w-full h-48 object-cover"
                />
              </div>
            )}
            <p className="text-sm text-primary font-medium flex items-center gap-2">
              続きを読む
              <span aria-hidden>→</span>
            </p>
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-foreground mb-3">
            {parsedContent.map((part, index) => {
              if (part.type === "text") {
                return (
                  <span key={index} className="break-words">
                    {renderTextWithLinks(part.content)}
                  </span>
                );
              } else if (part.type === "emoji") {
                return <span key={index} className="text-xl">{part.content}</span>;
                } else if (part.type === "image") {
                  return (
                    <img
                      key={index}
                      src={resolveMediaSrc(part.content)}
                      alt={part.altText}
                      className="inline-block w-6 h-6 object-contain mx-0.5 align-middle"
                    />
                  );
              }
              return null;
            })}
          </div>
        )}

        {/* 添付メディアの表示 */}
          {!displayPost.isLong && displayPost.attachedMedia && displayPost.attachedMedia.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {displayPost.attachedMedia.map((media) => {
                const mediaType = resolveMediaType(media);
                const wrapperClass = mediaType === "slide" ? "relative col-span-2" : "relative";
                return (
                  <div
                    key={media.id}
                    className={wrapperClass}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {mediaType === "image" ? (
                      <SensitiveMediaGate mediaId={media.id} isSensitive={media.isSensitive}>
                        <button
                          type="button"
                          className="block w-full focus:outline-none"
                          onClick={(event) => openLightbox(media.id, event)}
                        >
                          <img
                            src={`${BASE_URL}${media.url}`}
                            alt={media.altText}
                            className="rounded-md object-cover w-full h-48"
                          />
                        </button>
                      </SensitiveMediaGate>
                    ) : mediaType === "video" ? (
                    <video
                      src={`${BASE_URL}${media.url}`}
                      controls
                      className="rounded-md object-cover w-full h-48"
                    >
                      {media.altText}
                    </video>
                  ) : (
                    <SlideViewer src={`${BASE_URL}${media.url}`} minHeight={260} />
                  )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 埋め込みメディアの表示 */}
          {!displayPost.isLong && displayPost.embeddedMedia && displayPost.embeddedMedia.length > 0 && (
            <div className="mt-3 space-y-2">
              {displayPost.embeddedMedia.map((media) => {
                const mediaType = resolveMediaType(media);
                return (
                  <div
                    key={media.id}
                    className="border border-border rounded-md p-2 bg-muted/40"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {mediaType === "slide" ? (
                    <SlideViewer src={`${BASE_URL}${media.url}`} minHeight={280} />
                  ) : mediaType === "video" ? (
                    <video
                      src={`${BASE_URL}${media.url}`}
                      controls
                      className="rounded w-full max-h-64 object-contain"
                    >
                      {media.altText}
                    </video>
                  ) : (
                    <SensitiveMediaGate mediaId={media.id} isSensitive={media.isSensitive}>
                      <button
                        type="button"
                        className="block w-full focus:outline-none"
                        onClick={(event) => openLightbox(media.id, event)}
                      >
                        <img
                          src={`${BASE_URL}${media.url}`}
                          alt={media.altText}
                          className="rounded w-full max-h-64 object-contain"
                        />
                      </button>
                    </SensitiveMediaGate>
                  )}
                  </div>
                );
              })}
            </div>
          )}

        {/* 外部リンクプレビュー */}
        {!displayPost.isLong && (() => {
          const urls = extractUrls(displayPost.content);
          // 自サイトのURLは除外
          const externalUrls = urls.filter(url => {
            try {
              const hostname = new URL(url).hostname;
              return !hostname.includes(window.location.hostname);
            } catch {
              return false;
            }
          });
          if (externalUrls.length === 0) return null;
          return (
            <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
              {externalUrls.map((url) => (
                <LinkPreview key={url} url={url} />
              ))}
            </div>
          );
        })()}

        {/* 引用リポストの埋め込み表示 */}
        {isQuoteRepost && post.repostedPost && (
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <QuotedPost post={post.repostedPost} />
          </div>
        )}

        {/* アクションボタン */}
        {user && (
          <div className="mt-4 text-sm text-muted-foreground">
            {/* リプライ・リポスト (左) + リアクション (右、バッジは下に折り返し) */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onReply) {
                      onReply(displayPost.id);
                    } else {
                      navigate(`/posts/${displayPost.user.uniqueid}/${displayPost.uuid}`);
                    }
                  }}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                  title="リプライ"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{displayPost.replyCount ?? 0}</span>
                </motion.button>
                <RepostButton
                  post={displayPost}
                  isReposted={displayPost.isReposted ?? false}
                  onRepost={() => {
                    // Optionally refresh the post or show a toast
                  }}
                  onUnrepost={() => {
                    // Optionally refresh the post or show a toast
                  }}
                />
              </div>
              {/* リアクションボタン (右端) */}
              <ReactionBar
                postId={displayPost.id}
                reactions={displayPost.reactions}
                reactionCount={displayPost.reactionCount}
                onChange={(postId, reactions, count) =>
                  onReactionsChange?.(postId, reactions, count)
                }
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    <ImageLightbox
      images={imageEntries}
      openIndex={lightboxIndex}
      onClose={() => setLightboxIndex(null)}
      onNavigate={(index) => setLightboxIndex(index)}
    />
    </>
  );
};
