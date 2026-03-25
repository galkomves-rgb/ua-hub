import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Send, MessageSquare, Inbox, Clock, ChevronRight, User,
} from "lucide-react";
import Layout from "@/components/Layout";
import { authApi, redirectToAuthEntry } from "@/lib/auth";
import { getAPIBaseURL } from "@/lib/config";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

interface ConversationSummary {
  other_user_id: string;
  listing_id: string | null;
  listing_title: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  is_sender: boolean;
}

interface Message {
  id: number;
  user_id: string;
  recipient_id: string;
  listing_id: string | null;
  listing_title: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function MessagesPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";
  const [searchParams] = useSearchParams();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [selectedConv, setSelectedConv] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authApi.getCurrentUser();
        if (user) {
          setIsLoggedIn(true);
          setCurrentUserId(user.id || "");
          await loadInbox();
        }
      } catch {
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Auto-select conversation from URL params
  useEffect(() => {
    const recipientId = searchParams.get("to");
    const listingId = searchParams.get("listing");
    const listingTitle = searchParams.get("title");
    if (recipientId && isLoggedIn) {
      setSelectedConv({
        other_user_id: recipientId,
        listing_id: listingId,
        listing_title: listingTitle,
        last_message: "",
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        is_sender: true,
      });
    }
  }, [searchParams, isLoggedIn]);

  // Load conversation when selected
  useEffect(() => {
    if (selectedConv && isLoggedIn) {
      loadConversation(selectedConv.other_user_id, selectedConv.listing_id);
    }
  }, [selectedConv, isLoggedIn]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadInbox = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${getAPIBaseURL()}/api/v1/messaging/inbox`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        setTotalUnread(data.total_unread || 0);
      }
    } catch (err) {
      console.error("Failed to load inbox:", err);
    }
  };

  const loadConversation = async (otherUserId: string, listingId: string | null) => {
    try {
      const token = localStorage.getItem("auth_token");
      let url = `/api/v1/messaging/conversation?other_user_id=${otherUserId}`;
      if (listingId) url += `&listing_id=${listingId}`;
      const res = await fetch(`${getAPIBaseURL()}${url}`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
        // Mark unread messages as read
        const unreadIds = (Array.isArray(data) ? data : [])
          .filter((m: Message) => m.recipient_id === currentUserId && !m.is_read)
          .map((m: Message) => m.id);
        if (unreadIds.length > 0) {
          await fetch(`${getAPIBaseURL()}/api/v1/messaging/mark-read`, {
            method: "POST",
            body: JSON.stringify({ message_ids: unreadIds }),
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
          await loadInbox();
        }
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv || sending) return;
    setSending(true);
    try {
      const token = localStorage.getItem("auth_token");
      const body: Record<string, string> = {
        recipient_id: selectedConv.other_user_id,
        content: newMessage.trim(),
      };
      if (selectedConv.listing_id) body.listing_id = selectedConv.listing_id;
      if (selectedConv.listing_title) body.listing_title = selectedConv.listing_title;

      await fetch(`${getAPIBaseURL()}/api/v1/messaging/send`, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      setNewMessage("");
      await loadConversation(selectedConv.other_user_id, selectedConv.listing_id);
      await loadInbox();
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffH = Math.floor(diffMs / 3600000);
      if (diffH < 1) return `${Math.max(1, Math.floor(diffMs / 60000))} хв`;
      if (diffH < 24) return `${diffH} год`;
      return d.toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
    } catch {
      return "";
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <div className={`animate-spin w-8 h-8 border-2 rounded-full mx-auto mb-4 ${isDark ? "border-[#FFD700] border-t-transparent" : "border-[#0057B8] border-t-transparent"}`} />
          <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("common.loading")}</p>
        </div>
      </Layout>
    );
  }

  if (!isLoggedIn) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <MessageSquare className={`w-12 h-12 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
          <h1 className={`text-xl font-bold mb-2 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
            {t("msg.title")}
          </h1>
          <p className={`text-sm mb-5 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            {t("msg.loginRequired")}
          </p>
          <button
            onClick={redirectToAuthEntry}
            className={`h-10 px-6 text-sm font-semibold rounded-xl transition-all active:scale-95 ${
              isDark
                ? "bg-gradient-to-r from-[#FFD700] to-[#e6c200] text-[#0d1a2e]"
                : "bg-gradient-to-r from-[#0057B8] to-[#0070E0] text-white"
            }`}
          >
            {t("nav.login")}
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-5">
          <Link to="/" className={`${isDark ? "text-[#4a9eff]" : "text-[#0057B8]"}`}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className={`text-xl font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>
            {t("msg.title")}
            {totalUnread > 0 && (
              <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${isDark ? "bg-red-900/40 text-red-400" : "bg-red-50 text-red-600"}`}>
                {totalUnread}
              </span>
            )}
          </h1>
        </div>

        <div className={`flex rounded-xl border overflow-hidden ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`} style={{ height: "calc(100vh - 200px)", minHeight: "400px" }}>
          {/* Conversations list */}
          <div className={`w-full sm:w-80 shrink-0 border-r flex flex-col ${isDark ? "border-[#1a3050]" : "border-gray-100"} ${selectedConv ? "hidden sm:flex" : "flex"}`}>
            <div className={`px-4 py-3 border-b ${isDark ? "border-[#1a3050]" : "border-gray-100"}`}>
              <h2 className={`text-sm font-bold ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                <Inbox className="w-4 h-4 inline mr-1.5" />
                {t("msg.inbox")}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageSquare className={`w-8 h-8 mx-auto mb-2 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("msg.empty")}</p>
                </div>
              ) : (
                conversations.map((conv, i) => (
                  <button
                    key={`${conv.other_user_id}-${conv.listing_id || i}`}
                    onClick={() => setSelectedConv(conv)}
                    className={`w-full text-left px-4 py-3 border-b transition-colors ${
                      selectedConv?.other_user_id === conv.other_user_id && selectedConv?.listing_id === conv.listing_id
                        ? isDark ? "bg-[#1a2a40]" : "bg-blue-50"
                        : isDark ? "hover:bg-[#162236]" : "hover:bg-gray-50"
                    } ${isDark ? "border-[#1a3050]" : "border-gray-50"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isDark ? "bg-[#1a2a40]" : "bg-gray-100"}`}>
                        <User className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold truncate ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                            {conv.other_user_id.slice(0, 8)}...
                          </span>
                          <span className={`text-[10px] shrink-0 ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                            {formatTime(conv.last_message_at)}
                          </span>
                        </div>
                        {conv.listing_title && (
                          <p className={`text-[10px] truncate mt-0.5 ${isDark ? "text-[#4a9eff]" : "text-[#0057B8]"}`}>
                            {conv.listing_title}
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className={`text-xs truncate ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            {conv.last_message}
                          </p>
                          {conv.unread_count > 0 && (
                            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className={`flex-1 flex flex-col ${!selectedConv ? "hidden sm:flex" : "flex"}`}>
            {selectedConv ? (
              <>
                {/* Chat header */}
                <div className={`px-4 py-3 border-b flex items-center gap-3 ${isDark ? "border-[#1a3050]" : "border-gray-100"}`}>
                  <button
                    onClick={() => setSelectedConv(null)}
                    className={`sm:hidden ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-[#1a2a40]" : "bg-gray-100"}`}>
                    <User className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold truncate ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                      {selectedConv.other_user_id.slice(0, 12)}...
                    </p>
                    {selectedConv.listing_title && (
                      <p className={`text-[11px] truncate ${isDark ? "text-[#4a9eff]" : "text-[#0057B8]"}`}>
                        {selectedConv.listing_title}
                      </p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <p className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>{t("msg.startConversation")}</p>
                    </div>
                  )}
                  {messages.map((msg) => {
                    const isMine = msg.user_id === currentUserId;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl ${
                          isMine
                            ? isDark
                              ? "bg-[#0057B8] text-white rounded-br-md"
                              : "bg-[#0057B8] text-white rounded-br-md"
                            : isDark
                              ? "bg-[#1a2a40] text-gray-200 rounded-bl-md"
                              : "bg-gray-100 text-gray-800 rounded-bl-md"
                        }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isMine ? "text-white/60" : isDark ? "text-gray-500" : "text-gray-400"}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className={`px-4 py-3 border-t ${isDark ? "border-[#1a3050]" : "border-gray-100"}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder={t("msg.placeholder")}
                      className={`flex-1 h-10 px-4 text-sm rounded-xl border focus:outline-none transition-all ${
                        isDark
                          ? "bg-[#0d1a2e] border-[#1a3050] text-gray-200 placeholder:text-gray-600 focus:border-[#4a9eff]"
                          : "bg-gray-50 border-gray-200 text-gray-700 placeholder:text-gray-300 focus:border-blue-400"
                      }`}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 ${
                        isDark
                          ? "bg-gradient-to-r from-[#FFD700] to-[#e6c200] text-[#0d1a2e]"
                          : "bg-gradient-to-r from-[#0057B8] to-[#0070E0] text-white"
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className={`w-12 h-12 mx-auto mb-3 ${isDark ? "text-gray-700" : "text-gray-200"}`} />
                  <p className={`text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {t("msg.selectConversation")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}