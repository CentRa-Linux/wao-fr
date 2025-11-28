import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { Community, Post } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { PostCard } from "@/components/PostCard";
import { PostForm } from "@/components/PostForm";
import {
  Users,
  Settings,
  Lock,
  Globe,
  UserPlus,
  LogOut,
  Crown,
  Shield,
} from "lucide-react";

export function CommunityDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const { user } = useAuthStore();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const fetchCommunity = useCallback(async () => {
    if (!uuid) return;
    try {
      const data = await api.getCommunity(uuid);
      setCommunity(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load community");
    }
  }, [uuid]);

  const fetchPosts = useCallback(async () => {
    if (!uuid || !community?.isMember) return;
    try {
      const result = await api.getCommunityPosts(uuid, { limit: 20 });
      setPosts(result.posts);
      setHasMore(result.hasMore);
    } catch {
      // Silently fail if not a member
    }
  }, [uuid, community?.isMember]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchCommunity();
      setIsLoading(false);
    };
    load();
  }, [fetchCommunity]);

  useEffect(() => {
    if (community?.isMember) {
      fetchPosts();
    }
  }, [community?.isMember, fetchPosts]);

  const loadMore = useCallback(async () => {
    if (!uuid || isLoadingMore || !hasMore || posts.length === 0) return;
    setIsLoadingMore(true);
    try {
      const lastPost = posts[posts.length - 1];
      const result = await api.getCommunityPosts(uuid, {
        before: lastPost.createdAt,
        limit: 20,
      });
      setPosts((prev) => [...prev, ...result.posts]);
      setHasMore(result.hasMore);
    } finally {
      setIsLoadingMore(false);
    }
  }, [uuid, isLoadingMore, hasMore, posts]);

  const handleJoin = async () => {
    if (!uuid) return;
    setIsJoining(true);
    try {
      await api.joinCommunity(uuid);
      await fetchCommunity();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join community");
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!uuid || !confirm("Are you sure you want to leave this community?")) return;
    setIsLeaving(true);
    try {
      await api.leaveCommunity(uuid);
      await fetchCommunity();
      setPosts([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave community");
    } finally {
      setIsLeaving(false);
    }
  };

  const handleNewPost = useCallback((post?: Post) => {
    if (post) {
      setPosts((prev) => [post, ...prev]);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center py-12 text-destructive">
          {error || "Community not found"}
        </div>
      </div>
    );
  }

  const canManage = community.myRole === "owner" || community.myRole === "admin";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start gap-4">
          {community.icon ? (
            <img
              src={community.icon}
              alt={community.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold truncate">{community.name}</h1>
              <span title={community.isPublic ? "Public" : "Invite only"}>
                {community.isPublic ? (
                  <Globe className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                )}
              </span>
            </div>
            {community.description && (
              <p className="text-muted-foreground mt-1">{community.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <Link
                to={`/communities/${uuid}/members`}
                className="hover:text-foreground transition-colors"
              >
                {community.memberCount} members
              </Link>
              {community.myRole && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                  {community.myRole === "owner" && <Crown className="w-3 h-3" />}
                  {community.myRole === "admin" && <Shield className="w-3 h-3" />}
                  {community.myRole}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {!user ? (
            <Link
              to="/signin"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90"
            >
              Sign in to join
            </Link>
          ) : !community.isMember ? (
            community.isPublic ? (
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50"
              >
                {isJoining ? (
                  <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Join Community
              </button>
            ) : (
              <div className="text-sm text-muted-foreground">
                This community is invite-only
              </div>
            )
          ) : (
            <>
              {community.myRole !== "owner" && (
                <button
                  onClick={handleLeave}
                  disabled={isLeaving}
                  className="flex items-center gap-2 px-4 py-2 border border-border rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {isLeaving ? (
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  Leave
                </button>
              )}
              {canManage && (
                <Link
                  to={`/communities/${uuid}/settings`}
                  className="flex items-center gap-2 px-4 py-2 border border-border rounded-full hover:bg-muted transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {community.isMember ? (
        <div>
          {/* Post Form */}
          <PostForm
            communityUuid={community.uuid}
            onPostCreated={handleNewPost}
            placeholder="Share something with the community..."
            showLongPostButton={true}
          />

          {/* Posts */}
          {posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No posts yet. Be the first to post!
            </div>
          ) : (
            <div className="divide-y divide-border">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="p-4 text-center">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="px-6 py-2 border border-border rounded-full hover:bg-muted transition-colors disabled:opacity-50"
              >
                {isLoadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Lock className="w-12 h-12 mx-auto mb-4" />
          <p>Join this community to see posts</p>
        </div>
      )}
    </div>
  );
}

export default CommunityDetailPage;
