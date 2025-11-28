import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BlogEditor } from "@/components/BlogEditor";
import { api } from "@/lib/api";
import type { Post, PostVisibility } from "@/types";

export function BlogEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadPost();
  }, [id]);

  const loadPost = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);
    try {
      const postData = await api.getPost(parseInt(id));

      // ブログ記事でない場合はエラー
      if (!postData.isLong) {
        setError("この投稿はブログ記事ではありません");
        return;
      }

      setPost(postData);
    } catch (error) {
      console.error("Failed to load post:", error);
      setError("投稿の読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (
    title: string,
    content: string,
    isDraft: boolean,
    visibility: PostVisibility
  ) => {
    if (!id) return;

    await api.updatePost(parseInt(id), {
      title,
      content,
      isDraft,
      visibility,
    });

    // 保存後、投稿詳細ページへ遷移
    navigate(`/posts/${post!.user.uniqueid}/${post!.uuid}`);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "投稿が見つかりませんでした"}</p>
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <BlogEditor
      initialTitle={post.title || ""}
      initialContent={post.content}
      initialVisibility={post.visibility || "public"}
      onSave={handleSave}
    />
  );
}
