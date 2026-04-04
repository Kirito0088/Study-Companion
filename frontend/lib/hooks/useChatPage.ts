"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { chatSelectors, useChatStore } from "@/lib/hooks/useChatStore";

export function useChatPage() {
  const messages = useChatStore(chatSelectors.messages);
  const sessionFocus = useChatStore(chatSelectors.sessionFocus);
  const isTyping = useChatStore(chatSelectors.isTyping);
  const isLoading = useChatStore(chatSelectors.isLoading);
  const loadHistory = useChatStore(chatSelectors.loadHistory);
  const sendMessage = useChatStore(chatSelectors.sendMessage);

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const scrollToBottom = useEffectEvent(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  const latestMessageId = messages.at(-1)?.id;

  useEffect(() => {
    scrollToBottom();
  }, [isTyping, latestMessageId]);

  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) {
      return;
    }

    setInput("");
    await sendMessage(trimmedInput, sessionFocus?.topic);
  }, [input, sendMessage, sessionFocus?.topic]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }, [handleSend]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const handlePromptSelect = useCallback((prompt: string) => {
    setInput(prompt);
  }, []);

  const focusPct = sessionFocus
    ? Math.round((sessionFocus.elapsed_minutes / sessionFocus.total_minutes) * 100)
    : 0;

  return {
    messages,
    sessionFocus,
    isTyping,
    isLoading,
    input,
    bottomRef,
    focusPct,
    handleSend,
    handleKeyDown,
    handleInputChange,
    handlePromptSelect,
  };
}
