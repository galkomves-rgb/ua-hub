import { useEffect, useState, type ChangeEvent, type DragEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { Upload, UserCircle2, X } from "lucide-react";
import UahubLayout from "@/components/UahubLayout";
import CityPicker from "@/components/CityPicker";
import { useAuth } from "@/contexts/AuthContext";
import {
  completeOnboarding,
  fetchOnboardingStatus,
  type OnboardingCompletePayload,
} from "@/lib/account-api";
import { uploadImageFile } from "@/lib/media-storage";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

type OnboardingForm = OnboardingCompletePayload;

const defaultForm: OnboardingForm = {
  name: "",
  city: "",
  bio: "",
  preferred_language: "ua",
  account_type: "private",
  avatar_url: null,
  is_public_profile: false,
  show_as_public_author: false,
  allow_marketing_emails: false,
};

export default function OnboardingPage() {
  const { user, loading, refetch } = useAuth();
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const [form, setForm] = useState<OnboardingForm>(defaultForm);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);

  const onboardingQuery = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: fetchOnboardingStatus,
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (user) {
      setForm((current) => ({
        ...current,
        name: current.name || user.name || user.email,
      }));
    }
  }, [user]);

  const completeMutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: async () => {
      await refetch();
      navigate("/account", { replace: true });
    },
  });

  if (loading) {
    return (
      <UahubLayout>
        <div className="mx-auto max-w-3xl px-4 py-16 lg:px-6">{t("common.loading")}</div>
      </UahubLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (onboardingQuery.data?.completed) {
    return (
      <UahubLayout hideModuleNav>
        <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
          <section className={`rounded-3xl border p-6 md:p-8 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
            <h1 className={`text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("onboarding.title")}</h1>
            <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {t("onboarding.subtitle")}
            </p>
            <div className={`mt-6 rounded-2xl border p-4 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
              {t("account.subtitle")}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => navigate("/account")}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold ${isDark ? "bg-[#FFD700] text-[#0d1a2e]" : "bg-[#0057B8] text-white"}`}
              >
                {t("nav.account")}
              </button>
            </div>
          </section>
        </div>
      </UahubLayout>
    );
  }

  const handleSubmit = () => {
    completeMutation.mutate(form);
  };

  const handleAvatarFiles = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    setAvatarUploadError(null);
    setIsUploadingAvatar(true);

    try {
      const uploadedAvatar = await uploadImageFile(files[0], "avatar");
      setForm((current) => ({ ...current, avatar_url: uploadedAvatar.accessUrl }));
    } catch (error) {
      setAvatarUploadError(error instanceof Error ? error.message : t("onboarding.avatarUploadError"));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    await handleAvatarFiles(files);
  };

  const handleAvatarDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingAvatar(false);

    const files = Array.from(event.dataTransfer.files || []);
    await handleAvatarFiles(files);
  };

  return (
    <UahubLayout hideModuleNav>
      <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
        <section className={`rounded-3xl border p-6 md:p-8 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
          <h1 className={`text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("onboarding.title")}</h1>
          <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("onboarding.subtitle")}</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>{t("onboarding.name")}</label>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`} />
            </div>
            <div>
              <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>{t("onboarding.city")}</label>
              <CityPicker
                value={form.city}
                onValueChange={(city) => setForm((current) => ({ ...current, city }))}
                buttonClassName={isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100 hover:bg-[#10213a]" : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"}
              />
              <p className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("cityPicker.helper")}</p>
            </div>
            <div>
              <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>{t("onboarding.bio")}</label>
              <textarea value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} rows={4} className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`} />
            </div>
            <div>
              <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>{t("onboarding.accountType")}</label>
              <div className="grid gap-3 md:grid-cols-2">
                {(["private", "business"] as const).map((accountType) => (
                  <button
                    key={accountType}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, account_type: accountType }))}
                    className={`rounded-2xl border px-4 py-4 text-left text-sm font-medium ${form.account_type === accountType ? (isDark ? "border-[#FFD700] bg-[#1a2d4c] text-slate-100" : "border-[#0057B8] bg-blue-50 text-slate-900") : (isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-300" : "border-slate-200 bg-white text-slate-700")}`}
                  >
                    {t(`onboarding.accountType.${accountType}`)}
                  </button>
                ))}
              </div>
              {form.account_type === "business" ? (
                <p className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("onboarding.businessHint")}</p>
              ) : null}
            </div>
            <div>
              <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>{t("onboarding.language")}</label>
              <select value={form.preferred_language} onChange={(event) => setForm((current) => ({ ...current, preferred_language: event.target.value as "ua" | "es" | "en" }))} className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}>
                <option value="ua">Українська</option>
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>{t("onboarding.avatarUrl")}</label>
              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsDraggingAvatar(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!isDraggingAvatar) {
                    setIsDraggingAvatar(true);
                  }
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (event.currentTarget === event.target) {
                    setIsDraggingAvatar(false);
                  }
                }}
                onDrop={(event) => void handleAvatarDrop(event)}
                className={`rounded-2xl border-2 border-dashed p-4 transition-colors ${
                  isDraggingAvatar
                    ? isDark ? "border-[#4a9eff] bg-[#12233d]" : "border-blue-500 bg-blue-50"
                    : isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-300 bg-white"
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleAvatarInputChange(event)}
                  className="hidden"
                  id="onboardingAvatarUploadInput"
                />
                <label htmlFor="onboardingAvatarUploadInput" className="block cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl ${isDark ? "bg-[#1a2d4c]" : "bg-slate-100"}`}>
                      {form.avatar_url ? (
                        <img src={form.avatar_url} alt={form.name || user.email} className="h-full w-full object-cover" />
                      ) : (
                        <UserCircle2 className={`h-5 w-5 ${isDark ? "text-slate-300" : "text-slate-500"}`} />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                        {isUploadingAvatar ? t("onboarding.avatarUploading") : t("onboarding.avatarUploadHint")}
                      </p>
                      <p className={`mt-1 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        {t("create.uploadFormats")}
                      </p>
                    </div>
                    <Upload className={`ml-auto h-5 w-5 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
                  </div>
                </label>
              </div>
              {avatarUploadError ? (
                <div className={`mt-3 rounded-2xl border p-3 text-sm ${isDark ? "border-red-900/40 bg-red-950/20 text-red-300" : "border-red-200 bg-red-50 text-red-600"}`}>
                  {avatarUploadError}
                </div>
              ) : null}
              {form.avatar_url ? (
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, avatar_url: null }))}
                  className={`mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${isDark ? "bg-[#1a2d4c] text-slate-200" : "bg-slate-100 text-slate-700"}`}
                >
                  <X className="h-3.5 w-3.5" />
                  {t("onboarding.removeAvatar")}
                </button>
              ) : null}
            </div>
            <label className={`flex items-center gap-3 rounded-2xl border p-4 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
              <input type="checkbox" checked={form.is_public_profile} onChange={(event) => setForm((current) => ({ ...current, is_public_profile: event.target.checked }))} />
              {t("onboarding.publicProfile")}
            </label>
            <label className={`flex items-center gap-3 rounded-2xl border p-4 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
              <input type="checkbox" checked={form.show_as_public_author} onChange={(event) => setForm((current) => ({ ...current, show_as_public_author: event.target.checked }))} />
              {t("onboarding.publicAuthor")}
            </label>
            <label className={`flex items-center gap-3 rounded-2xl border p-4 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
              <input type="checkbox" checked={form.allow_marketing_emails} onChange={(event) => setForm((current) => ({ ...current, allow_marketing_emails: event.target.checked }))} />
              {t("onboarding.marketingEmails")}
            </label>
          </div>

          {completeMutation.isError ? (
            <p className={`mt-4 text-sm ${isDark ? "text-red-300" : "text-red-600"}`}>{completeMutation.error instanceof Error ? completeMutation.error.message : t("onboarding.error")}</p>
          ) : null}

          <div className="mt-6 flex justify-end">
            <button type="button" onClick={handleSubmit} disabled={completeMutation.isPending || !form.name.trim()} className={`rounded-2xl px-5 py-3 text-sm font-semibold ${(completeMutation.isPending || !form.name.trim()) ? "cursor-not-allowed opacity-60" : ""} ${isDark ? "bg-[#FFD700] text-[#0d1a2e]" : "bg-[#0057B8] text-white"}`}>
              {completeMutation.isPending ? t("onboarding.submitting") : t("onboarding.submit")}
            </button>
          </div>
        </section>
      </div>
    </UahubLayout>
  );
}
