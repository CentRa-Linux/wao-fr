import type { EmojiDefinition } from "@/types";
import { DEFAULT_EMOJI_SHORTCODES } from "@/data/defaultEmojiMap";

const normalizeShortcode = (value: string | undefined | null) => value?.toLowerCase() ?? "";

type ParsedPart = { type: "text" | "emoji" | "image"; content: string; altText?: string };

/**
 * テキスト内のショートコード（:shortcode:）を絵文字/GIF URLに変換する
 */
export function parseShortcodes(
  text: string,
  ...reactionSources: Array<EmojiDefinition[] | undefined>
): ParsedPart[] {
  const shortcodeMap = new Map<string, EmojiDefinition>();

  reactionSources.forEach((source) => {
    source?.forEach((reaction) => {
      if (reaction.shortcode) {
        shortcodeMap.set(normalizeShortcode(reaction.shortcode), reaction);
      }
    });
  });

  const shortcodePattern = /(:[a-zA-Z0-9_+-]+:)/g;
  const parts: ParsedPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = shortcodePattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.substring(lastIndex, match.index),
      });
    }

    const shortcode = match[0];
    const normalizedShortcode = normalizeShortcode(shortcode);
    const reaction = shortcodeMap.get(normalizedShortcode);
    const defaultEmoji = DEFAULT_EMOJI_SHORTCODES[normalizedShortcode];

    if (reaction) {
      if (reaction.emoji.startsWith("http") || reaction.emoji.startsWith("/")) {
        parts.push({
          type: "image",
          content: reaction.emoji,
          altText: shortcode,
        });
      } else {
        parts.push({
          type: "emoji",
          content: reaction.emoji,
        });
      }
    } else if (defaultEmoji) {
      parts.push({
        type: "emoji",
        content: defaultEmoji,
      });
    } else {
      parts.push({
        type: "text",
        content: shortcode,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.substring(lastIndex),
    });
  }

  return parts;
}
