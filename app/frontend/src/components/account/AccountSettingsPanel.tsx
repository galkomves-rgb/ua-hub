import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Globe2, Save, Shield, ToggleLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  createUserProfile,
  fetchUserProfile,
  updateUserProfile,
  type UserProfilePayload,
  type UserProfileResponse,
} from "@/lib/account-api";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

type SettingsFormState = {
  preferred_language: "ua" | "es" | "en";
  is_public_profile: boolean;
  show_as_public_author: boolean;
  allow_marketing_emails: boolean;
};

function buildSettingsForm(profile: UserProfileResponse | null): SettingsFormState {
  return {
    preferred_language: (profile?.preferred_language as "ua" | "es" | "en") || "ua",
    is_public_profile: profile?.is_public_profile ?? false,
    show_as_public_author: profile?.show_as_public_author ?? false,
    allow_marketing_emails: profile?.allow_marketing_emails ?? false,
  };
}

function SettingsToggle({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  description: string;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <label
      className={`flex cursor-pointer items-start justify-between gap-4 rounded-2xl border p-4 ${
        isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div>
        <p className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{title}</p>
        <p className={`mt-1 text-xs leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <div
        className={`mt-0.5 rounded-full p-1 transition-colors ${
          checked
            ? isDark
              ? "bg-[#FFD700] text-[#0d1a2e]"
              : "bg-[#0057B8] text-white"
            : isDark
              ? "bg-[#1a2d4c] text-slate-500"
              : "bg-slate-200 text-slate-500"
        }`}
      >
        <ToggleLeft className={`h-5 w-5 transition-transform ${checked ? "rotate-180" : ""}`} />
      </div>
    </label>
  );
}

export function AccountSettingsPanel() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["account-profile"],
    queryFn: fetchUserProfile,
    retry: false,
  });

  const profile = profileQuery.data ?? null;
  const profileMissing = profileQuery.error instanceof Error && profileQuery.error.message === "PROFILE_NOT_FOUND";

  const [form, setForm] = useState<SettingsFormState>(() => buildSettingsForm(null));

  useEffect(() => {
    setForm(buildSettingsForm(profile));
  }, [profile]);

  const mutation = useMutation({
    mutationFn: async (payload: UserProfilePayload) => {
      if (profileMissing || !profile) {
        return createUserProfile(payload);
      }
      return updateUserProfile(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["account-profile"] });
    },
  });

  const hasChanges = useMemo(() => {
    const baseline = buildSettingsForm(profile);
    return (
      baseline.preferred_language !== form.preferred_language ||
      baseline.is_public_profile !== form.is_public_profile ||
      baseline.show_as_public_author !== form.show_as_public_author ||
      baseline.allow_marketing_emails !== form.allow_marketing_emails
    );
  }, [form, profile]);

  const handleSave = () => {
    mutation.mutate({
      name: profile?.name || user?.name || user?.email || "User",
      city: profile?.city || "",
      bio: profile?.bio || "",
      preferred_language: form.preferred_language,
      avatar_url: profile?.avatar_url || null,
      is_public_profile: form.is_public_profile,
      show_as_public_author: form.show_as_public_author,
      allow_marketing_emails: form.allow_marketing_emails,
    });
  };

  return (
    <section
      className={`rounded-3xl border p-5 md:p-6 ${
        isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-6 flex items-start gap-4">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${isDark ? "bg-[#1a2d4c] text-[#FFD700]" : "bg-blue-50 text-[#0057B8]"}`}>
          <Shield className="h-7 w-7" />
        </div>
        <div>
          <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            {t("account.settings.title")}
          </h2>
          <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {t("account.settings.subtitle")}
          </p>
        </div>
      </div>

      {profileQuery.isLoading ? (
        <div className={`rounded-2xl border p-6 text-sm ${isDark ? "border-[#22416b] text-slate-400" : "border-slate-200 text-slate-500"}`}>
          {t("common.loading")}
        </div>
      ) : profileQuery.isError && !profileMissing ? (
        <div className={`rounded-2xl border p-6 ${isDark ? "border-red-900/40 bg-red-950/20" : "border-red-200 bg-red-50"}`}>
          <div className="flex items-start gap-3">
            <AlertCircle className={`mt-0.5 h-5 w-5 shrink-0 ${isDark ? "text-red-300" : "text-red-600"}`} />
            <div>
              <p className={`text-sm ${isDark ? "text-red-300" : "text-red-600"}`}>
                {profileQuery.error instanceof Error ? profileQuery.error.message : t("account.loadError")}
              </p>
              <button
                type="button"
                onClick={() => void profileQuery.refetch()}
                className={`mt-4 rounded-xl px-4 py-2 text-sm font-medium ${
                  isDark ? "bg-[#1a2d4c] text-slate-100" : "bg-white text-slate-700"
                }`}
              >
                {t("account.retry")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {profileMissing ? (
            <div
              className={`rounded-2xl border border-dashed p-4 text-sm ${
                isDark ? "border-[#22416b] text-slate-400" : "border-slate-200 text-slate-500"
              }`}
            >
              {t("account.settings.empty")}
            </div>
          ) : null}

          {mutation.isError ? (
            <div className={`rounded-2xl border p-4 text-sm ${isDark ? "border-red-900/40 bg-red-950/20 text-red-300" : "border-red-200 bg-red-50 text-red-600"}`}>
              {mutation.error instanceof Error ? mutation.error.message : t("account.settings.saveError")}
            </div>
          ) : null}

          {mutation.isSuccess ? (
            <div className={`rounded-2xl border p-4 text-sm ${isDark ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              {t("account.settings.saveSuccess")}
            </div>
          ) : null}

          <div className="space-y-4">
            <div
              className={`rounded-2xl border p-4 ${
                isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="mb-3 flex items-center gap-2">
                <Globe2 className={`h-4 w-4 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
                <p className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  {t("account.settings.language")}
                </p>
              </div>
              <select
                value={form.preferred_language}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    preferred_language: event.target.value as "ua" | "es" | "en",
                  }))
                }
                className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                  isDark
                    ? "border-[#22416b] bg-[#11203a] text-slate-100"
                    : "border-slate-300 bg-white text-slate-900"
                }`}
              >
                <option value="ua">{t("account.profile.language.ua")}</option>
                <option value="es">{t("account.profile.language.es")}</option>
                <option value="en">{t("account.profile.language.en")}</option>
              </select>
            </div>

            <SettingsToggle
              checked={form.is_public_profile}
              onChange={(value) => setForm((current) => ({ ...current, is_public_profile: value }))}
              title={t("account.settings.publicProfile")}
              description={t("account.settings.publicProfileDescription")}
            />
            <SettingsToggle
              checked={form.show_as_public_author}
              onChange={(value) => setForm((current) => ({ ...current, show_as_public_author: value }))}
              title={t("account.settings.publicAuthor")}
              description={t("account.settings.publicAuthorDescription")}
            />
            <SettingsToggle
              checked={form.allow_marketing_emails}
              onChange={(value) => setForm((current) => ({ ...current, allow_marketing_emails: value }))}
              title={t("account.settings.marketingEmails")}
              description={t("account.settings.marketingEmailsDescription")}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={mutation.isPending || !hasChanges}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold ${
                mutation.isPending || !hasChanges ? "cursor-not-allowed opacity-60" : ""
              } ${
                isDark
                  ? "bg-gradient-to-r from-[#FFD700] to-[#e6c200] text-[#0d1a2e]"
                  : "bg-gradient-to-r from-[#0057B8] to-[#0070E0] text-white"
              }`}
            >
              <Save className="h-4 w-4" />
              {mutation.isPending ? t("account.settings.saving") : t("account.settings.save")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
