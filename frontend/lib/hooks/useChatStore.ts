"use client";

import { create } from "zustand";
import type {
  ChatMessage,
  SessionFocus,
  SendMessagePayload,
} from "@/types";
import { sendChatMessage, getChatHistory } from "@/lib/api/client";

interface ChatState {
  messages: ChatMessage[];
  sessionFocus: SessionFocus | null;
  isTyping: boolean;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  // Actions
  loadHistory: (force?: boolean) => Promise<void>;
  sendMessage: (content: string, topic?: string) => Promise<void>;
  clearError: () => void;
}

let chatHistoryRequest: Promise<void> | null = null;

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessionFocus: null,
  isTyping: false,
  isLoading: false,
  hasLoaded: false,
  error: null,

  loadHistory: async (force = false) => {
    if (!force) {
      const { hasLoaded, isLoading } = get();
      if (hasLoaded || isLoading) {
        return chatHistoryRequest ?? Promise.resolve();
      }
    }

    if (chatHistoryRequest) {
      return chatHistoryRequest;
    }

    set({ isLoading: true, error: null });
    chatHistoryRequest = getChatHistory()
      .then((data) => {
        set({
          messages: data.messages,
          sessionFocus: data.session_focus,
          isLoading: false,
          hasLoaded: true,
        });
      })
      .catch(() => {
        set({ error: "Failed to load chat history", isLoading: false });
      })
      .finally(() => {
        chatHistoryRequest = null;
      });

    return chatHistoryRequest;
  },

  sendMessage: async (content: string, topic = "General Study") => {
    // Optimistically add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, userMsg], isTyping: true, error: null }));

    try {
      const payload: SendMessagePayload = { content, session_topic: topic };
      const response = await sendChatMessage(payload);
      set((s) => ({
        messages: [...s.messages, response.message],
        isTyping: false,
      }));
    } catch {
      set({ error: "Failed to send message", isTyping: false });
    }
  },

  clearError: () => set({ error: null }),
}));

export const chatSelectors = {
  messages: (state: ChatState) => state.messages,
  sessionFocus: (state: ChatState) => state.sessionFocus,
  isTyping: (state: ChatState) => state.isTyping,
  isLoading: (state: ChatState) => state.isLoading,
  error: (state: ChatState) => state.error,
  loadHistory: (state: ChatState) => state.loadHistory,
  sendMessage: (state: ChatState) => state.sendMessage,
  clearError: (state: ChatState) => state.clearError,
};
