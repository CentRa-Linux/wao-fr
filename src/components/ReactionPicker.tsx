import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { api } from "@/lib/api";
import type { SavedReaction } from "@/types";
import { DEFAULT_EMOJI_ENTRIES } from "@/data/defaultEmojiMap";
import { formatShortcodeForSave, sanitizeShortcodeInput } from "@/lib/emojiHelpers";

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const PRESET_EMOJI_TOTAL = DEFAULT_EMOJI_ENTRIES.length;

const toComparable = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/:/g, "")
    .replace(/[\s_-]+/g, "");

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  "Smileys & Emotion": { label: "スマイル・感情", icon: "😊" },
  "People & Body": { label: "人物・ボディ", icon: "🧑" },
  Component: { label: "ピクト・補助", icon: "⚙️" },
  "Animals & Nature": { label: "動物・自然", icon: "🐾" },
  "Food & Drink": { label: "食べ物・飲み物", icon: "🍣" },
  "Travel & Places": { label: "旅行・場所", icon: "🗺️" },
  Activities: { label: "アクティビティ", icon: "⚽" },
  Objects: { label: "オブジェクト", icon: "📦" },
  Symbols: { label: "記号", icon: "🔣" },
  Flags: { label: "旗", icon: "🏳️" },
  Other: { label: "その他", icon: "✨" },
};

const getCategoryMeta = (category?: string) =>
  CATEGORY_META[category ?? "Other"] ?? { label: category ?? "その他", icon: "✨" };

const matchesDefaultEmoji = (entry: (typeof DEFAULT_EMOJI_ENTRIES)[number], query: string) => {
  const trimmed = query.trim();
  if (!trimmed) return true;
  if (entry.emoji.includes(trimmed)) return true;

  const comparableQuery = toComparable(trimmed);
  if (!comparableQuery) return true;

  if (entry.shortcodes.some((shortcode) => shortcode.includes(comparableQuery))) return true;

  return toComparable(entry.description).includes(comparableQuery);
};

const matchesCustomReaction = (reaction: SavedReaction, query: string) => {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const comparableQuery = toComparable(trimmed);
  if (reaction.shortcode && toComparable(reaction.shortcode).includes(comparableQuery)) return true;
  return reaction.emoji.toLowerCase().includes(trimmed.toLowerCase());
};

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

