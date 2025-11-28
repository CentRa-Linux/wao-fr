import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";

const idPattern = /^[a-z0-9_-]{3,20}$/;
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [uniqueId, setUniqueId] = useState(() => user?.needsOnboarding ? "" : (user?.uniqueid ?? ""));
  const [idError, setIdError] = useState("");
  const [isCheckingId, setIsCheckingId] = useState(false);
  const [isIdAvailable, setIsIdAvailable] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [iconUrl, setIconUrl] = useState(user?.icon ?? "");
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const iconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && !user.needsOnboarding) {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    setUniqueId((prev) => (user?.needsOnboarding ? prev : user?.uniqueid ?? prev));
    setName(user?.name ?? "");
    setBio(user?.bio ?? "");
    setIconUrl(user?.icon ?? "");
  }, [user]);

  if (!user) {
    return null;
  }

  const sanitizeUniqueId = (value: string) => value.toLowerCase().replace(/[^a-z0-9_-]/g, "");

  const checkUniqueId = async (value: string) => {
    const candidate = sanitizeUniqueId(value.trim());
    setUniqueId(candidate);
    setIsIdAvailable(false);

    if (!idPattern.test(candidate)) {
      setIdError("3〜20文字、英小文字・数字・ハイフン・アンダースコアで入力してください");
      return false;
    }
    if (candidate.startsWith("temp-")) {
      setIdError("temp- から始まるIDは使用できません");
      return false;
    }

    setIsCheckingId(true);
    setIdError("");
    try {
      const result = await api.checkUniqueIdAvailability(candidate);
      if (!result.available) {
        setIdError("このIDは既に使用されています");
        setIsIdAvailable(false);
        return false;
      }
      setIsIdAvailable(true);
      return true;
    } catch (error) {
      setIdError(error instanceof Error ? error.message : "IDの確認に失敗しました");
      setIsIdAvailable(false);
      return false;
    } finally {
      setIsCheckingId(false);
    }
  };

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("画像ファイルを選択してください");
      return;
    }

    setIsUploadingIcon(true);
    setFormError("");
    try {
      const result = await api.uploadMedia(file, false, "Profile icon");
      setIconUrl(result.url);
    } catch (error) {
      setFormError("アイコンのアップロードに失敗しました");
    } finally {
      setIsUploadingIcon(false);
      if (iconInputRef.current) {
        iconInputRef.current.value = "";
      }
    }
  };

  const handleNext = async () => {
    if (await checkUniqueId(uniqueId)) {
      setStep(2);
    }
  };

  const handleComplete = async () => {
    const idOk = await checkUniqueId(uniqueId);
    if (!idOk) {
      setStep(1);
      return;
    }
    const trimmedName = name.trim();
    const trimmedBio = bio.trim();
    if (!trimmedName) {
      setFormError("表示名を入力してください");
      return;
    }
    if (!trimmedBio) {
      setFormError("自己紹介を入力してください");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    try {
      const updatedUser = await api.updateProfile({
        uniqueid: uniqueId,
        name: trimmedName,
        bio: trimmedBio,
        icon: iconUrl,
      });
      setUser(updatedUser);
      navigate("/");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "プロフィールの更新に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10 text-foreground">
      <Card className="w-full max-w-3xl bg-card">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">ようこそ！プロフィールの準備をしましょう</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <span
              className={`px-3 py-1 rounded-full ${
                step === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              1. ユニークID
            </span>
            <span className="text-muted-foreground/70">→</span>
            <span
              className={`px-3 py-1 rounded-full ${
                step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              2. プロフィール
            </span>
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  ユニークID（半角英数・ハイフン/アンダースコア）
                </label>
                <input
                  type="text"
                  value={uniqueId}
                  onChange={(e) => {
                    setUniqueId(sanitizeUniqueId(e.target.value));
                    setIsIdAvailable(false);
                    setIdError("");
                  }}
                  className="w-full px-4 py-2 border border-border rounded-md bg-background/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
                  placeholder="例: wao_blog"
                />
                {idError && <p className="text-sm text-red-600 mt-2">{idError}</p>}
                {isIdAvailable && !idError && (
                  <p className="text-sm text-green-600 mt-2">このIDは利用できます</p>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => checkUniqueId(uniqueId)}
                  disabled={isCheckingId || !uniqueId}
                  className="px-4 py-2 border border-border rounded-md text-sm bg-background text-foreground transition-colors btn-hover disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {isCheckingId ? "確認中..." : "空き状況を確認"}
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!uniqueId || isCheckingId}
                  className="px-4 py-2 bg-primary text-primary-foreground border border-primary rounded-md transition-colors hover:opacity-80 active:opacity-70 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  次へ
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">表示名</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-md bg-background/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
                  placeholder="あなたの名前"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">自己紹介</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-border rounded-md bg-background/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
                  placeholder="興味や自己紹介を書いてください"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">アイコン</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden border border-border bg-muted">
                    {iconUrl ? (
                      <img src={`${BASE_URL}${iconUrl}`} alt="icon" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Icon</div>
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
                      type="button"
                      onClick={() => iconInputRef.current?.click()}
                      disabled={isUploadingIcon}
                      className="px-4 py-2 border border-border rounded-md bg-background text-foreground transition-colors btn-hover disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                      {isUploadingIcon ? "アップロード中..." : "アイコンを選択"}
                    </button>
                    {iconUrl && (
                      <button
                        type="button"
                        onClick={() => setIconUrl("")}
                        className="ml-3 text-sm text-destructive transition-colors hover:bg-red-100 dark:hover:bg-red-900/30 active:bg-red-200 dark:active:bg-red-900/50 px-2 py-1 rounded cursor-pointer"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {formError && <div className="text-sm text-destructive">{formError}</div>}

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-muted-foreground border border-border rounded-md transition-colors hover:text-foreground btn-hover cursor-pointer"
                >
                  戻る
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={isSubmitting || !name.trim() || !bio.trim()}
                  className="px-6 py-2 bg-primary text-primary-foreground border border-primary rounded-md transition-colors hover:opacity-80 active:opacity-70 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {isSubmitting ? "保存中..." : "始める"}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
