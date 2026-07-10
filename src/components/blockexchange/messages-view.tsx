"use client";

/**
 * BlockExchange — Direct Messages view (chat box).
 *
 * Inbox list + conversation thread + compose.
 * iPhone-style black theme.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Toaster as SonnerToaster, toast } from "sonner";
import {
  ArrowLeft, Send, Search, Loader2, MessageCircle, X,
  User as UserIcon, Headset,
} from "lucide-react";

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  partnerPhoto: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export function MessagesView() {
  const { user, navigate } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePartner, setActivePartner] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadInbox = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/direct-messages/inbox", { headers: { "x-user-id": user.id } });
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  // Poll inbox every 10s for new messages
  useEffect(() => {
    const interval = setInterval(loadInbox, 10000);
    return () => clearInterval(interval);
  }, [loadInbox]);

  // Load conversation when partner selected
  useEffect(() => {
    if (!activePartner || !user) return;
    fetch(`/api/direct-messages/conversation?partnerId=${activePartner.partnerId}`, {
      headers: { "x-user-id": user.id },
    })
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []))
      .catch(() => toast.error("Failed to load conversation"));
  }, [activePartner, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Search users by name/email/UID
  async function handleSearch(q: string) {
    setSearch(q);
    if (!q.trim() || !user) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
        headers: { "x-user-id": user.id },
      });
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleSend() {
    if (!draft.trim() || !activePartner || !user) return;
    setSending(true);
    try {
      const res = await fetch("/api/direct-messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user.id },
        body: JSON.stringify({ recipientId: activePartner.partnerId, body: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send");
        return;
      }
      setMessages((prev) => [...prev, data.message]);
      setDraft("");
      // Update inbox last message
      setConversations((prev) =>
        prev.map((c) =>
          c.partnerId === activePartner.partnerId
            ? { ...c, lastMessage: data.message.body, lastAt: data.message.createdAt }
            : c
        )
      );
    } catch {
      toast.error("Network error");
    } finally {
      setSending(false);
    }
  }

  function startConversationWith(searchUser: any) {
    const conv: Conversation = {
      partnerId: searchUser.id,
      partnerName: searchUser.name,
      partnerEmail: searchUser.email,
      partnerPhoto: searchUser.photoUrl || "",
      lastMessage: "",
      lastAt: new Date().toISOString(),
      unread: 0,
    };
    setActivePartner(conv);
    setSearch("");
    setSearchResults([]);
    setConversations((prev) => {
      if (prev.find((c) => c.partnerId === conv.partnerId)) return prev;
      return [conv, ...prev];
    });
  }

  // Start conversation with Support (Super Admin) — help line
  async function startSupportChat() {
    if (!user) return;
    try {
      const res = await fetch("/api/users/search?q=trade@proton", {
        headers: { "x-user-id": user.id },
      });
      const data = await res.json();
      const admin = (data.users || [])[0];
      if (admin) {
        startConversationWith({
          id: admin.id,
          name: "BlockExchange Support",
          email: admin.email,
          photoUrl: "",
        });
      } else {
        toast.info("Support will be available soon");
      }
    } catch {
      toast.error("Failed to connect to support");
    }
  }

  if (!user) {
    return (
      <main className="flex-1 pt-20 flex items-center justify-center bg-black">
        <Button onClick={() => navigate("login")}>Please login</Button>
      </main>
    );
  }

  // === CONVERSATION VIEW ===
  if (activePartner) {
    return (
      <main className="flex-1 pt-14 pb-10 bg-black min-h-screen flex flex-col" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif' }}>
        <SonnerToaster richColors position="top-center" />
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-3 border-b" style={{ borderColor: "#38383A" }}>
          <button onClick={() => setActivePartner(null)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-[#0A84FF]" />
          </button>
          <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-bold" style={{ background: "linear-gradient(135deg, #0A84FF, #0D47A1)" }}>
            {activePartner.partnerPhoto ? (
              <img src={activePartner.partnerPhoto} alt={activePartner.partnerName} className="w-full h-full object-cover" />
            ) : (
              activePartner.partnerName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-medium text-sm">{activePartner.partnerName}</div>
            <div className="text-xs" style={{ color: "#8E8E93" }}>{activePartner.partnerEmail}</div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-12" style={{ color: "#8E8E93" }}>
              <MessageCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#48484A" }} />
              <p className="text-sm">No messages yet. Say hello!</p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderId === user.id;
              return (
                <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[75%] px-3.5 py-2 rounded-2xl text-sm"
                    style={{
                      background: isMe ? "#0A84FF" : "#2C2C2E",
                      color: "#fff",
                      borderBottomRightRadius: isMe ? "4px" : "16px",
                      borderBottomLeftRadius: isMe ? "16px" : "4px",
                    }}
                  >
                    <div>{m.body}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: isMe ? "rgba(255,255,255,0.7)" : "#8E8E93" }}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Compose */}
        <div className="px-3 py-3 border-t" style={{ borderColor: "#38383A", paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 rounded-full text-sm text-white outline-none"
              style={{ background: "#1C1C1E", border: "1px solid #38383A" }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !draft.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity disabled:opacity-40"
              style={{ background: "#0A84FF" }}
            >
              {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // === INBOX VIEW ===
  return (
    <main className="flex-1 pt-14 pb-10 bg-black min-h-screen" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif' }}>
      <SonnerToaster richColors position="top-center" />
      <div className="mx-auto max-w-md lg:max-w-2xl px-4">
        {/* iOS large title */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 pt-6">
          <h1 className="text-[34px] font-bold text-white tracking-tight">Messages</h1>
          {conversations.reduce((s, c) => s + c.unread, 0) > 0 && (
            <p className="text-sm mt-1" style={{ color: "#0A84FF" }}>
              {conversations.reduce((s, c) => s + c.unread, 0)} unread
            </p>
          )}
        </motion.div>

        {/* Help Line / Support button — always visible */}
        <button
          onClick={startSupportChat}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl mb-4 transition-colors"
          style={{ background: "linear-gradient(135deg, #0A84FF, #0D47A1)", border: "1px solid rgba(10,132,255,0.3)" }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.2)" }}>
            <Headset className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold text-white">BlockExchange Support</div>
            <div className="text-xs text-white/70">Tap to chat with our help line</div>
          </div>
          <svg className="w-5 h-5 text-white/50" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Search to start new conversation */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8E8E93" }} />
          <input
            placeholder="Search users to message..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: "#1C1C1E", border: "1px solid #38383A" }}
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setSearchResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4" style={{ color: "#8E8E93" }} />
            </button>
          )}
        </div>

        {/* Search results */}
        {search && (
          <div className="rounded-2xl overflow-hidden mb-4" style={{ background: "#1C1C1E", border: "1px solid #38383A" }}>
            {searching ? (
              <div className="p-6 text-center" style={{ color: "#8E8E93" }}>
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Searching...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-6 text-center text-sm" style={{ color: "#8E8E93" }}>
                No users found.
              </div>
            ) : (
              searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => startConversationWith(u)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
                  style={{ borderBottom: "1px solid #38383A" }}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: "linear-gradient(135deg, #0A84FF, #0D47A1)" }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium">{u.name}</div>
                    <div className="text-xs" style={{ color: "#8E8E93" }}>{u.email}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Inbox list */}
        {!search && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "#1C1C1E", border: "1px solid #38383A" }}>
            {loading ? (
              <div className="p-12 text-center" style={{ color: "#8E8E93" }}>
                <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-12 text-center">
                <MessageCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#48484A" }} />
                <h3 className="text-base font-semibold text-white mb-1">No messages</h3>
                <p className="text-sm" style={{ color: "#8E8E93" }}>
                  Search for a user above to start a conversation.
                </p>
              </div>
            ) : (
              conversations.map((c, i, arr) => (
                <button
                  key={c.partnerId}
                  onClick={() => setActivePartner(c)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/5"
                  style={{ borderBottom: i === arr.length - 1 ? "none" : "1px solid #38383A" }}
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-bold" style={{ background: "linear-gradient(135deg, #0A84FF, #0D47A1)" }}>
                      {c.partnerPhoto ? (
                        <img src={c.partnerPhoto} alt={c.partnerName} className="w-full h-full object-cover" />
                      ) : (
                        c.partnerName.charAt(0).toUpperCase()
                      )}
                    </div>
                    {c.unread > 0 && (
                      <span
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: "#FF453A" }}
                      >
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className={`text-sm truncate ${c.unread > 0 ? "text-white font-semibold" : "text-white font-medium"}`}>
                        {c.partnerName}
                      </div>
                      <div className="text-[10px] shrink-0" style={{ color: "#8E8E93" }}>
                        {new Date(c.lastAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </div>
                    </div>
                    <div className={`text-xs truncate mt-0.5 ${c.unread > 0 ? "text-white" : ""}`} style={{ color: c.unread > 0 ? "#fff" : "#8E8E93" }}>
                      {c.lastMessage || "Start a conversation"}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
