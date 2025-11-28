import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { Notification } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, UserPlus, AtSign, Quote, CheckCheck, Users, Repeat2 } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [filter]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const result = await api.getNotifications(filter === "unread", 50);
      setNotifications(result.notifications);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const result = await api.getUnreadCount();
      setUnreadCount(result.count);
    } catch (error) {
      console.error("Failed to load unread count:", error);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      ));
      loadUnreadCount();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === "community_invite") {
      navigate("/communities/invites");
    } else if (notification.post) {
      navigate(`/posts/${notification.post.user.uniqueid}/${notification.post.uuid}`);
    } else if (
      (notification.type === "follow" || notification.type === "follow_request") &&
      notification.actor
    ) {
      navigate(`/profile/${notification.actor.uniqueid}`);
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "reaction":
        return <Heart className="w-5 h-5 text-red-500" />;
      case "reply":
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case "follow":
        return <UserPlus className="w-5 h-5 text-green-500" />;
      case "follow_request":
        return <UserPlus className="w-5 h-5 text-amber-500" />;
      case "mention":
        return <AtSign className="w-5 h-5 text-purple-500" />;
      case "quote":
        return <Quote className="w-5 h-5 text-orange-500" />;
      case "repost":
        return <Repeat2 className="w-5 h-5 text-green-500" />;
      case "community_invite":
        return <Users className="w-5 h-5 text-indigo-500" />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    const actorName = notification.actor?.name || "Someone";

    switch (notification.type) {
      case "reaction":
        return `${actorName} があなたの投稿に ${notification.emoji} でリアクションしました`;
      case "reply":
        return `${actorName} があなたの投稿に返信しました`;
      case "follow":
        return `${actorName} があなたをフォローしました`;
      case "follow_request":
        return `${actorName} がフォローリクエストを送りました`;
      case "mention":
        return `${actorName} があなたをメンションしました`;
      case "quote":
        return `${actorName} があなたの投稿を引用しました`;
      case "repost":
        return `${actorName} があなたの投稿をリポストしました`;
      case "community_invite":
        return `${actorName} からコミュニティへの招待が届きました`;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">通知</h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <CheckCheck className="w-4 h-4" />
            すべて既読にする
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 border-b-2 transition-colors ${
            filter === "all"
              ? "border-blue-600 text-blue-600 font-medium"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          すべて
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-4 py-2 border-b-2 transition-colors ${
            filter === "unread"
              ? "border-blue-600 text-blue-600 font-medium"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          未読
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications list */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">読み込み中...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {filter === "unread" ? "未読の通知はありません" : "通知はありません"}
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`cursor-pointer btn-hover transition-colors ${
                !notification.isRead ? "bg-primary/5" : ""
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Avatar */}
                  {notification.actor && (
                    <Avatar className="w-10 h-10">
                      {notification.actor.icon ? (
                        <AvatarImage
                          src={`${BASE_URL}${notification.actor.icon}`}
                          alt={notification.actor.name}
                        />
                      ) : (
                        <AvatarFallback>
                          {notification.actor.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      {getNotificationText(notification)}
                    </p>
                    {notification.post && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.post.content}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt * 1000), {
                        addSuffix: true,
                        locale: ja,
                      })}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {!notification.isRead && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
