import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import type { User, Post } from "@/types";
import { PostCard } from "@/components/PostCard";
import { useAuthStore } from "@/stores/authStore";
import { Lock } from "lucide-react";

type ProfileTab = "posts" | "articles" | "media" | "likes";
type PostWithReactedAt = Post & { reactedAt?: number };

export function ProfilePage() {
  const { uniqueid } = useParams<{ uniqueid: string }>();
  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [likes, setLikes] = useState<PostWithReactedAt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followRequestPending, setFollowRequestPending] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [isFollowUpdating, setIsFollowUpdating] = useState(false);

  // Pagination state
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [hasMoreLikes, setHasMoreLikes] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!uniqueid) return;
    loadProfile();
  }, [uniqueid]);

  const isPrivateError = (error: unknown) =>
    error instanceof Error && error.message.toLowerCase().includes("private");

  const loadProfile = async (withSpinner = true) => {
    if (!uniqueid) return;

    if (withSpinner) {
      setIsLoading(true);
    }
    try {
      const userData = await api.getUser(uniqueid);
      setUser(userData);
      setIsFollowing(userData.isFollowing ?? false);
      setFollowRequestPending(userData.followRequestPending ?? false);
      setIsRestricted(false);

      try {
        const { posts: userPosts, hasMore } = await api.getUserPosts(uniqueid, { limit: 20 });
        setPosts(userPosts);
        setHasMorePosts(hasMore);
        setIsRestricted(false);
      } catch (postError) {
        setPosts([]);
        setHasMorePosts(false);
        if (isPrivateError(postError)) {
          setIsRestricted(true);
        } else {
          console.error("Failed to load posts:", postError);
        }
      }

      try {
        const { posts: likedPosts, hasMore } = await api.getUserLikes(uniqueid, { limit: 20 });
        setLikes(likedPosts);
        setHasMoreLikes(hasMore);
      } catch (likeError) {
        setLikes([]);
        setHasMoreLikes(false);
        if (isPrivateError(likeError)) {
          setIsRestricted(true);
        } else {
          console.error("Failed to load likes:", likeError);
        }
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!uniqueid) return;

    try {
      setIsFollowUpdating(true);
      if (isFollowing || followRequestPending) {
        await api.unfollowUser(uniqueid);
      } else {
        await api.followUser(uniqueid);
      }
      await loadProfile(false);
    } catch (error) {
      console.error("Failed to follow/unfollow:", error);
      alert("フォロー操作に失敗しました");
    } finally {
      setIsFollowUpdating(false);
    }
  };

  const handleReactionsChange = (
    postId: number,
    reactions: Record<string, number>,
    reactionCount: number
  ) => {
    setPosts((prev) => prev.map((post) =>
      post.id === postId ? { ...post, reactions, reactionCount } : post
    ));
  };

  // Load more posts for infinite scroll
  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMorePosts || posts.length === 0 || !uniqueid) return;

    const lastPost = posts[posts.length - 1];
    if (!lastPost) return;

    setIsLoadingMore(true);
    try {
      const { posts: morePosts, hasMore } = await api.getUserPosts(uniqueid, {
        before: lastPost.createdAt,
        limit: 20,
      });
      setPosts((prev) => [...prev, ...morePosts]);
      setHasMorePosts(hasMore);
    } catch (error) {
      console.error("Failed to load more posts:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMorePosts, posts, uniqueid]);

  // Load more likes for infinite scroll
  const loadMoreLikes = useCallback(async () => {
    if (isLoadingMore || !hasMoreLikes || likes.length === 0 || !uniqueid) return;

    const lastLike = likes[likes.length - 1];
    if (!lastLike?.reactedAt) return;

    setIsLoadingMore(true);
    try {
      const { posts: moreLikes, hasMore } = await api.getUserLikes(uniqueid, {
        before: lastLike.reactedAt,
        limit: 20,
      });
      setLikes((prev) => [...prev, ...moreLikes]);
      setHasMoreLikes(hasMore);
    } catch (error) {
      console.error("Failed to load more likes:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreLikes, likes, uniqueid]);

  // Determine which loadMore function to use based on active tab
  const currentHasMore = activeTab === "likes" ? hasMoreLikes : hasMorePosts;
  const loadMore = activeTab === "likes" ? loadMoreLikes : loadMorePosts;

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && currentHasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { rootMargin: "100px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [currentHasMore, isLoadingMore, loadMore]);

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
  const isOwnProfile = currentUser?.uniqueid === uniqueid;
  const canMessage = !!currentUser && !isOwnProfile && (user?.dmEnabled ?? true);
  const followButtonLabel = followRequestPending
    ? "申請を取り消す"
    : isFollowing
      ? "フォロー中"
      : "フォロー";
  const followButtonClass = followRequestPending
    ? "bg-amber-500 text-white hover:bg-amber-600"
    : isFollowing
      ? "bg-muted text-foreground hover:bg-muted/80"
      : "bg-blue-600 text-white hover:bg-blue-700";

  const tabMetrics = useMemo(() => {
    const mainPosts = posts.filter((post) => post.postType !== "reply");
    const articles = posts.filter((post) => post.isLong);
    const media = posts.filter((post) => post.attachedMedia.length > 0 || post.embeddedMedia.length > 0);
    return {
      posts: mainPosts,
      articles,
      media,
    };
  }, [posts]);

  const filteredPosts = useMemo(() => {
    switch (activeTab) {
      case "articles":
        return tabMetrics.articles;
      case "media":
        return tabMetrics.media;
      case "likes":
        return likes;
      case "posts":
      default:
        return tabMetrics.posts;
    }
  }, [activeTab, likes, tabMetrics]);

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: "posts", label: "投稿" },
    { id: "articles", label: "記事" },
    { id: "media", label: "メディア" },
    { id: "likes", label: "リアクション" }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">User not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header Image */}
      <div className="relative">
        <div
          className="h-48 bg-gradient-to-r from-blue-400 to-purple-500"
          style={
            user.header
              ? { backgroundImage: `url(${BASE_URL}${user.header})`, backgroundSize: "cover" }
              : undefined
          }
        />

        {/* Profile Image */}
        <div className="absolute -bottom-16 left-4">
          <div className="w-32 h-32 rounded-full border-4 border-white bg-blue-500 flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
            {user.icon ? (
              <img src={`${BASE_URL}${user.icon}`} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user.name[0]?.toUpperCase() || "U"
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="pt-20 px-4 pb-4">
        <div className="flex justify-end mb-4 gap-2">
          {canMessage && (
            <button
              onClick={() => navigate(`/messages/${user.uniqueid}`)}
              className="px-4 py-2 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              メッセージ
            </button>
          )}
          {currentUser && !isOwnProfile && (
            <button
              onClick={handleFollow}
              disabled={isFollowUpdating}
              className={`px-4 py-2 rounded-full font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${followButtonClass}`}
            >
              {followButtonLabel}
            </button>
          )}
        </div>
        {currentUser && !isOwnProfile && followRequestPending && (
          <p className="text-right text-sm text-muted-foreground mb-2">
            フォロー申請は承認待ちです（クリックで取り消しできます）。
          </p>
        )}

        <h1 className="text-2xl font-bold">{user.name}</h1>
        <p className="text-muted-foreground">@{user.uniqueid}</p>

        {user.isPrivate && (
          <div className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />
            非公開アカウント
          </div>
        )}

        {user.bio && <p className="mt-3 text-foreground">{user.bio}</p>}

        <div className="flex gap-4 mt-4 text-sm">
          <div>
            <span className="font-bold">{user.following}</span>{" "}
            <span className="text-muted-foreground">フォロー中</span>
          </div>
          <div>
            <span className="font-bold">{user.followers}</span>{" "}
            <span className="text-muted-foreground">フォロワー</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className="p-4 space-y-4">
        {isRestricted ? (
          <div className="text-center text-muted-foreground mt-8">
            このアカウントは非公開です。フォローが承認されると投稿を閲覧できます。
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center text-muted-foreground mt-8">
            {activeTab === "likes" ? "まだリアクションした投稿はありません" : "まだ投稿がありません"}
          </div>
        ) : (
          <>
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onReactionsChange={handleReactionsChange}
              />
            ))}

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="h-4" />

            {/* Loading indicator */}
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* End of posts indicator */}
            {!currentHasMore && filteredPosts.length > 0 && (
              <div className="text-center text-muted-foreground py-4 text-sm">
                これ以上の投稿はありません
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
