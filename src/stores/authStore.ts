import { create } from "zustand";
import { api } from "@/lib/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, turnstileToken?: string) => Promise<{ emailVerificationRequired: boolean }>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,  // Start with true to prevent redirect before fetchMe completes
  error: null,

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.signIn({ email, password });
      const user = await api.getMe();
      set({ user, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Sign in failed",
        isLoading: false
      });
      throw error;
    }
  },

  signUp: async (email: string, password: string, turnstileToken?: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.signUp({ email, password, turnstileToken });
      // サインアップ後はメール認証が必要なので、ユーザー情報は取得しない
      set({ isLoading: false });
      return { emailVerificationRequired: result.emailVerificationRequired ?? true };
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Sign up failed",
        isLoading: false
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await api.logout();
      set({ user: null, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      // Even if logout fails on server, clear local state
      set({ user: null });
    }
  },

  fetchMe: async () => {
    set({ isLoading: true });
    const token = localStorage.getItem("accessToken");

    // Try using access token first if available
    if (token) {
      try {
        const user = await api.getMe();
        set({ user, isLoading: false });
        return;
      } catch (error) {
        // If token invalid, fall through to refresh attempt
      }
    }

    // Try to refresh token (using httpOnly cookie)
    try {
      await api.refreshToken();
      const user = await api.getMe();
      set({ user, isLoading: false });
    } catch (refreshError) {
      // Refresh failed, clear everything
      localStorage.removeItem("accessToken");
      set({ user: null, isLoading: false });
    }
  },

  refreshToken: async () => {
    try {
      await api.refreshToken();
      const user = await api.getMe();
      set({ user });
    } catch (error) {
      localStorage.removeItem("accessToken");
      set({ user: null });
      throw error;
    }
  },

  setUser: (user: User) => set({ user }),

  clearError: () => set({ error: null }),
}));
