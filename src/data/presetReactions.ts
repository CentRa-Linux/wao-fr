export interface PresetEmoji {
  emoji: string;
  shortcode: `:${string}:`;
  keywords?: string[];
}

export interface PresetReactionGroup {
  id: string;
  icon: string;
  label: string;
  emojis: PresetEmoji[];
}

const withKeywords = (shortcode: `:${string}:`, keywords: string[] = []): string[] => {
  const normalized = shortcode.replace(/:/g, "").replace(/_/g, " ");
  return Array.from(new Set([...keywords, normalized]));
};

export const PRESET_REACTION_GROUPS: PresetReactionGroup[] = [
  {
    id: "smileys",
    icon: "🙂",
    label: "スマイル・感情",
    emojis: [
      { emoji: "😀", shortcode: ":grinning:", keywords: withKeywords(":grinning:", ["smile", "happy", "にこにこ"]) },
      { emoji: "😄", shortcode: ":smile:", keywords: withKeywords(":smile:", ["open mouth", "うれしい"]) },
      { emoji: "😂", shortcode: ":joy:", keywords: withKeywords(":joy:", ["lol", "laugh", "大笑い"]) },
      { emoji: "🤣", shortcode: ":rofl:", keywords: withKeywords(":rofl:", ["rolling", "rofl", "転げ回る"]) },
      { emoji: "😊", shortcode: ":blush:", keywords: withKeywords(":blush:", ["warm", "gentle", "照れ"]) },
      { emoji: "😍", shortcode: ":heart_eyes:", keywords: withKeywords(":heart_eyes:", ["love", "きゅん"]) },
      { emoji: "🤔", shortcode: ":thinking_face:", keywords: withKeywords(":thinking_face:", ["think", "hmm", "考える"]) },
      { emoji: "🙃", shortcode: ":upside_down:", keywords: withKeywords(":upside_down:", ["sarcasm", "ひっくり返る"]) },
      { emoji: "😭", shortcode: ":sob:", keywords: withKeywords(":sob:", ["cry", "tears", "泣く"]) },
      { emoji: "😎", shortcode: ":sunglasses:", keywords: withKeywords(":sunglasses:", ["cool", "かっこいい"]) },
    ],
  },
  {
    id: "gestures",
    icon: "🖐️",
    label: "ハンドサイン",
    emojis: [
      { emoji: "👍", shortcode: ":thumbsup:", keywords: withKeywords(":thumbsup:", ["good", "了解"]) },
      { emoji: "👎", shortcode: ":thumbsdown:", keywords: withKeywords(":thumbsdown:", ["bad", "だめ"]) },
      { emoji: "👏", shortcode: ":clap:", keywords: withKeywords(":clap:", ["bravo", "拍手"]) },
      { emoji: "🙌", shortcode: ":raised_hands:", keywords: withKeywords(":raised_hands:", ["yay", "やった"]) },
      { emoji: "🙏", shortcode: ":pray:", keywords: withKeywords(":pray:", ["thanks", "please", "感謝"]) },
      { emoji: "💪", shortcode: ":muscle:", keywords: withKeywords(":muscle:", ["strong", "筋肉"]) },
      { emoji: "🤝", shortcode: ":handshake:", keywords: withKeywords(":handshake:", ["deal", "握手"]) },
      { emoji: "🤟", shortcode: ":love_you_gesture:", keywords: withKeywords(":love_you_gesture:", ["ily", "rock", "ラブ"]) },
      { emoji: "🫶", shortcode: ":heart_hands:", keywords: withKeywords(":heart_hands:", ["love", "hands"]) },
      { emoji: "🫡", shortcode: ":saluting_face:", keywords: withKeywords(":saluting_face:", ["respect", "了解です"]) },
    ],
  },
  {
    id: "celebration",
    icon: "🎉",
    label: "お祝い・共感",
    emojis: [
      { emoji: "❤️", shortcode: ":heart:", keywords: withKeywords(":heart:", ["love", "heart", "好き"]) },
      { emoji: "💖", shortcode: ":sparkling_heart:", keywords: withKeywords(":sparkling_heart:", ["cute", "sparkle"]) },
      { emoji: "💯", shortcode: ":100:", keywords: withKeywords(":100:", ["nice", "パーフェクト"]) },
      { emoji: "🔥", shortcode: ":fire:", keywords: withKeywords(":fire:", ["lit", "hot", "最高"]) },
      { emoji: "🎉", shortcode: ":tada:", keywords: withKeywords(":tada:", ["congrats", "祝"]) },
      { emoji: "🥳", shortcode: ":partying_face:", keywords: withKeywords(":partying_face:", ["party", "celebrate"]) },
      { emoji: "🤩", shortcode: ":star_struck:", keywords: withKeywords(":star_struck:", ["wow", "憧れ"]) },
      { emoji: "😘", shortcode: ":kissing_heart:", keywords: withKeywords(":kissing_heart:", ["kiss", "感謝"]) },
      { emoji: "✨", shortcode: ":sparkles:", keywords: withKeywords(":sparkles:", ["shiny", "きらきら"]) },
      { emoji: "🥹", shortcode: ":pleading_face:", keywords: withKeywords(":pleading_face:", ["please", "うるうる"]) },
    ],
  },
  {
    id: "status",
    icon: "🚀",
    label: "状況・リアクション",
    emojis: [
      { emoji: "🚀", shortcode: ":rocket:", keywords: withKeywords(":rocket:", ["launch", "go", "出発"]) },
      { emoji: "👀", shortcode: ":eyes:", keywords: withKeywords(":eyes:", ["look", "見てる"]) },
      { emoji: "✅", shortcode: ":white_check_mark:", keywords: withKeywords(":white_check_mark:", ["ok", "done", "完了"]) },
      { emoji: "❌", shortcode: ":x:", keywords: withKeywords(":x:", ["no", "バツ"]) },
      { emoji: "⚡", shortcode: ":zap:", keywords: withKeywords(":zap:", ["quick", "電撃"]) },
      { emoji: "⭐", shortcode: ":star:", keywords: withKeywords(":star:", ["favorite", "注目"]) },
      { emoji: "🧠", shortcode: ":brain:", keywords: withKeywords(":brain:", ["smart", "idea"]) },
      { emoji: "🤯", shortcode: ":exploding_head:", keywords: withKeywords(":exploding_head:", ["mindblown", "驚き"]) },
      { emoji: "🌀", shortcode: ":cyclone:", keywords: withKeywords(":cyclone:", ["confused", "ぐるぐる"]) },
      { emoji: "🕒", shortcode: ":clock3:", keywords: withKeywords(":clock3:", ["waiting", "時間"]) },
    ],
  },
];

const quickShortcodes: `:${string}:`[] = [
  ":thumbsup:",
  ":heart:",
  ":joy:",
  ":clap:",
  ":thinking_face:",
  ":sob:",
  ":fire:",
  ":tada:",
];

const emojiIndex = new Map<string, PresetEmoji>();
PRESET_REACTION_GROUPS.forEach((group) => {
  group.emojis.forEach((emoji) => {
    if (!emojiIndex.has(emoji.shortcode)) {
      emojiIndex.set(emoji.shortcode, emoji);
    }
  });
});

export const PRESET_EMOJI_INDEX = emojiIndex;

export const PRESET_QUICK_EMOJIS: PresetEmoji[] = quickShortcodes
  .map((code) => emojiIndex.get(code))
  .filter((emoji): emoji is PresetEmoji => Boolean(emoji));
