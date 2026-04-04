"use client";

import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  activeRoute: string;
  setSidebarOpen: (open: boolean) => void;
  setActiveRoute: (route: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeRoute: "/",
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveRoute: (route) => set({ activeRoute: route }),
}));
