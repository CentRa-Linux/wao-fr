import { useEffect, useState } from "react";

interface SensitiveMediaGateProps {
  isSensitive?: boolean;
  mediaId?: number;
  children: React.ReactNode;
}

export function SensitiveMediaGate({ isSensitive, mediaId, children }: SensitiveMediaGateProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
  }, [mediaId, isSensitive]);

  if (!isSensitive || revealed) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-amber-500 bg-amber-50 dark:bg-amber-500/20 dark:border-amber-400 dark:text-amber-100 text-amber-900 p-6 text-center">
      <p className="font-medium">センシティブなメディアです</p>
      <p className="text-sm opacity-80">閲覧する場合は下のボタンを押してください</p>
      <button
        type="button"
        className="px-4 py-1.5 rounded-full bg-amber-500 text-white font-semibold hover:bg-amber-600 dark:bg-amber-400 dark:text-black"
        onClick={() => setRevealed(true)}
      >
        表示する
      </button>
    </div>
  );
}
