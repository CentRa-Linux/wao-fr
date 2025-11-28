import { useEffect, useState, useRef, useCallback } from "react";
import type { SyntheticEvent } from "react";
import { api } from "@/lib/api";
import type { Post, Hashtag, User } from "@/types";
import { Link, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { PostCard } from "@/components/PostCard";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, TrendingUp, Hash } from "lucide-react";

const resolveAvatarSrc = (icon?: string | null, baseUrl?: string): string | undefined => {
  const trimmed = icon?.trim();
  if (!trimmed || trimmed === "placeholder") return undefined;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  return `${baseUrl ?? ""}${trimmed}`;
};

const handleAvatarError = (event: SyntheticEvent<HTMLImageElement>) => {
  const target = event.currentTarget;
  if (target.dataset.fallbackApplied === "true") return;
  target.dataset.fallbackApplied = "true";
  target.style.display = "none";
};

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const [searchTerm, setSearchTerm] = useState(query);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "users">("posts");
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  // タグ候補機能
  const [tagSuggestions, setTagSuggestions] = useState<{ tag: string; count: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 入力中のタグを検出（最後の#以降を取得）
  const getTagBeingTyped = useCallback((text: string): string | null => {
    const match = text.match(/#([^\s#]*)$/);
    return match ? match[1] : null;
  }, []);

  // タグ候補を取得
  useEffect(() => {
    const tagQuery = getTagBeingTyped(searchTerm);
    if (tagQuery !== null && tagQuery.length > 0) {
      const timer = setTimeout(() => {
        api.getHashtagSuggestions(tagQuery, 8)
          .then((res) => {
            setTagSuggestions(res.hashtags);
            setShowSuggestions(res.hashtags.length > 0);
            setSelectedSuggestionIndex(-1);
          })
          .catch(() => {
            setTagSuggestions([]);
            setShowSuggestions(false);
          });
      }, 150); // デバウンス
      return () => clearTimeout(timer);
    } else {
      setTagSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, getTagBeingTyped]);

  // 候補選択時の処理
  const handleSelectSuggestion = useCallback((tag: string) => {
    // 現在入力中のタグ部分を置換
    const newSearchTerm = searchTerm.replace(/#[^\s#]*$/, `#${tag} `);
    setSearchTerm(newSearchTerm);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  }, [searchTerm]);

  // キーボード操作
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || tagSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) =>
        prev < tagSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(tagSuggestions[selectedSuggestionIndex].tag);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  }, [showSuggestions, tagSuggestions, selectedSuggestionIndex, handleSelectSuggestion]);

  // 外側クリックで候補を閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // トレンド取得
  useEffect(() => {
    api.getTrendingHashtags().then((res) => {
      setHashtags(res.hashtags);
    });
  }, []);

  // 検索実行
  useEffect(() => {
    if (!query) {
      setPosts([]);
      setUsers([]);
      return;
    }

    setLoading(true);
    api.search(query)
      .then((res) => {
        setPosts(res.posts);
        setUsers(res.users);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-4 pb-10">
        {/* 検索バー */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md p-4 border-b">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search wao... (use # for tags)"
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                const tagQuery = getTagBeingTyped(searchTerm);
                if (tagQuery && tagSuggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
            />
            {/* タグ候補ドロップダウン */}
            {showSuggestions && tagSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50"
              >
                {tagSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.tag}
                    type="button"
                    className={`w-full px-4 py-2 flex items-center justify-between text-left hover:bg-muted/60 transition-colors ${
                      index === selectedSuggestionIndex ? "bg-muted" : ""
                    }`}
                    onClick={() => handleSelectSuggestion(suggestion.tag)}
                    onMouseEnter={() => setSelectedSuggestionIndex(index)}
                  >
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{suggestion.tag}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {suggestion.count} posts
                    </span>
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* 検索結果表示エリア */}
        {query ? (
          <div className="p-4">
            <div className="flex space-x-4 border-b mb-4">
              <button
                className={`pb-2 px-4 font-medium text-sm transition-colors ${
                  activeTab === "posts"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("posts")}
              >
                Posts ({posts.length})
              </button>
              <button
                className={`pb-2 px-4 font-medium text-sm transition-colors ${
                  activeTab === "users"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("users")}
              >
                Users ({users.length})
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {activeTab === "posts" && (
                  <div className="space-y-4">
                    {posts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No posts found for "{query}"
                      </div>
                    ) : (
                      posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                      ))
                    )}
                  </div>
                )}

                {activeTab === "users" && (
                  <div className="space-y-4">
                    {users.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No users found for "{query}"
                      </div>
                    ) : (
                      users.map((user) => {
                        const avatarSrc = resolveAvatarSrc(user.icon, BASE_URL);
                        return (
                        <Link
                          key={user.id}
                          to={`/profile/${user.uniqueid}`}
                          className="flex items-center space-x-3 p-4 rounded-lg border border-border bg-card hover:bg-muted/60 transition-colors"
                        >
                          <Avatar className="h-12 w-12">
                            {avatarSrc && (
                              <AvatarImage
                                src={avatarSrc}
                                alt={user.name}
                                onError={handleAvatarError}
                              />
                            )}
                            <AvatarFallback>{user.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold truncate">{user.name}</div>
                            <div className="text-sm text-muted-foreground truncate">@{user.uniqueid}</div>
                            {user.bio && (
                              <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {user.bio}
                              </div>
                            )}
                          </div>
                        </Link>
                        );
                      })
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* トレンド表示エリア（検索していない時） */
          <div className="p-4">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-lg">Trending Hashtags</h2>
            </div>
            
            <div className="grid gap-4">
              {hashtags.length === 0 ? (
                <div className="text-muted-foreground text-sm">No trending hashtags yet</div>
              ) : (
                hashtags.map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/explore?q=${encodeURIComponent("#" + tag.tag)}`}
                    className="block p-4 rounded-lg border border-border bg-card hover:bg-muted/60 transition-colors"
                  >
                    <div className="font-bold text-lg">#{tag.tag}</div>
                    <div className="text-sm text-muted-foreground">
                      {tag.count} posts
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
      </div>
  );
}
