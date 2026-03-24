import type { AccountTab } from "@/components/account/AccountSidebar";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

export function AccountPlaceholderPanel({ tab }: { tab: AccountTab }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  return (
    <section
      className={`rounded-3xl border p-5 md:p-6 ${
        isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"
      }`}
    >
      <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
        {t(`account.nav.${tab}`)}
      </h2>
      <p className={`mt-3 max-w-2xl text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        {t("account.placeholder.description")}
      </p>
    </section>
  );
}
