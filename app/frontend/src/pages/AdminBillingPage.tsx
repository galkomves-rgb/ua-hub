import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import AdminPagination from "@/components/admin/AdminPagination";
import { fetchAdminBillingPayments, overrideAdminBillingPayment } from "@/lib/account-api";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

const STATUS_OPTIONS = ["all", "pending", "paid", "failed", "expired", "canceled"] as const;
const ENTITLEMENT_OPTIONS = ["", "pending", "active", "expired", "canceled"] as const;
const PAGE_SIZE = 12;

function formatDate(value: string | null, locale: "ua" | "es" | "en") {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale === "ua" ? "uk-UA" : locale === "es" ? "es-ES" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminBillingPage() {
  const { theme } = useTheme();
  const { locale } = useI18n();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [searchText, setSearchText] = useState("");
  const [offset, setOffset] = useState(0);
  const [paymentStatuses, setPaymentStatuses] = useState<Record<number, string>>({});
  const [entitlementStatuses, setEntitlementStatuses] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});

  useEffect(() => {
    setOffset(0);
  }, [status, searchText]);

  const paymentsQuery = useQuery({
    queryKey: ["admin-billing-payments", status, searchText, offset],
    queryFn: () => fetchAdminBillingPayments({ status, q: searchText.trim() || undefined, limit: PAGE_SIZE, offset }),
  });

  const overrideMutation = useMutation({
    mutationFn: ({ paymentId, paymentStatus, entitlementStatus, note }: { paymentId: number; paymentStatus: string; entitlementStatus: string; note: string }) =>
      overrideAdminBillingPayment(paymentId, {
        payment_status: paymentStatus,
        entitlement_status: entitlementStatus || null,
        note: note.trim() || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-billing-payments"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success(locale === "ua" ? "Платіж оновлено" : locale === "es" ? "Pago actualizado" : "Payment updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : (locale === "ua" ? "Не вдалося оновити платіж" : locale === "es" ? "No se pudo actualizar el pago" : "Unable to update the payment"));
    },
  });

  const page = paymentsQuery.data;
  const items = page?.items ?? [];

  return (
    <div className="space-y-6">
      <section className={`rounded-3xl border p-6 md:p-8 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <CreditCard className="h-6 w-6" />
        </div>
        <h2 className={`text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          {locale === "ua" ? "Центр платежів" : locale === "es" ? "Centro de pagos" : "Payments center"}
        </h2>
        <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          {locale === "ua"
            ? "Операційний реєстр платежів із ручним override статусів і entitlement для спірних або завислих оплат."
            : locale === "es"
              ? "Registro operativo de pagos con override manual de estados y entitlement para casos bloqueados o disputados."
              : "Operational payment registry with manual overrides for payment and entitlement states."}
        </p>
      </section>

      <section className={`rounded-3xl border p-5 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className={`flex items-center gap-3 rounded-2xl border px-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-300" : "border-slate-300 bg-white text-slate-700"}`}>
            <Search className="h-4 w-4" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={locale === "ua" ? "Пошук за title, product code, user, failure" : locale === "es" ? "Buscar por título, producto, usuario o fallo" : "Search by title, product, user, or failure"}
              className="h-12 w-full bg-transparent text-sm outline-none"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as (typeof STATUS_OPTIONS)[number])}
            className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
          >
            {STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? (locale === "ua" ? "Усі статуси" : locale === "es" ? "Todos los estados" : "All statuses") : item}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 space-y-4">
          {paymentsQuery.isLoading ? <StateBox isDark={isDark} tone="neutral" text={locale === "ua" ? "Завантаження платежів..." : locale === "es" ? "Cargando pagos..." : "Loading payments..."} /> : null}
          {paymentsQuery.isError ? <StateBox isDark={isDark} tone="danger" text={paymentsQuery.error instanceof Error ? paymentsQuery.error.message : "Failed to load payments"} /> : null}
          {!paymentsQuery.isLoading && !paymentsQuery.isError && items.length === 0 ? <StateBox isDark={isDark} tone="neutral" text={locale === "ua" ? "Платежів за поточними фільтрами не знайдено." : locale === "es" ? "No hay pagos con los filtros actuales." : "No payments found for the current filters."} /> : null}

          {items.map((item) => {
            const nextPaymentStatus = paymentStatuses[item.id] ?? item.status;
            const nextEntitlementStatus = entitlementStatuses[item.id] ?? (item.entitlement_status ?? "");
            const note = notes[item.id] ?? "";
            const isPending = overrideMutation.isPending && overrideMutation.variables?.paymentId === item.id;

            return (
              <article key={item.id} className={`rounded-3xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={`rounded-full px-3 py-1 font-semibold ${isDark ? "bg-[#173052] text-slate-100" : "bg-white text-slate-700"}`}>#{item.id}</span>
                      <span className={`rounded-full px-3 py-1 font-semibold ${isDark ? "bg-[#173052] text-slate-300" : "bg-white text-slate-600"}`}>{item.product_code}</span>
                      <span className={`rounded-full px-3 py-1 font-semibold ${item.status === "paid" ? (isDark ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700") : item.status === "pending" ? (isDark ? "bg-amber-900/40 text-amber-300" : "bg-amber-50 text-amber-700") : (isDark ? "bg-red-900/40 text-red-300" : "bg-red-50 text-red-700")}`}>{item.status}</span>
                    </div>
                    <h3 className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.title}</h3>
                    <div className={`grid gap-2 text-sm sm:grid-cols-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      <p>{locale === "ua" ? "User" : locale === "es" ? "Usuario" : "User"}: {item.user_id}</p>
                      <p>{locale === "ua" ? "Target" : locale === "es" ? "Objetivo" : "Target"}: {item.target_label ?? item.target_type}</p>
                      <p>{locale === "ua" ? "Створено" : locale === "es" ? "Creado" : "Created"}: {formatDate(item.created_at, locale)}</p>
                      <p>{locale === "ua" ? "Оплачено" : locale === "es" ? "Pagado" : "Paid"}: {formatDate(item.paid_at, locale)}</p>
                      <p>{locale === "ua" ? "Period end" : locale === "es" ? "Fin del período" : "Period end"}: {formatDate(item.period_end, locale)}</p>
                      <p>{locale === "ua" ? "Сума" : locale === "es" ? "Importe" : "Amount"}: {item.amount_total} {item.currency}</p>
                    </div>
                    {item.failure_reason ? <p className={`text-sm ${isDark ? "text-amber-300" : "text-amber-700"}`}>{item.failure_reason}</p> : null}
                  </div>

                  <div className="w-full max-w-xl space-y-3 xl:w-[380px]">
                    <select
                      value={nextPaymentStatus}
                      onChange={(event) => setPaymentStatuses((current) => ({ ...current, [item.id]: event.target.value }))}
                      className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#11203a] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
                    >
                      {STATUS_OPTIONS.filter((entry) => entry !== "all").map((entry) => (
                        <option key={entry} value={entry}>{entry}</option>
                      ))}
                    </select>
                    <select
                      value={nextEntitlementStatus}
                      onChange={(event) => setEntitlementStatuses((current) => ({ ...current, [item.id]: event.target.value }))}
                      className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#11203a] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
                    >
                      {ENTITLEMENT_OPTIONS.map((entry) => (
                        <option key={entry || "none"} value={entry}>{entry || (locale === "ua" ? "Без entitlement" : locale === "es" ? "Sin entitlement" : "No entitlement")}</option>
                      ))}
                    </select>
                    <textarea
                      value={note}
                      onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                      rows={3}
                      placeholder={locale === "ua" ? "Причина ручного override" : locale === "es" ? "Motivo del override manual" : "Reason for manual override"}
                      className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#11203a] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
                    />
                    <button
                      type="button"
                      onClick={() => overrideMutation.mutate({ paymentId: item.id, paymentStatus: nextPaymentStatus, entitlementStatus: nextEntitlementStatus, note })}
                      disabled={isPending}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-[#FFD700] text-slate-900" : "bg-blue-50 text-[#0057B8]"} ${isPending ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {locale === "ua" ? "Застосувати override" : locale === "es" ? "Aplicar override" : "Apply override"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6">
          <AdminPagination
            total={page?.total ?? 0}
            limit={page?.limit ?? PAGE_SIZE}
            offset={page?.offset ?? offset}
            isDark={isDark}
            locale={locale}
            onPageChange={setOffset}
          />
        </div>
      </section>
    </div>
  );
}

function StateBox({ isDark, tone, text }: { isDark: boolean; tone: "neutral" | "danger"; text: string }) {
  return (
    <div className={`rounded-2xl border p-4 text-sm ${tone === "danger"
      ? isDark ? "border-red-900/40 bg-red-950/20 text-red-300" : "border-red-200 bg-red-50 text-red-700"
      : isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}
    >
      {text}
    </div>
  );
}