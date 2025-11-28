import type MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import markdownItFootnote from "markdown-it-footnote";
import markdownItDeflist from "markdown-it-deflist";
import markdownItAbbr from "markdown-it-abbr";
import { full as markdownItEmoji } from "markdown-it-emoji";
import markdownItSub from "markdown-it-sub";
import markdownItSup from "markdown-it-sup";
import markdownItIns from "markdown-it-ins";
import markdownItMark from "markdown-it-mark";
import markdownItContainer from "markdown-it-container";
import type { EmojiDefinition } from "@/types";
import { DEFAULT_EMOJI_SHORTCODES } from "@/data/defaultEmojiMap";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

/**
 * YouTube埋め込みプラグイン
 * 単独行にYouTube URLがある場合、iframeに変換
 */
export function youtubePlugin(md: MarkdownIt) {
  const defaultRender = md.renderer.rules.paragraph_open ||
    ((tokens, idx, options, env, self) => {
      void env;
      return self.renderToken(tokens, idx, options);
    });

  md.renderer.rules.paragraph_open = (tokens, idx, options, env, self) => {
    const nextToken = tokens[idx + 1];

    if (nextToken && nextToken.type === 'inline') {
      const content = nextToken.content.trim();

      // YouTube URL のパターン
      const youtubeMatch = content.match(/^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);

      if (youtubeMatch && content === content.match(/^https?:\/\/[^\s]+$/)?.[0]) {
        const videoId = youtubeMatch[3];

        // nextToken の内容をクリアして、YouTube埋め込みだけを表示
        nextToken.content = '';

        return `
          <div class="youtube-embed my-8">
            <div class="relative w-full" style="padding-bottom: 56.25%;">
              <iframe
                class="absolute top-0 left-0 w-full h-full rounded-lg shadow-md"
                src="https://www.youtube.com/embed/${videoId}"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              ></iframe>
            </div>
          </div>
        `;
      }
    }

    return defaultRender(tokens, idx, options, env, self);
  };
}

/**
 * Twitter/X埋め込みプラグイン
 * 単独行にTwitter URLがある場合、埋め込みカードに変換
 */
export function twitterPlugin(md: MarkdownIt) {
  const defaultRender = md.renderer.rules.paragraph_open ||
    ((tokens, idx, options, env, self) => {
      void env;
      return self.renderToken(tokens, idx, options);
    });

  md.renderer.rules.paragraph_open = (tokens, idx, options, env, self) => {
    const nextToken = tokens[idx + 1];

    if (nextToken && nextToken.type === 'inline') {
      const content = nextToken.content.trim();

      // Twitter/X URL のパターン
      const twitterMatch = content.match(/^https?:\/\/(twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/([0-9]+)/);

      if (twitterMatch && content === content.match(/^https?:\/\/[^\s]+$/)?.[0]) {
        const tweetId = twitterMatch[3];

        // nextToken の内容をクリアして、Twitter埋め込み用プレースホルダーを表示
        nextToken.content = '';

        // createTweet用のプレースホルダー（BlogRenderer側でcreateTweetを呼び出す）
        return `
          <div class="twitter-embed my-8 not-prose" data-tweet-id="${tweetId}">
            <div class="twitter-embed-loading border border-border rounded-lg p-4 bg-muted/50 animate-pulse">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-muted rounded-full"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 bg-muted rounded w-1/3"></div>
                  <div class="h-3 bg-muted rounded w-1/4"></div>
                </div>
              </div>
              <div class="mt-3 space-y-2">
                <div class="h-3 bg-muted rounded w-full"></div>
                <div class="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </div>
          </div>
        `;
      }
    }

    return defaultRender(tokens, idx, options, env, self);
  };
}

/**
 * 画像キャプションプラグイン
 * ![alt](url "caption") の形式で、captionをfigcaptionとして表示
 */
export function imageCaptionPlugin(md: MarkdownIt) {
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    void options;
    void env;
    void self;
    const token = tokens[idx];
    const srcIndex = token.attrIndex('src');
    const src = srcIndex >= 0 ? token.attrs![srcIndex][1] : '';
    const alt = token.content;
    const caption = token.attrGet('title');

    // 相対URLの場合はBASE_URLを付加
    const fullSrc = src.startsWith('http') ? src : `${BASE_URL}${src}`;

    return `
      <figure class="my-8">
        <img
          src="${fullSrc}"
          alt="${alt}"
          class="rounded-lg shadow-md w-full hover:shadow-lg transition-shadow cursor-zoom-in"
          loading="lazy"
        />
        ${caption ? `<figcaption class="text-center text-sm text-muted-foreground mt-3 italic">${caption}</figcaption>` : ''}
      </figure>
    `;
  };
}

