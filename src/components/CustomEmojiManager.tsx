import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { api } from "@/lib/api";
import type { SavedReaction } from "@/types";
import { formatShortcodeForSave, sanitizeShortcodeInput } from "@/lib/emojiHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const isImageLikeEmoji = (value: string) =>
  value.startsWith("http") || value.startsWith("/") || value.startsWith("data:");

const isBlobUrl = (value: string) => value.startsWith("blob:");

const formatSavedReactionDate = (value?: number) => {
  if (!value) return "-";
  const ms = value > 1_000_000_000_000 ? value : value * 1000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export function CustomEmojiManager() {
  const [savedReactions, setSavedReactions] = useState<SavedReaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmoji, setNewEmoji] = useState("");
  const [newShortcode, setNewShortcode] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingEmoji, setRemovingEmoji] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSavedReactions = async () => {
    setLoading(true);
    try {
      const { reactions } = await api.getSavedReactions();
      setSavedReactions(reactions);
    } catch (error) {
      console.error("Failed to load saved reactions:", error);
      alert("カスタム絵文字の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadSavedReactions();
  }, []);

  const resetForm = () => {
    setNewEmoji("");
    setNewShortcode("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("画像ファイルのみアップロード可能です");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const { url } = await api.uploadMedia(file, true, newShortcode || file.name);
      setNewEmoji(url);
    } catch (error) {
      console.error("Failed to upload custom emoji:", error);
      alert("カスタム絵文字のアップロードに失敗しました");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleAddReaction = async () => {
    if (!newEmoji.trim()) return;
    setIsSubmitting(true);
    try {
      const formattedShortcode = formatShortcodeForSave(newShortcode);
      await api.addSavedReaction(newEmoji.trim(), formattedShortcode || undefined);
      resetForm();
      await loadSavedReactions();
    } catch (error) {
      console.error("Failed to add custom emoji:", error);
      alert("カスタム絵文字の追加に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveReaction = async (emoji: string) => {
    if (!window.confirm("このカスタム絵文字を削除しますか？")) return;
    setRemovingEmoji(emoji);
    try {
      await api.removeSavedReaction(emoji);
      await loadSavedReactions();
    } catch (error) {
      console.error("Failed to remove custom emoji:", error);
      alert("カスタム絵文字の削除に失敗しました");
    } finally {
      setRemovingEmoji(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>カスタム絵文字管理</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            保存済みのリアクション絵文字を管理し、ショートコードを設定できます。
          </p>
        </div>
        <button
          type="button"
          onClick={loadSavedReactions}
          className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "更新中…" : "最新の状態を取得"}
        </button>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            登録済み ({savedReactions.length})
          </h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : savedReactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだカスタム絵文字は登録されていません。</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {savedReactions.map((reaction) => {
                const imagePreviewAvailable =
                  isImageLikeEmoji(reaction.emoji) && !isBlobUrl(reaction.emoji);
                return (
                  <div
                    key={reaction.id}
                    className="flex items-center justify-between rounded border px-3 py-2 bg-card"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 flex items-center justify-center rounded border bg-muted overflow-hidden">
                        {imagePreviewAvailable ? (
                          <img
                            src={
                              reaction.emoji.startsWith("/")
                                ? `${BASE_URL}${reaction.emoji}`
                                : reaction.emoji
                            }
                            alt={reaction.shortcode || reaction.emoji}
                            className="w-full h-full object-contain"
                          />
                        ) : isBlobUrl(reaction.emoji) ? (
                          <span className="text-[10px] text-muted-foreground/70 text-center leading-tight px-1">
                            BLOB
                            <br />
                            埋込済み
                          </span>
                        ) : (
                          <span className="text-2xl">{reaction.emoji}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <span className="truncate">
                            {reaction.shortcode || "ショートコード未設定"}
                          </span>
                          <span className="text-[11px] text-muted-foreground/70">#{reaction.id}</span>
                        </div>
                        <p className="text-xs text-muted-foreground break-all">{reaction.emoji}</p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1">
                          使用回数: {reaction.usageCount ?? 0} ・ 保存日:{" "}
                          {formatSavedReactionDate(reaction.createdAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                      onClick={() => handleRemoveReaction(reaction.emoji)}
                      disabled={removingEmoji === reaction.emoji}
                    >
                      {removingEmoji === reaction.emoji ? "削除中..." : "削除"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">新規追加</h3>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">絵文字または画像URL</label>
            <input
              type="text"
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              placeholder="例: 😀 もしくは /uploads/custom.png"
              className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-2 text-sm border border-border rounded-md text-foreground btn-hover transition-colors disabled:opacity-50"
            >
              {isUploading ? "アップロード中..." : "画像ファイルから追加"}
            </button>
            {newEmoji && (
              <div className="flex items-center gap-3 rounded bg-muted px-3 py-2 border">
                {isImageLikeEmoji(newEmoji) && !isBlobUrl(newEmoji) ? (
                  <img
                    src={newEmoji.startsWith("/") ? `${BASE_URL}${newEmoji}` : newEmoji}
                    alt="preview"
                    className="w-10 h-10 object-contain rounded"
                  />
                ) : (
                  <span className="text-2xl">{newEmoji}</span>
                )}
                <div className="text-xs text-muted-foreground break-all">{newEmoji}</div>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">ショートコード（任意）</label>
            <div className="flex items-stretch border rounded overflow-hidden bg-card max-w-md">
              <span className="px-2 py-2 text-sm text-muted-foreground bg-muted border-r">:</span>
              <input
                type="text"
                value={newShortcode}
                onChange={(e) => setNewShortcode(sanitizeShortcodeInput(e.target.value))}
                placeholder="custom_emoji"
                className="flex-1 px-3 py-2 text-sm focus:outline-none"
              />
              <span className="px-2 py-2 text-sm text-muted-foreground bg-muted border-l">:</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              投稿本文で <code className="text-xs">:shortcode:</code> と入力するとこの絵文字が差し込まれます。
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddReaction}
              disabled={!newEmoji.trim() || isSubmitting}
              className="flex-1 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "追加中..." : "追加"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 py-2 text-sm border border-border bg-card text-foreground rounded btn-hover transition-colors"
            >
              クリア
            </button>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
