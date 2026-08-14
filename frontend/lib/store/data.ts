"use client";

import { create } from "zustand";

// Bumped after any mock mutation so views depending on it refetch.
interface DataState {
  version: number;
  bump: () => void;
}

export const useDataVersion = create<DataState>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));
