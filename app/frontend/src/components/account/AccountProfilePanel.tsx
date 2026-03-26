import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Save, Upload, UserCircle2, X } from "lucide-react";
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
import { uploadImageFile } from "@/lib/media-storage";

type EditableProfileForm = {
  name: string;
  city: string;
  bio: string;
  preferred_language: "ua" | "es" | "en";
  avatar_url: string;
};

function buildFormState(profile: UserProfileResponse | null, fallbackName: string): EditableProfileForm {
  return {
    name: profile?.name || fallbackName || "",
    city: profile?.city || "",
    bio: profile?.bio || "",
    preferred_language: (profile?.preferred_language as "ua" | "es" | "en") || "ua",
    avatar_url: profile?.avatar_url || "",
  };
}

export function AccountProfilePanel() {
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

  const [form, setForm] = useState<EditableProfileForm>(() => buildFormState(null, user?.name || ""));
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);

  useEffect(() => {
    setForm(buildFormState(profile, user?.name || ""));
  }, [profile, user?.name]);

  const mutation = useMutation({
    mutationFn: async (payload: UserProfilePayload) => {
      if (profileMissing || !profile) {
        return createUserProfile(payload);
      }
      return updateUserProfile(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account-profile"] });
    },
  });

  const hasMeaningfulChanges = useMemo(() => {
    const baseline = buildFormState(profile, user?.name || "");
    return (
      baseline.name !== form.name ||
      baseline.city !== form.city ||
      baseline.bio !== form.bio ||
      baseline.preferred_language !== form.preferred_language ||
      baseline.avatar_url !== form.avatar_url
    );
  }, [form, profile, user?.name]);

  const handleSubmit = () => {
    mutation.mutate({
      name: form.name.trim(),
      city: form.city.trim(),
      bio: form.bio.trim(),
      preferred_language: form.preferred_language,
      avatar_url: form.avatar_url.trim() || null,
    });
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
      console.error("Failed to upload avatar:", error);
      setAvatarUploadError(error instanceof Error ? error.message : "Не вдалося завантажити фото профілю.");
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
    <section
      className={`rounded-3xl border p-5 md:p-6 ${
        isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-6 flex items-start gap-4">
        <div
          className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${
            isDark ? "bg-[#1a2d4c]" : "bg-slate-100"
          }`}
        >
          {form.avatar_url ? (
            <img src={form.avatar_url} alt={form.name || user?.email || "Profile"} className="h-full w-full object-cover" />
          ) : (
            <UserCircle2 className={`h-8 w-8 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            {t("account.profile.title")}
          </h2>
          <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {t("account.profile.subtitle")}
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
              {t("account.profile.empty")}
            </div>
          ) : null}

          {mutation.isError ? (
            <div className={`rounded-2xl border p-4 text-sm ${isDark ? "border-red-900/40 bg-red-950/20 text-red-300" : "border-red-200 bg-red-50 text-red-600"}`}>
              {mutation.error instanceof Error ? mutation.error.message : t("account.profile.saveError")}
            </div>
          ) : null}

          {mutation.isSuccess ? (
            <div className={`rounded-2xl border p-4 text-sm ${isDark ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              {t("account.profile.saveSuccess")}
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div>
                <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                  {t("account.profile.publicName")}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                    isDark
                      ? "border-[#22416b] bg-[#0d1a2e] text-slate-100"
                      : "border-slate-300 bg-white text-slate-900"
                  }`}
                />
              </div>

              <div>
                <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                  {t("account.profile.city")}
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                    isDark
                      ? "border-[#22416b] bg-[#0d1a2e] text-slate-100"
                      : "border-slate-300 bg-white text-slate-900"
                  }`}
                />
              </div>

              <div>
                <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                  {t("account.profile.bio")}
                </label>
                <textarea
                  value={form.bio}
                  onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                  rows={5}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                    isDark
                      ? "border-[#22416b] bg-[#0d1a2e] text-slate-100"
                      : "border-slate-300 bg-white text-slate-900"
                  }`}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                  {t("account.profile.email")}
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                    isDark
                      ? "border-[#22416b] bg-[#0b1627] text-slate-400"
                      : "border-slate-300 bg-slate-50 text-slate-500"
                  }`}
                />
              </div>

              <div>
                <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                  {t("account.profile.preferredLanguage")}
                </label>
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
                      ? "border-[#22416b] bg-[#0d1a2e] text-slate-100"
                      : "border-slate-300 bg-white text-slate-900"
                  }`}
                >
                  <option value="ua">{t("account.profile.language.ua")}</option>
                  <option value="es">{t("account.profile.language.es")}</option>
                  <option value="en">{t("account.profile.language.en")}</option>
                </select>
              </div>

              <div>
                <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                  Фото профілю
                </label>
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
                  onDrop={handleAvatarDrop}
                  className={`rounded-2xl border-2 border-dashed p-4 transition-colors ${
                    isDraggingAvatar
                      ? isDark ? "border-[#4a9eff] bg-[#12233d]" : "border-blue-500 bg-blue-50"
                      : isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-300 bg-white"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarInputChange}
                    className="hidden"
                    id="avatarUploadInput"
                  />
                  <label htmlFor="avatarUploadInput" className="block cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isDark ? "bg-[#1a2d4c]" : "bg-slate-100"}`}>
                        <Upload className={`h-5 w-5 ${isDark ? "text-slate-300" : "text-slate-500"}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                          {isUploadingAvatar ? "Завантажуємо фото..." : "Натисніть, щоб вибрати фото, або перетягніть файл сюди"}
                        </p>
                        <p className={`mt-1 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          JPG, PNG до 5 МБ
                        </p>
                      </div>
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
                    onClick={() => setForm((current) => ({ ...current, avatar_url: "" }))}
                    className={`mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${isDark ? "bg-[#1a2d4c] text-slate-200" : "bg-slate-100 text-slate-700"}`}
                  >
                    <X className="h-3.5 w-3.5" />
                    Видалити фото
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={mutation.isPending || !form.name.trim() || !hasMeaningfulChanges}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold ${
                mutation.isPending || !form.name.trim() || !hasMeaningfulChanges
                  ? "cursor-not-allowed opacity-60"
                  : ""
              } ${
                isDark
                  ? "bg-gradient-to-r from-[#FFD700] to-[#e6c200] text-[#0d1a2e]"
                  : "bg-gradient-to-r from-[#0057B8] to-[#0070E0] text-white"
              }`}
            >
              <Save className="h-4 w-4" />
              {mutation.isPending ? t("account.profile.saving") : t("account.profile.save")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
