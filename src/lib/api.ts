import type {
  AuthResponse,
  SignInRequest,
  SignUpRequest,
  User,
  Post,
  Notification,
  ApiError,
  Hashtag,
  SavedReaction,
  CreatePostRequest,
  FollowRequest,
  Media,
  DirectMessage,
  DMConversation,
  OgpData,
  Community,
  CommunityMember,
  CommunityInvite,
  CommunityBan,
  CreateCommunityRequest,
  UpdateCommunityRequest,
  InviteAcceptFrom
} from "@/types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

class ApiClient {
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem("accessToken");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  private async tryRefreshToken(): Promise<boolean> {
    // 既にリフレッシュ中なら、その結果を待つ
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${BASE_URL}/auth/refresh`, {
          method: "POST",
          credentials: 'include',
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          localStorage.removeItem("accessToken");
          return false;
        }

        const result = await response.json();
        if (result.accessToken) {
          localStorage.setItem("accessToken", result.accessToken);
          return true;
        }
        return false;
      } catch {
        localStorage.removeItem("accessToken");
        return false;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    path: string,
    options?: RequestInit,
    isRetry = false
  ): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      credentials: 'include', // Include cookies for refresh token
      headers: {
        ...this.getAuthHeader(),
        ...options?.headers,
      },
    });

    // 401エラーで、リトライでなく、認証が必要なエンドポイントの場合
    if (response.status === 401 && !isRetry && !path.startsWith("/auth/")) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        // トークンリフレッシュ成功、リクエストをリトライ
        return this.request<T>(path, options, true);
      }
      // リフレッシュ失敗、元のエラーをスロー
    }

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        status: "error" as const,
        message: response.statusText,
      }));
      throw new Error(error.message);
    }

    return response.json();
  }

  // ============ Authentication ============

  async signIn(data: SignInRequest): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>("/auth/signin", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (result.accessToken) {
      localStorage.setItem("accessToken", result.accessToken);
    }
    return result;
  }

  async signUp(data: SignUpRequest): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });
    // メール認証が必要な場合はトークンを保存しない（自動ログインを防ぐ）
    if (result.accessToken && !result.emailVerificationRequired) {
      localStorage.setItem("accessToken", result.accessToken);
    }
    return result;
  }

  async refreshToken(): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>("/auth/refresh", {
      method: "POST",
    });
    if (result.accessToken) {
      localStorage.setItem("accessToken", result.accessToken);
    }
    return result;
  }

  async logout(): Promise<void> {
    await this.request<void>("/auth/logout", {
      method: "POST",
    });
    localStorage.removeItem("accessToken");
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  // ============ User Profile ============

  async getMe(): Promise<User> {
    const response = await this.request<{ status: string; user: User }>("/api/me");
    return response.user;
  }

  async getUser(uniqueid: string): Promise<User> {
    const response = await this.request<{ status: string; user: User }>(`/api/users/${uniqueid}`);
    return response.user;
  }

  async updateProfile(data: { name?: string; bio?: string; icon?: string; header?: string; uniqueid?: string; isPrivate?: boolean; dmEnabled?: boolean }): Promise<User> {
    const response = await this.request<{ status: string; user: User }>("/api/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return response.user;
  }

  async checkUniqueIdAvailability(value: string): Promise<{ available: boolean }> {
    const response = await this.request<{ status: string; available: boolean }>(
      `/api/users/check-id?value=${encodeURIComponent(value)}`
    );
    return { available: response.available };
  }

  async getUserPosts(uniqueid: string, params?: { before?: number; limit?: number }): Promise<{ posts: Post[]; hasMore: boolean }> {
    const searchParams = new URLSearchParams();
    if (params?.before) searchParams.append("before", params.before.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    const query = searchParams.toString();
    return this.request<{ posts: Post[]; hasMore: boolean }>(`/api/users/${uniqueid}/posts${query ? `?${query}` : ""}`);
  }

  async getUserLikes(uniqueid: string, params?: { before?: number; limit?: number }): Promise<{ posts: (Post & { reactedAt?: number })[]; hasMore: boolean }> {
    const searchParams = new URLSearchParams();
    if (params?.before) searchParams.append("before", params.before.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    const query = searchParams.toString();
    return this.request<{ posts: (Post & { reactedAt?: number })[]; hasMore: boolean }>(`/api/users/${uniqueid}/likes${query ? `?${query}` : ""}`);
  }

  async getUserFollowers(uniqueid: string): Promise<{ users: User[] }> {
    return this.request<{ users: User[] }>(`/api/users/${uniqueid}/followers`);
  }

  async getUserFollowing(uniqueid: string): Promise<{ users: User[] }> {
    return this.request<{ users: User[] }>(`/api/users/${uniqueid}/following`);
  }

  async followUser(uniqueid: string): Promise<{ followState?: "pending" | "following" }> {
    const response = await this.request<{ status: string; followState?: "pending" | "following" }>(`/api/users/${uniqueid}/follow`, {
      method: "POST",
    });
    return { followState: response.followState };
  }

  async unfollowUser(uniqueid: string): Promise<void> {
    return this.request<void>(`/api/users/${uniqueid}/follow`, {
      method: "DELETE",
    });
  }

  // ============ Posts ============

  async createPost(data: CreatePostRequest): Promise<Post> {
    const response = await this.request<{ status: string; post: Post }>("/api/post", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.post;
  }

  async getPosts(params?: { since?: number; before?: number; limit?: number }): Promise<{ posts: Post[]; hasMore: boolean }> {
    const searchParams = new URLSearchParams();
    if (params?.since) searchParams.append("since", params.since.toString());
    if (params?.before) searchParams.append("before", params.before.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    const query = searchParams.toString();
    return this.request<{ posts: Post[]; hasMore: boolean }>(`/api/posts${query ? `?${query}` : ""}`);
  }

  async getPost(id: number): Promise<Post> {
    const response = await this.request<{ status: string; post: Post }>(`/api/posts/${id}`);
    return response.post;
  }

  async getPostByUuid(username: string, uuid: string): Promise<Post> {
    const response = await this.request<{ status: string; post: Post }>(`/api/posts/${username}/${uuid}`);
    return response.post;
  }

  async getPostReplies(id: number): Promise<Post[]> {
    const response = await this.request<{ status: string; replies: Post[] }>(`/api/posts/${id}/replies`);
    return response.replies;
  }

  async updatePost(id: number, data: Partial<CreatePostRequest>): Promise<Post> {
    const response = await this.request<{ status: string; post: Post }>(`/api/posts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return response.post;
  }

