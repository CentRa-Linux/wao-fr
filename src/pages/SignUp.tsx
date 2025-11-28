import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Turnstile } from "@marsidev/react-turnstile";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
const SIGNUP_SUCCESS_KEY = "wao_signup_success";
const SIGNUP_EMAIL_KEY = "wao_signup_email";

export function SignUpPage() {
  // sessionStorageから初期値を読み込む（コンポーネントの再マウント対策）
  const [signupSuccess, setSignupSuccess] = useState(() => sessionStorage.getItem(SIGNUP_SUCCESS_KEY) === "true");
  const [submittedEmail, setSubmittedEmail] = useState(() => sessionStorage.getItem(SIGNUP_EMAIL_KEY) || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; turnstile?: string }>({});
  const isSubmittingRef = useRef(false);
  const { signUp, isLoading, error, clearError } = useAuthStore();

  // 成功画面が表示されたらsessionStorageをクリア（ページ離脱時）
  useEffect(() => {
    return () => {
      if (signupSuccess) {
        sessionStorage.removeItem(SIGNUP_SUCCESS_KEY);
        sessionStorage.removeItem(SIGNUP_EMAIL_KEY);
      }
    };
  }, [signupSuccess]);

  const validateForm = () => {
    const nextErrors: typeof fieldErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = "Please enter a valid email address";
    }

    if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters";
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    if (!turnstileToken) {
      nextErrors.turnstile = "Please complete the captcha";
    }

    setFieldErrors(nextErrors);
    return { isValid: Object.keys(nextErrors).length === 0, trimmedEmail };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const { isValid, trimmedEmail } = validateForm();
    if (!isValid) {
      return;
    }

    // 送信中フラグを立てて、Turnstileコールバックの影響を防ぐ
    isSubmittingRef.current = true;

    try {
      const result = await signUp(trimmedEmail, password, turnstileToken);
      if (result.emailVerificationRequired) {
        // sessionStorageに保存（コンポーネント再マウント対策）
        sessionStorage.setItem(SIGNUP_SUCCESS_KEY, "true");
        sessionStorage.setItem(SIGNUP_EMAIL_KEY, trimmedEmail);
        setSubmittedEmail(trimmedEmail);
        setSignupSuccess(true);
      }
    } catch {
      // Error is already handled in store
      isSubmittingRef.current = false;
    }
  };

  // サインアップ成功時のメッセージ
  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <Card className="w-full max-w-md bg-card text-foreground border border-border/60 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              認証メールを送信しました
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-md">
              <p className="text-sm text-green-700 dark:text-green-400">
                <strong>{submittedEmail}</strong> に認証メールを送信しました。
              </p>
            </div>
            <p className="text-muted-foreground text-sm">
              メールに記載されたリンクをクリックして、メールアドレスを認証してください。
              認証が完了すると、ログインできるようになります。
            </p>
            <div className="pt-4">
              <Link
                to="/signin"
                className="text-primary hover:underline text-sm"
              >
                サインインページへ
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
        {/* 左側: サインアップフォーム */}
        <Card className="w-full max-w-md bg-card text-foreground border border-border/60 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bold text-center">
              Sign Up
            </CardTitle>
            <p className="text-sm text-muted-foreground text-center">
              Create a new account to get started
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md">
                  {error}
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  required
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
                  placeholder="you@example.com"
                />
                {fieldErrors.email && (
                  <p className="text-sm text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
                  placeholder="••••••••"
                />
                {fieldErrors.password && (
                  <p className="text-sm text-red-600">{fieldErrors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  required
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
                  placeholder="••••••••"
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-sm text-red-600">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              {/* Turnstile Captcha */}
              <div className="space-y-2">
                <Turnstile
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={(token) => {
                    // 送信中・送信成功後はTurnstileの状態更新を無視
                    if (isSubmittingRef.current) return;
                    setTurnstileToken(token);
                    setFieldErrors((prev) => ({ ...prev, turnstile: undefined }));
                  }}
                  onError={() => {
                    if (isSubmittingRef.current) return;
                    setFieldErrors((prev) => ({ ...prev, turnstile: "Captcha failed. Please try again." }));
                  }}
                  onExpire={() => {
                    if (isSubmittingRef.current) return;
                    setTurnstileToken("");
                  }}
                  options={{
                    theme: "auto",
                    size: "normal",
                  }}
                />
                {fieldErrors.turnstile && (
                  <p className="text-sm text-red-600">{fieldErrors.turnstile}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-primary/70 shadow-sm flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  "Sign Up"
                )}
              </button>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/signin" className="text-primary hover:underline">
                  Sign in
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
