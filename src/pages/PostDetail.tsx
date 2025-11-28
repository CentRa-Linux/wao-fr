import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { Post } from "@/types";
import { PostCard } from "@/components/PostCard";
import { PostForm } from "@/components/PostForm";
import { BlogRenderer } from "@/components/BlogRenderer";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Edit } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { ReactionBar } from "@/components/ReactionBar";

export function PostDetailPage() {
  const { username, uuid } = useParams<{ username: string; uuid: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username || !uuid) return;
    loadPost();
  }, [username, uuid]);

  // Load replies when post is loaded
  useEffect(() => {
    if (post) {
      loadReplies();
    }
  }, [post?.id]);

  const loadPost = async () => {
    if (!username || !uuid) return;

    setIsLoading(true);
    setError(null);
    try {
      const postData = await api.getPostByUuid(username, uuid);
      setPost(postData);
    } catch (error) {
      console.error("Failed to load post:", error);
      setError("投稿の読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const loadReplies = async () => {
    if (!post) return;

    try {
      const repliesData = await api.getPostReplies(post.id);
      setReplies(repliesData);
    } catch (error) {
      console.error("Failed to load replies:", error);
    }
  };

  const handleReplyCreated = () => {
    loadReplies();
  };

  const handlePrimaryReactionsChange = (
    postId: number,
    reactions: Record<string, number>,
    reactionCount: number
  ) => {
    setPost((prev) => (prev && prev.id === postId ? { ...prev, reactions, reactionCount } : prev));
  };

  const handleReplyReactionsChange = (
    postId: number,
    reactions: Record<string, number>,
    reactionCount: number
  ) => {
    setReplies((prev) => prev.map((reply) =>
      reply.id === postId ? { ...reply, reactions, reactionCount } : reply
    ));
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          戻る
        </button>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">{error || "投稿が見つかりませんでした"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header with back button and edit button */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          戻る
        </button>

        {/* Edit button - only show for blog posts by the author */}
        {post.isLong && user && post.userid === user.id && (
          <button
            onClick={() => navigate(`/blog/edit/${post.id}`)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-4 h-4" />
            編集
          </button>
        )}
      </div>

      {/* Original post */}
      <div className="mb-6">
        {post.isLong ? (
          <div className="space-y-4">
            <BlogRenderer post={post} />
            <ReactionBar
              postId={post.id}
              reactions={post.reactions}
              reactionCount={post.reactionCount}
              onChange={(postId, reactions, count) =>
                handlePrimaryReactionsChange(postId, reactions, count)
              }
            />
          </div>
        ) : (
          <PostCard
            post={post}
            onReactionsChange={(postId, reactions, count) =>
              handlePrimaryReactionsChange(postId, reactions, count)
            }
          />
        )}
      </div>

      {/* Reply form */}
      <section className="mb-6">
        <PostForm
          replyToPostId={post.id}
          onPostCreated={handleReplyCreated}
          placeholder="返信を投稿"
        />
      </section>

      {/* Replies */}
      <div className="space-y-4">
        {replies.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">まだ返信がありません</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-gray-900">
              返信 ({replies.length})
            </h2>
            {replies.map((reply) => (
              <PostCard
                key={reply.id}
                post={reply}
                onReactionsChange={handleReplyReactionsChange}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
