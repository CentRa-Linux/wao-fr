import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setErrorMessage("認証トークンが指定されていません");
      return;
    }

    const verifyEmail = async () => {
      try {
        await api.verifyEmail(token);
        setStatus("success");
        // 3秒後にサインインページにリダイレクト
        setTimeout(() => {
          navigate("/signin?verified=true");
        }, 3000);
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "認証に失敗しました");
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <Card className="w-full max-w-md bg-card text-foreground border border-border/60 shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            メールアドレス認証
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              <p className="text-muted-foreground">認証中...</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <p className="text-lg font-medium text-green-600 dark:text-green-400">
                メールアドレスの認証が完了しました
              </p>
              <p className="text-sm text-muted-foreground">
                まもなくサインインページに移動します...
              </p>
              <Link
                to="/signin?verified=true"
                className="inline-block text-primary hover:underline text-sm"
              >
                今すぐサインインページへ
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <p className="text-lg font-medium text-destructive">
                認証に失敗しました
              </p>
              <p className="text-sm text-muted-foreground">
                {errorMessage}
              </p>
              <div className="pt-4 space-y-2">
                <Link
                  to="/signin"
                  className="inline-block w-full py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors text-center"
                >
                  サインインページへ
                </Link>
                <p className="text-xs text-muted-foreground">
                  認証メールを再送信するには、サインインページでメールアドレスを入力してください
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
