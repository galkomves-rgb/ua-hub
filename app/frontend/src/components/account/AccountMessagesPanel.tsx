import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Inbox, MessageSquare, Send, User } from "lucide-react";
import {
  blockMessagingUser,
  fetchMessagingConversation,
  fetchMessagingConversationState,
  fetchMessagingInbox,
  markMessagesRead,
  reportMessagingUser,
  sendMessage,
  type MessagingConversationSummary,
  type MessagingConversationState,
  type MessagingMessage,
  unblockMessagingUser,
} from "@/lib/account-api";
import { ConversationActions } from "@/components/messaging/ConversationActions";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

function formatTime(dateStr: string, locale: "ua" | "es" | "en") {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    if (diffH < 1) {
      const minutes = Math.max(1, Math.floor(diffMs / 60000));
      if (locale === "es") return `${minutes} min`;
      if (locale === "en") return `${minutes} min`;
      return `${minutes} хв`;
    }
    if (diffH < 24) {
      if (locale === "es") return `${diffH} h`;
      if (locale === "en") return `${diffH} h`;
      return `${diffH} год`;
    }
    const formatterLocale = locale === "ua" ? "uk-UA" : locale === "es" ? "es-ES" : "en-GB";
    return d.toLocaleDateString(formatterLocale, { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

export function AccountMessagesPanel() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedConversation, setSelectedConversation] = useState<MessagingConversationSummary | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const inboxQuery = useQuery({
    queryKey: ["account-messaging-inbox"],
    queryFn: fetchMessagingInbox,
    refetchInterval: 30000,
  });

  const conversationQuery = useQuery({
    queryKey: [
      "account-messaging-conversation",
      selectedConversation?.other_user_id || null,
      selectedConversation?.listing_id || null,
    ],
    queryFn: () =>
      fetchMessagingConversation(
        selectedConversation?.other_user_id || "",
        selectedConversation?.listing_id || null,
      ),
    enabled: Boolean(selectedConversation?.other_user_id),
    refetchInterval: selectedConversation?.other_user_id ? 30000 : false,
  });

  const conversationStateQuery = useQuery({
    queryKey: [
      "account-messaging-conversation-state",
      selectedConversation?.other_user_id || null,
      selectedConversation?.listing_id || null,
    ],
    queryFn: () =>
      fetchMessagingConversationState(
        selectedConversation?.other_user_id || "",
        selectedConversation?.listing_id || null,
      ),
    enabled: Boolean(selectedConversation?.other_user_id),
    refetchInterval: selectedConversation?.other_user_id ? 30000 : false,
  });

  const markReadMutation = useMutation({
    mutationFn: markMessagesRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account-messaging-inbox"] });
      void queryClient.invalidateQueries({ queryKey: ["account-dashboard"] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: async () => {
      setNewMessage("");
      await queryClient.invalidateQueries({ queryKey: ["account-messaging-inbox"] });
      await queryClient.invalidateQueries({
        queryKey: [
          "account-messaging-conversation",
          selectedConversation?.other_user_id || null,
          selectedConversation?.listing_id || null,
        ],
      });
      await queryClient.invalidateQueries({
        queryKey: [
          "account-messaging-conversation-state",
          selectedConversation?.other_user_id || null,
          selectedConversation?.listing_id || null,
        ],
      });
      await queryClient.invalidateQueries({ queryKey: ["account-dashboard"] });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation) {
        throw new Error(t("msg.selectConversation"));
      }

      const currentState = conversationStateQuery.data;
      if (currentState?.blocked_by_current_user) {
        return unblockMessagingUser(selectedConversation.other_user_id);
      }

      return blockMessagingUser(selectedConversation.other_user_id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["account-messaging-conversation-state"] });
      await queryClient.invalidateQueries({ queryKey: ["account-messaging-inbox"] });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (payload: { reason: string; details: string }) => {
      if (!selectedConversation) {
        throw new Error(t("msg.selectConversation"));
      }

      return reportMessagingUser({
        other_user_id: selectedConversation.other_user_id,
        listing_id: selectedConversation.listing_id || undefined,
        reason: payload.reason,
        details: payload.details || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["account-messaging-conversation-state"] });
    },
  });

  useEffect(() => {
    const conversations = inboxQuery.data?.conversations ?? [];
    if (!selectedConversation && conversations.length) {
      setSelectedConversation(conversations[0]);
      return;
    }

    if (selectedConversation) {
      const updatedConversation = conversations.find(
        (conversation) =>
          conversation.other_user_id === selectedConversation.other_user_id &&
          conversation.listing_id === selectedConversation.listing_id,
      );
      if (updatedConversation) {
        setSelectedConversation(updatedConversation);
      }
    }
  }, [inboxQuery.data, selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationQuery.data]);

  useEffect(() => {
    if (!selectedConversation || !conversationQuery.data || !user?.id) {
      return;
    }

    const unreadIds = conversationQuery.data
      .filter((message) => message.recipient_id === user.id && !message.is_read)
      .map((message) => message.id);

    if (unreadIds.length > 0) {
      markReadMutation.mutate(unreadIds);
    }
  }, [conversationQuery.data, markReadMutation, selectedConversation, user?.id]);

  const handleSend = () => {
    if (
      !selectedConversation ||
      !newMessage.trim() ||
      sendMessageMutation.isPending ||
      conversationStateQuery.data?.can_send === false
    ) {
      return;
    }

    sendMessageMutation.mutate({
      recipient_id: selectedConversation.other_user_id,
      listing_id: selectedConversation.listing_id || undefined,
      listing_title: selectedConversation.listing_title || undefined,
      content: newMessage.trim(),
    });
  };

  const conversations = inboxQuery.data?.conversations ?? [];
  const totalUnread = inboxQuery.data?.total_unread ?? 0;
  const messages = conversationQuery.data ?? [];
  const conversationState: MessagingConversationState | null = conversationStateQuery.data ?? null;
  const activeParticipant = conversationState?.participant ?? selectedConversation?.participant ?? null;

  return (
    <section
      className={`rounded-3xl border p-0 overflow-hidden ${
        isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"
      }`}
    >
      <div className={`border-b px-5 py-5 md:px-6 ${isDark ? "border-[#22416b]" : "border-slate-200"}`}>
        <div className="flex items-center gap-3">
          <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            {t("msg.title")}
          </h2>
          {totalUnread > 0 ? (
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${isDark ? "bg-red-950/40 text-red-300" : "bg-red-50 text-red-600"}`}>
              {totalUnread}
            </span>
          ) : null}
        </div>
        <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {t("account.messages.subtitle")}
        </p>
      </div>

      {inboxQuery.isLoading ? (
        <div className="p-6">
          <p className={isDark ? "text-slate-400" : "text-slate-500"}>{t("common.loading")}</p>
        </div>
      ) : inboxQuery.isError ? (
        <div className="p-6">
          <p className={isDark ? "text-red-300" : "text-red-600"}>
            {inboxQuery.error instanceof Error ? inboxQuery.error.message : t("account.loadError")}
          </p>
          <button
            type="button"
            onClick={() => void inboxQuery.refetch()}
            className={`mt-4 rounded-xl px-4 py-2 text-sm font-medium ${
              isDark ? "bg-[#1a2d4c] text-slate-100" : "bg-slate-100 text-slate-700"
            }`}
          >
            {t("account.retry")}
          </button>
        </div>
      ) : (
        <div className={`flex min-h-[560px] ${isDark ? "bg-[#11203a]" : "bg-white"}`}>
          <div
            className={`w-full shrink-0 border-r md:w-80 ${
              isDark ? "border-[#22416b]" : "border-slate-200"
            } ${selectedConversation ? "hidden md:flex md:flex-col" : "flex flex-col"}`}
          >
            <div className={`border-b px-4 py-3 ${isDark ? "border-[#22416b]" : "border-slate-200"}`}>
              <div className={`flex items-center gap-2 text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                <Inbox className="h-4 w-4" />
                {t("msg.inbox")}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageSquare className={`mx-auto mb-3 h-8 w-8 ${isDark ? "text-slate-600" : "text-slate-300"}`} />
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("msg.empty")}</p>
                </div>
              ) : (
                conversations.map((conversation, index) => {
                  const isActive =
                    selectedConversation?.other_user_id === conversation.other_user_id &&
                    selectedConversation?.listing_id === conversation.listing_id;

                  return (
                    <button
                      key={`${conversation.other_user_id}-${conversation.listing_id || index}`}
                      type="button"
                      onClick={() => setSelectedConversation(conversation)}
                      className={`w-full border-b px-4 py-3 text-left transition-colors ${
                        isActive
                          ? isDark
                            ? "bg-[#1a2d4c]"
                            : "bg-blue-50"
                          : isDark
                            ? "hover:bg-[#162b49]"
                            : "hover:bg-slate-50"
                      } ${isDark ? "border-[#22416b]" : "border-slate-100"}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isDark ? "bg-[#11203a]" : "bg-slate-100"}`}>
                          {conversation.participant.avatar_url ? (
                            <img
                              src={conversation.participant.avatar_url}
                              alt={conversation.participant.display_name}
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <User className={`h-4 w-4 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`truncate text-xs font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                              {conversation.participant.display_name}
                            </span>
                            <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                              {formatTime(conversation.last_message_at, locale)}
                            </span>
                          </div>
                          {conversation.listing_title ? (
                            <p className={`mt-0.5 truncate text-[11px] ${isDark ? "text-[#4a9eff]" : "text-[#0057B8]"}`}>
                              {conversation.listing_title}
                            </p>
                          ) : null}
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <p className={`truncate text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                              {conversation.last_message}
                            </p>
                            {conversation.unread_count > 0 ? (
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                {conversation.unread_count}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className={`flex min-w-0 flex-1 flex-col ${selectedConversation ? "flex" : "hidden md:flex"}`}>
            {selectedConversation ? (
              <>
                <div className={`flex items-center gap-3 border-b px-4 py-3 ${isDark ? "border-[#22416b]" : "border-slate-200"}`}>
                  <button
                    type="button"
                    onClick={() => setSelectedConversation(null)}
                    className={`md:hidden ${isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isDark ? "bg-[#1a2d4c]" : "bg-slate-100"}`}>
                    {activeParticipant?.avatar_url ? (
                      <img
                        src={activeParticipant.avatar_url}
                        alt={activeParticipant.display_name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <User className={`h-4 w-4 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      {activeParticipant?.display_name || selectedConversation.other_user_id}
                    </p>
                    {selectedConversation.listing_title ? (
                      <p className={`truncate text-[11px] ${isDark ? "text-[#4a9eff]" : "text-[#0057B8]"}`}>
                        {selectedConversation.listing_title}
                      </p>
                    ) : null}
                  </div>
                </div>

                <ConversationActions
                  state={conversationState}
                  isDark={isDark}
                  t={t}
                  blockPending={blockMutation.isPending}
                  reportPending={reportMutation.isPending}
                  onToggleBlock={() => blockMutation.mutate()}
                  onSubmitReport={async (reason, details) => {
                    await reportMutation.mutateAsync({ reason, details });
                  }}
                />

                <div className="flex-1 overflow-y-auto p-4">
                  {conversationQuery.isLoading ? (
                    <p className={isDark ? "text-slate-400" : "text-slate-500"}>{t("common.loading")}</p>
                  ) : conversationQuery.isError ? (
                    <p className={isDark ? "text-red-300" : "text-red-600"}>
                      {conversationQuery.error instanceof Error ? conversationQuery.error.message : t("account.loadError")}
                    </p>
                  ) : messages.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("msg.startConversation")}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message: MessagingMessage) => {
                        const isMine = message.user_id === user?.id;
                        return (
                          <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${
                                isMine
                                  ? "rounded-br-md bg-[#0057B8] text-white"
                                  : isDark
                                    ? "rounded-bl-md bg-[#1a2d4c] text-slate-100"
                                    : "rounded-bl-md bg-slate-100 text-slate-800"
                              }`}
                            >
                              <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                              <p className={`mt-1 text-[10px] ${isMine ? "text-white/70" : isDark ? "text-slate-500" : "text-slate-400"}`}>
                                {formatTime(message.created_at, locale)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}

                  {blockMutation.isError ? (
                    <p className={`mt-4 text-sm ${isDark ? "text-red-300" : "text-red-600"}`}>
                      {blockMutation.error instanceof Error ? blockMutation.error.message : t("account.loadError")}
                    </p>
                  ) : null}

                  {reportMutation.isError ? (
                    <p className={`mt-4 text-sm ${isDark ? "text-red-300" : "text-red-600"}`}>
                      {reportMutation.error instanceof Error ? reportMutation.error.message : t("account.loadError")}
                    </p>
                  ) : null}

                  {reportMutation.isSuccess ? (
                    <p className={`mt-4 text-sm ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                      {t("msg.reportSubmitted")}
                    </p>
                  ) : null}
                </div>

                <div className={`border-t px-4 py-3 ${isDark ? "border-[#22416b]" : "border-slate-200"}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(event) => setNewMessage(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={conversationState?.can_send === false ? t("msg.sendBlocked") : t("msg.placeholder")}
                      disabled={conversationState?.can_send === false}
                      className={`h-10 flex-1 rounded-xl border px-4 text-sm ${
                        isDark
                          ? "border-[#22416b] bg-[#0d1a2e] text-slate-100 placeholder:text-slate-600"
                          : "border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-400"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!newMessage.trim() || sendMessageMutation.isPending || conversationState?.can_send === false}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        isDark
                          ? "bg-gradient-to-r from-[#FFD700] to-[#e6c200] text-[#0d1a2e]"
                          : "bg-gradient-to-r from-[#0057B8] to-[#0070E0] text-white"
                      } ${!newMessage.trim() || sendMessageMutation.isPending || conversationState?.can_send === false ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>

                  {sendMessageMutation.isError ? (
                    <p className={`mt-3 text-sm ${isDark ? "text-red-300" : "text-red-600"}`}>
                      {sendMessageMutation.error instanceof Error ? sendMessageMutation.error.message : t("account.loadError")}
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6">
                <div className="text-center">
                  <MessageSquare className={`mx-auto mb-3 h-10 w-10 ${isDark ? "text-slate-700" : "text-slate-300"}`} />
                  <p className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {t("msg.selectConversation")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
