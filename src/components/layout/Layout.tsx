import { useState, useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, FileText, Home, Search, Bell, Mail, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = async () => {
    await logout();
    navigate("/signin");
  };

  useEffect(() => {
    if (!user) return;

    const loadUnreadCount = async () => {
      try {
        const result = await api.getUnreadCount();
        setUnreadCount(result.count);
      } catch (error) {
        console.error("Failed to load unread count:", error);
      }
    };

    loadUnreadCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [user]);

  if (user && user.needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="bg-card/90 backdrop-blur border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-2xl font-bold text-primary transition-colors hover:opacity-70">
                Wao<span className="text-base font-normal text-muted-foreground">(α)</span>
              </Link>
              <div className="hidden md:flex space-x-1">
                {[
                  { to: "/", label: "Timeline", auth: false },
                  { to: "/explore", label: "Explore", auth: false },
                  { to: "/notifications", label: "Notifications", auth: true },
                  { to: "/messages", label: "Messages", auth: true },
                  { to: "/communities", label: "Communities", auth: true },
                ]
                  .filter((item) => !item.auth || !!user)
                  .map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
                        ? "text-primary nav-active"
                        : "text-muted-foreground hover:text-foreground nav-hover"
                    }`}
                  >
                    {item.label}
                    {item.to === "/notifications" && user && unreadCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs w-5 h-5">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <ThemeToggle />
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground nav-hover px-2 py-1 rounded-md focus:outline-none cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        {user.icon ? (
                          <AvatarImage src={`${BASE_URL}${user.icon}`} alt={user.name} />
                        ) : (
                          <AvatarFallback>{user.name[0]?.toUpperCase() || "U"}</AvatarFallback>
                        )}
                      </Avatar>
                      @{user.uniqueid}
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate(`/profile/${user.uniqueid}`)}>
                      <User className="mr-2 h-4 w-4" />
                      <span>プロフィール</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>設定</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/drafts")}>
                      <FileText className="mr-2 h-4 w-4" />
                      <span>下書き</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-600 focus:text-red-600"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>ログアウト</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/signin"
                    className="px-3 py-1 text-sm border border-border rounded-full text-muted-foreground transition-colors nav-hover hover:text-foreground"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    className="px-3 py-1 text-sm border border-primary/50 rounded-full text-primary transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-primary active:bg-blue-200 dark:active:bg-blue-900/50"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border z-50">
          <div className="flex justify-around items-center h-14">
            {[
              { to: "/", icon: Home, label: "Home" },
              { to: "/explore", icon: Search, label: "Explore" },
              { to: "/notifications", icon: Bell, label: "Notifications", badge: unreadCount },
              { to: "/messages", icon: Mail, label: "Messages" },
              { to: "/communities", icon: Users, label: "Communities" },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to ||
                (item.to !== "/" && location.pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative flex flex-col items-center justify-center w-full h-full transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                  )}
                  <div className={`p-1.5 rounded-full transition-colors ${isActive ? "bg-primary/10" : ""}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {item.badge && item.badge > 0 && (
                    <span className="absolute top-1 right-1/4 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] min-w-[16px] h-4 px-1">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
