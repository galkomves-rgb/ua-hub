import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ExternalLink,
  Eye,
  Globe,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import CityPicker from "@/components/CityPicker";
import {
  createBusinessProfile,
  fetchMyBusinessProfiles,
  requestBusinessSubscription,
  requestBusinessVerification,
  updateBusinessProfile,
  type BusinessProfilePayload,
  type BusinessProfileResponse,
} from "@/lib/account-api";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

type BusinessFormState = {
  slug: string;
  name: string;
  category: string;
  city: string;
  description: string;
  logo_url: string;
  cover_url: string;
  contact_phone: string;
  contact_email: string;
  tags_text: string;
  rating: string;
  website: string;
  social_links_json: string;
  service_areas_text: string;
};

const PLAN_OPTIONS = ["basic", "premium", "business"] as const;

type PlanOption = (typeof PLAN_OPTIONS)[number];

function buildBusinessForm(profile: BusinessProfileResponse | null): BusinessFormState {
  const contacts = safeParseRecord(profile?.contacts_json);

  return {
    slug: profile?.slug || "",
    name: profile?.name || "",
    category: profile?.category || "",
    city: profile?.city || "",
    description: profile?.description || "",
    logo_url: profile?.logo_url || "",
    cover_url: profile?.cover_url || "",
    contact_phone: stringValue(contacts.phone),
    contact_email: stringValue(contacts.email),
    tags_text: safeParseStringArray(profile?.tags_json).join(", "),
    rating: profile?.rating || "0",
    website: profile?.website || "",
    social_links_json: profile?.social_links_json || "[]",
    service_areas_text: safeParseStringArray(profile?.service_areas_json).join(", "),
  };
}

