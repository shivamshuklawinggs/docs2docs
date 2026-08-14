"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role, Scope, ShipperMode, User } from "@/types";
import { isCorporate } from "@/lib/rbac";
import { apiClient } from "@/lib/api/client";
import {setToken } from "@/lib/api/http";
import { toast } from "react-toastify";

interface SessionState {
  user: User | null;
  role: Role | null;
  scope: Scope | null;
  mode: ShipperMode; // shipper/receiver only
  branchId: string | "ALL";
  demoMode: boolean;

  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  setBranch: (branchId: string | "ALL") => void;
  setMode: (mode: ShipperMode) => void;
  setDemoMode: (demoMode: boolean) => void;
  setRole: (role: Role) => void;
}

// Build a scope from a user + selected branch.
function scopeFor(user: User, branchId: string | "ALL"): Scope {
  const effective = isCorporate(user.role) ? branchId : user.branchIds[0] ?? "ALL";
  return { companyId: user.companyId, branchId: effective, role: user.role };
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      user: null,
      role: null,
      scope: null,
      mode: "OUTBOUND",
      branchId: "ALL",
      demoMode: false,

      login: async (email, password) => {
        try {
          const res = await apiClient.login(email, password || "demo1234");
          const branchId = res.scope.branchId;
          set({ user: res.user, role: res.user.role, branchId, scope: res.scope });
          return true;
        } catch (e) {
          toast.error((e instanceof Error ? e.message : "Failed to login"));
          return false;
        }
      },

      logout: () => {
        setToken(null);
        set({ user: null, role: null, scope: null });
      },

      setBranch: (branchId) => {
        const { user } = get();
        if (!user) return;
        if (!isCorporate(user.role)) return; // satellite users are locked
        set({ branchId, scope: scopeFor(user, branchId) });
      },

      setMode: (mode) => set({ mode }),
      setDemoMode: (demoMode) => set({ demoMode }),
      setRole: (role) => {
        const { user } = get();
        if (!user) return;
        set({ role, scope: scopeFor(user, get().branchId) });
      },
    }),
    {
      name: "d2d-session",
      partialize: (s) => ({
        role: s.role,
        branchId: s.branchId,
        mode: s.mode,
        userEmail: s.user?.email,
      }),
      // rehydrate the full user object from backend on load
      onRehydrateStorage: () => async (state) => {
        if (!state) return;
        const email = (state as unknown as { userEmail?: string }).userEmail;
        if (email) {
          try {
            const user = await apiClient.me();
            if (user) {
              state.user = user;
              state.role = user.role;
              state.scope = scopeFor(user, state.branchId ?? "ALL");
            }
          } catch {
            // If rehydration fails, session remains null (user will need to login again)
            state.user = null;
            state.role = null;
            state.scope = null;
          }
        }
      },
    }
  )
);
