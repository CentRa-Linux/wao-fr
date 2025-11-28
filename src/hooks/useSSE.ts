import { useEffect, useRef, useCallback } from "react";
import type { Post, DirectMessage, User } from "@/types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface UseSSEOptions {
  onTimelineUpdate?: (post: Post) => void;
  onNotification?: (notification: any) => void;
  onConnect?: () => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
  onReactionUpdate?: (payload: {
    postId: number;
    reactions: Record<string, number>;
    reactionCount: number;
  }) => void;
  onDirectMessageUpdate?: (updates: Array<{ message: DirectMessage; partner: User }>) => void;
}

export const useSSE = (options: UseSSEOptions = {}) => {
  const {
    onTimelineUpdate,
    onNotification,
    onConnect,
    onError,
    enabled = true,
    onReactionUpdate,
    onDirectMessageUpdate,
  } = options;

  const eventSourceRef = useRef<EventSource | null>(null);

  // コールバックをrefに保存して、再接続を防ぐ
  const callbacksRef = useRef({
    onTimelineUpdate,
    onNotification,
    onConnect,
    onError,
    onReactionUpdate,
    onDirectMessageUpdate,
  });

  // 毎レンダリングでrefを更新（再接続なしで最新のコールバックを使用）
  useEffect(() => {
    callbacksRef.current = {
      onTimelineUpdate,
      onNotification,
      onConnect,
      onError,
      onReactionUpdate,
      onDirectMessageUpdate,
    };
  });

  const connect = useCallback(() => {
    const token = localStorage.getItem("accessToken");

    if (!token || !enabled) {
      return;
    }

    // 既存の接続がある場合はクローズ
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // クエリパラメータでトークンを渡す
    const eventSource = new EventSource(`${BASE_URL}/api/events?token=${token}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("SSE connection established");
      callbacksRef.current.onConnect?.();
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      callbacksRef.current.onError?.(error);
    };

    // keep-aliveメッセージの処理
    eventSource.onmessage = (event) => {
      if (event.data === ": keep-alive") {
        // keep-aliveメッセージは無視
        return;
      }
    };

    // タイムライン更新イベント
    eventSource.addEventListener("timeline", (event: MessageEvent) => {
      try {
        const post = JSON.parse(event.data) as Post;
        callbacksRef.current.onTimelineUpdate?.(post);
      } catch (error) {
        console.error("Failed to parse timeline event:", error);
      }
    });

    // 通知イベント
    eventSource.addEventListener("notification", (event: MessageEvent) => {
      try {
        const notification = JSON.parse(event.data);
        callbacksRef.current.onNotification?.(notification);
      } catch (error) {
        console.error("Failed to parse notification event:", error);
      }
    });

    // その他のイベントタイプも追加可能
    eventSource.addEventListener("follow", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log("New follower:", data);
      } catch (error) {
        console.error("Failed to parse follow event:", error);
      }
    });

    eventSource.addEventListener("reaction", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        callbacksRef.current.onReactionUpdate?.(data);
      } catch (error) {
        console.error("Failed to parse reaction event:", error);
      }
    });
    eventSource.addEventListener("dm", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (import.meta.env.DEV) {
          console.debug("[SSE] dm", data);
        }
        callbacksRef.current.onDirectMessageUpdate?.(data.updates || []);
      } catch (error) {
        console.error("Failed to parse dm event:", error);
      }
    });
  }, [enabled]); // enabledのみ依存（コールバックはrefで管理）

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log("Closing SSE connection");
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();

    // クリーンアップ
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connect,
    disconnect,
    isConnected: eventSourceRef.current !== null,
  };
};