/**
 * カスタムOGPカードプラグイン
 * :::ogp 記法でOGPカードを表示
 *
 * 使用例:
 * :::ogp
 * url: https://example.com
 * title: Example Title
 * description: Example description
 * image: https://example.com/image.jpg
 * :::
 */
export function ogpPlugin(md: MarkdownIt) {
  md.block.ruler.before('fence', 'ogp', (state, startLine, endLine, silent) => {
    const marker = ':::';
    let pos = state.bMarks[startLine] + state.tShift[startLine];
    let max = state.eMarks[startLine];

    // Check if line starts with :::ogp
    if (pos + 3 > max) return false;

    const markerStr = state.src.slice(pos, pos + 3);
    if (markerStr !== marker) return false;

    pos += 3;
    const typeStart = pos;
    const typeEnd = state.skipSpacesBack(max, pos);
    const type = state.src.slice(typeStart, typeEnd).trim();

    if (type !== 'ogp') return false;

    if (silent) return true;

    // Find closing marker
    let nextLine = startLine;
    let autoClosed = false;

    while (nextLine < endLine) {
      nextLine++;
      if (nextLine >= endLine) break;

      pos = state.bMarks[nextLine] + state.tShift[nextLine];
      max = state.eMarks[nextLine];

      if (pos < max && state.sCount[nextLine] < state.blkIndent) break;

      if (state.src.slice(pos, pos + 3) === marker) {
        autoClosed = true;
        break;
      }
    }

    const oldParent = state.parentType;
    const oldLineMax = state.lineMax;
    state.parentType = 'ogp' as any;

    // Extract content
    const content = state.getLines(startLine + 1, nextLine, 0, false);

    // Parse OGP data
    const ogpData: Record<string, string> = {};
    content.split('\n').forEach(line => {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        ogpData[match[1]] = match[2].trim();
      }
    });

    const token = state.push('ogp', 'div', 0);
    token.content = JSON.stringify(ogpData);
    token.markup = marker;
    token.map = [startLine, nextLine + (autoClosed ? 1 : 0)];

    state.parentType = oldParent;
    state.lineMax = oldLineMax;
    state.line = nextLine + (autoClosed ? 1 : 0);

    return true;
  });

  md.renderer.rules.ogp = (tokens, idx) => {
    const ogpData = JSON.parse(tokens[idx].content);
    const { url, title, description, image } = ogpData;

    return `
      <a href="${url || '#'}" target="_blank" rel="noopener noreferrer" class="block my-8 no-underline not-prose">
        <div class="border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
          ${image ? `
            <div class="aspect-[1200/630] bg-muted">
              <img src="${image}" alt="${title || ''}" class="w-full h-full object-cover" loading="lazy" />
            </div>
          ` : ''}
          <div class="p-4 bg-card">
            ${title ? `<h3 class="font-semibold text-lg text-foreground mb-2">${title}</h3>` : ''}
            ${description ? `<p class="text-sm text-muted-foreground line-clamp-2">${description}</p>` : ''}
            ${url ? `<p class="text-xs text-muted-foreground mt-2">${new URL(url).hostname}</p>` : ''}
          </div>
        </div>
      </a>
    `;
  };
}

/**
 * 汎用URL埋め込みプラグイン
 * 単独行にURL（Twitter/YouTube以外）がある場合、OGPプレビュー用プレースホルダーに変換
 */
