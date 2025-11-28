import { useNavigate, useSearchParams } from "react-router-dom";
import { BlogEditor } from "@/components/BlogEditor";
import { api } from "@/lib/api";
import type { PostVisibility } from "@/types";

export function BlogCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const communityUuid = searchParams.get("community") || undefined;

  const handleSave = async (
    title: string,
    content: string,
    isDraft: boolean,
    visibility: PostVisibility
  ) => {
    const post = await api.createPost({
      title,
      content,
      isLong: true,
      isDraft,
      visibility: communityUuid ? "community" : visibility,
      communityUuid,
    });

    // 保存後、投稿詳細ページへ遷移（コミュニティの場合はコミュニティページへ）
    if (communityUuid) {
      navigate(`/communities/${communityUuid}`);
    } else {
      navigate(`/posts/${post.user.uniqueid}/${post.uuid}`);
    }
  };

  return <BlogEditor onSave={handleSave} communityUuid={communityUuid} />;
}
