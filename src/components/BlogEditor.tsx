import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import MarkdownIt from "markdown-it";
import { Bold, Italic, Heading, Image as ImageIcon, Code, Link as LinkIcon, List, Eye, Edit3 } from "lucide-react";
import { api } from "@/lib/api";
import { applyStandardMarkdownPlugins } from "@/lib/markdownPlugins";
import type { EmojiDefinition, PostVisibility } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import "highlight.js/styles/github-dark.css";

// Twitter widgets.jsをグローバルに一度だけロード
let twitterWidgetsPromise: Promise<void> | null = null;

function loadTwitterWidgets(): Promise<void> {
  if (twitterWidgetsPromise) return twitterWidgetsPromise;

  twitterWidgetsPromise = new Promise((resolve, reject) => {
    // @ts-expect-error Twitter global
    if (window.twttr?.widgets) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Twitter widgets"));
    document.head.appendChild(script);
  });

  return twitterWidgetsPromise;
}

interface BlogEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialVisibility?: PostVisibility;
  onSave?: (title: string, content: string, isDraft: boolean, visibility: PostVisibility) => Promise<void>;
  communityUuid?: string;
}

// Markdown-it インスタンスの作成とプラグイン適用
const createMarkdownRenderer = (customEmoji?: EmojiDefinition[]) => {
  const mdInstance = new MarkdownIt({
    html: false, // セキュリティのため
    breaks: true,
    linkify: true,
    typographer: true,
  });
  applyStandardMarkdownPlugins(mdInstance, customEmoji);
  return mdInstance;
};

