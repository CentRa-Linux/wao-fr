import { Link, useNavigate } from "react-router-dom";
import type { Post } from "@/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

interface QuotedPostProps {
  post: Post;
}

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export function QuotedPost({ post }: QuotedPostProps) {
  const navigate = useNavigate();
  const avatarSrc = post.user?.icon ? `${BASE_URL}${post.user.icon}` : undefined;

  // Truncate long content
  const maxLength = 200;
  const truncatedContent = post.content.length > maxLength
    ? post.content.slice(0, maxLength) + "..."
    : post.content;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.user?.uniqueid && post.uuid) {
      navigate(`/posts/${post.user.uniqueid}/${post.uuid}`);
    }
  };

  if (!post.user) {
    return (
      <div className="border border-border rounded-lg p-3 bg-muted/30 text-muted-foreground text-sm">
        元の投稿が見つかりません
      </div>
    );
  }

  return (
    <div
      className="border border-border rounded-lg p-3 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      {/* Author info */}
      <div className="flex items-center gap-2 mb-2">
        <Avatar className="w-5 h-5">
          {avatarSrc ? (
            <AvatarImage src={avatarSrc} alt={post.user.name} />
          ) : null}
          <AvatarFallback className="text-xs">
            {post.user.name?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <Link
          to={`/profile/${post.user.uniqueid}`}
          className="font-medium text-sm hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {post.user.name}
        </Link>
        <span className="text-muted-foreground text-xs">
          @{post.user.uniqueid}
        </span>
        <span className="text-muted-foreground text-xs ml-auto">
          {format(new Date(post.createdAt * 1000), "MMM d")}
        </span>
      </div>

      {/* Content */}
      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
        {truncatedContent}
      </p>

      {/* Media preview (if any) */}
      {post.attachedMedia && post.attachedMedia.length > 0 && (
        <div className="mt-2 flex gap-1 overflow-hidden rounded">
          {post.attachedMedia.slice(0, 2).map((media) => (
            <img
              key={media.id}
              src={`${BASE_URL}${media.url}`}
              alt={media.altText || ""}
              className="h-16 w-auto object-cover rounded"
            />
          ))}
          {post.attachedMedia.length > 2 && (
            <div className="h-16 w-16 bg-muted flex items-center justify-center rounded text-muted-foreground text-xs">
              +{post.attachedMedia.length - 2}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
