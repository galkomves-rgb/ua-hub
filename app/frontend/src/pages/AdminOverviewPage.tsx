import { useMemo } from "react";
import { AlertTriangle, BarChart3, Building2, CreditCard, FileWarning, ShieldAlert, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchAdminOverview } from "@/lib/account-api";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

export default function AdminOverviewPage() {
  const { theme } = useTheme();
  const { locale, t } = useI18n();
  const isDark = theme === "dark";
  const overviewQuery = useQuery({
    queryKey: ["admin-overview"],
    queryFn: fetchAdminOverview,
  });

  const cards = useMemo(() => {
    const counts = overviewQuery.data?.counts;
    if (!counts) {
      return [] as Array<{ key: string; label: string; value: number; icon: typeof Users; to?: string }>;
    }
    return [
      {
        key: "moderation",
        label: locale === "ua" ? "Очікують модерації" : locale === "es" ? "Pendientes de moderación" : "Pending moderation",
        value: counts.moderation_pending_count,
        icon: ShieldAlert,
        to: "/admin/listings/moderation",
      },
      {
        key: "reports",
        label: locale === "ua" ? "Відкриті скарги" : locale === "es" ? "Reportes abiertos" : "Open reports",
        value: counts.open_reports_count,
        icon: FileWarning,
      },
      {
        key: "payments",
        label: locale === "ua" ? "Проблемні платежі" : locale === "es" ? "Pagos problemáticos" : "Payment issues",
        value: counts.payment_issues_count,
        icon: CreditCard,
      },
      {
        key: "users",
        label: locale === "ua" ? "Користувачі" : locale === "es" ? "Usuarios" : "Users",
        value: counts.total_users_count,
        icon: Users,
      },
      {
        key: "businesses",
        label: locale === "ua" ? "Бізнес-профілі" : locale === "es" ? "Perfiles de negocio" : "Business profiles",
        value: counts.total_business_profiles_count,
        icon: Building2,
      },
      {
        key: "published",
        label: locale === "ua" ? "Опубліковані оголошення" : locale === "es" ? "Anuncios publicados" : "Published listings",
        value: counts.published_listings_count,
        icon: BarChart3,
        to: "/admin/listings",
      },
    ];
  }, [locale, overviewQuery.data?.counts]);

  return (
    <div className="space-y-6">
      <section className={`rounded-3xl border p-6 md:p-8 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0057B8]">
          <BarChart3 className="h-6 w-6" />
        </div>
        <h2 className={`text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          {locale === "ua" ? "Огляд адмін центру" : locale === "es" ? "Resumen del centro admin" : "Admin overview"}
        </h2>
        <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          {locale === "ua"
            ? "Dashboard показує головні черги, ризики та ключові обсяги по платформі."
            : locale === "es"
              ? "El dashboard muestra colas clave, riesgos y volúmenes principales de la plataforma."
              : "The dashboard surfaces key queues, risks, and platform volumes."}
        </p>
      </section>

      {overviewQuery.isLoading ? (
        <div className={`rounded-3xl border p-5 text-sm ${isDark ? "border-[#22416b] bg-[#11203a] text-slate-300" : "border-slate-200 bg-white text-slate-600"}`}>
          {locale === "ua" ? "Завантаження overview..." : locale === "es" ? "Cargando resumen..." : "Loading overview..."}
        </div>
      ) : null}

      {overviewQuery.isError ? (
        <div className={`rounded-3xl border p-5 text-sm ${isDark ? "border-red-900/40 bg-red-950/20 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}>
          {overviewQuery.error instanceof Error ? overviewQuery.error.message : "Failed to load admin overview"}
        </div>
      ) : null}

      {cards.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            const content = (
              <div className={`rounded-3xl border p-5 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{card.label}</p>
                    <p className={`mt-3 text-3xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{card.value}</p>
                  </div>
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isDark ? "bg-[#1a2d4c] text-[#FFD700]" : "bg-blue-50 text-[#0057B8]"}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
              </div>
            );

            return card.to ? <Link key={card.key} to={card.to}>{content}</Link> : <div key={card.key}>{content}</div>;
          })}
        </section>
      ) : null}

      {overviewQuery.data ? (
        <section className="grid gap-6 xl:grid-cols-3">
          <div className={`rounded-3xl border p-5 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                {locale === "ua" ? "Черга модерації" : locale === "es" ? "Cola de moderación" : "Moderation queue"}
              </h3>
              <Link to="/admin/listings/moderation" className="text-sm font-semibold text-[#0057B8]">{t("detail.back")}</Link>
            </div>
            <div className="space-y-3">
              {overviewQuery.data.recent_pending_listings.length > 0 ? overviewQuery.data.recent_pending_listings.map((item) => (
                <Link key={item.id} to="/admin/listings/moderation" className={`block rounded-2xl border px-4 py-3 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.title}</p>
                  <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t(`mod.${item.module}`)} · {item.category}</p>
                </Link>
              )) : (
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{locale === "ua" ? "Черга пуста." : locale === "es" ? "La cola está vacía." : "Queue is empty."}</p>
              )}
            </div>
          </div>

          <div className={`rounded-3xl border p-5 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
            <h3 className={`mb-4 text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              {locale === "ua" ? "Нові скарги" : locale === "es" ? "Nuevos reportes" : "New reports"}
            </h3>
            <div className="space-y-3">
              {overviewQuery.data.recent_reports.length > 0 ? overviewQuery.data.recent_reports.map((item) => (
                <div key={item.id} className={`rounded-2xl border px-4 py-3 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.reason}</p>
                  <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{item.reported_user_id}{item.listing_id ? ` · listing #${item.listing_id}` : ""}</p>
                </div>
              )) : (
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{locale === "ua" ? "Немає відкритих скарг." : locale === "es" ? "No hay reportes abiertos." : "No open reports."}</p>
              )}
            </div>
          </div>

          <div className={`rounded-3xl border p-5 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
            <h3 className={`mb-4 text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              {locale === "ua" ? "Платіжні ризики" : locale === "es" ? "Riesgos de pago" : "Payment risks"}
            </h3>
            <div className="space-y-3">
              {overviewQuery.data.recent_payment_issues.length > 0 ? overviewQuery.data.recent_payment_issues.map((item) => (
                <div key={item.id} className={`rounded-2xl border px-4 py-3 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.title}</p>
                      <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{item.status} · {item.amount_total} {item.currency.toUpperCase()}</p>
                    </div>
                    <AlertTriangle className={`h-4 w-4 shrink-0 ${isDark ? "text-amber-300" : "text-amber-600"}`} />
                  </div>
                  {item.failure_reason ? <p className={`mt-2 text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>{item.failure_reason}</p> : null}
                </div>
              )) : (
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{locale === "ua" ? "Немає проблемних платежів." : locale === "es" ? "No hay pagos problemáticos." : "No payment issues."}</p>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