export function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
  const [savedReactions, setSavedReactions] = useState<SavedReaction[]>([]);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [showAddReaction, setShowAddReaction] = useState(false);
  const [newEmoji, setNewEmoji] = useState("");
  const [newShortcode, setNewShortcode] = useState("");
  const [tab, setTab] = useState<"preset" | "custom">("preset");
  const [presetSearch, setPresetSearch] = useState("");
  const [isUploadingCustomEmoji, setIsUploadingCustomEmoji] = useState(false);
  const [removingEmoji, setRemovingEmoji] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSavedReactions = async () => {
    try {
      const { reactions } = await api.getSavedReactions();
      setSavedReactions(reactions);
    } catch (error) {
      console.error("Failed to load saved reactions:", error);
    }
  };

  useEffect(() => {
    // fetch() での初期ロードに useEffect を使う必要があるため許容
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSavedReactions();
  }, []);

  const handleEmojiClick = (emoji: string) => {
    setSelectedEmoji(emoji);
    onSelect(emoji);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const resetAddReactionForm = () => {
    setNewEmoji("");
    setNewShortcode("");
    setShowAddReaction(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddReaction = async () => {
    if (!newEmoji.trim()) return;

    try {
      const formattedShortcode = formatShortcodeForSave(newShortcode);
      await api.addSavedReaction(newEmoji.trim(), formattedShortcode || undefined);
      resetAddReactionForm();
      await loadSavedReactions();
    } catch (error) {
      console.error("Failed to add saved reaction:", error);
      alert("リアクションの追加に失敗しました");
    }
  };

  const handleUploadCustomEmoji = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("画像ファイルのみアップロード可能です");
      event.target.value = "";
      return;
    }

    setIsUploadingCustomEmoji(true);
    try {
      const { url } = await api.uploadMedia(file, true, newShortcode.trim() || file.name);
      setNewEmoji(url);
    } catch (error) {
      console.error("Failed to upload custom emoji:", error);
      alert("カスタム絵文字のアップロードに失敗しました");
    } finally {
      setIsUploadingCustomEmoji(false);
      event.target.value = "";
    }
  };

  const handleRemoveSavedReaction = async (emoji: string) => {
    if (!window.confirm("このカスタムリアクションを削除しますか？")) {
      return;
    }
    setRemovingEmoji(emoji);
    try {
      await api.removeSavedReaction(emoji);
      await loadSavedReactions();
    } catch (error) {
      console.error("Failed to remove saved reaction:", error);
      alert("カスタムリアクションの削除に失敗しました");
    } finally {
      setRemovingEmoji(null);
    }
  };

  const trimmedPresetSearch = presetSearch.trim();

  const filteredCustomReactions = useMemo(() => {
    if (!trimmedPresetSearch) return savedReactions;
    return savedReactions.filter((reaction) => matchesCustomReaction(reaction, trimmedPresetSearch));
  }, [savedReactions, trimmedPresetSearch]);

  const defaultEmojiGroups = useMemo(() => {
    let totalMatches = 0;
    const categoryMap = new Map<
      string,
      { id: string; label: string; icon: string; entries: Array<(typeof DEFAULT_EMOJI_ENTRIES)[number]> }
    >();

    DEFAULT_EMOJI_ENTRIES.forEach((entry) => {
      if (!matchesDefaultEmoji(entry, trimmedPresetSearch)) {
        return;
      }
      totalMatches += 1;
      const key = entry.category || "Other";
      if (!categoryMap.has(key)) {
        const meta = getCategoryMeta(key);
        categoryMap.set(key, { id: key, label: meta.label, icon: meta.icon, entries: [] });
      }
      categoryMap.get(key)!.entries.push(entry);
    });

    return {
      totalMatches,
      categories: Array.from(categoryMap.values()),
    };
  }, [trimmedPresetSearch]);

  const totalPresetMatches = defaultEmojiGroups.totalMatches + filteredCustomReactions.length;
  const hasPresetSearch = Boolean(trimmedPresetSearch);

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-background/40 backdrop-blur opacity-0 animate-in fade-in duration-100" onClick={onClose} />

      {/* Picker */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:absolute md:bottom-full md:top-auto md:left-auto md:right-0 md:translate-x-0 md:translate-y-0 md:mb-2 rounded-xl shadow-xl border border-border/80 bg-popover dark:bg-zinc-900 text-foreground p-3 z-50 w-[calc(100vw-2rem)] max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tabs */}
        <div className="flex border-b border-border/70 mb-3">
          <button
            onClick={() => setTab("preset")}
            className={`flex-1 py-2 text-sm font-medium transition-colors cursor-pointer ${
              tab === "preset"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground btn-hover"
            }`}
          >
            プリセット ({PRESET_EMOJI_TOTAL})
          </button>
          <button
            onClick={() => setTab("custom")}
            className={`flex-1 py-2 text-sm font-medium transition-colors cursor-pointer ${
              tab === "custom"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground btn-hover"
            }`}
          >
            カスタム ({savedReactions.length})
          </button>
        </div>

        {/* Content */}
        {tab === "preset" ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Discord風ショートコード検索
              </label>
              <input
                type="search"
                value={presetSearch}
                onChange={(e) => setPresetSearch(e.target.value)}
                placeholder=':thinking_face: や "rocket" で検索'
                className="w-full px-3 py-2 text-sm border border-border rounded bg-popover text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {hasPresetSearch
                    ? `検索結果 ${totalPresetMatches} 件`
                    : `全 ${PRESET_EMOJI_TOTAL} 種（+ カスタム ${savedReactions.length} 件）`}
                </span>
                {hasPresetSearch && totalPresetMatches === 0 && (
                  <span>別のキーワードを試してください</span>
                )}
              </div>
              <div className="space-y-4 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {filteredCustomReactions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <span className="text-base">⭐</span>
                      <span>カスタム絵文字 ({filteredCustomReactions.length})</span>
                    </div>
                    <div className="mt-2 grid grid-cols-6 gap-2">
                      {filteredCustomReactions.map((reaction) => (
                        <button
                          key={`preset-custom-${reaction.id}`}
                          onClick={() => handleEmojiClick(reaction.emoji)}
                          className={`flex flex-col items-center justify-center h-16 rounded-md border text-2xl transition-colors cursor-pointer ${
                            selectedEmoji === reaction.emoji
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50 btn-hover"
                          }`}
                          title={reaction.shortcode || reaction.emoji}
                        >
                              {isBlobUrl(reaction.emoji) ? (
                                <span className="text-[10px] text-muted-foreground leading-tight text-center px-1">
                                  BLOB
                                  <br />
                                  埋込
                                </span>
                              ) : isImageLikeEmoji(reaction.emoji) ? (
                                <img
                                  src={
                                    reaction.emoji.startsWith("/")
                                      ? `${BASE_URL}${reaction.emoji}`
                                      : reaction.emoji
                                  }
                                  alt={reaction.shortcode || reaction.emoji}
                                  className="w-8 h-8 object-contain"
                                />
                              ) : (
                                <span>{reaction.emoji}</span>
                              )}
                              <span className="text-[10px] text-muted-foreground mt-1 px-1 w-full truncate">
                                {reaction.shortcode || reaction.emoji}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {defaultEmojiGroups.categories.length > 0 ? (
                      defaultEmojiGroups.categories.map((group) => (
                        <div key={group.id}>
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            <span className="text-base">{group.icon}</span>
                            <span>
                              {group.label} ({group.entries.length})
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-6 gap-2">
                            {group.entries.map((entry, index) => (
                              <button
                                key={`${group.id}-${entry.emoji}-${index}`}
                                onClick={() => handleEmojiClick(entry.emoji)}
                                className={`flex flex-col items-center justify-center h-16 rounded-md border text-2xl transition-colors cursor-pointer ${
                                  selectedEmoji === entry.emoji
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border hover:border-primary/50 btn-hover"
                                }`}
                                title={entry.description || entry.shortcodes[0]}
                              >
                                <span>{entry.emoji}</span>
                                <span className="text-[10px] text-muted-foreground mt-1 px-1 w-full truncate">
                                  {entry.description || entry.shortcodes[0]}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      filteredCustomReactions.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          「{presetSearch}」に一致する絵文字が見つかりません
                        </p>
                      )
                    )}
                  </div>
                </div>
            </div>
          ) : (
            <div className="space-y-3">
              {savedReactions.length > 0 ? (
                <div className="border border-border rounded-lg divide-y divide-border/60 max-h-72 overflow-y-auto custom-scrollbar">
                  {savedReactions.map((reaction) => {
                    const imagePreviewAvailable =
                      isImageLikeEmoji(reaction.emoji) && !isBlobUrl(reaction.emoji);
                    return (
                      <div key={reaction.id} className="flex items-center gap-3 px-3 py-2 bg-card">
                        <button
                          type="button"
                          onClick={() => handleEmojiClick(reaction.emoji)}
                          className={`flex flex-1 items-center gap-3 rounded-md px-2 py-2 text-left transition-colors cursor-pointer ${
                            selectedEmoji === reaction.emoji
                              ? "bg-primary/10 text-primary"
                              : "btn-hover"
                          }`}
                        >
                          <div className="w-12 h-12 flex items-center justify-center rounded-md border border-border bg-background overflow-hidden">
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
                              <div className="text-[10px] text-muted-foreground leading-tight text-center px-1">
                                BLOB
                                <br />
                                埋込済み
                              </div>
                            ) : (
                              <span className="text-2xl">{reaction.emoji}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                              <span className="truncate">
                                {reaction.shortcode || "ショートコード未設定"}
                              </span>
                              <span className="text-[11px] text-muted-foreground">#{reaction.id}</span>
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {isBlobUrl(reaction.emoji) ? "アップロード済みの埋め込み" : reaction.emoji}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              使用回数: {reaction.usageCount ?? 0} ・ 保存日:{" "}
                              {formatSavedReactionDate(reaction.createdAt)}
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSavedReaction(reaction.emoji)}
                          disabled={removingEmoji === reaction.emoji}
                          className="text-xs text-destructive transition-all hover:bg-red-100 dark:hover:bg-red-900/30 active:bg-red-200 dark:active:bg-red-900/50 px-2 py-1 rounded disabled:opacity-50 cursor-pointer"
                        >
                          {removingEmoji === reaction.emoji ? "削除中..." : "削除"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  カスタムリアクションがありません
                </p>
              )}

              {!showAddReaction ? (
                <button
                  onClick={() => setShowAddReaction(true)}
                  className="w-full py-2 text-sm text-primary transition-all hover:bg-blue-100 dark:hover:bg-blue-900/30 active:bg-blue-200 dark:active:bg-blue-900/50 rounded border border-dashed border-primary/50 hover:border-primary cursor-pointer"
                >
                  + 新しいリアクションを追加
                </button>
              ) : (
                <div className="space-y-3 rounded-md border border-border p-3 bg-muted/40">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      絵文字または画像URL
                    </label>
                    <input
                      type="text"
                      value={newEmoji}
                      onChange={(e) => setNewEmoji(e.target.value)}
                      placeholder="例) 😀 もしくは /uploads/custom.png"
                      className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUploadCustomEmoji}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingCustomEmoji}
                        className="px-3 py-2 text-sm border border-border rounded-md text-foreground bg-popover transition-colors btn-hover disabled:opacity-50 cursor-pointer"
                      >
                        {isUploadingCustomEmoji ? "アップロード中..." : "ファイルから追加"}
                      </button>
                      <span className="text-xs text-muted-foreground">
                        PNG / JPG / GIF / WEBP をアップロード
                      </span>
                    </div>
                    {newEmoji && (
                      <div className="flex items-center gap-3 rounded-md bg-popover px-3 py-2 border border-border">
                        {isImageLikeEmoji(newEmoji) && !isBlobUrl(newEmoji) ? (
                          <img
                            src={newEmoji.startsWith("/") ? `${BASE_URL}${newEmoji}` : newEmoji}
                            alt="preview"
                            className="w-8 h-8 object-contain rounded"
                          />
                        ) : (
                          <span className="text-2xl">{newEmoji}</span>
                        )}
                        <div className="text-xs text-muted-foreground break-all">{newEmoji}</div>
                      </div>
                    )}
                  </div>
                  <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        ショートコード（任意）
                      </label>
                      <div className="flex items-stretch border border-border rounded overflow-hidden bg-background">
                        <span className="px-2 py-2 text-sm text-muted-foreground bg-muted/40 border-r border-border">:</span>
                        <input
                          type="text"
                          value={newShortcode}
                          onChange={(e) => setNewShortcode(sanitizeShortcodeInput(e.target.value))}
                          placeholder="custom_emoji"
                          className="flex-1 px-3 py-2 text-sm bg-transparent text-foreground focus:outline-none"
                        />
                        <span className="px-2 py-2 text-sm text-muted-foreground bg-muted/40 border-l border-border">:</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        投稿本文では <code className="text-xs">:shortcode:</code> を入力するとこの絵文字が差し込まれます
                      </p>
                    </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddReaction}
                      disabled={!newEmoji.trim()}
                      className="flex-1 py-2 text-sm bg-primary text-primary-foreground border border-primary rounded transition-colors hover:opacity-80 active:opacity-70 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                      追加
                    </button>
                    <button
                      onClick={resetAddReactionForm}
                      className="flex-1 py-2 text-sm border border-border bg-background text-foreground rounded transition-colors btn-hover cursor-pointer"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
    </>
  );
}
