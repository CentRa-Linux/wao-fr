import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomEmojiManager } from "@/components/CustomEmojiManager";
import type { FollowRequest } from "@/types";

export function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"profile" | "account" | "privacy">("profile");

  // Profile form state
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [iconUrl, setIconUrl] = useState(user?.icon || "");
  const [headerUrl, setHeaderUrl] = useState(user?.header || "");
  const [isPrivateAccount, setIsPrivateAccount] = useState(user?.isPrivate ?? false);
  const [dmEnabled, setDmEnabled] = useState(user?.dmEnabled ?? true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrivacySaving, setIsPrivacySaving] = useState(false);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState(false);

  const iconInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  if (!user) return null;

  const fetchFollowRequests = async () => {
    setIsRequestsLoading(true);
    try {
      const requests = await api.getFollowRequests();
      setFollowRequests(requests);
    } catch (error) {
      console.error("Failed to load follow requests:", error);
    } finally {
      setIsRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setBio(user.bio || "");
    setIconUrl(user.icon || "");
    setHeaderUrl(user.header || "");
    setIsPrivateAccount(user.isPrivate ?? false);
    setDmEnabled(user.dmEnabled ?? true);
    fetchFollowRequests();
  }, [user]);

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("画像ファイルのみアップロード可能です");
      return;
    }

    setIsUploading(true);
    try {
      const result = await api.uploadMedia(file, false, "Profile icon");
      setIconUrl(result.url);
    } catch (error) {
      console.error("Failed to upload icon:", error);
      alert("アイコンのアップロードに失敗しました");
    } finally {
      setIsUploading(false);
      if (iconInputRef.current) {
        iconInputRef.current.value = "";
      }
    }
  };

  const handleHeaderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("画像ファイルのみアップロード可能です");
      return;
    }

    setIsUploading(true);
    try {
      const result = await api.uploadMedia(file, false, "Profile header");
      setHeaderUrl(result.url);
    } catch (error) {
      console.error("Failed to upload header:", error);
      alert("バナーのアップロードに失敗しました");
    } finally {
      setIsUploading(false);
      if (headerInputRef.current) {
        headerInputRef.current.value = "";
      }
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updatedUser = await api.updateProfile({
        name,
        bio,
        icon: iconUrl,
        header: headerUrl,
      });
      setUser(updatedUser);
      setIsPrivateAccount(updatedUser.isPrivate ?? false);
      alert("プロフィールを更新しました");
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("プロフィールの更新に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    setIsPrivacySaving(true);
    try {
      const updatedUser = await api.updateProfile({
        isPrivate: isPrivateAccount,
        dmEnabled,
      });
      setUser(updatedUser);
      setIsPrivateAccount(updatedUser.isPrivate ?? false);
      setDmEnabled(updatedUser.dmEnabled ?? true);
      alert("プライバシー設定を更新しました");
    } catch (error) {
      console.error("Failed to update privacy settings:", error);
      alert("プライバシー設定の更新に失敗しました");
    } finally {
      setIsPrivacySaving(false);
    }
  };

  const handleApproveRequest = async (id: number) => {
    try {
      await api.approveFollowRequest(id);
      setFollowRequests((prev) => prev.filter((req) => req.id !== id));
      setUser({
        ...user,
        pendingFollowRequests: Math.max(
          (user.pendingFollowRequests ?? followRequests.length) - 1,
          0,
        ),
      });
      alert("フォローを承認しました");
    } catch (error) {
      console.error("Failed to approve request:", error);
      alert("承認に失敗しました");
    }
  };

  const handleRejectRequest = async (id: number) => {
    try {
      await api.rejectFollowRequest(id);
      setFollowRequests((prev) => prev.filter((req) => req.id !== id));
      setUser({
        ...user,
        pendingFollowRequests: Math.max(
          (user.pendingFollowRequests ?? followRequests.length) - 1,
          0,
        ),
      });
    } catch (error) {
      console.error("Failed to reject request:", error);
      alert("リクエストの拒否に失敗しました");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">設定</h1>

      {/* Mobile tabs */}
      <div className="md:hidden flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm transition-colors cursor-pointer ${
            activeTab === "profile"
              ? "bg-primary text-primary-foreground font-medium"
              : "bg-muted text-muted-foreground"
          }`}
        >
          プロフィール
        </button>
        <button
          onClick={() => setActiveTab("account")}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm transition-colors cursor-pointer ${
            activeTab === "account"
              ? "bg-primary text-primary-foreground font-medium"
              : "bg-muted text-muted-foreground"
          }`}
        >
          アカウント
        </button>
        <button
          onClick={() => setActiveTab("privacy")}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm transition-colors cursor-pointer ${
            activeTab === "privacy"
              ? "bg-primary text-primary-foreground font-medium"
              : "bg-muted text-muted-foreground"
          }`}
        >
          プライバシー
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar - hidden on mobile */}
        <div className="hidden md:block w-64 flex-shrink-0">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full text-left px-4 py-2 rounded-md transition-colors cursor-pointer ${
                activeTab === "profile"
                  ? "bg-gray-200 dark:bg-gray-700 text-primary font-medium"
                  : "text-muted-foreground btn-hover hover:text-foreground"
              }`}
            >
              プロフィール
            </button>
            <button
              onClick={() => setActiveTab("account")}
              className={`w-full text-left px-4 py-2 rounded-md transition-colors cursor-pointer ${
                activeTab === "account"
                  ? "bg-gray-200 dark:bg-gray-700 text-primary font-medium"
                  : "text-muted-foreground btn-hover hover:text-foreground"
              }`}
            >
              アカウント
            </button>
            <button
              onClick={() => setActiveTab("privacy")}
              className={`w-full text-left px-4 py-2 rounded-md transition-colors cursor-pointer ${
                activeTab === "privacy"
                  ? "bg-gray-200 dark:bg-gray-700 text-primary font-medium"
                  : "text-muted-foreground btn-hover hover:text-foreground"
              }`}
            >
              プライバシー
            </button>
          </nav>
        </div>

        {/* Content */}
          <div className="flex-1 min-w-0">
            {activeTab === "profile" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>プロフィール設定</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Header/Banner */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        バナー画像
                      </label>
                      <div className="relative">
                        {headerUrl ? (
                          <div className="relative h-48 rounded-lg overflow-hidden border border-gray-300">
                            <img
                              src={`${BASE_URL}${headerUrl}`}
                              alt="Header"
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => setHeaderUrl("")}
                              className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors hover:bg-black/90 cursor-pointer"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div className="h-48 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                            <span className="text-gray-500">バナー画像なし</span>
                          </div>
                        )}
                        <input
                          ref={headerInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleHeaderUpload}
                          className="hidden"
                        />
                        <button
                          onClick={() => headerInputRef.current?.click()}
                          disabled={isUploading}
                          className="mt-2 px-4 py-2 border border-border bg-background text-foreground rounded-md transition-colors btn-hover disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                        >
                          {isUploading ? "アップロード中..." : "バナーを変更"}
                        </button>
                      </div>
                    </div>

                    {/* Icon */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        アイコン画像
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-300 bg-gray-100">
                          {iconUrl ? (
                            <img
                              src={`${BASE_URL}${iconUrl}`}
                              alt="Icon"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl font-bold">
                              {user.name[0]?.toUpperCase() || "U"}
                            </div>
                          )}
                        </div>
                        <div>
                          <input
                            ref={iconInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleIconUpload}
                            className="hidden"
                          />
                          <button
                            onClick={() => iconInputRef.current?.click()}
                            disabled={isUploading}
                            className="px-4 py-2 border border-border bg-background text-foreground rounded-md transition-colors btn-hover disabled:opacity-50 disabled:pointer-events-none block mb-2 cursor-pointer"
                          >
                            {isUploading ? "アップロード中..." : "アイコンを変更"}
                          </button>
                          {iconUrl && (
                            <button
                              onClick={() => setIconUrl("")}
                              className="px-4 py-2 text-sm text-destructive border border-red-200 dark:border-red-800 rounded-md transition-colors hover:bg-red-100 dark:hover:bg-red-900/30 active:bg-red-200 dark:active:bg-red-900/50 cursor-pointer"
                            >
                              削除
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        表示名
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="表示名を入力"
                      />
                    </div>

                    {/* Unique ID (read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ユニークID
                      </label>
                      <input
                        type="text"
                        value={user.uniqueid}
                        disabled
                        className="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">ユニークIDは変更できません</p>
                    </div>

                    {/* Bio */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        自己紹介
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={4}
                        placeholder="自己紹介を入力してください"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Save Button */}
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="px-6 py-2 bg-primary text-primary-foreground border border-primary rounded-md transition-colors hover:opacity-80 active:opacity-70 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                      {isSaving ? "保存中..." : "保存"}
                    </button>
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>
                      フォローリクエスト
                      {user.pendingFollowRequests ? ` (${user.pendingFollowRequests})` : ""}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isRequestsLoading ? (
                      <div className="text-sm text-gray-500">読み込み中...</div>
                    ) : followRequests.length === 0 ? (
                      <div className="text-sm text-gray-500">
                        現在処理待ちのフォローリクエストはありません。
                      </div>
                    ) : (
                      followRequests.map((request) => (
                        <div key={request.id} className="border rounded-lg p-4 flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{request.requester.name}</div>
                            <div className="text-sm text-muted-foreground truncate">@{request.requester.uniqueid}</div>
                            {request.requester.bio && (
                              <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {request.requester.bio}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApproveRequest(request.id)}
                              className="px-3 py-1 rounded-md bg-primary text-primary-foreground border border-primary transition-colors hover:opacity-80 active:opacity-70 cursor-pointer"
                            >
                              承認
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request.id)}
                              className="px-3 py-1 rounded-md border border-border bg-background text-foreground transition-colors btn-hover cursor-pointer"
                            >
                              拒否
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <CustomEmojiManager />
              </div>
            )}

          {activeTab === "account" && (
            <Card>
              <CardHeader>
                <CardTitle>アカウント設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    パスワード変更
                  </label>
                  <button className="px-4 py-2 border border-border rounded-md bg-background text-foreground transition-colors btn-hover cursor-pointer">
                    パスワードを変更
                  </button>
                </div>
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-medium text-destructive mb-2">危険な操作</h3>
                  <button className="px-4 py-2 bg-destructive text-destructive-foreground border border-destructive rounded-md transition-colors hover:opacity-80 active:opacity-70 cursor-pointer">
                    アカウントを削除
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "privacy" && (
            <Card>
              <CardHeader>
                <CardTitle>プライバシー設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4">
                  <div>
                    <div className="font-medium text-foreground">非公開アカウント</div>
                    <p className="text-sm text-muted-foreground">
                      承認したユーザーのみが投稿やプロフィールを閲覧できるようにします。
                    </p>
                  </div>
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      {isPrivateAccount ? "オン" : "オフ"}
                    </span>
                    <input
                      type="checkbox"
                      className="w-5 h-5"
                      checked={isPrivateAccount}
                      onChange={(e) => setIsPrivateAccount(e.target.checked)}
                    />
                  </label>
                </div>

                <p className="text-sm text-muted-foreground">
                  非公開アカウントに切り替えると、フォローリクエストを承認したユーザーだけがあなたの投稿を閲覧できます。
                </p>

                <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4">
                  <div>
                    <div className="font-medium text-foreground">ダイレクトメッセージ</div>
                    <p className="text-sm text-muted-foreground">
                      他のユーザーがあなたにDMを送信できるかどうかを制御します。
                    </p>
                  </div>
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      {dmEnabled ? "受信を許可する" : "受信しない"}
                    </span>
                    <input
                      type="checkbox"
                      className="w-5 h-5"
                      checked={dmEnabled}
                      onChange={(e) => setDmEnabled(e.target.checked)}
                    />
                  </label>
                </div>
                <p className="text-sm text-muted-foreground">
                  DMを受信しない場合、他のユーザーにはメッセージボタンが表示されません。
                </p>

                <button
                  onClick={handleSavePrivacy}
                  disabled={isPrivacySaving}
                  className="px-6 py-2 bg-primary text-primary-foreground border border-primary rounded-md transition-colors hover:opacity-80 active:opacity-70 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {isPrivacySaving ? "保存中..." : "変更を保存"}
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