  async deletePost(id: number): Promise<void> {
    return this.request<void>(`/api/posts/${id}`, {
      method: "DELETE",
    });
  }

  async getTimeline(params?: { since?: number; before?: number; limit?: number }): Promise<{ posts: Post[]; hasMore: boolean }> {
    const queryParts: string[] = [];
    if (params?.since) queryParts.push(`since=${params.since}`);
    if (params?.before) queryParts.push(`before=${params.before}`);
    if (params?.limit) queryParts.push(`limit=${params.limit}`);
    const query = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    return this.request<{ posts: Post[]; hasMore: boolean }>(`/api/timeline${query}`);
  }

  async getDrafts(): Promise<Post[]> {
    const response = await this.request<{ status: string; drafts: Post[] }>("/api/drafts");
    return response.drafts;
  }

  // ============ Follow Requests ============

  async getFollowRequests(): Promise<FollowRequest[]> {
    const response = await this.request<{ status: string; requests: FollowRequest[] }>("/api/me/follow-requests");
    return response.requests;
  }

  async approveFollowRequest(id: number): Promise<void> {
    await this.request(`/api/me/follow-requests/${id}/approve`, {
      method: "POST",
    });
  }

  async rejectFollowRequest(id: number): Promise<void> {
    await this.request(`/api/me/follow-requests/${id}`, {
      method: "DELETE",
    });
  }

  // ============ Direct Messages ============

  async getDMInbox(): Promise<{ conversations: DMConversation[] }> {
    const response = await this.request<{ status: string; conversations: DMConversation[] }>("/api/dm/inbox");
    return { conversations: response.conversations };
  }

  async getDMThread(uniqueid: string): Promise<{ user: User; messages: DirectMessage[] }> {
    const response = await this.request<{ status: string; user: User; messages: DirectMessage[] }>(`/api/dm/${uniqueid}`);
    return { user: response.user, messages: response.messages };
  }

