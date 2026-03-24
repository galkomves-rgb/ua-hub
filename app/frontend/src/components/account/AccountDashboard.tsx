import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Briefcase, Clock3, Heart, MessageSquare, NotebookPen, ShieldAlert } from "lucide-react";
import { fetchAccountDashboard, type AccountDashboardResponse } from "@/lib/account-api";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

const METRICS: Array<{
  key: keyof AccountDashboardResponse;
  labelKey: string;
  icon: typeof Briefcase;
}> = [
  { key: "active_listings_count", labelKey: "account.dashboard.activeListings", icon: Briefcase },
  { key: "draft_listings_count", labelKey: "account.dashboard.draftListings", icon: NotebookPen },
  { key: "saved_listings_count", labelKey: "account.dashboard.savedListings", icon: Heart },
  { key: "unread_messages_count", labelKey: "account.dashboard.unreadMessages", icon: MessageSquare },
  { key: "business_profiles_count", labelKey: "account.dashboard.businessProfiles", icon: AlertTriangle },
  { key: "expiring_soon_count", labelKey: "account.dashboard.expiringSoon", icon: Clock3 },
  { key: "moderation_issues_count", labelKey: "account.dashboard.moderationIssues", icon: ShieldAlert },
];

export function AccountDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  const { data, isLoading, isError, refetch, error } = useQuery({
    queryKey: ["account-dashboard"],
    queryFn: fetchAccountDashboard,
  });

  return (
    <section
      className={`rounded-3xl border p-5 md:p-6 ${
        isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-6">
        <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {t("account.dashboard.welcome")}
        </p>
        <h2 className={`mt-1 text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          {user?.name || user?.email || t("account.title")}
        </h2>
      </div>

      {isLoading ? (
        <div className={`rounded-2xl border p-6 text-sm ${isDark ? "border-[#22416b] text-slate-400" : "border-slate-200 text-slate-500"}`}>
          {t("common.loading")}
        </div>
      ) : isError ? (
        <div className={`rounded-2xl border p-6 ${isDark ? "border-red-900/40 bg-red-950/20" : "border-red-200 bg-red-50"}`}>
          <p className={`text-sm ${isDark ? "text-red-300" : "text-red-600"}`}>
            {error instanceof Error ? error.message : t("account.loadError")}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className={`mt-4 rounded-xl px-4 py-2 text-sm font-medium ${
              isDark ? "bg-[#1a2d4c] text-slate-100" : "bg-white text-slate-700"
            }`}
          >
            {t("account.retry")}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {METRICS.map(({ key, labelKey, icon: Icon }) => (
            <div
              key={key}
              className={`rounded-2xl border p-4 ${
                isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50/70"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t(labelKey)}</p>
                <Icon className={`h-4 w-4 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
              </div>
              <p className={`mt-4 text-3xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                {data?.[key] ?? 0}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
