"use client";

import { memo, useCallback } from "react";
import type { ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Brain,
  FileText,
  MessageSquare,
  Paperclip,
  SendHorizontal,
  User2,
  Zap,
} from "lucide-react";
import type { ChatMessage, ConfidenceScore } from "@/types";
import { useChatPage } from "@/lib/hooks/useChatPage";
import { formatTime } from "@/lib/utils/cn";
import { containerVariants as container, itemVariants as item } from "@/lib/utils/variants";

const quickPrompts = [
  "Explain this concept",
  "Generate practice questions",
  "Summarize my notes",
  "Create a study plan",
];

const messageVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const attachmentVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1 },
};

const widthTransition = { duration: 1 };
const buttonHover = { scale: 1.05 };
const buttonTap = { scale: 0.95 };

const TypingIndicator = memo(function TypingIndicator() {
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
});

const ConfidenceMeter = memo(function ConfidenceMeter({ score }: { score: ConfidenceScore }) {
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
          transition={widthTransition}
        />
      </div>
    </div>
  );
});

const ChatMessageItem = memo(function ChatMessageItem({ message }: { message: ChatMessage }) {
  const rowClassName = `flex items-end gap-2 mb-3 ${message.role === "user" ? "flex-row-reverse" : ""}`;
  const avatarClassName = message.role === "assistant" ? "bg-gradient-primary" : "bg-surface-high";
  const contentWrapperClassName = message.role === "user" ? "items-end flex flex-col" : "";

  return (
    <motion.div variants={messageVariants} initial="hidden" animate="show" className={rowClassName}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${avatarClassName}`}>
        {message.role === "assistant"
          ? <Bot size={13} className="text-white" />
          : <User2 size={13} className="text-text-secondary" />
        }
      </div>

      <div className={contentWrapperClassName}>
        <div className={message.role === "user" ? "chat-user" : "chat-ai"}>
          {message.content}
        </div>

        {message.attachment && (
          <motion.div
            variants={attachmentVariants}
            initial="hidden"
            animate="show"
            className="mt-2 flex items-center gap-3 p-3 glass-card-elevated rounded-xl border border-primary/20 cursor-pointer hover:border-primary/40 transition-colors max-w-[220px]"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <FileText size={14} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">{message.attachment.name}</p>
              <p className="text-[10px] text-text-muted">{message.attachment.type} • {message.attachment.size}</p>
            </div>
          </motion.div>
        )}

        <p className="text-[9px] text-text-muted mt-1 px-1">
          {formatTime(message.timestamp)}
        </p>
      </div>
    </motion.div>
  );
});

interface QuickPromptButtonProps {
  prompt: string;
  onSelect: (prompt: string) => void;
}

const QuickPromptButton = memo(function QuickPromptButton({
  prompt,
  onSelect,
}: QuickPromptButtonProps) {
  const handleClick = useCallback(() => {
    onSelect(prompt);
  }, [onSelect, prompt]);

  return (
    <button
      onClick={handleClick}
      className="w-full text-left text-xs text-text-secondary px-3 py-2 rounded-lg hover:bg-surface-elevated hover:text-text-primary border border-transparent hover:border-surface-border transition-all"
    >
      {prompt}
    </button>
  );
});

export function ChatView() {
  const {
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
  } = useChatPage();

  const handleTextareaChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(event.target.value);
  }, [handleInputChange]);

  const handleSendClick = useCallback(() => {
    void handleSend();
  }, [handleSend]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-6xl">
      <div className="flex gap-5 h-[calc(100vh-112px)]">
        <motion.div variants={item} className="flex-1 flex flex-col glass-card overflow-hidden">
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

          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-text-muted text-sm">Loading chat history...</div>
              </div>
            ) : (
              <AnimatePresence>
                {messages.map((message) => (
                  <ChatMessageItem key={message.id} message={message} />
                ))}
                {isTyping && <TypingIndicator />}
              </AnimatePresence>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-4 border-t border-surface-border">
            <div className="flex items-end gap-2 glass-card-elevated px-4 py-3 rounded-2xl border border-surface-border focus-within:border-primary/40 transition-colors">
              <textarea
                value={input}
                onChange={handleTextareaChange}
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
                  whileHover={buttonHover}
                  whileTap={buttonTap}
                  onClick={handleSendClick}
                  disabled={!input.trim() || isTyping}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-gradient-primary text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-glow-sm"
                >
                  <SendHorizontal size={14} />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="w-64 flex flex-col gap-4 flex-shrink-0">
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
                  transition={widthTransition}
                />
              </div>
              <p className="text-xs text-text-secondary text-center">{sessionFocus.topic}</p>
            </div>
          )}

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

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={14} className="text-primary" />
              <p className="text-xs font-semibold text-text-primary">Quick Prompts</p>
            </div>
            <div className="space-y-2">
              {quickPrompts.map((prompt) => (
                <QuickPromptButton key={prompt} prompt={prompt} onSelect={handlePromptSelect} />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
