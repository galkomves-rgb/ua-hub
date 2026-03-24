import { Building2, CreditCard, Heart, LayoutDashboard, ListChecks, LogOut, MessageSquare, Settings, User } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

export type AccountTab =
  | "dashboard"
  | "profile"
  | "business"
  | "listings"
  | "saved"
  | "messages"
  | "billing"
  | "settings";

interface AccountSidebarProps {
  activeTab: AccountTab;
  onNavigate: (tab: AccountTab) => void;
  onLogout: () => Promise<void>;
  onClose?: () => void;
}

const NAV_ITEMS: Array<{ tab: AccountTab; labelKey: string; icon: typeof LayoutDashboard }> = [
  { tab: "dashboard", labelKey: "account.nav.dashboard", icon: LayoutDashboard },
  { tab: "profile", labelKey: "account.nav.profile", icon: User },
  { tab: "business", labelKey: "account.nav.business", icon: Building2 },
  { tab: "listings", labelKey: "account.nav.listings", icon: ListChecks },
  { tab: "saved", labelKey: "account.nav.saved", icon: Heart },
  { tab: "messages", labelKey: "account.nav.messages", icon: MessageSquare },
  { tab: "billing", labelKey: "account.nav.billing", icon: CreditCard },
  { tab: "settings", labelKey: "account.nav.settings", icon: Settings },
];

export function AccountSidebar({ activeTab, onNavigate, onLogout, onClose }: AccountSidebarProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  return (
    <div
      className={`rounded-3xl border p-4 shadow-sm ${
        isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-4 flex items-center justify-between px-2">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            {t("nav.account")}
          </p>
          <p className={`mt-1 text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            {t(`account.nav.${activeTab}`)}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl px-3 py-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            {t("account.closeMenu")}
          </button>
        ) : null}
      </div>

      <nav className="space-y-1">
        {NAV_ITEMS.map(({ tab, labelKey, icon: Icon }) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onNavigate(tab)}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition-colors ${
                isActive
                  ? isDark
                    ? "bg-[#1a2d4c] text-[#FFD700]"
                    : "bg-blue-50 text-[#0057B8]"
                  : isDark
                    ? "text-slate-300 hover:bg-[#162b49]"
                    : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t(labelKey)}</span>
            </button>
          );
        })}
      </nav>

      <div className={`mt-5 border-t pt-4 ${isDark ? "border-[#22416b]" : "border-slate-200"}`}>
        <button
          type="button"
          onClick={() => void onLogout()}
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition-colors ${
            isDark ? "text-red-300 hover:bg-red-950/30" : "text-red-600 hover:bg-red-50"
          }`}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>{t("account.nav.logout")}</span>
        </button>
      </div>
    </div>
  );
}
