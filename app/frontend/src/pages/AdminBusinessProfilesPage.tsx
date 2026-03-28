import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import AdminPagination from "@/components/admin/AdminPagination";
import {
  fetchAdminBusinessProfiles,
  reviewAdminBusinessSubscription,
  reviewAdminBusinessVerification,
  type AdminBusinessProfileItem,
} from "@/lib/account-api";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

const VERIFICATION_FILTERS = ["all", "pending", "verified", "rejected", "unverified"] as const;
const SUBSCRIPTION_FILTERS = ["all", "pending", "approved", "rejected"] as const;
const PAGE_SIZE = 12;

function formatDate(value: string | null, locale: "ua" | "es" | "en") {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale === "ua" ? "uk-UA" : locale === "es" ? "es-ES" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function AdminBusinessCard({
  item,
  locale,
  isDark,
  onVerificationDecision,
  onSubscriptionDecision,
  isMutating,
}: {
  item: AdminBusinessProfileItem;
  locale: "ua" | "es" | "en";
  isDark: boolean;
  onVerificationDecision: (slug: string, decision: "approved" | "rejected") => void;
  onSubscriptionDecision: (slug: string, decision: "approved" | "rejected", plan?: "basic" | "premium" | "business") => void;
  isMutating: boolean;
}) {
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "premium" | "business">(
    (item.subscription_requested_plan as "basic" | "premium" | "business") || "premium",
  );

  useEffect(() => {
    setSelectedPlan((item.subscription_requested_plan as "basic" | "premium" | "business") || "premium");
  }, [item.subscription_requested_plan]);

  const pendingVerification = item.verification_status === "pending";
  const pendingSubscription = item.subscription_request_status === "pending";

  return (
    <article className={`rounded-3xl border p-5 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-3 py-1 font-semibold ${isDark ? "bg-[#173052] text-slate-100" : "bg-white text-slate-700"}`}>
              {item.slug}
            </span>
            <span className={`rounded-full px-3 py-1 font-semibold ${isDark ? "bg-[#173052] text-slate-300" : "bg-white text-slate-600"}`}>
              {item.city}
            </span>
          </div>

          <h3 className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.name}</h3>

          <div className={`grid gap-2 text-sm sm:grid-cols-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            <p>Owner: {item.owner_user_id}</p>
            <p>{locale === "ua" ? "Категорія" : locale === "es" ? "Categoría" : "Category"}: {item.category}</p>
            <p>{locale === "ua" ? "Верифікація" : locale === "es" ? "Verificación" : "Verification"}: {item.verification_status}</p>
            <p>{locale === "ua" ? "Запит верифікації" : locale === "es" ? "Solicitud de verificación" : "Verification requested"}: {formatDate(item.verification_requested_at, locale)}</p>
            <p>{locale === "ua" ? "Поточний план" : locale === "es" ? "Plan actual" : "Current plan"}: {item.subscription_plan || "-"}</p>
            <p>{locale === "ua" ? "Запит підписки" : locale === "es" ? "Solicitud de suscripción" : "Subscription request"}: {item.subscription_request_status || "-"}</p>
            <p>{locale === "ua" ? "План у запиті" : locale === "es" ? "Plan solicitado" : "Requested plan"}: {item.subscription_requested_plan || "-"}</p>
            <p>{locale === "ua" ? "Оновлено" : locale === "es" ? "Actualizado" : "Updated"}: {formatDate(item.updated_at, locale)}</p>
          </div>
        </div>

        <div className="w-full max-w-sm space-y-4 xl:w-[300px]">
          <div className={`rounded-2xl border p-3 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {locale === "ua" ? "Верифікація" : locale === "es" ? "Verificación" : "Verification"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isMutating || !pendingVerification}
                onClick={() => onVerificationDecision(item.slug, "approved")}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${isMutating || !pendingVerification ? "cursor-not-allowed opacity-60" : ""} ${isDark ? "bg-emerald-900/30 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}
              >
                <CheckCircle2 className="h-4 w-4" />
                {locale === "ua" ? "Схвалити" : locale === "es" ? "Aprobar" : "Approve"}
              </button>
              <button
                type="button"
                disabled={isMutating || !pendingVerification}
                onClick={() => onVerificationDecision(item.slug, "rejected")}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${isMutating || !pendingVerification ? "cursor-not-allowed opacity-60" : ""} ${isDark ? "bg-red-900/30 text-red-300" : "bg-red-50 text-red-700"}`}
              >
                <XCircle className="h-4 w-4" />
                {locale === "ua" ? "Відхилити" : locale === "es" ? "Rechazar" : "Reject"}
              </button>
            </div>
          </div>

          <div className={`rounded-2xl border p-3 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {locale === "ua" ? "Запит підписки" : locale === "es" ? "Solicitud de suscripción" : "Subscription request"}
            </p>
            <select
              value={selectedPlan}
              onChange={(event) => setSelectedPlan(event.target.value as "basic" | "premium" | "business")}
              disabled={isMutating}
              className={`mt-3 w-full rounded-xl border px-3 py-2 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
            >
              <option value="basic">basic</option>
              <option value="premium">premium</option>
              <option value="business">business</option>
            </select>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isMutating || !pendingSubscription}
                onClick={() => onSubscriptionDecision(item.slug, "approved", selectedPlan)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${isMutating || !pendingSubscription ? "cursor-not-allowed opacity-60" : ""} ${isDark ? "bg-emerald-900/30 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}
              >
                <CheckCircle2 className="h-4 w-4" />
                {locale === "ua" ? "Схвалити" : locale === "es" ? "Aprobar" : "Approve"}
              </button>
              <button
                type="button"
                disabled={isMutating || !pendingSubscription}
                onClick={() => onSubscriptionDecision(item.slug, "rejected")}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${isMutating || !pendingSubscription ? "cursor-not-allowed opacity-60" : ""} ${isDark ? "bg-red-900/30 text-red-300" : "bg-red-50 text-red-700"}`}
              >
                <XCircle className="h-4 w-4" />
                {locale === "ua" ? "Відхилити" : locale === "es" ? "Rechazar" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AdminBusinessProfilesPage() {
  const { theme } = useTheme();
  const { locale } = useI18n();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();

  const [verificationStatus, setVerificationStatus] = useState<(typeof VERIFICATION_FILTERS)[number]>("pending");
  const [subscriptionStatus, setSubscriptionStatus] = useState<(typeof SUBSCRIPTION_FILTERS)[number]>("pending");
  const [searchText, setSearchText] = useState("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(0);
  }, [verificationStatus, subscriptionStatus, searchText]);

  const profilesQuery = useQuery({
    queryKey: ["admin-business-profiles", verificationStatus, subscriptionStatus, searchText, offset],
    queryFn: () =>
      fetchAdminBusinessProfiles({
        verification_status: verificationStatus,
        subscription_request_status: subscriptionStatus,
        q: searchText.trim() || undefined,
        limit: PAGE_SIZE,
        offset,
      }),
  });

  const verificationMutation = useMutation({
    mutationFn: ({ slug, decision }: { slug: string; decision: "approved" | "rejected" }) =>
      reviewAdminBusinessVerification(slug, { decision }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-business-profiles"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success(locale === "ua" ? "Статус верифікації оновлено" : locale === "es" ? "Estado de verificación actualizado" : "Verification status updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Request failed");
    },
  });

  const subscriptionMutation = useMutation({
    mutationFn: ({ slug, decision, plan }: { slug: string; decision: "approved" | "rejected"; plan?: "basic" | "premium" | "business" }) =>
      reviewAdminBusinessSubscription(slug, { decision, plan }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-business-profiles"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success(locale === "ua" ? "Статус запиту підписки оновлено" : locale === "es" ? "Estado de solicitud de suscripción actualizado" : "Subscription request status updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Request failed");
    },
  });

  const page = profilesQuery.data;
  const items = page?.items ?? [];
  const isMutating = verificationMutation.isPending || subscriptionMutation.isPending;

  return (
    <div className="space-y-6">
      <section className={`rounded-3xl border p-6 md:p-8 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Building2 className="h-6 w-6" />
        </div>
        <h2 className={`text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          {locale === "ua" ? "Бізнес-профілі" : locale === "es" ? "Perfiles de negocio" : "Business profiles"}
        </h2>
        <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          {locale === "ua"
            ? "Ручна модерація запитів на верифікацію та зміни підписки бізнес-профілів."
            : locale === "es"
              ? "Moderación manual de solicitudes de verificación y cambios de suscripción de perfiles de negocio."
              : "Manual moderation for business profile verification and subscription change requests."}
        </p>
      </section>

      <section className={`rounded-3xl border p-5 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
          <label className={`flex items-center gap-3 rounded-2xl border px-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-300" : "border-slate-300 bg-white text-slate-700"}`}>
            <Search className="h-4 w-4" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={locale === "ua" ? "Пошук за slug, назвою, owner id" : locale === "es" ? "Buscar por slug, nombre, owner id" : "Search by slug, name, owner id"}
              className="h-12 w-full bg-transparent text-sm outline-none"
            />
          </label>
          <select
            value={verificationStatus}
            onChange={(event) => setVerificationStatus(event.target.value as (typeof VERIFICATION_FILTERS)[number])}
            className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
          >
            {VERIFICATION_FILTERS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select
            value={subscriptionStatus}
            onChange={(event) => setSubscriptionStatus(event.target.value as (typeof SUBSCRIPTION_FILTERS)[number])}
            className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
          >
            {SUBSCRIPTION_FILTERS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="mt-6 space-y-4">
          {profilesQuery.isLoading ? (
            <StateBox
              isDark={isDark}
              tone="neutral"
              text={locale === "ua" ? "Завантаження бізнес-профілів..." : locale === "es" ? "Cargando perfiles de negocio..." : "Loading business profiles..."}
            />
          ) : null}

          {profilesQuery.isError ? (
            <StateBox
              isDark={isDark}
              tone="danger"
              text={profilesQuery.error instanceof Error ? profilesQuery.error.message : "Failed to load business profiles"}
            />
          ) : null}

          {!profilesQuery.isLoading && !profilesQuery.isError && items.length === 0 ? (
            <StateBox
              isDark={isDark}
              tone="neutral"
              text={locale === "ua" ? "За поточними фільтрами запитів немає." : locale === "es" ? "No hay resultados con los filtros actuales." : "No results for current filters."}
            />
          ) : null}

          {items.map((item) => (
            <AdminBusinessCard
              key={item.slug}
              item={item}
              locale={locale}
              isDark={isDark}
              onVerificationDecision={(slug, decision) => verificationMutation.mutate({ slug, decision })}
              onSubscriptionDecision={(slug, decision, plan) => subscriptionMutation.mutate({ slug, decision, plan })}
              isMutating={isMutating}
            />
          ))}
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
