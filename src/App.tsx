import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Layout } from "@/components/layout/Layout";
import { SignInPage } from "@/pages/SignIn";
import { SignUpPage } from "@/pages/SignUp";
import { VerifyEmailPage } from "@/pages/VerifyEmail";
import { TimelinePage } from "@/pages/Timeline";
import { ProfilePage } from "@/pages/Profile";
import { NotificationsPage } from "@/pages/Notifications";
import { PostDetailPage } from "@/pages/PostDetail";
import { DraftsPage } from "@/pages/Drafts";
import { BlogListPage } from "@/pages/BlogList";
import { OnboardingPage } from "@/pages/Onboarding";
import ExplorePage from "@/pages/Explore";
import { MessagesPage } from "@/pages/Messages";
import { MessageThreadPage } from "@/pages/MessageThread";
import { CommunitiesPage } from "@/pages/Communities";
import { CommunityDetailPage } from "@/pages/CommunityDetail";
import { CommunityCreatePage } from "@/pages/CommunityCreate";
import { CommunityMembersPage } from "@/pages/CommunityMembers";
import { CommunitySettingsPage } from "@/pages/CommunitySettings";
import { CommunityInvitesPage } from "@/pages/CommunityInvites";

// 重いコンポーネントを遅延読み込み
const SettingsPage = lazy(() => import("@/pages/Settings").then(m => ({ default: m.SettingsPage })));
const BlogCreatePage = lazy(() => import("@/pages/BlogCreate").then(m => ({ default: m.BlogCreatePage })));
const BlogEditPage = lazy(() => import("@/pages/BlogEdit").then(m => ({ default: m.BlogEditPage })));

const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
    <div className="text-lg font-bold text-primary tracking-widest">WAO</div>
  </div>
);

const PageLoader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
  </div>
);

function RequireAuth({ children, allowIncomplete = false }: { children: React.ReactNode; allowIncomplete?: boolean }) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (user.needsOnboarding && !allowIncomplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to={user.needsOnboarding ? "/onboarding" : "/"} replace />;
  }

  return <>{children}</>;
}

function App() {
  const { fetchMe } = useAuthStore();

  useEffect(() => {
    // Try to fetch user on app load
    fetchMe();
  }, [fetchMe]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/signin"
          element={
            <PublicRoute>
              <SignInPage />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={<SignUpPage />}
        />
        <Route
          path="/verify-email"
          element={<VerifyEmailPage />}
        />

        <Route
          path="/onboarding"
          element={
            <RequireAuth allowIncomplete>
              <OnboardingPage />
            </RequireAuth>
          }
        />

        {/* Routes with shared layout */}
        <Route
          path="/"
          element={<Layout />}
        >
          <Route index element={<TimelinePage />} />
          <Route path="explore" element={<ExplorePage />} />
          <Route
            path="notifications"
            element={
              <RequireAuth>
                <NotificationsPage />
              </RequireAuth>
            }
          />
          <Route
            path="blog/create"
            element={
              <RequireAuth>
                <Suspense fallback={<PageLoader />}>
                  <BlogCreatePage />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="blog/edit/:id"
            element={
              <RequireAuth>
                <Suspense fallback={<PageLoader />}>
                  <BlogEditPage />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route path="blogs" element={<BlogListPage />} />
          <Route
            path="drafts"
            element={
              <RequireAuth>
                <DraftsPage />
              </RequireAuth>
            }
          />
          <Route
            path="messages"
            element={
              <RequireAuth>
                <MessagesPage />
              </RequireAuth>
            }
          />
          <Route
            path="messages/:uniqueid"
            element={
              <RequireAuth>
                <MessageThreadPage />
              </RequireAuth>
            }
          />
          <Route
            path="communities"
            element={
              <RequireAuth>
                <CommunitiesPage />
              </RequireAuth>
            }
          />
          <Route
            path="communities/create"
            element={
              <RequireAuth>
                <CommunityCreatePage />
              </RequireAuth>
            }
          />
          <Route
            path="communities/invites"
            element={
              <RequireAuth>
                <CommunityInvitesPage />
              </RequireAuth>
            }
          />
          <Route
            path="communities/:uuid"
            element={
              <RequireAuth>
                <CommunityDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="communities/:uuid/members"
            element={
              <RequireAuth>
                <CommunityMembersPage />
              </RequireAuth>
            }
          />
          <Route
            path="communities/:uuid/settings"
            element={
              <RequireAuth>
                <CommunitySettingsPage />
              </RequireAuth>
            }
          />
          <Route path="posts/:username/:uuid" element={<PostDetailPage />} />
          <Route path="profile/:uniqueid" element={<ProfilePage />} />
          <Route
            path="settings"
            element={
              <RequireAuth>
                <Suspense fallback={<PageLoader />}>
                  <SettingsPage />
                </Suspense>
              </RequireAuth>
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
