import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { PlayCircle, TimerReset } from "lucide-react";
import { toast } from "sonner";
import { runAdminExpirationJobs } from "@/lib/account-api";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

export default function AdminOperationsPage() {
  const { theme } = useTheme();
  const { locale } = useI18n();
  const isDark = theme === "dark";
  const [asOf, setAsOf] = useState("");

  const runMutation = useMutation({
    mutationFn: () => runAdminExpirationJobs(asOf || undefined),
    onSuccess: () => {
      toast.success(locale === "ua" ? "Перевірку завершень виконано" : locale === "es" ? "La revisión de vencimientos se completó" : "Expiry check completed");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : (locale === "ua" ? "Не вдалося запустити перевірку" : locale === "es" ? "No se pudo iniciar la revisión" : "Unable to start the check"));
    },
  });

  const result = runMutation.data;

  return (
    <div className="space-y-6">
      <section className={`rounded-3xl border p-6 md:p-8 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
          <TimerReset className="h-6 w-6" />
        </div>
        <h2 className={`text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          {locale === "ua" ? "Операції" : locale === "es" ? "Operaciones" : "Operations"}
        </h2>
        <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          {locale === "ua"
            ? "Тут можна вручну перевірити завершення терміну дії оголошень, просувань і підписок."
            : locale === "es"
              ? "Aquí puedes lanzar manualmente la revisión de vencimientos de anuncios, promociones y suscripciones."
              : "Run a manual expiry check for listings, promotions, and subscriptions."}
        </p>
      </section>

      <section className={`rounded-3xl border p-5 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
        <label className={`block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
          {locale === "ua" ? "Дата й час для перевірки (необов'язково)" : locale === "es" ? "Fecha y hora para la revisión (opcional)" : "Check date and time (optional)"}
        </label>
        <input
          value={asOf}
          onChange={(event) => setAsOf(event.target.value)}
          placeholder="2025-01-31T12:00:00Z"
          className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
        />

        <button
          type="button"
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending}
          className={`mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-[#FFD700] text-slate-900" : "bg-blue-50 text-[#0057B8]"} ${runMutation.isPending ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <PlayCircle className="h-4 w-4" />
          {locale === "ua" ? "Запустити перевірку" : locale === "es" ? "Iniciar revisión" : "Run check"}
        </button>

        {runMutation.isError ? (
          <div className={`mt-4 rounded-2xl border p-4 text-sm ${isDark ? "border-red-900/40 bg-red-950/20 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}>
            {runMutation.error instanceof Error ? runMutation.error.message : "Failed to run expiration job"}
          </div>
        ) : null}

        {result ? (
          <div className={`mt-6 rounded-3xl border p-5 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard isDark={isDark} label={locale === "ua" ? "Оголошення завершені" : locale === "es" ? "Anuncios finalizados" : "Listings expired"} value={result.expired_listings} />
              <MetricCard isDark={isDark} label={locale === "ua" ? "Просування завершені" : locale === "es" ? "Promociones finalizadas" : "Promotions expired"} value={result.expired_promotions} />
              <MetricCard isDark={isDark} label={locale === "ua" ? "Підписки завершені" : locale === "es" ? "Suscripciones finalizadas" : "Subscriptions expired"} value={result.expired_subscriptions} />
              <MetricCard isDark={isDark} label={locale === "ua" ? "Бізнесів зачеплено" : locale === "es" ? "Negocios afectados" : "Businesses affected"} value={result.affected_business_profile_ids.length} />
            </div>
            <div className={`mt-4 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              <p>{locale === "ua" ? "Перевірено на дату" : locale === "es" ? "Revisión realizada para" : "Checked for"}: {result.as_of}</p>
              <p>{locale === "ua" ? "ID оголошень" : locale === "es" ? "ID de anuncios" : "Listing IDs"}: {result.expired_listing_ids.join(", ") || "-"}</p>
              <p>{locale === "ua" ? "ID просувань" : locale === "es" ? "ID de promociones" : "Promotion IDs"}: {result.expired_promotion_ids.join(", ") || "-"}</p>
              <p>{locale === "ua" ? "ID підписок" : locale === "es" ? "ID de suscripciones" : "Subscription IDs"}: {result.expired_subscription_ids.join(", ") || "-"}</p>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function MetricCard({ isDark, label, value }: { isDark: boolean; label: string; value: number }) {
  return (
    <div className={`rounded-2xl border px-4 py-4 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
      <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-500"}`}>{label}</p>
      <p className={`mt-3 text-3xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}