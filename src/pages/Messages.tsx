import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import type { DMConversation, DirectMessageUpdate } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { useSSE } from "@/hooks/useSSE";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export function MessagesPage() {
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const sortConversations = (items: DMConversation[]) =>
    [...items].sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);

  useEffect(() => {
    const loadInbox = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { conversations } = await api.getDMInbox();
        setConversations(sortConversations(conversations));
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "DMを読み込めませんでした");
      } finally {
        setIsLoading(false);
      }
    };

    loadInbox();
  }, []);

  const handleRealtimeUpdates = (updates: DirectMessageUpdate[]) => {
    if (!updates.length || !user) return;

    setConversations((prev) => {
      const map = new Map<number, DMConversation>();
      prev.forEach((conversation) => {
        map.set(conversation.user.id, conversation);
      });

      updates.forEach(({ message, partner }) => {
        const existing = map.get(partner.id);
        const unreadDelta = message.receiverId === user.id ? 1 : 0;
        const nextUnread =
          unreadDelta > 0
            ? (existing?.unreadCount ?? 0) + unreadDelta
            : existing?.unreadCount ?? 0;

        map.set(partner.id, {
          user: partner,
          lastMessage: message,
          unreadCount: nextUnread,
        });
      });

      return sortConversations(Array.from(map.values()));
    });
  };

  useSSE({
    enabled: Boolean(user),
    onDirectMessageUpdate: handleRealtimeUpdates,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">メッセージ</h1>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md mb-4">
          {error}
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-muted/30 rounded-lg border border-dashed border-border">
          まだメッセージはありません
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => {
            const lastMessage = conversation.lastMessage;
            return (
              <Link
                key={conversation.user.id}
                to={`/messages/${conversation.user.uniqueid}`}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-card/80 transition-colors"
              >
                <div className="w-14 h-14 rounded-full overflow-hidden bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                  {conversation.user.icon ? (
                    <img
                      src={`${BASE_URL}${conversation.user.icon}`}
                      alt={conversation.user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    conversation.user.name[0]?.toUpperCase() || "U"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-foreground truncate">{conversation.user.name}</div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(lastMessage.createdAt * 1000), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {lastMessage.content}
                  </div>
                </div>
                {conversation.unreadCount > 0 && (
                  <span className="px-2 py-1 text-xs rounded-full bg-primary text-primary-foreground">
                    {conversation.unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
