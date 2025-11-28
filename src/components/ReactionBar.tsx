import { useEffect, useState, lazy, Suspense, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/authStore";

// ReactionPickerを遅延読み込み（18,000行以上の絵文字データを含むため）
const ReactionPicker = lazy(() => import("@/components/ReactionPicker").then(m => ({ default: m.ReactionPicker })));

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// Stable empty object reference for default prop
const EMPTY_REACTIONS: Record<string, number> = {};

type ReactionUser = { id: number; uniqueid: string; name: string; icon: string };

interface ReactionBarProps {
  postId: number;
  reactions?: Record<string, number>;
  reactionCount?: number;
  className?: string;
  onChange?: (
    postId: number,
    reactions: Record<string, number>,
    reactionCount: number
  ) => void;
}

const cleanReactions = (input: Record<string, number>) => {
  const result: Record<string, number> = {};
  for (const [emoji, count] of Object.entries(input)) {
    if (count > 0) {
      result[emoji] = count;
    }
  }
  return result;
};

// カスタム絵文字かどうか判定（URL形式）
const isCustomEmoji = (emoji: string) => emoji.startsWith("http") || emoji.startsWith("/");

// リアクションボタンコンポーネント（ホバーポップオーバー付き）
function ReactionButton({
  postId,
  emoji,
  count,
  onToggle,
}: {
  postId: number;
  emoji: string;
  count: number;
  onToggle: () => void;
}) {
  const [showPopover, setShowPopover] = useState(false);
  const [users, setUsers] = useState<ReactionUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const { user: currentUser } = useAuthStore();

  const loadReactionUsers = useCallback(async () => {
    if (users.length > 0) return; // Already loaded
    setIsLoading(true);
    try {
      const { details } = await api.getReactionDetails(postId, emoji);
      setUsers(details[emoji] || []);
    } catch (error) {
      console.error("Failed to load reaction details:", error);
    } finally {
      setIsLoading(false);
    }
  }, [postId, emoji, users.length]);

  const handleMouseEnter = () => {
    setShowPopover(true);
    loadReactionUsers();
  };

  const handleCopyEmoji = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCopying) return;

    setIsCopying(true);
    try {
      await api.addSavedReaction(emoji);
      alert("絵文字を保存しました！");
    } catch (error) {
      if (error instanceof Error && error.message.includes("Already saved")) {
        alert("この絵文字は既に保存されています");
      } else {
        console.error("Failed to copy emoji:", error);
        alert("絵文字の保存に失敗しました");
      }
    } finally {
      setIsCopying(false);
    }
  };

  const isCustom = isCustomEmoji(emoji);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowPopover(false)}
    >
      <motion.button
        layout
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="flex items-center gap-1 px-2 py-1 bg-muted hover:bg-muted/80 rounded-full transition-colors"
      >
        {isCustom ? (
          <img
            src={emoji.startsWith("/") ? `${BASE_URL}${emoji}` : emoji}
            alt=""
            className="w-4 h-4 object-contain"
          />
        ) : (
          <span>{emoji}</span>
        )}
        <span className="text-muted-foreground">{count}</span>
      </motion.button>

      {/* Hover Popover */}
      <AnimatePresence>
        {showPopover && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 z-50 min-w-[160px] max-w-[240px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-popover dark:bg-zinc-900 border border-border rounded-lg shadow-lg p-2 text-sm">
              {/* ユーザー一覧 */}
              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-1">
                  <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  読み込み中...
                </div>
              ) : users.length > 0 ? (
                <div className="space-y-1 max-h-[120px] overflow-y-auto">
                  {users.slice(0, 5).map((u) => (
                    <div key={u.id} className="flex items-center gap-2 py-0.5">
                      <div className="w-5 h-5 rounded-full bg-muted overflow-hidden flex-shrink-0">
                        {u.icon ? (
                          <img src={`${BASE_URL}${u.icon}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {u.name[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="truncate text-foreground">{u.name}</span>
                    </div>
                  ))}
                  {users.length > 5 && (
                    <div className="text-muted-foreground text-xs py-0.5">
                      他 {users.length - 5} 人
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground py-1">リアクションなし</div>
              )}

              {/* カスタム絵文字の場合、パクるボタンを表示（自分がリアクション済み or 既に保存済みなら非表示） */}
              {isCustom && currentUser && !users.some(u => u.id === currentUser.id) && !currentUser.customEmoji?.some(e => e.emoji === emoji) && (
                <div className="border-t border-border mt-2 pt-2">
                  <button
                    onClick={handleCopyEmoji}
                    disabled={isCopying}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors disabled:opacity-50"
                  >
                    {isCopying ? (
                      <>
                        <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <span>🔖</span>
                        この絵文字をパクる
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ReactionBar({
  postId,
  reactions = EMPTY_REACTIONS,
  reactionCount = 0,
  className,
  onChange,
}: ReactionBarProps) {
  const [localReactions, setLocalReactions] = useState<Record<string, number>>(reactions);
  const [localCount, setLocalCount] = useState(reactionCount);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Track previous props to avoid unnecessary state updates
  const prevPropsRef = useRef({ reactions, reactionCount, postId });

  // Sync local state with props only when they actually change
  useEffect(() => {
    const prev = prevPropsRef.current;
    const reactionsStr = JSON.stringify(reactions);
    const prevReactionsStr = JSON.stringify(prev.reactions);

    // Only update if props actually changed (by value, not reference)
    if (postId !== prev.postId || reactionsStr !== prevReactionsStr || reactionCount !== prev.reactionCount) {
      setLocalReactions(reactions);
      setLocalCount(reactionCount);
      prevPropsRef.current = { reactions, reactionCount, postId };
    }
  }, [reactions, reactionCount, postId]);

  const updateState = (nextReactions: Record<string, number>, nextCount: number) => {
    const cleaned = cleanReactions(nextReactions);
    setLocalReactions(cleaned);
    setLocalCount(nextCount);
    onChange?.(postId, cleaned, nextCount);
  };

  const toggleReaction = async (emoji: string) => {
    const prevReactions = localReactions;
    const prevCount = localCount;

    try {
      // トグルAPI（追加または削除）
      const result = await api.toggleReaction(postId, emoji);
      const draft = { ...localReactions };

      if (result.action === "added") {
        draft[emoji] = (draft[emoji] ?? 0) + 1;
        updateState(draft, localCount + 1);
      } else if (result.action === "removed") {
        draft[emoji] = Math.max(0, (draft[emoji] ?? 0) - 1);
        updateState(draft, Math.max(0, localCount - 1));
      }
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
      updateState(prevReactions, prevCount);
    }
  };

  const hasReactions = Object.keys(localReactions).length > 0;

  return (
    <div
      className={cn("relative flex flex-col items-end gap-2 text-sm text-muted-foreground", className)}
      onClick={(e) => e.stopPropagation()}
    >
      {/* リアクションボタン（常に表示） */}
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            setPickerOpen((prev) => !prev);
          }}
          className="flex items-center gap-1 hover:text-red-500 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
          <span>{localCount}</span>
        </motion.button>
        {pickerOpen && (
          <Suspense fallback={
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:absolute md:bottom-full md:top-auto md:left-auto md:right-0 md:translate-x-0 md:translate-y-0 md:mb-2 rounded-xl shadow-xl border border-border/80 bg-popover dark:bg-zinc-900 p-4 z-50 w-[calc(100vw-2rem)] max-w-md">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                読み込み中...
              </div>
            </div>
          }>
            <ReactionPicker
              onSelect={(emoji) => {
                toggleReaction(emoji);
                setPickerOpen(false);
              }}
              onClose={() => setPickerOpen(false)}
            />
          </Suspense>
        )}
      </div>
      {/* リアクションバッジ（リアクションがある場合のみ表示） */}
      {hasReactions && (
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <AnimatePresence mode="popLayout">
            {Object.entries(localReactions).map(([emoji, count]) => (
              <ReactionButton
                key={`${postId}-${emoji}`}
                postId={postId}
                emoji={emoji}
                count={count}
                onToggle={() => toggleReaction(emoji)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
