import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, MessageSquareWarning, Search } from "lucide-react";
import { toast } from "sonner";
import AdminPagination from "@/components/admin/AdminPagination";
import { fetchAdminReports, reviewAdminReport } from "@/lib/account-api";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

const STATUS_OPTIONS = ["all", "pending", "reviewed", "closed"] as const;
const PAGE_SIZE = 12;

function formatDateTime(value: string | null, locale: "ua" | "es" | "en") {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale === "ua" ? "uk-UA" : locale === "es" ? "es-ES" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminReportsPage() {
  const { theme } = useTheme();
  const { locale } = useI18n();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("pending");
  const [searchText, setSearchText] = useState("");
  const [offset, setOffset] = useState(0);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [nextStatuses, setNextStatuses] = useState<Record<number, string>>({});

  useEffect(() => {
    setOffset(0);
  }, [status, searchText]);

  const reportsQuery = useQuery({
    queryKey: ["admin-reports", status, searchText, offset],
    queryFn: () =>
      fetchAdminReports({
        status,
        q: searchText.trim() || undefined,
        limit: PAGE_SIZE,
        offset,
      }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ reportId, nextStatus, note }: { reportId: number; nextStatus: string; note: string }) =>
      reviewAdminReport(reportId, {
        status: nextStatus,
        moderation_note: note.trim() || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast.success(locale === "ua" ? "Статус скарги оновлено" : locale === "es" ? "Estado del reporte actualizado" : "Report status updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : (locale === "ua" ? "Не вдалося оновити скаргу" : locale === "es" ? "No se pudo actualizar el reporte" : "Unable to update the report"));
    },
  });

  const page = reportsQuery.data;
  const items = page?.items ?? [];
  const pendingCount = items.filter((item) => item.status === "pending").length;

  return (
    <div className="space-y-6">
      <section className={`rounded-3xl border p-6 md:p-8 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <MessageSquareWarning className="h-6 w-6" />
        </div>
        <h2 className={`text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          {locale === "ua" ? "Центр скарг" : locale === "es" ? "Centro de reportes" : "Reports center"}
        </h2>
        <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          {locale === "ua"
            ? "Черга користувацьких скарг з ручним переходом між статусами та службовими нотатками для розбору кейсів."
            : locale === "es"
              ? "Cola de reportes con revisión manual de estados y notas internas para cada caso."
              : "User reports queue with manual status transitions and internal moderation notes."}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard isDark={isDark} label={locale === "ua" ? "У поточній сторінці" : locale === "es" ? "En esta página" : "On this page"} value={items.length} />
        <MetricCard isDark={isDark} label={locale === "ua" ? "Очікують" : locale === "es" ? "Pendientes" : "Pending"} value={pendingCount} />
        <MetricCard isDark={isDark} label={locale === "ua" ? "Усього знайдено" : locale === "es" ? "Total encontrado" : "Total matched"} value={page?.total ?? 0} />
      </section>

      <section className={`rounded-3xl border p-5 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className={`flex items-center gap-3 rounded-2xl border px-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-300" : "border-slate-300 bg-white text-slate-700"}`}>
            <Search className="h-4 w-4" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={locale === "ua" ? "Пошук за reason, details, reporter, reported" : locale === "es" ? "Buscar por motivo, detalle, reportante o usuario" : "Search by reason, details, reporter, or user"}
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
                {item === "all"
                  ? locale === "ua" ? "Усі статуси" : locale === "es" ? "Todos los estados" : "All statuses"
                  : item}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 space-y-4">
          {reportsQuery.isLoading ? <StateBox isDark={isDark} tone="neutral" text={locale === "ua" ? "Завантаження скарг..." : locale === "es" ? "Cargando reportes..." : "Loading reports..."} /> : null}
          {reportsQuery.isError ? <StateBox isDark={isDark} tone="danger" text={reportsQuery.error instanceof Error ? reportsQuery.error.message : "Failed to load reports"} /> : null}
          {!reportsQuery.isLoading && !reportsQuery.isError && items.length === 0 ? <StateBox isDark={isDark} tone="neutral" text={locale === "ua" ? "Скарг за поточними фільтрами не знайдено." : locale === "es" ? "No hay reportes con los filtros actuales." : "No reports found for the current filters."} /> : null}

          {items.map((item) => {
            const note = notes[item.id] ?? item.moderation_note ?? "";
            const nextStatus = nextStatuses[item.id] ?? item.status;
            const isPending = reviewMutation.isPending && reviewMutation.variables?.reportId === item.id;

            return (
              <article key={item.id} className={`rounded-3xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={`rounded-full px-3 py-1 font-semibold ${isDark ? "bg-[#173052] text-slate-100" : "bg-white text-slate-700"}`}>#{item.id}</span>
                      <span className={`rounded-full px-3 py-1 font-semibold ${item.status === "pending" ? (isDark ? "bg-amber-900/40 text-amber-300" : "bg-amber-50 text-amber-700") : item.status === "closed" ? (isDark ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700") : (isDark ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700")}`}>{item.status}</span>
                      {item.listing_id ? <span className={`rounded-full px-3 py-1 font-semibold ${isDark ? "bg-[#173052] text-slate-300" : "bg-white text-slate-600"}`}>listing {item.listing_id}</span> : null}
                    </div>
                    <h3 className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.reason}</h3>
                    {item.details ? <p className={`text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>{item.details}</p> : null}
                    <div className={`grid gap-2 text-sm sm:grid-cols-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      <p>{locale === "ua" ? "Reporter" : locale === "es" ? "Reportante" : "Reporter"}: {item.reporter_user_id}</p>
                      <p>{locale === "ua" ? "Reported user" : locale === "es" ? "Usuario reportado" : "Reported user"}: {item.reported_user_id}</p>
                      <p>{locale === "ua" ? "Створено" : locale === "es" ? "Creado" : "Created"}: {formatDateTime(item.created_at, locale)}</p>
                      <p>{locale === "ua" ? "Переглянуто" : locale === "es" ? "Revisado" : "Reviewed"}: {formatDateTime(item.reviewed_at, locale)}</p>
                    </div>
                  </div>

                  <div className="w-full max-w-xl space-y-3 xl:w-[380px]">
                    <select
                      value={nextStatus}
                      onChange={(event) => setNextStatuses((current) => ({ ...current, [item.id]: event.target.value }))}
                      className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#11203a] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
                    >
                      {STATUS_OPTIONS.filter((entry) => entry !== "all").map((entry) => (
                        <option key={entry} value={entry}>{entry}</option>
                      ))}
                    </select>
                    <textarea
                      value={note}
                      onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                      rows={3}
                      placeholder={locale === "ua" ? "Внутрішня нотатка по кейсу" : locale === "es" ? "Nota interna del caso" : "Internal moderation note"}
                      className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#11203a] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
                    />
                    <button
                      type="button"
                      onClick={() => reviewMutation.mutate({ reportId: item.id, nextStatus, note })}
                      disabled={isPending}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-[#FFD700] text-slate-900" : "bg-blue-50 text-[#0057B8]"} ${isPending ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      {locale === "ua" ? "Оновити кейс" : locale === "es" ? "Actualizar caso" : "Update case"}
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

function MetricCard({ isDark, label, value }: { isDark: boolean; label: string; value: number }) {
  return (
    <div className={`rounded-3xl border p-5 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
      <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
      <p className={`mt-3 text-3xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{value}</p>
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