function safeParseRecord(value: string | null | undefined): Record<string, unknown> {
  if (!value?.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function safeParseStringArray(value: string | null | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function serializeStringList(value: string): string {
  const items = value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

  return JSON.stringify(Array.from(new Set(items)));
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function VerificationBadge({ status }: { status: string }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  const palette =
    status === "verified"
      ? isDark
        ? "bg-emerald-950/30 text-emerald-300"
        : "bg-emerald-50 text-emerald-700"
      : status === "pending"
        ? isDark
          ? "bg-amber-950/30 text-amber-300"
          : "bg-amber-50 text-amber-700"
        : status === "rejected"
          ? isDark
            ? "bg-red-950/30 text-red-300"
            : "bg-red-50 text-red-700"
          : isDark
            ? "bg-slate-800 text-slate-300"
            : "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${palette}`}>
      {t(`account.business.status.${status}`)}
    </span>
  );
}

export function AccountBusinessPanel() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();

  const businessQuery = useQuery({
    queryKey: ["account-business-profiles"],
    queryFn: fetchMyBusinessProfiles,
  });

  const profiles = businessQuery.data ?? [];
  const activeProfile = profiles[0] ?? null;
  const previewUrl = activeProfile?.public_preview_url ?? null;
  const renewalDate = formatDate(activeProfile?.subscription_renewal_date ?? null);
  const requestedAt = formatDate(activeProfile?.subscription_requested_at ?? null);
  const verificationRequestedAt = formatDate(activeProfile?.verification_requested_at ?? null);

  const [form, setForm] = useState<BusinessFormState>(() => buildBusinessForm(null));
  const [verificationNote, setVerificationNote] = useState("");
  const [targetPlan, setTargetPlan] = useState<PlanOption>("business");

  useEffect(() => {
    setForm(buildBusinessForm(activeProfile));
    setVerificationNote(activeProfile?.verification_notes || "");
    const requestedPlan = activeProfile?.subscription_requested_plan;
    const currentPlan = activeProfile?.subscription_plan;
    if (requestedPlan && PLAN_OPTIONS.includes(requestedPlan as PlanOption)) {
      setTargetPlan(requestedPlan as PlanOption);
      return;
    }
    if (currentPlan && PLAN_OPTIONS.includes(currentPlan as PlanOption)) {
      setTargetPlan(currentPlan as PlanOption);
      return;
    }
    setTargetPlan("business");
  }, [activeProfile]);

  const saveMutation = useMutation({
    mutationFn: async (payload: BusinessProfilePayload) => {
      if (activeProfile) {
        return updateBusinessProfile(activeProfile.slug, payload);
      }
      return createBusinessProfile(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["account-business-profiles"] });
      await queryClient.invalidateQueries({ queryKey: ["account-dashboard"] });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (!activeProfile) {
        throw new Error(t("account.business.empty"));
      }
      return requestBusinessVerification(activeProfile.slug, { message: verificationNote.trim() || null });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["account-business-profiles"] });
    },
  });

  const subscriptionMutation = useMutation({
    mutationFn: async () => {
      if (!activeProfile) {
        throw new Error(t("account.business.empty"));
      }
      return requestBusinessSubscription(activeProfile.slug, { plan: targetPlan });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["account-business-profiles"] });
    },
  });

  const canSubmit = useMemo(() => {
    return (
      form.slug.trim().length > 0 &&
      form.name.trim().length > 0 &&
      form.category.trim().length > 0 &&
      form.description.trim().length > 0
    );
  }, [form.category, form.description, form.name, form.slug]);

  const canRequestVerification = Boolean(
    activeProfile && activeProfile.verification_status !== "pending" && activeProfile.verification_status !== "verified",
  );
  const canRequestPlanChange = Boolean(
    activeProfile &&
      targetPlan &&
      activeProfile.subscription_plan !== targetPlan &&
      !(activeProfile.subscription_request_status === "pending" && activeProfile.subscription_requested_plan === targetPlan),
  );

  const handleSave = () => {
    if (!canSubmit) {
      return;
    }

    saveMutation.mutate({
      slug: form.slug.trim(),
      name: form.name.trim(),
      category: form.category.trim(),
      city: form.city.trim(),
      description: form.description.trim(),
      logo_url: form.logo_url.trim() || null,
      cover_url: form.cover_url.trim() || null,
      contacts_json: JSON.stringify({
        ...(form.contact_phone.trim() ? { phone: form.contact_phone.trim() } : {}),
        ...(form.contact_email.trim() ? { email: form.contact_email.trim() } : {}),
      }),
      tags_json: serializeStringList(form.tags_text),
      rating: form.rating.trim() || "0",
      website: form.website.trim() || null,
      social_links_json: form.social_links_json.trim() || "[]",
      service_areas_json: serializeStringList(form.service_areas_text),
    });
  };

  const planLabel = (plan: string | null | undefined) => {
    if (!plan) {
      return t("account.business.noPlan");
    }
    if (plan === "basic") {
      return t("pricing.basic");
    }
    if (plan === "premium") {
      return t("pricing.premium");
    }
    if (plan === "business") {
      return t("pricing.business");
    }
    return plan;
  };

  const analyticsCards = activeProfile
    ? [
        {
          key: "active-listings",
          icon: Globe,
          title: t("account.business.activeListings"),
          value: activeProfile.active_listings_count,
        },
        {
          key: "views",
          icon: Eye,
          title: t("account.business.totalViews"),
          value: activeProfile.total_views_count,
        },
        {
          key: "saved",
          icon: Star,
          title: t("account.business.savedByUsers"),
          value: activeProfile.saved_by_users_count,
        },
        {
          key: "completeness",
          icon: BarChart3,
          title: t("account.business.completeness"),
          value: `${activeProfile.profile_completeness}%`,
        },
      ]
    : [];

  return (
    <section className="space-y-6">
      <div
        className={`rounded-3xl border p-5 md:p-6 ${
          isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"
        }`}
      >
        <div className="mb-6 flex items-start gap-4">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
              isDark ? "bg-[#1a2d4c] text-[#FFD700]" : "bg-blue-50 text-[#0057B8]"
            }`}
          >
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              {t("account.business.title")}
            </h2>
            <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {t("account.business.subtitle")}
            </p>
          </div>
        </div>

        {businessQuery.isLoading ? (
          <div
            className={`rounded-2xl border p-6 text-sm ${
              isDark ? "border-[#22416b] text-slate-400" : "border-slate-200 text-slate-500"
            }`}
          >
            {t("common.loading")}
          </div>
        ) : businessQuery.isError ? (
          <div
            className={`rounded-2xl border p-6 ${
              isDark ? "border-red-900/40 bg-red-950/20" : "border-red-200 bg-red-50"
            }`}
          >
            <p className={isDark ? "text-red-300" : "text-red-600"}>
              {businessQuery.error instanceof Error ? businessQuery.error.message : t("account.loadError")}
            </p>
            <button
              type="button"
              onClick={() => void businessQuery.refetch()}
              className={`mt-4 rounded-xl px-4 py-2 text-sm font-medium ${
                isDark ? "bg-[#1a2d4c] text-slate-100" : "bg-slate-100 text-slate-700"
              }`}
            >
              {t("account.retry")}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {!activeProfile ? (
              <div
                className={`rounded-2xl border border-dashed p-4 text-sm ${
                  isDark ? "border-[#22416b] text-slate-400" : "border-slate-200 text-slate-500"
                }`}
              >
                {t("account.business.empty")}
              </div>
            ) : null}

            {saveMutation.isError ? (
              <div
                className={`rounded-2xl border p-4 text-sm ${
                  isDark ? "border-red-900/40 bg-red-950/20 text-red-300" : "border-red-200 bg-red-50 text-red-600"
                }`}
              >
                {saveMutation.error instanceof Error ? saveMutation.error.message : t("account.business.saveError")}
              </div>
            ) : null}

            {saveMutation.isSuccess ? (
              <div
                className={`rounded-2xl border p-4 text-sm ${
                  isDark
                    ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-300"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {t("account.business.saveSuccess")}
              </div>
            ) : null}

            {activeProfile ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div
                    className={`rounded-2xl border p-4 ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className={`h-4 w-4 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
                      <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                        {t("account.business.verificationStatus")}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <VerificationBadge status={activeProfile.verification_status} />
                    </div>
                    {verificationRequestedAt ? (
                      <p className={`mt-3 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {verificationRequestedAt}
                      </p>
                    ) : null}
                  </div>

                  <div
                    className={`rounded-2xl border p-4 ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className={`h-4 w-4 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
                      <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                        {t("account.business.currentPlan")}
                      </p>
                    </div>
                    <p className={`mt-3 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      {planLabel(activeProfile.subscription_plan)}
                    </p>
                    {renewalDate ? (
                      <p className={`mt-3 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {t("account.business.subscriptionRenewal")}: {renewalDate}
                      </p>
                    ) : null}
                  </div>

                  <div
                    className={`rounded-2xl border p-4 ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
                      <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                        {t("account.business.listingQuota")}
                      </p>
                    </div>
                    <p className={`mt-3 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      {activeProfile.listing_quota ?? t("account.business.notSet")}
                    </p>
                  </div>

                  <div
                    className={`rounded-2xl border p-4 ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className={`h-4 w-4 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
                      <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                        {t("account.business.completeness")}
                      </p>
                    </div>
                    <p className={`mt-3 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      {activeProfile.profile_completeness}%
                    </p>
                    <div className={`mt-3 h-2 rounded-full ${isDark ? "bg-[#1a2d4c]" : "bg-slate-200"}`}>
                      <div
                        className={`h-2 rounded-full ${isDark ? "bg-[#FFD700]" : "bg-[#0057B8]"}`}
                        style={{ width: `${Math.max(6, activeProfile.profile_completeness)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {analyticsCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.key}
                        className={`rounded-2xl border p-4 ${
                          isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
                          <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                            {card.title}
                          </p>
                        </div>
                        <p className={`mt-3 text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                          {card.value}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div
                    className={`rounded-2xl border p-5 ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                          {t("account.business.preview")}
                        </p>
                        <p className={`mt-1 text-xs leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          {previewUrl || t("account.business.notSet")}
                        </p>
                      </div>
                      {previewUrl ? (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold ${
                            isDark ? "bg-[#1a2d4c] text-slate-100 hover:bg-[#22416b]" : "bg-white text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <ExternalLink className="h-4 w-4" />
                          {t("account.business.openPreview")}
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border p-5 ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <p className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      {t("account.business.subscriptionRequest")}
                    </p>
                    <p className={`mt-1 text-xs leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {t("account.business.subscriptionRequestHint")}
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <select
                        value={targetPlan}
                        onChange={(event) => setTargetPlan(event.target.value as PlanOption)}
                        className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                          isDark ? "border-[#22416b] bg-[#11203a] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                        }`}
                      >
                        {PLAN_OPTIONS.map((plan) => (
                          <option key={plan} value={plan}>
                            {planLabel(plan)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => subscriptionMutation.mutate()}
                        disabled={subscriptionMutation.isPending || !canRequestPlanChange}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${
                          subscriptionMutation.isPending || !canRequestPlanChange ? "cursor-not-allowed opacity-60" : ""
                        } ${isDark ? "bg-[#FFD700] text-[#0d1a2e]" : "bg-[#0057B8] text-white"}`}
                      >
                        <Sparkles className="h-4 w-4" />
                        {subscriptionMutation.isPending
                          ? t("account.business.requestingPlan")
                          : t("account.business.requestPlan")}
                      </button>
                    </div>
                    <p className={`mt-3 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {t("account.business.pendingRequest")}: {activeProfile.subscription_request_status || t("account.business.none")}
                      {requestedAt ? ` · ${requestedAt}` : ""}
                    </p>
                    {subscriptionMutation.isError ? (
                      <p className={`mt-3 text-sm ${isDark ? "text-red-300" : "text-red-600"}`}>
                        {subscriptionMutation.error instanceof Error
                          ? subscriptionMutation.error.message
                          : t("account.business.saveError")}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div
                  className={`rounded-2xl border p-5 ${
                    isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                    {t("account.business.verificationRequest")}
                  </p>
                  <p className={`mt-1 text-xs leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {t("account.business.verificationRequestHint")}
                  </p>
                  <textarea
                    value={verificationNote}
                    onChange={(event) => setVerificationNote(event.target.value)}
                    rows={3}
                    disabled={!activeProfile}
                    placeholder={t("account.business.verificationNote")}
                    className={`mt-4 w-full rounded-2xl border px-4 py-3 text-sm ${
                      isDark ? "border-[#22416b] bg-[#11203a] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    }`}
                  />
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {activeProfile.verification_status === "pending" && verificationRequestedAt
                        ? `${t("account.business.status.pending")} · ${verificationRequestedAt}`
                        : activeProfile.verification_status === "verified"
                          ? t("account.business.status.verified")
                          : t("account.business.status.unverified")}
                    </p>
                    <button
                      type="button"
                      onClick={() => verifyMutation.mutate()}
                      disabled={verifyMutation.isPending || !canRequestVerification}
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${
                        verifyMutation.isPending || !canRequestVerification ? "cursor-not-allowed opacity-60" : ""
                      } ${isDark ? "bg-[#FFD700] text-[#0d1a2e]" : "bg-[#0057B8] text-white"}`}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {verifyMutation.isPending
                        ? t("account.business.requestingVerification")
                        : t("account.business.requestVerification")}
                    </button>
                  </div>
                  {verifyMutation.isError ? (
                    <p className={`mt-3 text-sm ${isDark ? "text-red-300" : "text-red-600"}`}>
                      {verifyMutation.error instanceof Error
                        ? verifyMutation.error.message
                        : t("account.business.saveError")}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {t("account.business.slug")}
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                    disabled={Boolean(activeProfile)}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    } ${activeProfile ? "cursor-not-allowed opacity-70" : ""}`}
                  />
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {t("account.business.name")}
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    }`}
                  />
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {t("account.business.category")}
                  </label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    }`}
                  />
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {t("account.business.city")}
                  </label>
                  <CityPicker
                    value={form.city}
                    onValueChange={(city) => setForm((current) => ({ ...current, city }))}
                    buttonClassName={`w-full ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    }`}
                  />
                  <p className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("cityPicker.helper")}</p>
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {t("account.business.description")}
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    rows={5}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {t("account.business.website")}
                  </label>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    }`}
                  />
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {t("account.business.phone")}
                  </label>
                  <input
                    type="tel"
                    value={form.contact_phone}
                    onChange={(event) => setForm((current) => ({ ...current, contact_phone: event.target.value }))}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    }`}
                  />
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {t("account.business.email")}
                  </label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={(event) => setForm((current) => ({ ...current, contact_email: event.target.value }))}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    }`}
                  />
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {t("account.business.logoUrl")}
                  </label>
                  <input
                    type="url"
                    value={form.logo_url}
                    onChange={(event) => setForm((current) => ({ ...current, logo_url: event.target.value }))}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    }`}
                  />
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {t("account.business.coverUrl")}
                  </label>
                  <input
                    type="url"
                    value={form.cover_url}
                    onChange={(event) => setForm((current) => ({ ...current, cover_url: event.target.value }))}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    }`}
                  />
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {t("account.business.tagsJson")}
                  </label>
                  <textarea
                    value={form.tags_text}
                    onChange={(event) => setForm((current) => ({ ...current, tags_text: event.target.value }))}
                    rows={3}
                    placeholder={t("account.business.tagsHint")}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    }`}
                  />
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {t("account.business.serviceAreasJson")}
                  </label>
                  <textarea
                    value={form.service_areas_text}
                    onChange={(event) => setForm((current) => ({ ...current, service_areas_text: event.target.value }))}
                    rows={3}
                    placeholder={t("account.business.serviceAreasHint")}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSubmit || saveMutation.isPending}
                className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold ${
                  !canSubmit || saveMutation.isPending ? "cursor-not-allowed opacity-60" : ""
                } ${
                  isDark
                    ? "bg-gradient-to-r from-[#FFD700] to-[#e6c200] text-[#0d1a2e]"
                    : "bg-gradient-to-r from-[#0057B8] to-[#0070E0] text-white"
                }`}
              >
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? t("account.business.saving") : t("account.business.save")}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
