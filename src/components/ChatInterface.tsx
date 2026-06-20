"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import TradeCard from "./TradeCard";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  tradeData?: TradeData | null;
  createdAt?: string;
}

interface TradeData {
  tradeId: string;
  symbol: string;
  direction: string;
  leverage: number;
  riskLevel: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  size: number;
  riskRewardRatio: number;
  thesis: string;
  currentPrice: number;
  high24h: number;
  low24h: number;
  change24h: number;
  balanceBefore: number;
  requiredMargin: number;
  remainingBalance: number;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, conversationId }),
      });

      const data = await res.json();

      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
      }

      const agentMsg: Message = {
        id: data.messageId || `agent-${Date.now()}`,
        role: "agent",
        content: data.response,
        tradeData: data.tradeData || null,
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: "agent",
        content: "Something went wrong. Please try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    "Long BTC with 5x leverage",
    "Short ETH with medium risk",
    "Open a conservative SOL trade",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-foreground">
              BitAgent
            </h2>
            <p className="text-text-dim text-sm max-w-md mb-8 leading-relaxed">
              Your AI-powered paper trading assistant for Bitget futures.
              Describe a trade in natural language and I'll analyze the market,
              calculate risk levels, and simulate the position.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {quickActions.map((action) => (
                <button
                  key={action}
                  onClick={() => {
                    setInput(action);
                    setTimeout(() => {
                      inputRef.current?.focus();
                    }, 0);
                  }}
                  className="text-left px-4 py-3 rounded-lg bg-surface-2 border border-border hover:border-accent/50 hover:bg-surface-3 transition-all text-sm text-text-dim hover:text-foreground"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`animate-fade-in-up flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[75%] ${
                msg.role === "user"
                  ? "bg-accent text-white rounded-2xl rounded-br-md px-4 py-3"
                  : "bg-surface-2 border border-border rounded-2xl rounded-bl-md"
              }`}
            >
              {msg.role === "agent" ? (
                <div className="space-y-3">
                  {msg.tradeData && <TradeCard data={msg.tradeData} />}
                  <div className="text-sm leading-relaxed text-text-dim whitespace-pre-wrap px-1">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-fade-in-up">
            <div className="bg-surface-2 border border-border rounded-2xl rounded-bl-md px-5 py-4">
              <div className="flex items-center gap-1.5">
                <div className="typing-dot w-2 h-2 rounded-full bg-accent" />
                <div className="typing-dot w-2 h-2 rounded-full bg-accent" />
                <div className="typing-dot w-2 h-2 rounded-full bg-accent" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4 bg-surface">
        <div className="max-w-3xl mx-auto flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a trade... (e.g. Long BTC with 10x leverage)"
            rows={1}
            className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-text-muted resize-none focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-5 py-3 bg-accent hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
            Send
          </button>
        </div>
        <p className="text-center text-xs text-text-muted mt-2">
          Paper trading only — no real money at risk
        </p>
      </div>
    </div>
  );
}