export const BlogEditor = ({
  initialTitle = "",
  initialContent = "",
  initialVisibility = "public",
  onSave,
  communityUuid,
}: BlogEditorProps) => {
  const { user } = useAuthStore();
  const isCommunityPost = Boolean(communityUuid);
  const [title, setTitle] = useState(initialTitle);
  const [markdown, setMarkdown] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [visibility, setVisibility] = useState<PostVisibility>(initialVisibility);
  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);
  const md = useMemo(() => createMarkdownRenderer(user?.customEmoji), [user?.customEmoji]);

  // スクロール同期
  const handleEditorScroll = useCallback(() => {
    if (!editorRef.current || !previewRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = editorRef.current;
    const scrollRatio = scrollTop / (scrollHeight - clientHeight);

    const preview = previewRef.current;
    preview.scrollTop = scrollRatio * (preview.scrollHeight - preview.clientHeight);
  }, []);

  // Markdown 挿入ヘルパー
  const insertMarkdown = useCallback((before: string, after: string = "", placeholder: string = "") => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.substring(start, end);
    const textToInsert = selectedText || placeholder;

    const newText =
      markdown.substring(0, start) +
      before +
      textToInsert +
      after +
      markdown.substring(end);

    setMarkdown(newText);

    // カーソル位置を調整
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [markdown]);

  // 画像アップロード
  const handleImageUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const result = await api.uploadMedia(file, false, file.name);
        insertMarkdown(`![${file.name}](${result.url})`, "", "");
      } catch (error) {
        console.error("Failed to upload image:", error);
        alert("画像のアップロードに失敗しました");
      }
    };

    input.click();
  };

  // ドラッグ&ドロップ
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];

    if (file && file.type.startsWith("image/")) {
      try {
        const result = await api.uploadMedia(file, false, file.name);
        insertMarkdown(`![${file.name}](${result.url})`, "", "");
      } catch (error) {
        console.error("Failed to upload image:", error);
        alert("画像のアップロードに失敗しました");
      }
    }
  }, [insertMarkdown]);

  // 保存処理
  const handleSave = async (isDraft: boolean) => {
    if (!title.trim()) {
      alert("タイトルを入力してください");
      return;
    }

    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(title, markdown, isDraft, visibility);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        switch (e.key) {
          case "b":
            e.preventDefault();
            insertMarkdown("**", "**", "太字");
            break;
          case "i":
            e.preventDefault();
            insertMarkdown("*", "*", "斜体");
            break;
          case "s":
            e.preventDefault();
            handleSave(false);
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [insertMarkdown, handleSave]);

  const renderedHTML = useMemo(() => md.render(markdown), [md, markdown]);

  // Twitter埋め込みとOGPプレビューの処理
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!previewContentRef.current) return;
      processEmbeds();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [renderedHTML]);

  const processEmbeds = async () => {
    // Twitter埋め込みの処理
    const processTwitterEmbeds = async () => {
      if (!previewContentRef.current) return;

      const twitterContainers = previewContentRef.current.querySelectorAll<HTMLElement>(".twitter-embed[data-tweet-id]");

      for (const container of twitterContainers) {
        const tweetId = container.dataset.tweetId;
        if (!tweetId) continue;

        // 既に処理済みの場合はスキップ
        if (container.querySelector("iframe")) continue;

        try {
          await loadTwitterWidgets();

          const loadingEl = container.querySelector(".twitter-embed-loading");
          const isDark = document.documentElement.classList.contains("dark");

          // @ts-expect-error Twitter global
          const el = await window.twttr?.widgets?.createTweet(tweetId, container, {
            theme: isDark ? "dark" : "light",
            conversation: "none",
            dnt: true,
          });

          if (loadingEl && el) {
            loadingEl.remove();
          } else if (loadingEl && !el) {
            loadingEl.innerHTML = `<a href="https://twitter.com/i/status/${tweetId}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">ツイートを表示</a>`;
            loadingEl.classList.remove("animate-pulse");
          }
        } catch (e) {
          console.error("Failed to render tweet:", e);
        }
      }
    };

    // OGPプレビューの処理
    const processUrlPreviews = async () => {
      if (!previewContentRef.current) return;

      const urlPreviews = previewContentRef.current.querySelectorAll<HTMLElement>(".url-preview[data-url]");

      for (const preview of urlPreviews) {
        const url = preview.dataset.url;
        if (!url) continue;

        // 既に処理済みの場合はスキップ
        const contentEl = preview.querySelector(".url-preview-content");
        if (contentEl && contentEl.querySelector(".flex:not(.url-preview-loading)")) continue;

        try {
          const ogp = await api.getOgp(url);
          const loadingEl = preview.querySelector(".url-preview-loading");
          const fallbackEl = preview.querySelector(".url-preview-fallback");

          if (!contentEl || !loadingEl || !fallbackEl) continue;

          if (ogp && (ogp.title || ogp.description)) {
            const hostname = new URL(url).hostname;
            contentEl.innerHTML = `
              <div class="flex">
                ${ogp.image ? `
                  <div class="w-28 h-20 flex-shrink-0 bg-muted">
                    <img src="${ogp.image}" alt="" class="w-full h-full object-cover" onerror="this.style.display='none'" />
                  </div>
                ` : ''}
                <div class="flex-1 p-3 min-w-0">
                  <p class="text-xs text-muted-foreground mb-1 truncate">${ogp.siteName || hostname}</p>
                  <p class="text-sm font-medium text-foreground line-clamp-1">${ogp.title || url}</p>
                  ${ogp.description ? `<p class="text-xs text-muted-foreground mt-1 line-clamp-2">${ogp.description}</p>` : ''}
                </div>
              </div>
            `;
          } else {
            loadingEl.classList.add("hidden");
            fallbackEl.classList.remove("hidden");
          }
        } catch (e) {
          console.error("Failed to fetch OGP:", e);
          const loadingEl = preview.querySelector(".url-preview-loading");
          const fallbackEl = preview.querySelector(".url-preview-fallback");
          if (loadingEl && fallbackEl) {
            loadingEl.classList.add("hidden");
            fallbackEl.classList.remove("hidden");
          }
        }
      }
    };

    processTwitterEmbeds();
    processUrlPreviews();
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* ヘッダー */}
      <div className="border-b border-border p-3 md:p-4">
        {/* タイトル入力 */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトルを入力..."
          className="text-xl md:text-3xl font-bold w-full border-none outline-none bg-transparent text-foreground placeholder:text-muted-foreground mb-3 md:mb-0"
        />
        {/* アクションボタン */}
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          {isCommunityPost ? (
            <span className="px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-muted-foreground border border-border rounded-md bg-muted/50">
              コミュニティ限定
            </span>
          ) : (
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as PostVisibility)}
              className="border border-border rounded-md px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm bg-background/60 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/60"
            >
              <option value="public">公開</option>
              <option value="followers">フォロワー限定</option>
            </select>
          )}
          <div className="flex-1" />
          <button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-foreground border border-border rounded-md hover:bg-muted disabled:opacity-50"
          >
            下書き
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            公開
          </button>
        </div>
      </div>

      {/* モバイル用タブ切り替え */}
      <div className="md:hidden flex border-b border-border">
        <button
          onClick={() => setMobileTab("editor")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            mobileTab === "editor"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Edit3 className="w-4 h-4" />
          編集
        </button>
        <button
          onClick={() => setMobileTab("preview")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            mobileTab === "preview"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Eye className="w-4 h-4" />
          プレビュー
        </button>
      </div>

      {/* エディタ本体 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左: Markdown エディタ */}
        <div className={`${mobileTab === "editor" ? "flex" : "hidden"} md:flex w-full md:w-1/2 md:border-r border-border flex-col`}>
          {/* ツールバー */}
          <div className="flex gap-0.5 md:gap-1 p-2 border-b border-border bg-muted/50 overflow-x-auto">
            <button
              onClick={() => insertMarkdown("**", "**", "太字")}
              className="p-1.5 md:p-2 hover:bg-muted rounded text-foreground flex-shrink-0"
              title="太字 (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown("*", "*", "斜体")}
              className="p-1.5 md:p-2 hover:bg-muted rounded text-foreground flex-shrink-0"
              title="斜体 (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown("# ", "", "見出し")}
              className="p-1.5 md:p-2 hover:bg-muted rounded text-foreground flex-shrink-0"
              title="見出し"
            >
              <Heading className="w-4 h-4" />
            </button>
            <div className="w-px bg-border mx-0.5 md:mx-1 flex-shrink-0" />
            <button
              onClick={handleImageUpload}
              className="p-1.5 md:p-2 hover:bg-muted rounded text-foreground flex-shrink-0"
              title="画像"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown("[", "](url)", "リンクテキスト")}
              className="p-1.5 md:p-2 hover:bg-muted rounded text-foreground flex-shrink-0"
              title="リンク"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown("```\n", "\n```", "コード")}
              className="p-1.5 md:p-2 hover:bg-muted rounded text-foreground flex-shrink-0"
              title="コードブロック"
            >
              <Code className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown("- ", "", "リスト項目")}
              className="p-1.5 md:p-2 hover:bg-muted rounded text-foreground flex-shrink-0"
              title="リスト"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* テキストエリア */}
          <textarea
            ref={editorRef}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            onScroll={handleEditorScroll}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex-1 p-3 md:p-4 font-mono text-sm resize-none outline-none bg-background text-foreground placeholder:text-muted-foreground"
            placeholder="Markdown で記事を書く...

# 見出し
**太字** *斜体*
[リンク](url)
![画像](url)

画像をドラッグ&ドロップでアップロード"
          />
        </div>

        {/* 右: プレビュー */}
        <div
          ref={previewRef}
          className={`${mobileTab === "preview" ? "block" : "hidden"} md:block w-full md:w-1/2 p-4 md:p-8 overflow-auto bg-muted/30`}
        >
          <div className="max-w-3xl mx-auto bg-card p-4 md:p-8 rounded-lg shadow-sm border border-border">
            <h1 className="text-2xl md:text-4xl font-bold mb-4 md:mb-8 text-foreground">{title || "タイトルなし"}</h1>
            <div
              ref={previewContentRef}
              className="prose prose-sm md:prose-lg dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderedHTML }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
