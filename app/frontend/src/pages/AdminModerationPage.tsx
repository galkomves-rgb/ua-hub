import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, CheckCircle2, XCircle, ArrowRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import ProtectedAdminRoute from "@/components/ProtectedAdminRoute";
import UahubLayout from "@/components/UahubLayout";
import { moderateListing, fetchModerationQueue, type ListingManagementItem } from "@/lib/account-api";
import { deriveListingLabels, getModuleLabelSystem, type LabelId } from "@/lib/label-taxonomy";
import { MODULES } from "@/lib/platform";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

const MODULE_OPTIONS = ["all", "jobs", "housing", "services", "marketplace", "events", "community", "organizations"] as const;
const MODERATOR_BADGES = ["featured", "urgent", "remote", "online", "free"] as const;

function parseBadges(rawBadges: string | null) {
  if (!rawBadges) {
    return [] as string[];
  }
  try {
    const parsed = JSON.parse(rawBadges);
    return Array.isArray(parsed) ? parsed.filter((badge): badge is string => typeof badge === "string") : [];
  } catch {
    return [];
  }
}

function parseImages(rawImages: string | null) {
  if (!rawImages) {
    return [] as string[];
  }
  try {
    const parsed = JSON.parse(rawImages);
    return Array.isArray(parsed) ? parsed.filter((image): image is string => typeof image === "string" && image.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function getLabelTitle(label: LabelId, locale: "ua" | "es" | "en") {
  const titles: Record<LabelId, { ua: string; es: string; en: string }> = {
    verified: { ua: "Перевірено", es: "Verificado", en: "Verified" },
    premium: { ua: "Преміум", es: "Premium", en: "Premium" },
    featured: { ua: "Рекомендоване", es: "Destacado", en: "Featured" },
    business: { ua: "Бізнес", es: "Negocio", en: "Business" },
    private: { ua: "Приватне", es: "Privado", en: "Private" },
    free: { ua: "Безкоштовно", es: "Gratis", en: "Free" },
    new: { ua: "Нове", es: "Nuevo", en: "New" },
    urgent: { ua: "Терміново", es: "Urgente", en: "Urgent" },
    remote: { ua: "Віддалено", es: "Remoto", en: "Remote" },
    online: { ua: "Онлайн", es: "En línea", en: "Online" },
  };

  return titles[label][locale];
}

function getModuleTitle(moduleId: string, t: (key: string) => string) {
  return MODULES[moduleId] ? t(`mod.${moduleId}`) : moduleId;
}

function getCategoryTitle(moduleId: string, categoryId: string) {
  const category = MODULES[moduleId]?.categories.find((entry) => entry.id === categoryId);
  return category?.labelKey ?? categoryId;
}

function ModerationCard({
  item,
  pending,
  onApprove,
  onReject,
}: {
  item: ListingManagementItem;
  pending: boolean;
  onApprove: (listingId: number, module: string, category: string, badges: string[]) => void;
  onReject: (listingId: number, reason: string, module: string, category: string, badges: string[]) => void;
}) {
  const { theme } = useTheme();
  const { locale, t } = useI18n();
  const isDark = theme === "dark";
  const [reason, setReason] = useState(item.moderation_reason ?? "");
  const [moduleId, setModuleId] = useState(item.module);
  const [category, setCategory] = useState(item.category);
  const [selectedBadges, setSelectedBadges] = useState<string[]>(() => parseBadges(item.badges).filter((badge) => MODERATOR_BADGES.includes(badge as never)));
  const originalModeratorBadges = useMemo(
    () => parseBadges(item.badges).filter((badge) => MODERATOR_BADGES.includes(badge as never)),
    [item.badges],
  );
  const moduleLabelSystem = getModuleLabelSystem();
  const availableBadges = moduleLabelSystem[moduleId]?.filter((badge) => MODERATOR_BADGES.includes(badge as never)) ?? [];
  const availableCategories = MODULES[moduleId]?.categories ?? [];
  const originalCategories = MODULES[item.module]?.categories ?? [];
  const images = useMemo(() => parseImages(item.images_json), [item.images_json]);
  const derivedLabels = useMemo(
    () => deriveListingLabels({
      module: moduleId,
      badges: parseBadges(item.badges),
      owner_type: item.owner_type,
      created_at: item.created_at,
      is_verified: item.is_verified,
      is_featured: item.is_featured,
      is_promoted: item.is_promoted,
    }),
    [item.badges, item.created_at, item.is_featured, item.is_promoted, item.is_verified, item.owner_type, moduleId],
  );
  const systemLabels = derivedLabels.filter((badge) => !MODERATOR_BADGES.includes(badge as never));
  const finalLabels = useMemo(
    () => deriveListingLabels({
      module: moduleId,
      badges: selectedBadges,
      owner_type: item.owner_type,
      created_at: item.created_at,
      is_verified: item.is_verified,
      is_featured: item.is_featured,
      is_promoted: item.is_promoted,
    }),
    [item.created_at, item.is_featured, item.is_promoted, item.is_verified, item.owner_type, moduleId, selectedBadges],
  );
  const finalManagedLabels = finalLabels.filter((badge) => MODERATOR_BADGES.includes(badge as never));
  const finalSystemLabels = finalLabels.filter((badge) => !MODERATOR_BADGES.includes(badge as never));
  const originalModuleTitle = getModuleTitle(item.module, t);
  const reviewedModuleTitle = getModuleTitle(moduleId, t);
  const originalCategoryTitle = getCategoryTitle(item.module, item.category);
  const reviewedCategoryTitle = getCategoryTitle(moduleId, category);
  const originalCategoryIsInvalid = originalCategories.length > 0 && !originalCategories.some((entry) => entry.id === item.category);
  const reviewChanged = item.module !== moduleId || item.category !== category || JSON.stringify(originalModeratorBadges) !== JSON.stringify(selectedBadges);

  return (
    <article className={`rounded-2xl border p-5 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-white"}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.title}</h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "rejected" ? (isDark ? "bg-red-950/40 text-red-300" : "bg-red-50 text-red-700") : (isDark ? "bg-amber-950/40 text-amber-300" : "bg-amber-50 text-amber-700")}`}>
              {item.status}
            </span>
          </div>
          <div className={`mt-3 grid gap-2 text-sm sm:grid-cols-2 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            <p><span className={`font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>{locale === "ua" ? "Поточний модуль" : locale === "es" ? "Módulo actual" : "Current module"}:</span> {originalModuleTitle}</p>
            <p><span className={`font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>{locale === "ua" ? "Поточна категорія" : locale === "es" ? "Categoría actual" : "Current category"}:</span> {originalCategoryTitle}</p>
            <p><span className={`font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>{locale === "ua" ? "Перегляди" : locale === "es" ? "Vistas" : "Views"}:</span> {item.views_count}</p>
            <p><span className={`font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>{locale === "ua" ? "Збереження" : locale === "es" ? "Guardados" : "Saves"}:</span> {item.saved_count}</p>
          </div>

          <div className={`mt-4 rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-slate-50"}`}>
            <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {locale === "ua" ? "Рішення модерації" : locale === "es" ? "Resultado de moderación" : "Moderation outcome"}
            </p>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
              <div>
                <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>{locale === "ua" ? "Було" : locale === "es" ? "Antes" : "Before"}</p>
                <p className={`mt-1 text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{originalModuleTitle}</p>
                <p className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>{originalCategoryTitle}</p>
              </div>
              <div className={`hidden md:flex md:justify-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                <ArrowRight className="h-4 w-4" />
              </div>
              <div>
                <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>{locale === "ua" ? "Стане після підтвердження" : locale === "es" ? "Quedará después de confirmar" : "After approval"}</p>
                <p className={`mt-1 text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{reviewedModuleTitle}</p>
                <p className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>{reviewedCategoryTitle || (locale === "ua" ? "Категорію не обрано" : locale === "es" ? "Categoría no seleccionada" : "Category not selected")}</p>
              </div>
            </div>
            {reviewChanged ? (
              <p className={`mt-3 text-xs ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                {locale === "ua"
                  ? "Зміни ще не збережені. Вони застосуються після натискання “Схвалити” або “Відхилити”."
                  : locale === "es"
                    ? "Los cambios aún no se han guardado. Se aplicarán después de pulsar “Aprobar” o “Rechazar”."
                    : "Changes are not saved yet. They will be applied after you click Approve or Reject."}
              </p>
            ) : null}
          </div>

          {originalCategoryIsInvalid ? (
            <div className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 ${isDark ? "border-amber-900/40 bg-amber-950/20" : "border-amber-200 bg-amber-50"}`}>
              <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${isDark ? "text-amber-300" : "text-amber-700"}`} />
              <div>
                <p className={`text-sm ${isDark ? "text-amber-200" : "text-amber-800"}`}>
                  {locale === "ua"
                    ? "Поточна категорія не належить до поточного модуля. Це оголошення потребує ручного виправлення під час модерації."
                    : locale === "es"
                      ? "La categoría actual no pertenece al módulo actual. Este anuncio necesita corrección manual durante la moderación."
                      : "The current category does not belong to the current module. This listing needs manual correction during moderation."}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
              {locale === "ua" ? "Фото оголошення" : locale === "es" ? "Fotos del anuncio" : "Listing photos"}
            </label>
            {images.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {images.slice(0, 4).map((image, index) => (
                  <a
                    key={`${item.id}-${index}`}
                    href={image}
                    target="_blank"
                    rel="noreferrer"
                    className={`overflow-hidden rounded-2xl border ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-slate-50"}`}
                  >
                    <img src={image} alt={`${item.title} ${index + 1}`} className="h-28 w-full object-cover" />
                  </a>
                ))}
              </div>
            ) : (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#11203a] text-slate-400" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                {locale === "ua" ? "До оголошення не прикріплено фото або вони ще не потрапляють у moderation payload." : locale === "es" ? "El anuncio no tiene fotos adjuntas o aún no llegan al payload de moderación." : "No photos are attached to this listing or they are not present in the moderation payload yet."}
              </div>
            )}
          </div>

          {systemLabels.length > 0 ? (
            <div className="mt-4">
              <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                {locale === "ua" ? "Системні лейбли" : locale === "es" ? "Etiquetas del sistema" : "System labels"}
              </label>
              <div className="flex flex-wrap gap-2">
                {systemLabels.map((badge) => (
                  <span
                    key={badge}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold ${isDark ? "border-[#22416b] bg-[#11203a] text-slate-200" : "border-slate-300 bg-slate-50 text-slate-700"}`}
                  >
                    {getLabelTitle(badge, locale)}
                  </span>
                ))}
              </div>
              <p className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {locale === "ua"
                  ? "Ці лейбли формуються автоматично або платіжною/верифікаційною логікою, тому тут не редагуються вручну."
                  : locale === "es"
                    ? "Estas etiquetas se calculan automáticamente o vienen de la lógica de pago/verificación, por eso aquí no se editan manualmente."
                    : "These labels are derived automatically or come from payment/verification logic, so they are not manually editable here."}
              </p>
            </div>
          ) : null}

          <div className="mt-4">
            <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
              {locale === "ua" ? "Модуль після перевірки" : locale === "es" ? "Módulo final" : "Reviewed module"}
            </label>
            <select
              value={moduleId}
              onChange={(event) => {
                const nextModuleId = event.target.value;
                const nextCategories = MODULES[nextModuleId]?.categories ?? [];
                setModuleId(nextModuleId);
                setCategory(nextCategories.some((entry) => entry.id === category) ? category : (nextCategories[0]?.id ?? ""));
                setSelectedBadges((current) => current.filter((badge) => (moduleLabelSystem[nextModuleId] ?? []).includes(badge as never) && MODERATOR_BADGES.includes(badge as never)));
              }}
              className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#11203a] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
            >
              {Object.keys(MODULES).filter((entry) => entry !== "business").map((entry) => (
                <option key={entry} value={entry}>
                  {t(`mod.${entry}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
              {locale === "ua" ? "Категорія після перевірки" : locale === "es" ? "Categoría final" : "Reviewed category"}
            </label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#11203a] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
            >
              {availableCategories.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.labelKey}
                </option>
              ))}
            </select>
            {availableCategories.length === 0 ? (
              <p className={`mt-2 text-xs ${isDark ? "text-red-300" : "text-red-600"}`}>
                {locale === "ua"
                  ? "Для цього модуля не знайдено жодної категорії. Підтвердження краще не виконувати, поки конфіг не буде виправлено."
                  : locale === "es"
                    ? "No se encontraron categorías para este módulo. Es mejor no confirmar hasta corregir la configuración."
                    : "No categories were found for this module. Avoid confirming until the configuration is fixed."}
              </p>
            ) : null}
          </div>

          {availableBadges.length > 0 ? (
            <div className="mt-4">
              <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                {locale === "ua" ? "Службові лейбли" : locale === "es" ? "Etiquetas moderadas" : "Moderator labels"}
              </label>
              <div className="flex flex-wrap gap-2">
                {availableBadges.map((badge) => {
                  const active = selectedBadges.includes(badge);
                  return (
                    <button
                      key={badge}
                      type="button"
                      onClick={() => {
                        setSelectedBadges((current) =>
                          current.includes(badge)
                            ? current.filter((item) => item !== badge)
                            : [...current, badge],
                        );
                      }}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold ${active ? (isDark ? "border-[#FFD700] bg-[#FFD700]/10 text-[#FFD700]" : "border-[#0057B8] bg-blue-50 text-[#0057B8]") : (isDark ? "border-[#22416b] bg-[#11203a] text-slate-300" : "border-slate-300 bg-white text-slate-700")}`}
                    >
                      {getLabelTitle(badge, locale)}
                    </button>
                  );
                })}
              </div>
              <p className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {locale === "ua"
                  ? "Тут показуються лише лейбли, якими модератор має право керувати для обраного модуля."
                  : locale === "es"
                    ? "Aquí solo se muestran las etiquetas que el moderador puede controlar para el módulo seleccionado."
                    : "Only the labels that moderators are allowed to control for the selected module are shown here."}
              </p>
            </div>
          ) : null}

          <div className="mt-4">
            <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
              {locale === "ua" ? "Фінальні лейбли після підтвердження" : locale === "es" ? "Etiquetas finales después de confirmar" : "Final labels after confirmation"}
            </label>
            <div className={`rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-slate-50"}`}>
              {finalLabels.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {finalLabels.map((badge) => (
                    <span
                      key={`final-${badge}`}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold ${MODERATOR_BADGES.includes(badge as never)
                        ? (isDark ? "border-[#FFD700]/40 bg-[#FFD700]/10 text-[#FFD700]" : "border-[#0057B8]/30 bg-blue-50 text-[#0057B8]")
                        : (isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-200" : "border-slate-300 bg-white text-slate-700")}`}
                    >
                      {getLabelTitle(badge, locale)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {locale === "ua" ? "Після підтвердження у картки не буде жодного лейбла." : locale === "es" ? "Después de confirmar, la tarjeta no tendrá etiquetas." : "After confirmation, the listing card will have no labels."}
                </p>
              )}
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {locale === "ua"
                    ? `Системні: ${finalSystemLabels.length ? finalSystemLabels.map((badge) => getLabelTitle(badge, locale)).join(", ") : "немає"}`
                    : locale === "es"
                      ? `Sistema: ${finalSystemLabels.length ? finalSystemLabels.map((badge) => getLabelTitle(badge, locale)).join(", ") : "ninguna"}`
                      : `System: ${finalSystemLabels.length ? finalSystemLabels.map((badge) => getLabelTitle(badge, locale)).join(", ") : "none"}`}
                </p>
                <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {locale === "ua"
                    ? `Керовані модератором: ${finalManagedLabels.length ? finalManagedLabels.map((badge) => getLabelTitle(badge, locale)).join(", ") : "немає"}`
                    : locale === "es"
                      ? `Gestionadas por moderación: ${finalManagedLabels.length ? finalManagedLabels.map((badge) => getLabelTitle(badge, locale)).join(", ") : "ninguna"}`
                      : `Moderator-managed: ${finalManagedLabels.length ? finalManagedLabels.map((badge) => getLabelTitle(badge, locale)).join(", ") : "none"}`}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
              {locale === "ua" ? "Причина відхилення" : locale === "es" ? "Motivo del rechazo" : "Rejection reason"}
            </label>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#11203a] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
              placeholder={locale === "ua" ? "Заповнюйте лише якщо відхиляєте оголошення" : locale === "es" ? "Complete solo si rechaza el anuncio" : "Fill this only when rejecting a listing"}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:w-[250px] lg:flex-col">
          <a
            href={`/${moduleId}/${item.id}`}
            className={`inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-[#1a2d4c] text-slate-100 hover:bg-[#21365a]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            {locale === "ua" ? "Відкрити" : locale === "es" ? "Abrir" : "Open listing"}
          </a>
          <button
            type="button"
            onClick={() => onApprove(item.id, moduleId, category, selectedBadges)}
            disabled={pending}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"} ${pending ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {locale === "ua" ? "Схвалити" : locale === "es" ? "Aprobar" : "Approve"}
          </button>
          <button
            type="button"
            onClick={() => onReject(item.id, reason, moduleId, category, selectedBadges)}
            disabled={pending}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-red-950/30 text-red-300 hover:bg-red-950/50" : "bg-red-50 text-red-700 hover:bg-red-100"} ${pending ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <XCircle className="h-4 w-4" />
            {locale === "ua" ? "Відхилити" : locale === "es" ? "Rechazar" : "Reject"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AdminModerationPage() {
  const { theme } = useTheme();
  const { locale, t } = useI18n();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"moderation_pending" | "rejected" | "all">("moderation_pending");
  const [module, setModule] = useState<(typeof MODULE_OPTIONS)[number]>("all");

  const queueQuery = useQuery({
    queryKey: ["admin-moderation-queue", status, module],
    queryFn: () => fetchModerationQueue({ status, module: module === "all" ? undefined : module }),
  });

  const moderateMutation = useMutation({
    mutationFn: ({ listingId, decision, reason, module, category, badges }: { listingId: number; decision: "approve" | "reject"; reason?: string; module?: string; category?: string; badges?: string[] }) =>
      moderateListing(listingId, {
        decision,
        moderation_reason: reason ?? null,
        module: module ?? null,
        category: category ?? null,
        badges: badges ?? null,
      }),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-moderation-queue"] });
      await queryClient.invalidateQueries({ queryKey: ["account-my-listings"] });
      toast.success(
        variables.decision === "approve"
          ? locale === "ua" ? "Оголошення схвалено" : locale === "es" ? "Anuncio aprobado" : "Listing approved"
          : locale === "ua" ? "Оголошення відхилено" : locale === "es" ? "Anuncio rechazado" : "Listing rejected"
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Moderation failed");
    },
  });

  const items = useMemo(() => queueQuery.data ?? [], [queueQuery.data]);

  return (
    <ProtectedAdminRoute>
      <UahubLayout hideModuleNav>
        <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
          <section className={`rounded-3xl border p-6 md:p-8 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${isDark ? "bg-[#1a2d4c] text-[#FFD700]" : "bg-blue-50 text-[#0057B8]"}`}>
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h1 className={`text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  {locale === "ua" ? "Модерація оголошень" : locale === "es" ? "Moderación de anuncios" : "Listing moderation"}
                </h1>
                <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {locale === "ua"
                    ? "Тимчасова мінімальна backoffice-сторінка для ручного E2E тестування approve/reject flow. Перед релізом перевірити, чи її треба замінити повним admin center."
                    : locale === "es"
                      ? "Página mínima temporal de backoffice para probar manualmente el flujo approve/reject. Antes del release, revisar si debe sustituirse por un admin center completo."
                      : "Temporary minimal backoffice page for manual approve/reject E2E testing. Before release, verify whether it should be replaced by a full admin center."}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as "moderation_pending" | "rejected" | "all")}
                className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
              >
                <option value="moderation_pending">{locale === "ua" ? "Очікують модерації" : locale === "es" ? "Pendientes" : "Pending moderation"}</option>
                <option value="rejected">{locale === "ua" ? "Відхилені" : locale === "es" ? "Rechazados" : "Rejected"}</option>
                <option value="all">{locale === "ua" ? "Усі проблемні" : locale === "es" ? "Todos los problemáticos" : "All moderation items"}</option>
              </select>
              <select
                value={module}
                onChange={(event) => setModule(event.target.value as (typeof MODULE_OPTIONS)[number])}
                className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
              >
                {MODULE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item === "all"
                      ? locale === "ua" ? "Усі модулі" : locale === "es" ? "Todos los módulos" : "All modules"
                      : t(`mod.${item}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 space-y-4">
              {queueQuery.isLoading ? (
                <div className={`rounded-2xl border p-4 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                  {locale === "ua" ? "Завантаження moderation queue..." : locale === "es" ? "Cargando cola de moderación..." : "Loading moderation queue..."}
                </div>
              ) : null}

              {queueQuery.isError ? (
                <div className={`rounded-2xl border p-4 text-sm ${isDark ? "border-red-900/40 bg-red-950/20 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}>
                  {queueQuery.error instanceof Error ? queueQuery.error.message : "Failed to load moderation queue"}
                </div>
              ) : null}

              {!queueQuery.isLoading && !queueQuery.isError && items.length === 0 ? (
                <div className={`rounded-2xl border p-5 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                  {locale === "ua" ? "Немає оголошень для модерації за поточними фільтрами." : locale === "es" ? "No hay anuncios para moderar con los filtros actuales." : "No listings found for the current moderation filters."}
                </div>
              ) : null}

              {items.map((item) => (
                <ModerationCard
                  key={item.id}
                  item={item}
                  pending={moderateMutation.isPending && moderateMutation.variables?.listingId === item.id}
                  onApprove={(listingId, moduleId, category, badges) => moderateMutation.mutate({ listingId, decision: "approve", module: moduleId, category, badges })}
                  onReject={(listingId, reason, moduleId, category, badges) => moderateMutation.mutate({ listingId, decision: "reject", reason, module: moduleId, category, badges })}
                />
              ))}
            </div>
          </section>
        </div>
      </UahubLayout>
    </ProtectedAdminRoute>
  );
}
