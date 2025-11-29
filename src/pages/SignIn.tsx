import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const { signIn, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ?verified=true の場合、認証成功メッセージを表示
  const verified = searchParams.get("verified") === "true";

  // エラーメッセージから EMAIL_NOT_VERIFIED を検出
  useEffect(() => {
    if (error?.includes("メールアドレスが認証されていません")) {
      setEmailNotVerified(true);
    } else {
      setEmailNotVerified(false);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setEmailNotVerified(false);
    setResendSuccess(false);

    try {
      await signIn(email, password);
      navigate("/");
    } catch {
      // Error is already handled in store
    }
  };

  const handleResendVerification = async () => {
    if (!email) return;
    setResendLoading(true);
    try {
      await api.resendVerification(email);
      setResendSuccess(true);
    } catch {
      // Ignore errors (security - don't reveal if email exists)
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
        {/* 左側: サインインフォーム */}
        <Card className="w-full max-w-md bg-card text-foreground border border-border/60 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bold text-center">
              Sign In
            </CardTitle>
            <p className="text-sm text-muted-foreground text-center">
              Enter your credentials to access your account
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* メール認証完了メッセージ */}
              {verified && (
                <div className="p-3 text-sm text-green-700 dark:text-green-400 bg-green-500/10 border border-green-500/30 rounded-md">
                  メールアドレスの認証が完了しました。ログインしてください。
                </div>
              )}

              {/* エラーメッセージ */}
              {error && !emailNotVerified && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md">
                  {error}
                </div>
              )}

              {/* メール未認証エラー + 再送信ボタン */}
              {emailNotVerified && (
                <div className="p-3 text-sm bg-amber-500/10 border border-amber-500/30 rounded-md space-y-2">
                  <p className="text-amber-700 dark:text-amber-400">
                    {error}
                  </p>
                  {resendSuccess ? (
                    <p className="text-green-700 dark:text-green-400 text-xs">
                      認証メールを再送信しました。
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendLoading || !email}
                      className="text-xs text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer py-1 px-2 -ml-2 rounded"
                    >
                      {resendLoading ? "送信中..." : "認証メールを再送信する"}
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-3 py-2 rounded-md border border-border bg-background/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-3 py-2 rounded-md border border-border bg-background/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-primary/70 shadow-sm"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </button>

              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 右側: キャッチコピー */}
        <div className="w-full max-w-md lg:max-w-sm space-y-6 text-center lg:text-left order-first lg:order-last">
          <div className="space-y-4">
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
              日常の<span className="text-primary">ワオ！</span>と
              <br className="hidden lg:block" />
              ときめく瞬間を
            </h1>
            <p className="text-xl lg:text-2xl font-semibold text-muted-foreground">
              我々の<span className="text-primary font-bold">やかましいインターネット</span>を取り戻す
            </p>
          </div>

          <div className="pt-4 border-t border-border/40">
            <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
              Wao(α)は、文章や感情を書き散らすためのSNSです。
              また、ブログという形で誰でも長文を書くことができます。
              日常の<span className="text-primary font-medium">ワオ！</span>とときめいた瞬間をぜひWaoに残してください。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
