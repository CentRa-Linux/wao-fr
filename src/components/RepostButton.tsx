import { useState, useEffect } from "react";
import { Repeat2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import type { Post } from "@/types";

interface RepostButtonProps {
  post: Post;
  onRepost?: (newPost: Post) => void;
  onUnrepost?: () => void;
  onQuoteClick?: () => void;
  isReposted?: boolean;
  disabled?: boolean;
}

export function RepostButton({
  post,
  onRepost,
  onUnrepost,
  onQuoteClick,
  isReposted = false,
  disabled = false,
}: RepostButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localIsReposted, setLocalIsReposted] = useState(isReposted);

  // Sync with prop when it changes
  useEffect(() => {
    setLocalIsReposted(isReposted);
  }, [isReposted]);

  const handleRepost = async () => {
    if (isSubmitting || disabled) return;

    setIsSubmitting(true);
    try {
      if (localIsReposted) {
        // unrepost - delete the repost
        await api.unrepost(post.id);
        setLocalIsReposted(false);
        onUnrepost?.();
      } else {
        // repost
        const newPost = await api.repost(post.id);
        setLocalIsReposted(true);
        onRepost?.(newPost);
      }
    } catch (error) {
      console.error("Repost action failed:", error);
      alert(localIsReposted ? "リポストの取り消しに失敗しました" : "リポストに失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuote = () => {
    onQuoteClick?.();
  };

  // Don't show repost button for own reposts (can't repost your own repost)
  const canRepost = !(post.postType === "repost" && post.user.id === post.userid);

  if (!canRepost) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled || isSubmitting}>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center gap-1 transition-colors ${
            localIsReposted
              ? "text-green-500 hover:text-green-600"
              : "hover:text-green-500"
          } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
          title="リポスト"
          onClick={(e) => e.stopPropagation()}
        >
          <Repeat2 className="w-4 h-4" />
          <span>{post.repostCount ?? 0}</span>
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={handleRepost} disabled={isSubmitting}>
          <Repeat2 className="w-4 h-4 mr-2" />
          {localIsReposted ? "リポストを取り消す" : "リポスト"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleQuote}>
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21" />
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
          </svg>
          引用リポスト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