export function urlPreviewPlugin(md: MarkdownIt) {
  const defaultRender = md.renderer.rules.paragraph_open ||
    ((tokens, idx, options, env, self) => {
      void env;
      return self.renderToken(tokens, idx, options);
    });

  md.renderer.rules.paragraph_open = (tokens, idx, options, env, self) => {
    const nextToken = tokens[idx + 1];

    if (nextToken && nextToken.type === 'inline') {
      const content = nextToken.content.trim();

      // 単独URLかどうかチェック
      const urlMatch = content.match(/^https?:\/\/[^\s]+$/);
      if (!urlMatch) {
        return defaultRender(tokens, idx, options, env, self);
      }

      const url = urlMatch[0];

      // Twitter/X URLは専用プラグインで処理するので除外
      if (/^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/.test(url)) {
        return defaultRender(tokens, idx, options, env, self);
      }

      // YouTube URLは専用プラグインで処理するので除外
      if (/youtube\.com\/watch|youtu\.be\//.test(url)) {
        return defaultRender(tokens, idx, options, env, self);
      }

      // nextToken の内容をクリアして、OGPプレビュー用プレースホルダーを表示
      nextToken.content = '';

      return `
        <div class="url-preview my-6 not-prose" data-url="${url}">
          <a href="${url}" target="_blank" rel="noopener noreferrer" class="block border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow no-underline">
            <div class="url-preview-content p-4 bg-card">
              <div class="url-preview-loading flex items-center gap-3">
                <div class="w-16 h-16 bg-muted rounded animate-pulse flex-shrink-0"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                  <div class="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
              <p class="url-preview-fallback hidden text-sm text-muted-foreground truncate">${url}</p>
            </div>
          </a>
        </div>
      `;
    }

    return defaultRender(tokens, idx, options, env, self);
  };
}

/**
 * リンクを新しいタブで開く
 */
export function linkTargetBlankPlugin(md: MarkdownIt) {
  const defaultLinkOpen = md.renderer.rules.link_open ||
    ((tokens, idx, options, env, self) => {
      void env;
      return self.renderToken(tokens, idx, options);
    });

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const aIndex = tokens[idx].attrIndex('target');

    if (aIndex < 0) {
      tokens[idx].attrPush(['target', '_blank']);
    } else {
      tokens[idx].attrs![aIndex][1] = '_blank';
    }

    tokens[idx].attrPush(['rel', 'noopener noreferrer']);
    tokens[idx].attrPush(['class', 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline']);

    return defaultLinkOpen(tokens, idx, options, env, self);
  };
}

/**
 * シンタックスハイライトプラグイン
 * コードブロックにhighlight.jsを適用
 */
export function syntaxHighlightPlugin(md: MarkdownIt) {
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    void options;
    void env;
    void self;
    const token = tokens[idx];
    const lang = token.info.trim();
    const code = token.content;

    let highlightedCode = code;
    let langLabel = lang || 'text';

    // 言語が指定されている場合はハイライト
    if (lang && hljs.getLanguage(lang)) {
      try {
        highlightedCode = hljs.highlight(code, { language: lang }).value;
      } catch (error) {
        console.error('Syntax highlighting error:', error);
      }
    } else if (lang === '') {
      // 言語が指定されていない場合は自動検出
      try {
        const result = hljs.highlightAuto(code);
        highlightedCode = result.value;
        langLabel = result.language || 'text';
      } catch (error) {
        console.error('Auto syntax highlighting error:', error);
      }
    }

    return `
      <div class="code-block my-6">
        <div class="flex items-center justify-between bg-gray-800 px-4 py-2 rounded-t-lg">
          <span class="text-xs font-mono text-gray-300">${langLabel}</span>
        </div>
        <pre class="rounded-b-lg bg-gray-900 p-4 overflow-x-auto"><code class="hljs language-${lang || 'plaintext'}">${highlightedCode}</code></pre>
      </div>
    `;
  };
}

function registerCalloutContainer(md: MarkdownIt, name: string, label: string) {
  const baseClass = "my-6 border-l-4 rounded-md p-4";
  const styles: Record<string, string> = {
    warning: `${baseClass} border-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-900 dark:text-yellow-100`,
    info: `${baseClass} border-blue-400 bg-blue-50 dark:bg-blue-500/10 text-blue-900 dark:text-blue-100`,
    success: `${baseClass} border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-100`,
    note: `${baseClass} border-gray-400 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100`,
  };

  const className = styles[name] || `${baseClass} border-gray-400 bg-gray-50 text-gray-900`;

  md.use(markdownItContainer as any, name, {
    render(tokens: any, idx: number) {
      if (tokens[idx].nesting === 1) {
        return `<div class="${className}"><p class="text-xs font-semibold uppercase tracking-wide mb-2">${label}</p>`;
      }
      return "</div>";
    }
  });
}

