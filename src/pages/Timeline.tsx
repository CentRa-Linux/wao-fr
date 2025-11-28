import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import type { Post } from "@/types";
import { PostCard } from "@/components/PostCard";
import { PostForm } from "@/components/PostForm";
import { useSSE } from "@/hooks/useSSE";
import { useAuthStore } from "@/stores/authStore";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Globe } from "lucide-react";

type FeedType = "following" | "all";

export function TimelinePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [feedType, setFeedType] = useState<FeedType>("following");
  const { user } = useAuthStore();
  const isAuthenticated = Boolean(user && !user.needsOnboarding);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // フィードタイプ変更時にリロード
  useEffect(() => {
    loadTimeline();
  }, [feedType]);

  const loadTimeline = async () => {
    setIsLoading(true);
    try {
      if (feedType === "following" && isAuthenticated) {
        const result = await api.getTimeline({ limit: 20 });
        setPosts(result.posts);
        setHasMore(result.hasMore);
      } else {
        const result = await api.getPosts({ limit: 20 });
        setPosts(result.posts);
        setHasMore(result.hasMore);
      }
    } catch (error) {
      console.error("Failed to load timeline:", error);
      // フォロータイムライン失敗時はグローバルにフォールバック
      if (feedType === "following") {
        try {
          const result = await api.getPosts({ limit: 20 });
          setPosts(result.posts);
          setHasMore(result.hasMore);
        } catch {
          setPosts([]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || posts.length === 0) return;

    const lastPost = posts[posts.length - 1];
    if (!lastPost) return;

    setIsLoadingMore(true);
    try {
      if (feedType === "following" && isAuthenticated) {
        const result = await api.getTimeline({ before: lastPost.createdAt, limit: 20 });
        setPosts((prev) => [...prev, ...result.posts]);
        setHasMore(result.hasMore);
      } else {
        const result = await api.getPosts({ before: lastPost.createdAt, limit: 20 });
        setPosts((prev) => [...prev, ...result.posts]);
        setHasMore(result.hasMore);
      }
    } catch (error) {
      console.error("Failed to load more posts:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, posts, feedType, isAuthenticated]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { rootMargin: "100px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  // Real-time updates via SSE
  useSSE({
    onTimelineUpdate: (newPost) => {
      setPosts((prev) => [newPost, ...prev]);
    },
    onReactionUpdate: (payload) => {
      const { postId, reactions, reactionCount } = payload;
      handleReactionsChange(postId, reactions, reactionCount);
    },
    enabled: isAuthenticated,
  });

  const handleReactionsChange = (postId: number, reactions: Record<string, number>, reactionCount: number) => {
    setPosts((prev) => prev.map((post) => {
      // 投稿自体のリアクション更新
      if (post.id === postId) {
        return { ...post, reactions, reactionCount };
      }
      // リポスト元のリアクション更新（シンボリックリンク的な同期）
      if (post.repostedPost && post.repostedPost.id === postId) {
        return {
          ...post,
          repostedPost: { ...post.repostedPost, reactions, reactionCount }
        };
      }
      return post;
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading timeline...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-3xl font-bold mb-6">Timeline</h1>

      {/* フィードタイプ切り替えタブ */}
      {isAuthenticated && (
        <div className="flex border-b border-border">
          <button
            onClick={() => setFeedType("following")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              feedType === "following"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            Following
          </button>
          <button
            onClick={() => setFeedType("all")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              feedType === "all"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="h-4 w-4" />
            All
          </button>
        </div>
      )}

      {isAuthenticated ? (
        <PostForm onPostCreated={loadTimeline} showLongPostButton />
      ) : (
        <div className="rounded-lg border border-dashed border-muted-foreground/50 px-4 py-3 text-sm text-muted-foreground">
          ログインすると投稿やリアクションができます。
        </div>
      )}

      {posts.length === 0 ? (
        <div className="text-center text-muted-foreground mt-8">
          No posts yet. Start following people to see their posts!
        </div>
      ) : (
        <>
          <AnimatePresence initial={false} mode="popLayout">
            {posts.map((post) => (
              <motion.div
                layout
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <PostCard
                  post={post}
                  onReactionsChange={handleReactionsChange}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-4" />

          {/* Loading indicator */}
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          )}

          {/* End of posts indicator */}
          {!hasMore && posts.length > 0 && (
            <div className="text-center text-muted-foreground py-4 text-sm">
              これ以上の投稿はありません
            </div>
          )}
        </>
      )}
    </div>
  );
}
