import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, ChevronDown, ChevronUp, CreditCard, ExternalLink, Globe, Mail, MapPin, Phone, Search, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import AdminPagination from "@/components/admin/AdminPagination";
import {
  fetchAdminBusinessProfileDetail,
  fetchAdminBusinessProfiles,
  reviewAdminBusinessSubscription,
  reviewAdminBusinessVerification,
  type AdminBusinessProfileDetail,
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

function parseJsonObject(value: string | null | undefined): Record<string, string> {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.entries(parsed).reduce<Record<string, string>>((accumulator, [key, entry]) => {
      if (typeof entry === "string" && entry.trim().length > 0) {
        accumulator[key] = entry;
      }
      return accumulator;
    }, {});
  } catch {
    return {};
  }
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function normalizeExternalUrl(value: string) {
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) {
    return value;
  }
  return `https://${value}`;
}

function hasPaidSubscriptionEvidence(detail: AdminBusinessProfileDetail | undefined, requestedAt: string | null) {
  if (!detail) {
    return false;
  }

  const requestedTimestamp = requestedAt ? new Date(requestedAt).getTime() : null;
  return detail.related_payments.some((payment) => {
    if (payment.status !== "paid") {
      return false;
    }
    if (requestedTimestamp === null) {
      return true;
    }
    const paymentTimestamp = new Date(payment.paid_at ?? payment.created_at).getTime();
    return !Number.isNaN(paymentTimestamp) && paymentTimestamp >= requestedTimestamp;
  });
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
  onVerificationDecision: (slug: string, decision: "approved" | "rejected", moderationNote?: string | null) => void;
  onSubscriptionDecision: (slug: string, decision: "approved" | "rejected", plan?: "basic" | "premium" | "business", moderationNote?: string | null, manualOverride?: boolean) => void;
  isMutating: boolean;
}) {
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "premium" | "business">(
    (item.subscription_requested_plan as "basic" | "premium" | "business") || "premium",
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [verificationNote, setVerificationNote] = useState(item.verification_notes || "");
  const [subscriptionNote, setSubscriptionNote] = useState("");
  const [manualOverride, setManualOverride] = useState(false);

  useEffect(() => {
    setSelectedPlan((item.subscription_requested_plan as "basic" | "premium" | "business") || "premium");
    setVerificationNote(item.verification_notes || "");
    setSubscriptionNote("");
    setManualOverride(false);
  }, [item.subscription_requested_plan, item.verification_notes]);

  const pendingVerification = item.verification_status === "pending";
  const pendingSubscription = item.subscription_request_status === "pending";
  const detailQuery = useQuery({
    queryKey: ["admin-business-profile-detail", item.slug],
    queryFn: () => fetchAdminBusinessProfileDetail(item.slug),
    enabled: isExpanded,
  });
  const detail = detailQuery.data;
  const contacts = parseJsonObject(detail?.contacts_json);
  const tags = parseJsonArray(detail?.tags_json);
  const serviceAreas = parseJsonArray(detail?.service_areas_json);
  const socialLinks = parseJsonArray(detail?.social_links_json);
  const paidEvidence = hasPaidSubscriptionEvidence(detail, item.subscription_requested_at);
  const canApproveWithFallback = manualOverride && subscriptionNote.trim().length > 0;
  const canApproveSubscription = pendingSubscription && (paidEvidence || canApproveWithFallback);

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

          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${isDark ? "bg-[#173052] text-slate-100" : "bg-white text-slate-700"}`}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {locale === "ua" ? "Переглянути повний профіль" : locale === "es" ? "Ver perfil completo" : "Review full profile"}
          </button>
        </div>

        <div className="w-full max-w-sm space-y-4 xl:w-[300px]">
          <div className={`rounded-2xl border p-3 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {locale === "ua" ? "Верифікація" : locale === "es" ? "Verificación" : "Verification"}
            </p>
            <textarea
              value={verificationNote}
              onChange={(event) => setVerificationNote(event.target.value)}
              rows={3}
              placeholder={locale === "ua" ? "Нотатка модератора" : locale === "es" ? "Nota de moderación" : "Moderation note"}
              className={`mt-3 w-full rounded-xl border px-3 py-2 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isMutating || !pendingVerification}
                onClick={() => onVerificationDecision(item.slug, "approved", verificationNote.trim() || null)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${isMutating || !pendingVerification ? "cursor-not-allowed opacity-60" : ""} ${isDark ? "bg-emerald-900/30 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}
              >
                <CheckCircle2 className="h-4 w-4" />
                {locale === "ua" ? "Схвалити" : locale === "es" ? "Aprobar" : "Approve"}
              </button>
              <button
                type="button"
                disabled={isMutating || !pendingVerification}
                onClick={() => onVerificationDecision(item.slug, "rejected", verificationNote.trim() || null)}
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
            <textarea
              value={subscriptionNote}
              onChange={(event) => setSubscriptionNote(event.target.value)}
              rows={3}
              placeholder={locale === "ua" ? "Причина рішення / доказ оплати" : locale === "es" ? "Motivo de la decisión / prueba de pago" : "Decision reason / payment proof note"}
              className={`mt-3 w-full rounded-xl border px-3 py-2 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
            />
            <label className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-3 text-xs ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
              <input
                type="checkbox"
                checked={manualOverride}
                onChange={(event) => setManualOverride(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                {locale === "ua"
                  ? "Ручна активація fallback: використовуйте лише якщо система не зафіксувала оплату, але користувач надав доказ."
                  : locale === "es"
                    ? "Activación manual de respaldo: úsala solo si el sistema no registró el pago pero el usuario aportó prueba."
                    : "Manual fallback activation: use only when the system missed the payment but the user provided proof."}
              </span>
            </label>
            <div className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
              paidEvidence
                ? isDark ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"
                : isDark ? "border-amber-900/40 bg-amber-950/20 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700"
            }`}>
              {paidEvidence
                ? (locale === "ua" ? "Оплата для цього запиту знайдена в системі." : locale === "es" ? "Se encontró un pago para esta solicitud." : "Payment evidence for this request was found in the system.")
                : (locale === "ua" ? "Оплата не підтверджена автоматично. Для approve відкрийте деталі і перевірте платежі, або використайте manual fallback з приміткою." : locale === "es" ? "El pago no está confirmado automáticamente. Abre los detalles y revisa los pagos, o usa la activación manual con una nota." : "Payment is not confirmed automatically. Open the details and review payments, or use manual fallback with a note.")}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isMutating || !canApproveSubscription}
                onClick={() => onSubscriptionDecision(item.slug, "approved", selectedPlan, subscriptionNote.trim() || null, manualOverride)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${isMutating || !canApproveSubscription ? "cursor-not-allowed opacity-60" : ""} ${isDark ? "bg-emerald-900/30 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}
              >
                <CheckCircle2 className="h-4 w-4" />
                {locale === "ua" ? "Схвалити" : locale === "es" ? "Aprobar" : "Approve"}
              </button>
              <button
                type="button"
                disabled={isMutating || !pendingSubscription}
                onClick={() => onSubscriptionDecision(item.slug, "rejected", undefined, subscriptionNote.trim() || null, false)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${isMutating || !pendingSubscription ? "cursor-not-allowed opacity-60" : ""} ${isDark ? "bg-red-900/30 text-red-300" : "bg-red-50 text-red-700"}`}
              >
                <XCircle className="h-4 w-4" />
                {locale === "ua" ? "Відхилити" : locale === "es" ? "Rechazar" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div className={`mt-5 rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
          {detailQuery.isLoading ? (
            <StateBox
              isDark={isDark}
              tone="neutral"
              text={locale === "ua" ? "Завантаження повного профілю..." : locale === "es" ? "Cargando perfil completo..." : "Loading full profile..."}
            />
          ) : null}

          {detailQuery.isError ? (
            <StateBox
              isDark={isDark}
              tone="danger"
              text={detailQuery.error instanceof Error ? detailQuery.error.message : "Failed to load business profile details"}
            />
          ) : null}

          {detail ? (
            <div className="space-y-4">
              <div className={`overflow-hidden rounded-2xl border ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                <div className={`h-28 w-full ${detail.cover_url ? "" : isDark ? "bg-gradient-to-r from-[#173052] to-[#264d7f]" : "bg-gradient-to-r from-blue-100 to-amber-50"}`}>
                  {detail.cover_url ? <img src={detail.cover_url} alt={detail.name} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="flex flex-col gap-4 p-4 md:flex-row md:items-start">
                  <div className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl font-bold ${isDark ? "bg-[#173052] text-slate-100" : "bg-white text-slate-700"}`}>
                    {detail.logo_url ? <img src={detail.logo_url} alt={detail.name} className="h-full w-full object-cover" /> : detail.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className={`text-xl font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{detail.name}</h4>
                      {detail.is_verified ? (
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? "bg-emerald-900/30 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
                          {locale === "ua" ? "Верифіковано" : locale === "es" ? "Verificado" : "Verified"}
                        </span>
                      ) : null}
                      {detail.is_premium ? (
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? "bg-amber-900/30 text-amber-300" : "bg-amber-50 text-amber-700"}`}>
                          {locale === "ua" ? "Платний план" : locale === "es" ? "Plan de pago" : "Paid plan"}
                        </span>
                      ) : null}
                    </div>
                    <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{detail.category} · {detail.city}</p>
                    <p className={`mt-3 whitespace-pre-wrap text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-700"}`}>{detail.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {detail.public_preview_url ? (
                        <a
                          href={normalizeExternalUrl(detail.public_preview_url)}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${isDark ? "bg-[#173052] text-slate-100" : "bg-white text-slate-700"}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                          {locale === "ua" ? "Публічний профіль" : locale === "es" ? "Perfil público" : "Public profile"}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <div className={`rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                    {locale === "ua" ? "Дані профілю" : locale === "es" ? "Datos del perfil" : "Profile data"}
                  </p>
                  <div className={`mt-3 grid gap-2 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    <p>Slug: {detail.slug}</p>
                    <p>Owner ID: {detail.owner_user_id}</p>
                    <p>Owner email: {detail.owner_email || "-"}</p>
                    <p>{locale === "ua" ? "Створено" : locale === "es" ? "Creado" : "Created"}: {formatDate(detail.created_at, locale)}</p>
                    <p>{locale === "ua" ? "Оновлено" : locale === "es" ? "Actualizado" : "Updated"}: {formatDate(detail.updated_at, locale)}</p>
                    <p>{locale === "ua" ? "Нотатка на верифікацію" : locale === "es" ? "Nota de verificación" : "Verification note"}: {detail.verification_notes || "-"}</p>
                  </div>

                  {tags.length > 0 ? (
                    <div className="mt-4">
                      <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                        {locale === "ua" ? "Теги" : locale === "es" ? "Etiquetas" : "Tags"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <span key={tag} className={`rounded-full px-3 py-1 text-xs ${isDark ? "bg-[#173052] text-slate-200" : "bg-white text-slate-700"}`}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {serviceAreas.length > 0 ? (
                    <div className="mt-4">
                      <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                        {locale === "ua" ? "Зони роботи" : locale === "es" ? "Zonas de servicio" : "Service areas"}
                      </p>
                      <div className={`mt-2 flex flex-wrap gap-2 text-xs ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {serviceAreas.map((area) => (
                          <span key={area} className={`rounded-full px-3 py-1 ${isDark ? "bg-[#173052]" : "bg-white"}`}>{area}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className={`rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                    <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                      {locale === "ua" ? "Контакти" : locale === "es" ? "Contacto" : "Contact"}
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className={`flex items-start gap-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{detail.city}</span>
                      </div>
                      {contacts.phone ? (
                        <a href={`tel:${contacts.phone}`} className={`flex items-start gap-2 break-all hover:underline ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                          <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{contacts.phone}</span>
                        </a>
                      ) : null}
                      {contacts.email ? (
                        <a href={`mailto:${contacts.email}`} className={`flex items-start gap-2 break-all hover:underline ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                          <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{contacts.email}</span>
                        </a>
                      ) : null}
                      {detail.website ? (
                        <a href={normalizeExternalUrl(detail.website)} target="_blank" rel="noreferrer" className={`flex items-start gap-2 break-all hover:underline ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                          <Globe className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{detail.website}</span>
                        </a>
                      ) : null}
                      {socialLinks.length > 0 ? (
                        <div className="pt-2">
                          <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.12em] ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                            {locale === "ua" ? "Соцмережі" : locale === "es" ? "Redes" : "Social links"}
                          </p>
                          <div className="space-y-2">
                            {socialLinks.map((link) => (
                              <a key={link} href={normalizeExternalUrl(link)} target="_blank" rel="noreferrer" className={`flex items-start gap-2 break-all text-sm hover:underline ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{link}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className={`rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-center gap-2">
                      <CreditCard className={`h-4 w-4 ${isDark ? "text-slate-300" : "text-slate-700"}`} />
                      <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                        {locale === "ua" ? "Платежі за підписку" : locale === "es" ? "Pagos de suscripción" : "Subscription payments"}
                      </p>
                    </div>
                    <div className="mt-3 space-y-3">
                      {detail.related_payments.length === 0 ? (
                        <div className={`rounded-xl border px-3 py-3 text-xs ${isDark ? "border-[#22416b] bg-[#11203a] text-slate-400" : "border-slate-200 bg-white text-slate-600"}`}>
                          {locale === "ua" ? "Пов’язаних платежів не знайдено." : locale === "es" ? "No se encontraron pagos relacionados." : "No related payments were found."}
                        </div>
                      ) : detail.related_payments.map((payment) => (
                        <div key={payment.id} className={`rounded-xl border p-3 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isDark ? "bg-[#173052] text-slate-100" : "bg-slate-100 text-slate-700"}`}>#{payment.id}</span>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              payment.status === "paid"
                                ? isDark ? "bg-emerald-900/30 text-emerald-300" : "bg-emerald-50 text-emerald-700"
                                : payment.status === "pending"
                                  ? isDark ? "bg-amber-900/30 text-amber-300" : "bg-amber-50 text-amber-700"
                                  : isDark ? "bg-red-900/30 text-red-300" : "bg-red-50 text-red-700"
                            }`}>
                              {payment.status}
                            </span>
                            {payment.entitlement_status ? (
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isDark ? "bg-[#173052] text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                                entitlement: {payment.entitlement_status}
                              </span>
                            ) : null}
                          </div>
                          <div className={`mt-2 grid gap-1 text-xs ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                            <p>{payment.title} · {payment.amount_total} {payment.currency.toUpperCase()}</p>
                            <p>{locale === "ua" ? "Створено" : locale === "es" ? "Creado" : "Created"}: {formatDate(payment.created_at, locale)}</p>
                            <p>{locale === "ua" ? "Оплачено" : locale === "es" ? "Pagado" : "Paid"}: {formatDate(payment.paid_at, locale)}</p>
                            {payment.failure_reason ? <p>{payment.failure_reason}</p> : null}
                          </div>
                          {(payment.receipt_url || payment.invoice_url) ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {payment.receipt_url ? (
                                <a href={payment.receipt_url} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold ${isDark ? "bg-[#173052] text-slate-100" : "bg-slate-100 text-slate-700"}`}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  {locale === "ua" ? "Чек" : locale === "es" ? "Recibo" : "Receipt"}
                                </a>
                              ) : null}
                              {payment.invoice_url ? (
                                <a href={payment.invoice_url} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold ${isDark ? "bg-[#173052] text-slate-100" : "bg-slate-100 text-slate-700"}`}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  {locale === "ua" ? "Інвойс" : locale === "es" ? "Factura" : "Invoice"}
                                </a>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {!paidEvidence && pendingSubscription ? (
                      <div className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-3 text-xs ${isDark ? "border-amber-900/40 bg-amber-950/20 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          {locale === "ua"
                            ? "Автоматично підтвердженого платежу для цього запиту не знайдено. Для активації без payment evidence використовуйте manual fallback з приміткою."
                            : locale === "es"
                              ? "No se encontró un pago confirmado automáticamente para esta solicitud. Para activar sin evidencia de pago usa la activación manual con nota."
                              : "No automatically confirmed payment was found for this request. To activate without payment evidence, use manual fallback with a note."}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
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
    mutationFn: ({ slug, decision, moderationNote }: { slug: string; decision: "approved" | "rejected"; moderationNote?: string | null }) =>
      reviewAdminBusinessVerification(slug, { decision, moderation_note: moderationNote }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-business-profiles"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-business-profile-detail"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success(locale === "ua" ? "Статус верифікації оновлено" : locale === "es" ? "Estado de verificación actualizado" : "Verification status updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Request failed");
    },
  });

  const subscriptionMutation = useMutation({
    mutationFn: ({ slug, decision, plan, moderationNote, manualOverride }: { slug: string; decision: "approved" | "rejected"; plan?: "basic" | "premium" | "business"; moderationNote?: string | null; manualOverride?: boolean }) =>
      reviewAdminBusinessSubscription(slug, { decision, plan, moderation_note: moderationNote, manual_override: manualOverride }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-business-profiles"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-business-profile-detail"] });
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
              onVerificationDecision={(slug, decision, moderationNote) => verificationMutation.mutate({ slug, decision, moderationNote })}
              onSubscriptionDecision={(slug, decision, plan, moderationNote, manualOverride) => subscriptionMutation.mutate({ slug, decision, plan, moderationNote, manualOverride })}
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