/**
 * カスタムショートコード変換プラグイン
 * テキスト内の :shortcode: を絵文字またはカスタム絵文字画像に変換
 */
export function customShortcodePlugin(md: MarkdownIt, customEmoji?: EmojiDefinition[]) {
  const normalizeShortcode = (value: string | undefined | null) => value?.toLowerCase() ?? "";

  // カスタム絵文字マップを構築
  const shortcodeMap = new Map<string, EmojiDefinition>();
  customEmoji?.forEach((reaction) => {
    if (reaction.shortcode) {
      shortcodeMap.set(normalizeShortcode(reaction.shortcode), reaction);
    }
  });

  // テキストトークンを処理するルール
  const shortcodePattern = /:([\w+-]+):/g;

  md.core.ruler.after('inline', 'custom_shortcode', (state) => {
    for (const token of state.tokens) {
      if (token.type !== 'inline' || !token.children) continue;

      const newChildren: typeof token.children = [];

      for (const child of token.children) {
        if (child.type !== 'text' || !child.content.includes(':')) {
          newChildren.push(child);
          continue;
        }

        const text = child.content;
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        shortcodePattern.lastIndex = 0;

        while ((match = shortcodePattern.exec(text)) !== null) {
          // マッチ前のテキストを追加
          if (match.index > lastIndex) {
            const textToken = new state.Token('text', '', 0);
            textToken.content = text.substring(lastIndex, match.index);
            newChildren.push(textToken);
          }

          const fullShortcode = match[0]; // :code:
          const normalizedShortcode = normalizeShortcode(fullShortcode);
          const customReaction = shortcodeMap.get(normalizedShortcode);
          const defaultEmoji = DEFAULT_EMOJI_SHORTCODES[normalizedShortcode];

          if (customReaction) {
            // カスタム絵文字（画像または絵文字）
            if (customReaction.emoji.startsWith("http") || customReaction.emoji.startsWith("/")) {
              // 画像としてレンダリング
              const imgToken = new state.Token('html_inline', '', 0);
              const src = customReaction.emoji.startsWith("/")
                ? `${BASE_URL}${customReaction.emoji}`
                : customReaction.emoji;
              imgToken.content = `<img src="${src}" alt="${fullShortcode}" class="inline-block w-5 h-5 align-text-bottom" />`;
              newChildren.push(imgToken);
            } else {
              // Unicode絵文字
              const emojiToken = new state.Token('text', '', 0);
              emojiToken.content = customReaction.emoji;
              newChildren.push(emojiToken);
            }
          } else if (defaultEmoji) {
            // デフォルト絵文字マップから
            const emojiToken = new state.Token('text', '', 0);
            emojiToken.content = defaultEmoji;
            newChildren.push(emojiToken);
          } else {
            // マッチしない場合はそのまま
            const textToken = new state.Token('text', '', 0);
            textToken.content = fullShortcode;
            newChildren.push(textToken);
          }

          lastIndex = match.index + match[0].length;
        }

        // 残りのテキストを追加
        if (lastIndex < text.length) {
          const textToken = new state.Token('text', '', 0);
          textToken.content = text.substring(lastIndex);
          newChildren.push(textToken);
        }
      }

      token.children = newChildren;
    }
  });
}

export function applyStandardMarkdownPlugins(md: MarkdownIt, customEmoji?: EmojiDefinition[]) {
  md.use(markdownItFootnote as any);
  md.use(markdownItDeflist as any);
  md.use(markdownItAbbr as any);
  md.use(markdownItEmoji as any);
  md.use(markdownItSub as any);
  md.use(markdownItSup as any);
  md.use(markdownItIns as any);
  md.use(markdownItMark as any);
  registerCalloutContainer(md, "warning", "Warning");
  registerCalloutContainer(md, "info", "Info");
  registerCalloutContainer(md, "success", "Success");
  registerCalloutContainer(md, "note", "Note");

  youtubePlugin(md);
  twitterPlugin(md);
  urlPreviewPlugin(md);
  imageCaptionPlugin(md);
  ogpPlugin(md);
  linkTargetBlankPlugin(md);
  syntaxHighlightPlugin(md);

  // カスタムショートコード変換（最後に適用）
  customShortcodePlugin(md, customEmoji);
}
