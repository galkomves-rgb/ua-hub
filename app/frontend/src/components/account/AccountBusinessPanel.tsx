import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, Globe, Save, ShieldCheck, Sparkles } from "lucide-react";
import {
  createBusinessProfile,
  fetchMyBusinessProfiles,
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
  contacts_json: string;
  tags_json: string;
  rating: string;
  website: string;
  social_links_json: string;
  service_areas_json: string;
};

function buildBusinessForm(profile: BusinessProfileResponse | null): BusinessFormState {
  return {
    slug: profile?.slug || "",
    name: profile?.name || "",
    category: profile?.category || "",
    city: profile?.city || "",
    description: profile?.description || "",
    logo_url: profile?.logo_url || "",
    cover_url: profile?.cover_url || "",
    contacts_json: profile?.contacts_json || "{}",
    tags_json: profile?.tags_json || "[]",
    rating: profile?.rating || "0",
    website: profile?.website || "",
    social_links_json: profile?.social_links_json || "[]",
    service_areas_json: profile?.service_areas_json || "[]",
  };
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

  const [form, setForm] = useState<BusinessFormState>(() => buildBusinessForm(null));

  useEffect(() => {
    setForm(buildBusinessForm(activeProfile));
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

  const canSubmit = useMemo(() => {
    return (
      form.slug.trim().length > 0 &&
      form.name.trim().length > 0 &&
      form.category.trim().length > 0 &&
      form.description.trim().length > 0
    );
  }, [form.category, form.description, form.name, form.slug]);

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
      contacts_json: form.contacts_json.trim() || "{}",
      tags_json: form.tags_json.trim() || "[]",
      rating: form.rating.trim() || "0",
      website: form.website.trim() || null,
      social_links_json: form.social_links_json.trim() || "[]",
      service_areas_json: form.service_areas_json.trim() || "[]",
    });
  };

  return (
    <section className="space-y-6">
      <div
        className={`rounded-3xl border p-5 md:p-6 ${
          isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"
        }`}
      >
        <div className="mb-6 flex items-start gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${isDark ? "bg-[#1a2d4c] text-[#FFD700]" : "bg-blue-50 text-[#0057B8]"}`}>
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
          <div className={`rounded-2xl border p-6 text-sm ${isDark ? "border-[#22416b] text-slate-400" : "border-slate-200 text-slate-500"}`}>
            {t("common.loading")}
          </div>
        ) : businessQuery.isError ? (
          <div className={`rounded-2xl border p-6 ${isDark ? "border-red-900/40 bg-red-950/20" : "border-red-200 bg-red-50"}`}>
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
              <div className={`rounded-2xl border border-dashed p-4 text-sm ${isDark ? "border-[#22416b] text-slate-400" : "border-slate-200 text-slate-500"}`}>
                {t("account.business.empty")}
              </div>
            ) : null}

            {saveMutation.isError ? (
              <div className={`rounded-2xl border p-4 text-sm ${isDark ? "border-red-900/40 bg-red-950/20 text-red-300" : "border-red-200 bg-red-50 text-red-600"}`}>
                {saveMutation.error instanceof Error ? saveMutation.error.message : t("account.business.saveError")}
              </div>
            ) : null}

            {saveMutation.isSuccess ? (
              <div className={`rounded-2xl border p-4 text-sm ${isDark ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                {t("account.business.saveSuccess")}
              </div>
            ) : null}

            {activeProfile ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className={`rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`h-4 w-4 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
                    <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      {t("account.business.verificationStatus")}
                    </p>
                  </div>
                  <p className={`mt-3 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    {activeProfile.verification_status}
                  </p>
                </div>

                <div className={`rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                  <div className="flex items-center gap-2">
                    <Sparkles className={`h-4 w-4 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
                    <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      {t("account.business.plan")}
                    </p>
                  </div>
                  <p className={`mt-3 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    {activeProfile.subscription_plan || t("account.business.noPlan")}
                  </p>
                </div>

                <div className={`rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`h-4 w-4 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
                    <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      {t("account.business.verified")}
                    </p>
                  </div>
                  <p className={`mt-3 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    {activeProfile.is_verified ? t("account.business.yes") : t("account.business.no")}
                  </p>
                </div>

                <div className={`rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                  <div className="flex items-center gap-2">
                    <Globe className={`h-4 w-4 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
                    <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      {t("account.business.listingQuota")}
                    </p>
                  </div>
                  <p className={`mt-3 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    {activeProfile.listing_quota ?? t("account.business.notSet")}
                  </p>
                </div>
              </div>
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
                  <input
                    type="text"
                    value={form.city}
                    onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    }`}
                  />
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
                    {t("account.business.contactsJson")}
                  </label>
                  <textarea
                    value={form.contacts_json}
                    onChange={(event) => setForm((current) => ({ ...current, contacts_json: event.target.value }))}
                    rows={3}
                    className={`w-full rounded-2xl border px-4 py-3 font-mono text-xs ${
                      isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    }`}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                      {t("account.business.tagsJson")}
                    </label>
                    <textarea
                      value={form.tags_json}
                      onChange={(event) => setForm((current) => ({ ...current, tags_json: event.target.value }))}
                      rows={3}
                      className={`w-full rounded-2xl border px-4 py-3 font-mono text-xs ${
                        isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                      {t("account.business.serviceAreasJson")}
                    </label>
                    <textarea
                      value={form.service_areas_json}
                      onChange={(event) => setForm((current) => ({ ...current, service_areas_json: event.target.value }))}
                      rows={3}
                      className={`w-full rounded-2xl border px-4 py-3 font-mono text-xs ${
                        isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"
                      }`}
                    />
                  </div>
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
