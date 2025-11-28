import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Post } from "@/types";
import { PostCard } from "@/components/PostCard";

export function BlogListPage() {
  const [blogs, setBlogs] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBlogs();
  }, []);

  const loadBlogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { posts } = await api.getPosts();
      const longPosts = posts.filter((post) => post.isLong && !post.isDraft);
      setBlogs(longPosts);
    } catch (err) {
      console.error("Failed to load blogs:", err);
      setError("ブログ一覧の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-500">
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">ブログ一覧</h1>
          <p className="text-gray-500 text-sm">公開済みの長文ポストのみ表示しています</p>
        </div>
      </div>

      {blogs.length === 0 ? (
        <div className="text-center text-gray-500">公開されたブログはまだありません。</div>
      ) : (
        blogs.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </div>
  );
}
