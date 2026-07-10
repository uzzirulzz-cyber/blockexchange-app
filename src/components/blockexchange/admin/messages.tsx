"use client";

/**
 * BlockExchange admin — Customer Messages section.
 *
 * Shows all direct messages between the admin and customers.
 * Admin can read + reply to customer support messages.
 */

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Loader2, Send, ArrowLeft, MessageCircle } from "lucide-react";
import { SectionHeader, SectionShell } from "./shared";
import { useAuth } from "@/lib/auth-store";

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

export function AdminMessages({ userId }: { userId: string }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePartner, setActivePartner] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadInbox = async () => {
    if (!userId) return;
    try {
      const res = await fetch("/api/direct-messages/inbox", { headers: { "x-user-id": userId } });
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInbox(); }, [userId]);
  useEffect(() => {
    const interval = setInterval(loadInbox, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    if (!activePartner || !userId) return;
    fetch(`/api/direct-messages/conversation?partnerId=${activePartner.partnerId}`, {
      headers: { "x-user-id": userId },
    })
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []))
      .catch(() => toast.error("Failed to load conversation"));
  }, [activePartner, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!draft.trim() || !activePartner || !userId) return;
    setSending(true);
    try {
      const res = await fetch("/api/direct-messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ recipientId: activePartner.partnerId, body: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to send"); return; }
      setMessages((prev) => [...prev, data.message]);
      setDraft("");
    } catch { toast.error("Network error"); }
    finally { setSending(false); }
  }

  // === CONVERSATION VIEW ===
  if (activePartner) {
    return (
      <SectionShell>
        <SectionHeader title="Customer Messages" description={`Chatting with ${activePartner.partnerName}`} icon={MessageCircle} />
        <div className="rounded-xl overflow-hidden flex flex-col" style={{ height: "600px", background: "#132F4C", border: "1px solid #1E3A5F" }}>
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3 border-b" style={{ borderColor: "#1E3A5F" }}>
            <button onClick={() => setActivePartner(null)}>
              <ArrowLeft className="w-5 h-5" style={{ color: "#007BFF" }} />
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: "#007BFF" }}>
              {activePartner.partnerName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{activePartner.partnerName}</div>
              <div className="text-xs" style={{ color: "#CCCCCC" }}>{activePartner.partnerEmail}</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {messages.length === 0 ? (
              <div className="text-center py-12" style={{ color: "#CCCCCC" }}>
                <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No messages yet.</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.senderId === userId;
                return (
                  <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[75%] px-3.5 py-2 rounded-2xl text-sm"
                      style={{
                        background: isMe ? "#007BFF" : "#1E3A5F",
                        color: "#fff",
                        borderBottomRightRadius: isMe ? "4px" : "16px",
                        borderBottomLeftRadius: isMe ? "16px" : "4px",
                      }}>
                      <div>{m.body}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: isMe ? "rgba(255,255,255,0.7)" : "#CCCCCC" }}>
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
          <div className="px-3 py-3 border-t" style={{ borderColor: "#1E3A5F" }}>
            <div className="flex items-center gap-2">
              <input type="text" value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type a reply..." className="flex-1 px-4 py-2.5 rounded-full text-sm text-white outline-none"
                style={{ background: "#0A192F", border: "1px solid #1E3A5F" }} />
              <button onClick={handleSend} disabled={sending || !draft.trim()}
                className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40"
                style={{ background: "#007BFF" }}>
                {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>
          </div>
        </div>
      </SectionShell>
    );
  }

  // === INBOX LIST ===
  return (
    <SectionShell>
      <SectionHeader title="Customer Messages" description="Support chat — read and reply to customer messages" icon={MessageCircle} />
      <div className="rounded-xl overflow-hidden" style={{ background: "#132F4C", border: "1px solid #1E3A5F" }}>
        {loading ? (
          <div className="p-12 text-center" style={{ color: "#CCCCCC" }}>
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading...
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-12 text-center">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm" style={{ color: "#CCCCCC" }}>No customer messages yet.</p>
          </div>
        ) : (
          conversations.map((c, i, arr) => (
            <button key={c.partnerId} onClick={() => setActivePartner(c)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/5"
              style={{ borderBottom: i === arr.length - 1 ? "none" : "1px solid #1E3A5F" }}>
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: "#007BFF" }}>
                  {c.partnerName.charAt(0).toUpperCase()}
                </div>
                {c.unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "#DC3545" }}>
                    {c.unread}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className={`text-sm truncate ${c.unread > 0 ? "text-white font-semibold" : "text-white font-medium"}`}>{c.partnerName}</div>
                  <div className="text-[10px] shrink-0" style={{ color: "#CCCCCC" }}>
                    {new Date(c.lastAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </div>
                </div>
                <div className={`text-xs truncate mt-0.5`} style={{ color: c.unread > 0 ? "#fff" : "#CCCCCC" }}>
                  {c.lastMessage || "Start a conversation"}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </SectionShell>
  );
}
