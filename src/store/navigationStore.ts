import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PageId =
  | "login"
  | "register"
  | "dashboard"
  | "chat"
  | "documents"
  | "knowledge-bases"
  | "agent-studio"
  | "workflows"
  | "model-settings"
  | "tenants"
  | "billing"
  | "enterprise-settings"
  | "analytics"
  | "team"
  | "webhooks"
  | "profile"
  | "api-keys"
  | "audit-logs"
  | "observability"
  | "guardrails";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

interface NavigationState {
  activePage: PageId;
  sidebarOpen: boolean;
  setActivePage: (page: PageId) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: "auth-store",
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    }
  )
);

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      activePage: "dashboard",
      sidebarOpen: true,
      setActivePage: (page) => set({ activePage: page }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    { name: "nav-store", partialize: (s) => ({ activePage: s.activePage }) }
  )
);