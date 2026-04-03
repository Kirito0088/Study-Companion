"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SendHorizontal, Paperclip, FileText, Brain, Zap, MessageSquare,
  Bot, User2
} from "lucide-react";
import { useChatStore } from "@/lib/hooks/useChatStore";
import type { ChatMessage, ConfidenceScore } from "@/types";
import { formatTime } from "@/lib/utils/cn";
import { containerVariants as container, itemVariants as item } from "@/lib/utils/variants";


function ConfidenceMeter({ score }: { score: ConfidenceScore }) {
  const color = score.score >= 70 ? "#22c55e" : score.score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] text-text-secondary truncate pr-2">{score.topic}</span>
        <span className="text-[10px] font-bold" style={{ color }}>{score.score}%</span>
      </div>
      <div className="progress-track h-1">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score.score}%` }}
          transition={{ duration: 1 }}
        />
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
        <Bot size={14} className="text-white" />
      </div>
      <div className="chat-ai flex items-center gap-1 px-4 py-3">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { messages, sessionFocus, isTyping, isLoading, sendMessage, loadHistory } = useChatStore();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    await sendMessage(text, sessionFocus?.topic);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const focusPct = sessionFocus
    ? Math.round((sessionFocus.elapsed_minutes / sessionFocus.total_minutes) * 100)
    : 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-6xl">
      <div className="flex gap-5 h-[calc(100vh-112px)]">

        {/* ── Chat Panel ────────────────────────────────────────────────── */}
        <motion.div variants={item} className="flex-1 flex flex-col glass-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-surface-border">
            <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-sm">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">Study Companion</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                <p className="text-[10px] text-text-muted">AI-Powered Study System</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-text-muted text-sm">Loading chat history...</div>
              </div>
            ) : (
              <AnimatePresence>
                {messages.map((msg: ChatMessage) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-end gap-2 mb-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    {/* Avatar */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === "assistant" ? "bg-gradient-primary" : "bg-surface-high"
                    }`}>
                      {msg.role === "assistant"
                        ? <Bot size={13} className="text-white" />
                        : <User2 size={13} className="text-text-secondary" />
                      }
                    </div>

                    <div className={msg.role === "user" ? "items-end flex flex-col" : ""}>
                      {/* Bubble */}
                      <div className={msg.role === "user" ? "chat-user" : "chat-ai"}>
                        {msg.content}
                      </div>

                      {/* File attachment */}
                      {msg.attachment && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mt-2 flex items-center gap-3 p-3 glass-card-elevated rounded-xl border border-primary/20 cursor-pointer hover:border-primary/40 transition-colors max-w-[220px]"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                            <FileText size={14} className="text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-text-primary truncate">{msg.attachment.name}</p>
                            <p className="text-[10px] text-text-muted">{msg.attachment.type} • {msg.attachment.size}</p>
                          </div>
                        </motion.div>
                      )}

                      <p className="text-[9px] text-text-muted mt-1 px-1">
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {/* Typing indicator */}
                {isTyping && <TypingIndicator />}
              </AnimatePresence>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="p-4 border-t border-surface-border">
            <div className="flex items-end gap-2 glass-card-elevated px-4 py-3 rounded-2xl border border-surface-border focus-within:border-primary/40 transition-colors">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your study material..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none leading-relaxed max-h-32"
              />
              <div className="flex items-center gap-1.5 flex-shrink-0 pb-0.5">
                <button className="w-8 h-8 flex items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-high transition-colors">
                  <Paperclip size={15} />
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-gradient-primary text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-glow-sm"
                >
                  <SendHorizontal size={14} />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Right Sidebar ────────────────────────────────────────────── */}
        <motion.div variants={item} className="w-64 flex flex-col gap-4 flex-shrink-0">

          {/* Session focus */}
          {sessionFocus && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-primary" />
                <p className="text-xs font-semibold text-text-primary">Session Focus</p>
              </div>
              <div className="text-center mb-3">
                <p className="text-2xl font-bold gradient-text">
                  {sessionFocus.elapsed_minutes}/{sessionFocus.total_minutes}
                </p>
                <p className="text-[10px] text-text-muted">MIN</p>
              </div>
              <div className="progress-track mb-2">
                <motion.div
                  className="progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${focusPct}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
              <p className="text-xs text-text-secondary text-center">{sessionFocus.topic}</p>
            </div>
          )}

          {/* Topic confidence */}
          {sessionFocus && sessionFocus.confidence_scores.length > 0 && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={14} className="text-tertiary" />
                <p className="text-xs font-semibold text-text-primary">Topic Confidence</p>
              </div>
              {sessionFocus.confidence_scores.map((score) => (
                <ConfidenceMeter key={score.topic} score={score} />
              ))}
            </div>
          )}

          {/* Quick prompts */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={14} className="text-primary" />
              <p className="text-xs font-semibold text-text-primary">Quick Prompts</p>
            </div>
            <div className="space-y-2">
              {["Explain this concept", "Generate practice questions", "Summarize my notes", "Create a study plan"].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="w-full text-left text-xs text-text-secondary px-3 py-2 rounded-lg hover:bg-surface-elevated hover:text-text-primary border border-transparent hover:border-surface-border transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
