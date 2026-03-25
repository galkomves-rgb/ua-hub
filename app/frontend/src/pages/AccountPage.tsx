import { useEffect, useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import UahubLayout from "@/components/UahubLayout";
import { AccountBusinessPanel } from "@/components/account/AccountBusinessPanel";
import { AccountDashboard } from "@/components/account/AccountDashboard";
import { AccountListingsPanel } from "@/components/account/AccountListingsPanel";
import { AccountMessagesPanel } from "@/components/account/AccountMessagesPanel";
import { AccountPlaceholderPanel } from "@/components/account/AccountPlaceholderPanel";
import { AccountProfilePanel } from "@/components/account/AccountProfilePanel";
import { AccountSavedPanel } from "@/components/account/AccountSavedPanel";
import { AccountSettingsPanel } from "@/components/account/AccountSettingsPanel";
import { AccountSidebar, type AccountTab } from "@/components/account/AccountSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

const ACCOUNT_TABS: AccountTab[] = [
  "dashboard",
  "profile",
  "business",
  "listings",
  "saved",
  "messages",
  "billing",
  "settings",
];

export default function AccountPage() {
  const { user, loading, login, logout } = useAuth();
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeTab = useMemo<AccountTab>(() => {
    const requestedTab = searchParams.get("tab");
    return ACCOUNT_TABS.includes(requestedTab as AccountTab)
      ? (requestedTab as AccountTab)
      : "dashboard";
  }, [searchParams]);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (!requestedTab || !ACCOUNT_TABS.includes(requestedTab as AccountTab)) {
      setSearchParams({ tab: "dashboard" }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const setActiveTab = (tab: AccountTab) => {
    setSearchParams({ tab });
    setIsSidebarOpen(false);
  };

  const renderTab = () => {
    switch (activeTab) {
      case "dashboard":
        return <AccountDashboard />;
      case "profile":
        return <AccountProfilePanel />;
      case "business":
        return <AccountBusinessPanel />;
      case "listings":
        return <AccountListingsPanel />;
      case "messages":
        return <AccountMessagesPanel />;
      case "saved":
        return <AccountSavedPanel />;
      case "settings":
        return <AccountSettingsPanel />;
      case "billing":
        return <AccountPlaceholderPanel tab={activeTab} />;
      default:
        return <AccountDashboard />;
    }
  };

  if (loading) {
    return (
      <UahubLayout>
        <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
          <div className="text-center">
            <div
              className={`mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 ${
                isDark
                  ? "border-[#FFD700] border-t-transparent"
                  : "border-[#0057B8] border-t-transparent"
              }`}
            />
            <p className={isDark ? "text-slate-400" : "text-slate-500"}>
              {t("common.loading")}
            </p>
          </div>
        </div>
      </UahubLayout>
    );
  }

  if (!user) {
    return (
      <UahubLayout>
        <div className="mx-auto max-w-4xl px-4 py-16 lg:px-6">
          <div
            className={`rounded-3xl border p-8 text-center ${
              isDark
                ? "border-[#22416b] bg-[#11203a] text-slate-100"
                : "border-slate-200 bg-white text-slate-900"
            }`}
          >
            <h1 className="mb-3 text-2xl font-bold">{t("account.title")}</h1>
            <p className={`mb-6 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {t("account.loginRequired")}
            </p>
            <button
              type="button"
              onClick={() => login()}
              className={`rounded-2xl px-5 py-3 text-sm font-semibold ${
                isDark
                  ? "bg-gradient-to-r from-[#FFD700] to-[#e6c200] text-[#0d1a2e]"
                  : "bg-gradient-to-r from-[#0057B8] to-[#0070E0] text-white"
              }`}
            >
              {t("account.loginCta")}
            </button>
          </div>
        </div>
      </UahubLayout>
    );
  }

  return (
    <UahubLayout hideModuleNav>
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              {t("account.title")}
            </h1>
            <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {t("account.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium md:hidden ${
              isDark
                ? "border-[#22416b] bg-[#11203a] text-slate-200"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            <Menu className="h-4 w-4" />
            {t("account.mobileMenu")}
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden md:block">
            <AccountSidebar activeTab={activeTab} onNavigate={setActiveTab} onLogout={logout} />
          </aside>

          <main className="min-w-0">{renderTab()}</main>
        </div>
      </div>

      {isSidebarOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={t("account.closeMenu")}
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[88%] max-w-sm p-4">
            <AccountSidebar
              activeTab={activeTab}
              onNavigate={setActiveTab}
              onLogout={logout}
              onClose={() => setIsSidebarOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </UahubLayout>
  );
}