  async sendDM(uniqueid: string, content: string): Promise<DirectMessage> {
    const response = await this.request<{ status: string; message: DirectMessage }>(`/api/dm/${uniqueid}`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    return response.message;
  }

  // ============ Reactions ============

  async toggleReaction(postId: number, emoji: string): Promise<{ action: "added" | "removed"; emoji: string }> {
    return this.request<{ action: "added" | "removed"; emoji: string }>(`/api/posts/${postId}/reaction`, {
      method: "POST",
      body: JSON.stringify({ emoji }),
    });
  }

  // 後方互換性のため残す（非推奨）
  async addReaction(postId: number, emoji: string): Promise<void> {
    await this.toggleReaction(postId, emoji);
  }

  async removeReaction(postId: number, emoji: string): Promise<void> {
    return this.request<void>(`/api/posts/${postId}/reaction?emoji=${encodeURIComponent(emoji)}`, {
      method: "DELETE",
    });
  }

  async getPostReactions(postId: number): Promise<{ reactions: Record<string, number> }> {
    return this.request<{ reactions: Record<string, number> }>(`/api/posts/${postId}/reactions`);
  }

  async getReactionDetails(postId: number, emoji?: string): Promise<{ details: Record<string, { id: number; uniqueid: string; name: string; icon: string }[]> }> {
    const query = emoji ? `?emoji=${encodeURIComponent(emoji)}` : "";
    return this.request<{ details: Record<string, { id: number; uniqueid: string; name: string; icon: string }[]> }>(`/api/posts/${postId}/reactions/details${query}`);
  }

  // ============ Reposts ============

  async repost(postId: number): Promise<Post> {
    const response = await this.request<{ status: string; post: Post }>(`/api/posts/${postId}/repost`, {
      method: "POST",
    });
    return response.post;
  }

  async unrepost(postId: number): Promise<void> {
    return this.request<void>(`/api/posts/${postId}/repost`, {
      method: "DELETE",
    });
  }

  // ============ Saved Reactions (お気に入りリアクション) ============

  async getSavedReactions(): Promise<{ reactions: SavedReaction[]; count: number }> {
    return this.request<{ reactions: SavedReaction[]; count: number }>("/api/me/reactions/saved");
  }

  async addSavedReaction(emoji: string, shortcode?: string): Promise<SavedReaction> {
    const response = await this.request<{ reaction: SavedReaction }>("/api/me/reactions/saved", {
      method: "POST",
      body: JSON.stringify({ emoji, shortcode }),
    });
    return response.reaction;
  }

  async updateSavedReactionShortcode(emoji: string, shortcode?: string): Promise<void> {
    return this.request<void>("/api/me/reactions/saved", {
      method: "PATCH",
      body: JSON.stringify({ emoji, shortcode }),
    });
  }

  async removeSavedReaction(emoji: string): Promise<void> {
    return this.request<void>(`/api/me/reactions/saved?emoji=${encodeURIComponent(emoji)}`, {
      method: "DELETE",
    });
  }

  // ============ Notifications ============

  async getNotifications(unreadOnly?: boolean, limit?: number, since?: number): Promise<{ notifications: Notification[] }> {
    const params = new URLSearchParams();
    if (unreadOnly) params.append("unreadOnly", "true");
    if (limit) params.append("limit", limit.toString());
    if (since) params.append("since", since.toString());

    const query = params.toString();
    return this.request<{ notifications: Notification[] }>(`/api/notifications${query ? `?${query}` : ""}`);
  }

  async getUnreadCount(): Promise<{ count: number }> {
    return this.request<{ count: number }>("/api/notifications/unread-count");
  }

  async markNotificationAsRead(id: number): Promise<void> {
    return this.request<void>(`/api/notifications/${id}/read`, {
      method: "PUT",
    });
  }

  async markAllNotificationsAsRead(): Promise<void> {
    return this.request<void>("/api/notifications/read-all", {
      method: "PUT",
    });
  }

  // ============ Media Upload ============

  async uploadMedia(file: File, isEmbedded: boolean = false, altText?: string, isSensitive?: boolean): Promise<Media> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("isEmbedded", isEmbedded.toString());
    if (altText) formData.append("altText", altText);
    if (typeof isSensitive === "boolean") {
      formData.append("isSensitive", String(isSensitive));
    }

    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${BASE_URL}/api/media/upload`, {
      method: "POST",
      credentials: 'include',
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload media");
    }

    const result = await response.json();
    return result.media;
  }

  async updateMediaMetadata(id: number, data: { isSensitive?: boolean; altText?: string }): Promise<void> {
    await this.request(`/api/media/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // ============ Hashtags ============

  async getTrendingHashtags(limit: number = 20): Promise<{ hashtags: Hashtag[] }> {
    return this.request<{ hashtags: Hashtag[] }>(`/api/hashtags/trending?limit=${limit}`);
  }

  async getHashtagPosts(tag: string): Promise<{ posts: Post[] }> {
    return this.request<{ posts: Post[] }>(`/api/hashtags/${encodeURIComponent(tag)}/posts`);
  }

  async getHashtagSuggestions(query: string, limit: number = 10): Promise<{ hashtags: { tag: string; count: number }[] }> {
    return this.request<{ hashtags: { tag: string; count: number }[] }>(
      `/api/hashtags/suggest?q=${encodeURIComponent(query)}&limit=${limit}`
    );
  }

  // ============ Search ============
  async search(query: string): Promise<{ posts: Post[]; users: User[] }> {
    return this.request<{ posts: Post[]; users: User[] }>(`/api/search?q=${encodeURIComponent(query)}`);
  }

  // ============ OGP ============
  async getOgp(url: string): Promise<OgpData> {
    const response = await this.request<{ status: string; ogp: OgpData }>(`/api/ogp?url=${encodeURIComponent(url)}`);
    return response.ogp;
  }

  // ============ Communities ============

  async createCommunity(data: CreateCommunityRequest): Promise<Community> {
    const response = await this.request<{ status: string; community: Community }>("/api/communities", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.community;
  }

  async getCommunity(uuid: string): Promise<Community> {
    const response = await this.request<{ status: string; community: Community }>(`/api/communities/${uuid}`);
    return response.community;
  }

  async updateCommunity(uuid: string, data: UpdateCommunityRequest): Promise<Community> {
    const response = await this.request<{ status: string; community: Community }>(`/api/communities/${uuid}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return response.community;
  }

  async deleteCommunity(uuid: string): Promise<void> {
    await this.request<{ status: string }>(`/api/communities/${uuid}`, {
      method: "DELETE",
    });
  }

  async getMyCommunities(): Promise<{ communities: Community[]; count: number }> {
    return this.request<{ communities: Community[]; count: number }>("/api/me/communities");
  }

  // Community Members
  async getCommunityMembers(uuid: string): Promise<{ members: CommunityMember[]; count: number }> {
    return this.request<{ members: CommunityMember[]; count: number }>(`/api/communities/${uuid}/members`);
  }

  async joinCommunity(uuid: string): Promise<void> {
    await this.request<{ status: string }>(`/api/communities/${uuid}/join`, {
      method: "POST",
    });
  }

  async leaveCommunity(uuid: string): Promise<void> {
    await this.request<{ status: string }>(`/api/communities/${uuid}/leave`, {
      method: "DELETE",
    });
  }

  async kickMember(uuid: string, userId: number): Promise<void> {
    await this.request<{ status: string }>(`/api/communities/${uuid}/members/${userId}`, {
      method: "DELETE",
    });
  }

  async promoteMember(uuid: string, userId: number): Promise<void> {
    await this.request<{ status: string }>(`/api/communities/${uuid}/admins/${userId}`, {
      method: "POST",
    });
  }

  async demoteMember(uuid: string, userId: number): Promise<void> {
    await this.request<{ status: string }>(`/api/communities/${uuid}/admins/${userId}`, {
      method: "DELETE",
    });
  }

  // Community Invites
  async inviteUser(uuid: string, uniqueid: string): Promise<void> {
    await this.request<{ status: string }>(`/api/communities/${uuid}/invite/${uniqueid}`, {
      method: "POST",
    });
  }

  async getMyInvites(): Promise<{ invites: CommunityInvite[]; count: number }> {
    return this.request<{ invites: CommunityInvite[]; count: number }>("/api/me/community-invites");
  }

  async acceptInvite(inviteId: number): Promise<{ community: Community }> {
    return this.request<{ community: Community }>(`/api/me/community-invites/${inviteId}/accept`, {
      method: "POST",
    });
  }

  async declineInvite(inviteId: number): Promise<void> {
    await this.request<{ status: string }>(`/api/me/community-invites/${inviteId}`, {
      method: "DELETE",
    });
  }

  // Community Bans
  async banUser(uuid: string, userId: number, reason?: string): Promise<void> {
    await this.request<{ status: string }>(`/api/communities/${uuid}/ban/${userId}`, {
      method: "POST",
      body: JSON.stringify({ reason: reason || "" }),
    });
  }

  async unbanUser(uuid: string, userId: number): Promise<void> {
    await this.request<{ status: string }>(`/api/communities/${uuid}/ban/${userId}`, {
      method: "DELETE",
    });
  }

  async getCommunityBans(uuid: string): Promise<{ bans: CommunityBan[]; count: number }> {
    return this.request<{ bans: CommunityBan[]; count: number }>(`/api/communities/${uuid}/bans`);
  }

  // Community Posts
  async getCommunityPosts(uuid: string, params?: { since?: number; before?: number; limit?: number }): Promise<{ posts: Post[]; hasMore: boolean }> {
    const searchParams = new URLSearchParams();
    if (params?.since) searchParams.append("since", params.since.toString());
    if (params?.before) searchParams.append("before", params.before.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    const query = searchParams.toString() ? `?${searchParams}` : "";
    return this.request<{ posts: Post[]; hasMore: boolean }>(`/api/communities/${uuid}/posts${query}`);
  }

  async createCommunityPost(uuid: string, data: CreatePostRequest): Promise<Post> {
    const response = await this.request<{ status: string; post: Post }>(`/api/communities/${uuid}/posts`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.post;
  }

  // Invite Settings
  async getInviteSettings(): Promise<{ acceptFrom: InviteAcceptFrom }> {
    return this.request<{ acceptFrom: InviteAcceptFrom }>("/api/me/invite-settings");
  }

  async updateInviteSettings(acceptFrom: InviteAcceptFrom): Promise<void> {
    await this.request<{ status: string }>("/api/me/invite-settings", {
      method: "PATCH",
      body: JSON.stringify({ acceptFrom }),
    });
  }
}

export const api = new ApiClient();
// End of file
