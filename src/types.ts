// wao.nim の User モデルに対応
export interface User {
  id: number;
  auserid: number;
  uniqueid: string;
  name: string;
  icon: string;
  header: string;
  bio: string;
  following: number;
  followers: number;
  isFollowing?: boolean; // APIレスポンスに含まれる場合がある
  needsOnboarding?: boolean;
  isPrivate?: boolean;
  followRequestPending?: boolean;
  pendingFollowRequests?: number;
  dmEnabled?: boolean;
  customEmoji?: EmojiDefinition[];
}

export interface EmojiDefinition {
  emoji: string;
  shortcode?: string | null;
}

// wao.nim の Media モデルに対応
export interface Media {
  id: number;
  url: string;
  mediaType: "image" | "video" | "slide";
  isEmbedded: boolean;
  altText: string;
  isSensitive?: boolean;
}

// 投稿タイプ
export type PostType = "normal" | "reply" | "repost" | "quote";

// wao.nim の Post モデルに対応
export interface Post {
  id: number;
  uuid: string; // URL用のUUID
  userid: number;
  content: string;
  title?: string; // ブログ投稿の場合のタイトル
  isLong: boolean;
  postType: PostType; // 投稿タイプ
  replyid: number;
  repostid: number; // リポスト元のPostId
  repostCount: number; // リポストされた回数
  createdAt: number; // UNIX Timestamp
  hasMedia: boolean;
  isDraft: boolean;
  user: User; // JOINされて返ってくる
  attachedMedia: Media[];
  embeddedMedia: Media[];
  reactions: Record<string, number>; // emoji -> count
  reactionCount: number;
  replyCount: number;
  hashtags?: string[];
  visibility?: PostVisibility;
  repostedPost?: Post; // リポスト/引用の場合の元投稿
  isReposted?: boolean; // 閲覧者がリポスト済みかどうか
}

// OGP情報
export interface OgpData {
  title: string;
  description: string;
  image: string;
  siteName: string;
  url: string;
}

export interface FollowRequest {
  id: number;
  createdAt: number;
  requester: User;
}

export interface DirectMessage {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: number;
  readAt?: number;
}

export interface DMConversation {
  user: User;
  lastMessage: DirectMessage;
  unreadCount: number;
}

export interface DirectMessageUpdate {
  message: DirectMessage;
  partner: User;
}

// wao.nim の Notification モデルに対応
export interface Notification {
  id: number;
  userid: number;
  type: "reaction" | "reply" | "follow" | "mention" | "quote" | "repost" | "follow_request" | "community_invite";
  actor?: User;
  post?: Post;
  emoji?: string; // for reaction notifications
  isRead: boolean;
  createdAt: number;
}

// コミュニティ関連
export interface Community {
  id: number;
  uuid: string;
  name: string;
  description: string;
  icon: string;
  owner: User;
  isPublic: boolean;
  allowMemberInvite: boolean;
  memberCount: number;
  createdAt: number;
  myRole?: "owner" | "admin" | "member" | null;
  isMember?: boolean;
}

export interface CommunityMember {
  user: User;
  role: "owner" | "admin" | "member";
  joinedAt: number;
}

export interface CommunityInvite {
  id: number;
  community: Community;
  inviter: User;
  status: "pending" | "accepted" | "declined";
  createdAt: number;
}

export interface CommunityBan {
  user: User;
  bannedBy: User;
  reason?: string;
  createdAt: number;
}

export type InviteAcceptFrom = "following" | "mutual" | "anyone" | "nobody";

export interface CreateCommunityRequest {
  name: string;
  description?: string;
  icon?: string;
  isPublic?: boolean;
  allowMemberInvite?: boolean;
}

export interface UpdateCommunityRequest {
  name?: string;
  description?: string;
  icon?: string;
  isPublic?: boolean;
  allowMemberInvite?: boolean;
}

// 認証関連
export interface AuthResponse {
  accessToken: string;
  emailVerificationRequired?: boolean;
  // refreshToken is set in HttpOnly cookie
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  turnstileToken?: string;
}

// タイムライン取得のパラメータ
export interface TimelineParams {
  since?: number; // Unix timestamp
}

// ハッシュタグ
export interface Hashtag {
  id: number;
  tag: string;
  count: number;
  createdAt: number;
  updatedAt: number;
}

// 保存されたリアクション
export interface SavedReaction extends EmojiDefinition {
  id: number;
  userid: number;
  usageCount: number;
  createdAt: number;
}

// 投稿作成リクエスト
export interface CreatePostRequest {
  content: string;
  title?: string; // ブログ投稿の場合のタイトル
  isLong?: boolean;
  isDraft?: boolean;
  postType?: PostType; // 投稿タイプ（"normal" / "reply" / "quote"）
  replyid?: number;
  repostid?: number; // 引用リポストの場合の元投稿ID
  mediaIds?: number[];
  visibility?: PostVisibility;
  communityUuid?: string; // コミュニティ投稿の場合のUUID
}

// APIエラーレスポンス
export interface ApiError {
  status: "error";
  message: string;
}
export type PostVisibility = "public" | "followers" | "community";
