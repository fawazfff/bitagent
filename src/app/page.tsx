"use client";

import { useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"chat" | "dashboard">("chat");

  return (
    <div className="flex flex-col h-screen">
      {/* Top nav */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">BitAgent</h1>
            <p className="text-[10px] text-text-muted">Paper Trading Terminal</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-surface-2 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "chat"
                ? "bg-accent text-white"
                : "text-text-dim hover:text-foreground"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "dashboard"
                ? "bg-accent text-white"
                : "text-text-dim hover:text-foreground"
            }`}
          >
            Dashboard
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
          <span className="text-[10px] text-text-muted uppercase tracking-wider">Live</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === "chat" ? <ChatInterface /> : <Dashboard />}
      </main>
    </div>
  );
}
