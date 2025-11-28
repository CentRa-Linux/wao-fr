import { useEffect, useState, useMemo, useRef, lazy, Suspense } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { api } from "@/lib/api";
import type { DirectMessage, User } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { useSSE } from "@/hooks/useSSE";

// ReactionPickerを遅延読み込み（18,000行以上の絵文字データを含むため）
const ReactionPicker = lazy(() => import("@/components/ReactionPicker").then(m => ({ default: m.ReactionPicker })));

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export function MessageThreadPage() {
  const { uniqueid } = useParams<{ uniqueid: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [partner, setPartner] = useState<User | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = useMemo(() => {
    if (!partner) return false;
    return partner.dmEnabled !== false;
  }, [partner]);

  const loadThread = async (showSpinner = true) => {
    if (!uniqueid) return;
    if (showSpinner) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await api.getDMThread(uniqueid);
      setPartner(data.user);
      setMessages(data.messages);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "メッセージを取得できませんでした");
    } finally {
      if (showSpinner) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadThread();
  }, [uniqueid]);

  const appendMessage = (message: DirectMessage) => {
    setMessages((prev) => {
      if (prev.some((existing) => existing.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
  };

  const handleSend = async () => {
    if (!uniqueid) return;
    if (!content.trim()) {
      return;
    }

    setIsSending(true);
    try {
      const message = await api.sendDM(uniqueid, content.trim());
      appendMessage(message);
      setContent("");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "メッセージを送信できませんでした");
    } finally {
      setIsSending(false);
    }
  };

  const insertEmojiAtCursor = (emoji: string) => {
    const textarea = textareaRef.current;
    setContent((prev) => {
      const selectionStart = textarea?.selectionStart ?? prev.length;
      const selectionEnd = textarea?.selectionEnd ?? prev.length;
      const nextValue =
        prev.slice(0, selectionStart) + emoji + prev.slice(selectionEnd);
      requestAnimationFrame(() => {
        if (textarea) {
          const caret = selectionStart + emoji.length;
          textarea.selectionStart = caret;
          textarea.selectionEnd = caret;
          textarea.focus();
        }
      });
      return nextValue;
    });
  };

  useSSE({
    enabled: Boolean(user && partner),
    onDirectMessageUpdate: (updates) => {
      if (!partner || !user) return;
      updates.forEach(({ message }) => {
        const otherParty = message.senderId === user.id ? message.receiverId : message.senderId;
        if (otherParty === partner.id) {
          appendMessage(message);
        }
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 戻る
        </button>
        <div className="p-4 rounded-md bg-destructive/10 text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!partner) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 戻る
        </button>
        <Link
          to={`/profile/${partner.uniqueid}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center font-semibold">
            {partner.icon ? (
              <img src={`${BASE_URL}${partner.icon}`} className="w-full h-full object-cover" alt={partner.name} />
            ) : (
              partner.name[0]?.toUpperCase() || "U"
            )}
          </div>
          <div>
            <div className="font-semibold text-foreground">{partner.name}</div>
            <div className="text-xs text-muted-foreground">@{partner.uniqueid}</div>
          </div>
        </Link>
      </div>

      <div className="space-y-3 bg-card border border-border rounded-2xl p-4 min-h-[50vh]">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">まだメッセージはありません</div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  data-testid="dm-message"
                  data-owner={isOwn ? "me" : "partner"}
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm border ${
                    isOwn
                      ? "bg-primary text-primary-foreground border-primary/40"
                      : "bg-muted text-foreground border-border"
                  } shadow-sm`}
                >
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  <div
                    className={`text-[10px] mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                  >
                    {format(new Date(message.createdAt * 1000), "MM/dd HH:mm")}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {partner.dmEnabled === false && (
        <div className="p-3 text-sm rounded-md bg-amber-100 text-amber-900">
          このユーザーは現在DMを受け付けていません。
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            disabled={!canSend || isSending}
            placeholder={canSend ? "メッセージを入力..." : "このユーザーにはDMを送信できません"}
            className="w-full resize-none border border-border rounded-xl px-3 py-2 pr-16 bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted/40"
          />
          <div className="absolute bottom-2 right-4 flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setEmojiPickerOpen((prev) => !prev)}
                disabled={!canSend || isSending}
                className="p-2 text-xl rounded-full hover:bg-muted disabled:opacity-50"
              >
                😊
              </button>
              {emojiPickerOpen && (
                <Suspense fallback={
                  <div className="absolute bottom-full left-0 mb-2 rounded-xl shadow-xl border border-border/80 bg-popover p-4 z-50 min-w-[320px]">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      読み込み中...
                    </div>
                  </div>
                }>
                  <ReactionPicker
                    onSelect={(emoji) => {
                      insertEmojiAtCursor(emoji);
                      setEmojiPickerOpen(false);
                    }}
                    onClose={() => setEmojiPickerOpen(false)}
                  />
                </Suspense>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={handleSend}
          disabled={!canSend || isSending || content.trim().length === 0}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-50"
        >
          送信
        </button>
      </div>
    </div>
  );
}
