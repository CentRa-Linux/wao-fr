import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "ライトモードに切り替える" : "ダークモードに切り替える"}
      className="p-2 rounded-full border border-border bg-card/70 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
