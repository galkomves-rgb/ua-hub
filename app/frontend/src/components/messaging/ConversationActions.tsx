import { useState } from "react";
import { ExternalLink, Flag, ShieldBan } from "lucide-react";
import { Link } from "react-router-dom";
import type { MessagingConversationState } from "@/lib/account-api";

type ConversationActionsProps = {
  state: MessagingConversationState | null;
  isDark: boolean;
  t: (key: string) => string;
  blockPending: boolean;
  reportPending: boolean;
  onToggleBlock: () => void;
  onSubmitReport: (reason: string, details: string) => Promise<void> | void;
};

const REPORT_REASONS = ["spam", "abuse", "fraud", "unsafe", "other"] as const;

export function ConversationActions({
  state,
  isDark,
  t,
  blockPending,
  reportPending,
  onToggleBlock,
  onSubmitReport,
}: ConversationActionsProps) {
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>("spam");
  const [details, setDetails] = useState("");

  if (!state) {
    return null;
  }

  const statusMessage = state.blocked_by_current_user
    ? t("msg.blockedByYou")
    : state.blocked_by_other_user
      ? t("msg.blockedByParticipant")
      : state.latest_report_status
        ? `${t("msg.report")}: ${t(`msg.reportStatus.${state.latest_report_status}`)}`
        : null;

  return (
    <div className={`border-b px-4 py-3 ${isDark ? "border-[#22416b] bg-[#10213b]" : "border-slate-200 bg-slate-50/70"}`}>
      <div className="flex flex-wrap items-center gap-2">
        {state.linked_listing_url ? (
          <Link
            to={state.linked_listing_url}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
              isDark ? "bg-[#1a2d4c] text-slate-100" : "bg-white text-slate-700"
            }`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("msg.openLinkedListing")}
          </Link>
        ) : null}

        <button
          type="button"
          onClick={onToggleBlock}
          disabled={blockPending}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
            state.blocked_by_current_user
              ? isDark
                ? "bg-emerald-950/30 text-emerald-300"
                : "bg-emerald-50 text-emerald-700"
              : isDark
                ? "bg-red-950/30 text-red-300"
                : "bg-red-50 text-red-700"
          } ${blockPending ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <ShieldBan className="h-3.5 w-3.5" />
          {state.blocked_by_current_user ? t("msg.unblock") : t("msg.block")}
        </button>

        <button
          type="button"
          onClick={() => setIsReportOpen((current) => !current)}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
            isDark ? "bg-amber-950/30 text-amber-300" : "bg-amber-50 text-amber-700"
          }`}
        >
          <Flag className="h-3.5 w-3.5" />
          {t("msg.report")}
        </button>
      </div>

      {statusMessage ? (
        <p className={`mt-3 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{statusMessage}</p>
      ) : null}

      {isReportOpen ? (
        <div className={`mt-3 rounded-2xl border p-3 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-white"}`}>
          <label className={`mb-2 block text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
            {t("msg.reportReason")}
          </label>
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value as (typeof REPORT_REASONS)[number])}
            className={`h-10 w-full rounded-xl border px-3 text-sm ${
              isDark
                ? "border-[#22416b] bg-[#10213b] text-slate-100"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            {REPORT_REASONS.map((item) => (
              <option key={item} value={item}>{t(`msg.reportReason.${item}`)}</option>
            ))}
          </select>

          <label className={`mb-2 mt-3 block text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
            {t("msg.reportDetails")}
          </label>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={3}
            className={`w-full rounded-xl border px-3 py-2 text-sm ${
              isDark
                ? "border-[#22416b] bg-[#10213b] text-slate-100"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
            placeholder={t("msg.reportHelp")}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                await onSubmitReport(reason, details.trim());
                setDetails("");
                setIsReportOpen(false);
              }}
              disabled={reportPending}
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                isDark ? "bg-[#FFD700] text-[#0d1a2e]" : "bg-[#0057B8] text-white"
              } ${reportPending ? "cursor-not-allowed opacity-60" : ""}`}
            >
              {t("msg.reportSubmit")}
            </button>
            <button
              type="button"
              onClick={() => setIsReportOpen(false)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                isDark ? "bg-[#1a2d4c] text-slate-100" : "bg-slate-100 text-slate-700"
              }`}
            >
              {t("msg.reportCancel")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}