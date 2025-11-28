#!/usr/bin/env node

/**
 * gemoji の生データから、アプリで利用するショートコード辞書を生成するスクリプト。
 *
 * 実行例:
 *   node scripts/generateEmojiData.cjs
 */

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const RAW_JSON_PATH = path.join(PROJECT_ROOT, "src", "data", "gemoji_raw.json");
const OUTPUT_PATH = path.join(PROJECT_ROOT, "src", "data", "defaultEmojiMap.ts");
const FALLBACK_CATEGORY = "Other";

const normalizeIdentifier = (value) => {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .replace(/\s+/g, "_");
};

const readJson = (filePath) => {
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
};

const buildEntries = (raw) => {
  return raw
    .map((item) => {
      const candidates = new Set();
      (item.aliases || []).forEach((alias) => {
        const normalized = normalizeIdentifier(alias);
        if (normalized) candidates.add(normalized);
      });

      const normalizedDescription = normalizeIdentifier(item.description);
      if (normalizedDescription) {
        candidates.add(normalizedDescription);
      }

      if (candidates.size === 0) {
        return null;
      }

      return {
        emoji: item.emoji,
        description: item.description || "",
        category: item.category || FALLBACK_CATEGORY,
        shortcodes: Array.from(candidates),
      };
    })
    .filter(Boolean);
};

const buildShortcodeMap = (entries) => {
  const map = {};
  for (const entry of entries) {
    for (const shortcode of entry.shortcodes) {
      const key = `:${shortcode}:`;
      if (!map[key]) {
        map[key] = entry.emoji;
      }
    }
  }
  return map;
};

const generateFile = (entries, shortcodeMap) => {
  const header = `/**
 * このファイルは scripts/generateEmojiData.cjs によって自動生成されました。
 * 直接編集しないでください。
 */

export interface DefaultEmojiEntry {
  emoji: string;
  description: string;
  category: string;
  shortcodes: readonly string[];
}

export const DEFAULT_EMOJI_ENTRIES: readonly DefaultEmojiEntry[] = ${JSON.stringify(entries, null, 2)} as const;

export const DEFAULT_EMOJI_SHORTCODES: Readonly<Record<string, string>> = ${JSON.stringify(shortcodeMap, null, 2)} as const;
`;
  return header;
};

const main = () => {
  if (!fs.existsSync(RAW_JSON_PATH)) {
    console.error(`Raw gemoji JSON not found at: ${RAW_JSON_PATH}`);
    process.exit(1);
  }

  const raw = readJson(RAW_JSON_PATH);
  const entries = buildEntries(raw);
  const shortcodeMap = buildShortcodeMap(entries);
  const output = generateFile(entries, shortcodeMap);

  fs.writeFileSync(OUTPUT_PATH, output, "utf-8");
  console.log(`Generated ${OUTPUT_PATH} with ${entries.length} entries and ${Object.keys(shortcodeMap).length} shortcodes.`);
};

main();
