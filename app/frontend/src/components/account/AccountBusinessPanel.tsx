import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from "react";
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
  Upload,
  X,
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
import { beginReauthenticationFlow, ReauthenticationRequiredError } from "@/lib/auth";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";
import { uploadImageFile } from "@/lib/media-storage";
import { MODULES } from "@/lib/platform";

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
type BusinessImageField = "logo_url" | "cover_url";

const BUSINESS_PROFILE_DRAFT_KEY = "account_business_profile_draft";

const CYRILLIC_SLUG_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ye", ж: "zh", з: "z", и: "y", і: "i",
  ї: "yi", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "", ю: "yu", я: "ya",
};

function slugifyBusinessValue(value: string): string {
  const transliterated = value
    .trim()
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_SLUG_MAP[char] ?? char)
    .join("");

  return transliterated
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

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

function persistBusinessDraft(form: BusinessFormState) {
  sessionStorage.setItem(BUSINESS_PROFILE_DRAFT_KEY, JSON.stringify(form));
}

function consumeBusinessDraft(): BusinessFormState | null {
  const rawValue = sessionStorage.getItem(BUSINESS_PROFILE_DRAFT_KEY);
  if (!rawValue) {
    return null;
  }

  sessionStorage.removeItem(BUSINESS_PROFILE_DRAFT_KEY);

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      slug: stringValue((parsed as Record<string, unknown>).slug),
      name: stringValue((parsed as Record<string, unknown>).name),
      category: stringValue((parsed as Record<string, unknown>).category),
      city: stringValue((parsed as Record<string, unknown>).city),
      description: stringValue((parsed as Record<string, unknown>).description),
      logo_url: stringValue((parsed as Record<string, unknown>).logo_url),
      cover_url: stringValue((parsed as Record<string, unknown>).cover_url),
      contact_phone: stringValue((parsed as Record<string, unknown>).contact_phone),
      contact_email: stringValue((parsed as Record<string, unknown>).contact_email),
      tags_text: stringValue((parsed as Record<string, unknown>).tags_text),
      rating: stringValue((parsed as Record<string, unknown>).rating) || "0",
      website: stringValue((parsed as Record<string, unknown>).website),
      social_links_json: stringValue((parsed as Record<string, unknown>).social_links_json) || "[]",
      service_areas_text: stringValue((parsed as Record<string, unknown>).service_areas_text),
    };
  } catch {
    return null;
  }
}

function getReadableErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  if (message.includes("slug: String should match pattern")) {
    return fallback;
  }
  if (!message || message === "Failed to fetch" || message === "NetworkError when attempting to fetch resource.") {
    return fallback;
  }

  return message;
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
  const [draggingField, setDraggingField] = useState<BusinessImageField | null>(null);
  const [uploadingField, setUploadingField] = useState<BusinessImageField | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Partial<Record<BusinessImageField, string>>>({});
  const [restoredDraft, setRestoredDraft] = useState(false);

  useEffect(() => {
    const pendingDraft = consumeBusinessDraft();
    if (pendingDraft) {
      setForm(pendingDraft);
      setRestoredDraft(true);
    } else {
      setForm(buildBusinessForm(activeProfile));
      setRestoredDraft(false);
    }
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
      form.city.trim().length > 0 &&
      form.description.trim().length > 0
    );
  }, [form.category, form.city, form.description, form.name, form.slug]);

  const slugValue = form.slug.trim();
  const slugNormalized = slugifyBusinessValue(slugValue);
  const slugError = !activeProfile && slugValue.length > 0 && slugValue !== slugNormalized
    ? t("account.business.slugInvalid")
    : null;
  const requiredFields = [
    { key: "slug", valid: slugValue.length > 0 && !slugError },
    { key: "name", valid: form.name.trim().length > 0 },
    { key: "category", valid: form.category.trim().length > 0 },
    { key: "city", valid: form.city.trim().length > 0 },
    { key: "description", valid: form.description.trim().length > 0 },
  ];
  const isFormReady = canSubmit && !slugError;
  const categoryOptionGroups = useMemo(() => {
    return Object.entries(MODULES)
      .filter(([moduleId]) => moduleId !== "business")
      .map(([moduleId, moduleConfig]) => ({
        moduleId,
        moduleLabel: t(`mod.${moduleId}`),
        options: moduleConfig.categories.map((category) => ({
          value: category.labelKey,
          label: category.labelKey,
        })),
      }))
      .filter((group) => group.options.length > 0);
  }, [t]);
  const categoryValues = useMemo(
    () => new Set(categoryOptionGroups.flatMap((group) => group.options.map((option) => option.value))),
    [categoryOptionGroups],
  );
  const hasCustomCategory = form.category.trim().length > 0 && !categoryValues.has(form.category.trim());

  const canRequestVerification = Boolean(
    activeProfile && activeProfile.verification_status !== "pending" && activeProfile.verification_status !== "verified",
  );
  const canRequestPlanChange = Boolean(
    activeProfile &&
      targetPlan &&
      activeProfile.subscription_plan !== targetPlan &&
      !(activeProfile.subscription_request_status === "pending" && activeProfile.subscription_requested_plan === targetPlan),
  );

  const handleSave = async () => {
    if (!isFormReady) {
      return;
    }

    const payload: BusinessProfilePayload = {
      slug: slugNormalized,
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
    };

    saveMutation.reset();

    try {
      await saveMutation.mutateAsync(payload);
      sessionStorage.removeItem(BUSINESS_PROFILE_DRAFT_KEY);
      setRestoredDraft(false);
    } catch (error) {
      if (error instanceof ReauthenticationRequiredError) {
        persistBusinessDraft(form);
        await beginReauthenticationFlow("/account?tab=business");
      }
    }
  };

  const clearUploadError = (field: BusinessImageField) => {
    setUploadErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleBusinessImageFiles = async (field: BusinessImageField, files: File[]) => {
    if (files.length === 0) {
      return;
    }

    clearUploadError(field);
    setUploadingField(field);

    try {
      const uploadedAsset = await uploadImageFile(files[0], "listing");
      setForm((current) => ({ ...current, [field]: uploadedAsset.accessUrl }));
    } catch (error) {
      setUploadErrors((current) => ({
        ...current,
        [field]: error instanceof Error ? error.message : t("account.business.imageUploadError"),
      }));
    } finally {
      setUploadingField((current) => (current === field ? null : current));
    }
  };

  const handleBusinessImageInputChange = async (field: BusinessImageField, event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    await handleBusinessImageFiles(field, files);
  };

  const handleBusinessImageDrop = async (field: BusinessImageField, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDraggingField((current) => (current === field ? null : current));

    const files = Array.from(event.dataTransfer.files || []);
    await handleBusinessImageFiles(field, files);
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
              {getReadableErrorMessage(businessQuery.error, t("account.loadError"))}
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
                {getReadableErrorMessage(saveMutation.error, t("account.business.saveError"))}
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

            {restoredDraft ? (
              <div
                className={`rounded-2xl border p-4 text-sm ${
                  isDark
                    ? "border-amber-900/40 bg-amber-950/20 text-amber-200"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {t("account.business.draftRestored")}
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
                          ? getReadableErrorMessage(subscriptionMutation.error, t("account.business.saveError"))
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
                        ? getReadableErrorMessage(verifyMutation.error, t("account.business.saveError"))
                        : t("account.business.saveError")}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}

            <div
              className={`rounded-2xl border p-4 text-sm ${
                isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-400" : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              <p className={`font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                {t("account.business.requiredFieldsTitle")}
              </p>
              <p className="mt-1">{t("account.business.requiredFieldsHint")}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                    {t("account.business.requiredSection")}
                  </p>
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {t("account.business.slug")}
                    <span className={`ml-2 text-xs ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`}>{t("account.business.requiredMark")}</span>
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(event) => setForm((current) => ({ ...current, slug: slugifyBusinessValue(event.target.value) }))}
                    disabled={Boolean(activeProfile)}
                    placeholder={t("account.business.slugPlaceholder")}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    } ${activeProfile ? "cursor-not-allowed opacity-70" : ""}`}
                  />
                  <p className={`mt-2 text-xs ${slugError ? (isDark ? "text-red-300" : "text-red-600") : (isDark ? "text-slate-400" : "text-slate-500")}`}>
                    {slugError || t("account.business.slugHint")}
                  </p>
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {t("account.business.name")}
                    <span className={`ml-2 text-xs ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`}>{t("account.business.requiredMark")}</span>
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
                    <span className={`ml-2 text-xs ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`}>{t("account.business.requiredMark")}</span>
                  </label>
                  <select
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    }`}
                  >
                    <option value="">{t("account.business.categoryPlaceholder")}</option>
                    {hasCustomCategory ? (
                      <option value={form.category}>
                        {form.category} ({t("account.business.categoryLegacyOption")})
                      </option>
                    ) : null}
                    {categoryOptionGroups.map((group) => (
                      <optgroup key={group.moduleId} label={group.moduleLabel}>
                        {group.options.map((option) => (
                          <option key={`${group.moduleId}-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {t("account.business.categoryHint")}
                  </p>
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {t("account.business.city")}
                    <span className={`ml-2 text-xs ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`}>{t("account.business.requiredMark")}</span>
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
                    <span className={`ml-2 text-xs ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`}>{t("account.business.requiredMark")}</span>
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
                  <p className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                    {t("account.business.optionalSection")}
                  </p>
                </div>
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
                  <div
                    onDragEnter={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setDraggingField("logo_url");
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (draggingField !== "logo_url") {
                        setDraggingField("logo_url");
                      }
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (event.currentTarget === event.target) {
                        setDraggingField((current) => (current === "logo_url" ? null : current));
                      }
                    }}
                    onDrop={(event) => void handleBusinessImageDrop("logo_url", event)}
                    className={`rounded-2xl border-2 border-dashed p-4 transition-colors ${
                      draggingField === "logo_url"
                        ? isDark ? "border-[#4a9eff] bg-[#12233d]" : "border-blue-500 bg-blue-50"
                        : isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => void handleBusinessImageInputChange("logo_url", event)}
                      className="hidden"
                      id="businessLogoUploadInput"
                    />
                    <label htmlFor="businessLogoUploadInput" className="block cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl ${isDark ? "bg-[#1a2d4c]" : "bg-slate-100"}`}>
                          {form.logo_url ? (
                            <img src={form.logo_url} alt={t("account.business.logoUrl")} className="h-full w-full object-cover" />
                          ) : (
                            <Upload className={`h-5 w-5 ${isDark ? "text-slate-300" : "text-slate-500"}`} />
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                            {uploadingField === "logo_url" ? t("account.business.imageUploading") : t("account.business.imageUploadHint")}
                          </p>
                          <p className={`mt-1 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            {t("account.business.imageUploadFormats")}
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                  {uploadErrors.logo_url ? (
                    <div className={`mt-3 rounded-2xl border p-3 text-sm ${isDark ? "border-red-900/40 bg-red-950/20 text-red-300" : "border-red-200 bg-red-50 text-red-600"}`}>
                      {uploadErrors.logo_url}
                    </div>
                  ) : null}
                  {form.logo_url ? (
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, logo_url: "" }))}
                      className={`mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${isDark ? "bg-[#1a2d4c] text-slate-200" : "bg-slate-100 text-slate-700"}`}
                    >
                      <X className="h-3.5 w-3.5" />
                      {t("account.business.removeImage")}
                    </button>
                  ) : null}
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {t("account.business.coverUrl")}
                  </label>
                  <div
                    onDragEnter={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setDraggingField("cover_url");
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (draggingField !== "cover_url") {
                        setDraggingField("cover_url");
                      }
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (event.currentTarget === event.target) {
                        setDraggingField((current) => (current === "cover_url" ? null : current));
                      }
                    }}
                    onDrop={(event) => void handleBusinessImageDrop("cover_url", event)}
                    className={`rounded-2xl border-2 border-dashed p-4 transition-colors ${
                      draggingField === "cover_url"
                        ? isDark ? "border-[#4a9eff] bg-[#12233d]" : "border-blue-500 bg-blue-50"
                        : isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => void handleBusinessImageInputChange("cover_url", event)}
                      className="hidden"
                      id="businessCoverUploadInput"
                    />
                    <label htmlFor="businessCoverUploadInput" className="block cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl ${isDark ? "bg-[#1a2d4c]" : "bg-slate-100"}`}>
                          {form.cover_url ? (
                            <img src={form.cover_url} alt={t("account.business.coverUrl")} className="h-full w-full object-cover" />
                          ) : (
                            <Upload className={`h-5 w-5 ${isDark ? "text-slate-300" : "text-slate-500"}`} />
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                            {uploadingField === "cover_url" ? t("account.business.imageUploading") : t("account.business.imageUploadHint")}
                          </p>
                          <p className={`mt-1 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            {t("account.business.imageUploadFormats")}
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                  {uploadErrors.cover_url ? (
                    <div className={`mt-3 rounded-2xl border p-3 text-sm ${isDark ? "border-red-900/40 bg-red-950/20 text-red-300" : "border-red-200 bg-red-50 text-red-600"}`}>
                      {uploadErrors.cover_url}
                    </div>
                  ) : null}
                  {form.cover_url ? (
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, cover_url: "" }))}
                      className={`mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${isDark ? "bg-[#1a2d4c] text-slate-200" : "bg-slate-100 text-slate-700"}`}
                    >
                      <X className="h-3.5 w-3.5" />
                      {t("account.business.removeImage")}
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
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
            </div>

            {!isFormReady ? (
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {t("account.business.requiredFieldsMissing")}:{" "}
                {requiredFields
                  .filter((field) => !field.valid)
                  .map((field) => t(`account.business.${field.key}`))
                  .join(", ")}
              </p>
            ) : null}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={!isFormReady || saveMutation.isPending}
                className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold ${
                  !isFormReady || saveMutation.isPending ? "cursor-not-allowed opacity-60" : ""
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
