import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
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
  Trash2,
  Upload,
  X,
} from "lucide-react";
import CityPicker from "@/components/CityPicker";
import InternationalPhoneInput from "@/components/InternationalPhoneInput";
import {
  createBusinessProfile,
  deleteBusinessProfile,
  fetchMyBusinessProfiles,
  requestBusinessSubscription,
  requestBusinessVerification,
  updateBusinessProfile,
  type BusinessProfilePayload,
  type BusinessProfileResponse,
} from "@/lib/account-api";
import { normalizeStoredPhoneValue } from "@/lib/phone-utils";
import { uploadImageFile } from "@/lib/media-storage";
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

type FieldRequirement = "required" | "optional";

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

function FieldLabel({
  label,
  requirement,
  isDark,
  requiredLabel,
  optionalLabel,
}: {
  label: string;
  requirement: FieldRequirement;
  isDark: boolean;
  requiredLabel: string;
  optionalLabel: string;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <label className={`block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>{label}</label>
      <span className={`text-[11px] font-medium ${requirement === "required"
        ? isDark ? "text-amber-300" : "text-amber-700"
        : isDark ? "text-slate-500" : "text-slate-400"}`}>
        {requirement === "required" ? requiredLabel : optionalLabel}
      </span>
    </div>
  );
}

export function AccountBusinessPanel() {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
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
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!activeProfile) {
        throw new Error(t("account.business.empty"));
      }
      return deleteBusinessProfile(activeProfile.slug);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["account-business-profiles"] });
      await queryClient.invalidateQueries({ queryKey: ["account-dashboard"] });
      setForm(buildBusinessForm(null));
    },
  });

  const canSubmit = useMemo(() => {
    return (
      form.slug.trim().length > 0 &&
      form.name.trim().length > 0 &&
      form.category.trim().length > 0 &&
      form.city.trim().length > 0 &&
      form.description.trim().length > 0 &&
      (
        form.contact_phone.trim().length > 0 ||
        form.contact_email.trim().length > 0 ||
        form.website.trim().length > 0
      )
    );
  }, [form.category, form.city, form.contact_email, form.contact_phone, form.description, form.name, form.slug, form.website]);

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
        ...(form.contact_phone.trim() ? { phone: normalizeStoredPhoneValue(form.contact_phone, locale) } : {}),
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
      ]
    : [];

  const handleLogoFiles = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    setLogoUploadError(null);
    setIsUploadingLogo(true);

    try {
      const uploadedLogo = await uploadImageFile(files[0], "avatar");
      setForm((current) => ({ ...current, logo_url: uploadedLogo.accessUrl }));
    } catch (error) {
      console.error("Failed to upload business logo:", error);
      setLogoUploadError(error instanceof Error ? error.message : "Не вдалося завантажити логотип.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleLogoInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    await handleLogoFiles(files);
  };

  const handleLogoDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingLogo(false);

    const files = Array.from(event.dataTransfer.files || []);
    await handleLogoFiles(files);
  };

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

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <FieldLabel label={t("account.business.slug")} requirement="required" isDark={isDark} requiredLabel={t("common.required")} optionalLabel={t("common.optional")} />
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                    disabled={Boolean(activeProfile)}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    } ${activeProfile ? "cursor-not-allowed opacity-70" : ""}`}
                  />
                  <p className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("account.business.slugHint")}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel label={t("account.business.name")} requirement="required" isDark={isDark} requiredLabel={t("common.required")} optionalLabel={t("common.optional")} />
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
                    <FieldLabel label={t("account.business.category")} requirement="required" isDark={isDark} requiredLabel={t("common.required")} optionalLabel={t("common.optional")} />
                    <input
                      type="text"
                      value={form.category}
                      onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                      className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                        isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                      }`}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel label={t("account.business.city")} requirement="required" isDark={isDark} requiredLabel={t("common.required")} optionalLabel={t("common.optional")} />
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
                    <FieldLabel label={t("account.business.website")} requirement="optional" isDark={isDark} requiredLabel={t("common.required")} optionalLabel={t("common.optional")} />
                    <input
                      type="url"
                      value={form.website}
                      onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                      className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                        isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                      }`}
                    />
                    <p className={`mt-2 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>{t("account.business.contactRule")}</p>
                  </div>
                </div>
                <div>
                  <FieldLabel label={t("account.business.description")} requirement="required" isDark={isDark} requiredLabel={t("common.required")} optionalLabel={t("common.optional")} />
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    rows={5}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    }`}
                  />
                </div>
                <div>
                  <div className={`rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                    <div className="mb-4 flex items-start gap-4">
                      <div className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${isDark ? "bg-[#1a2d4c]" : "bg-slate-100"}`}>
                        {form.logo_url ? (
                          <img src={form.logo_url} alt={form.name || "Business logo"} className="h-full w-full object-cover" />
                        ) : (
                          <Building2 className={`h-8 w-8 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <FieldLabel label={t("account.business.logoUrl")} requirement="optional" isDark={isDark} requiredLabel={t("common.required")} optionalLabel={t("common.optional")} />
                        <p className={`text-xs leading-5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("account.business.logoHint")}</p>
                      </div>
                    </div>
                    <div
                      onDragEnter={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setIsDraggingLogo(true);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!isDraggingLogo) {
                          setIsDraggingLogo(true);
                        }
                      }}
                      onDragLeave={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (event.currentTarget === event.target) {
                          setIsDraggingLogo(false);
                        }
                      }}
                      onDrop={handleLogoDrop}
                      className={`rounded-2xl border-2 border-dashed p-4 transition-colors ${
                        isDraggingLogo
                          ? isDark ? "border-[#4a9eff] bg-[#12233d]" : "border-blue-500 bg-blue-50"
                          : isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-300 bg-white"
                      }`}
                    >
                      <input type="file" accept="image/*" onChange={handleLogoInputChange} className="hidden" id="businessLogoUploadInput" />
                      <label htmlFor="businessLogoUploadInput" className="block cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isDark ? "bg-[#1a2d4c]" : "bg-slate-100"}`}>
                            <Upload className={`h-5 w-5 ${isDark ? "text-slate-300" : "text-slate-500"}`} />
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                              {isUploadingLogo ? t("account.business.logoUploading") : t("account.business.logoUploadAction")}
                            </p>
                            <p className={`mt-1 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>{t("account.business.logoUploadMeta")}</p>
                          </div>
                        </div>
                      </label>
                    </div>
                    {logoUploadError ? (
                      <div className={`mt-3 rounded-2xl border p-3 text-sm ${isDark ? "border-red-900/40 bg-red-950/20 text-red-300" : "border-red-200 bg-red-50 text-red-600"}`}>
                        <div className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{logoUploadError}</span>
                        </div>
                      </div>
                    ) : null}
                    {form.logo_url ? (
                      <button
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, logo_url: "" }))}
                        className={`mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${isDark ? "bg-[#1a2d4c] text-slate-200" : "bg-slate-100 text-slate-700"}`}
                      >
                        <X className="h-3.5 w-3.5" />
                        {t("account.business.logoRemove")}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel label={t("account.business.phone")} requirement="optional" isDark={isDark} requiredLabel={t("common.required")} optionalLabel={t("common.optional")} />
                    <InternationalPhoneInput
                      value={form.contact_phone}
                      onChange={(value) => setForm((current) => ({ ...current, contact_phone: value }))}
                      buttonClassName={isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100 hover:bg-[#12233d]" : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"}
                      inputClassName={isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100 placeholder:text-slate-500" : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"}
                    />
                  </div>
                  <div>
                    <FieldLabel label={t("account.business.email")} requirement="optional" isDark={isDark} requiredLabel={t("common.required")} optionalLabel={t("common.optional")} />
                    <input
                      type="email"
                      value={form.contact_email}
                      onChange={(event) => setForm((current) => ({ ...current, contact_email: event.target.value }))}
                      className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                        isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                      }`}
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel label={t("account.business.coverUrl")} requirement="optional" isDark={isDark} requiredLabel={t("common.required")} optionalLabel={t("common.optional")} />
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
                  <FieldLabel label={t("account.business.tagsJson")} requirement="optional" isDark={isDark} requiredLabel={t("common.required")} optionalLabel={t("common.optional")} />
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
                  <FieldLabel label={t("account.business.serviceAreasJson")} requirement="optional" isDark={isDark} requiredLabel={t("common.required")} optionalLabel={t("common.optional")} />
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

            <div className={`rounded-2xl border p-4 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
              <p className="font-medium">{t("account.business.requiredTitle")}</p>
              <p className="mt-2 leading-6">{t("account.business.requiredHint")}</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {activeProfile ? (
                <button
                  type="button"
                  onClick={() => {
                    const confirmed = window.confirm(
                      t("account.business.deleteConfirm") ||
                        (typeof window !== "undefined" && window.navigator.language.startsWith("es")
                          ? "¿Seguro que quieres eliminar este perfil de negocio?"
                          : "Ви впевнені, що хочете видалити цей бізнес-профіль?"),
                    );
                    if (confirmed) {
                      deleteMutation.mutate();
                    }
                  }}
                  disabled={deleteMutation.isPending || saveMutation.isPending}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    deleteMutation.isPending || saveMutation.isPending ? "cursor-not-allowed opacity-60" : ""
                  } ${
                    isDark
                      ? "border-red-900/40 bg-red-950/20 text-red-300"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("account.business.delete")}
                </button>
              ) : (
                <span />
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={!canSubmit || saveMutation.isPending || deleteMutation.isPending}
                className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold ${
                  !canSubmit || saveMutation.isPending || deleteMutation.isPending ? "cursor-not-allowed opacity-60" : ""
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

            {deleteMutation.isError ? (
              <div
                className={`rounded-2xl border p-4 text-sm ${
                  isDark ? "border-red-900/40 bg-red-950/20 text-red-300" : "border-red-200 bg-red-50 text-red-600"
                }`}
              >
                {deleteMutation.error instanceof Error ? deleteMutation.error.message : t("account.business.saveError")}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
