import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ClipboardList, Eye, RotateCcw, Search, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AdminPagination from "@/components/admin/AdminPagination";
import {
  fetchAdminListings,
  type ListingManagementItem,
  type ListingVisibility,
  updateAdminListingPromotion,
  updateAdminListingVisibility,
} from "@/lib/account-api";
import { MODULES } from "@/lib/platform";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

const STATUS_OPTIONS = ["all", "draft", "moderation_pending", "published", "rejected", "expired", "archived"] as const;
const MODULE_OPTIONS = ["all", ...Object.keys(MODULES)] as const;
const OWNER_OPTIONS = ["all", "private_user", "business_profile", "organization"] as const;
const PAGE_SIZE = 24;

function parseImages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function formatDate(value: string | null, locale: "ua" | "es" | "en") {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale === "ua" ? "uk-UA" : locale === "es" ? "es-ES" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function AdminListingCard({
  item,
  locale,
  isDark,
  isMutating,
  onVisibilityAction,
  onPromotionAction,
}: {
  item: ListingManagementItem;
  locale: "ua" | "es" | "en";
  isDark: boolean;
  isMutating: boolean;
  onVisibilityAction: (listingId: number, action: "archive" | "restore" | "delete") => void;
  onPromotionAction: (listingId: number, mode: ListingVisibility) => void;
}) {
  const images = parseImages(item.images_json);
  const needsModeration = item.status === "moderation_pending" || item.status === "rejected";
  const canRestore = item.status === "archived" || item.status === "rejected" || item.status === "expired";
  const [promotionMode, setPromotionMode] = useState<ListingVisibility>((item.visibility || "standard") as ListingVisibility);

  useEffect(() => {
    setPromotionMode((item.visibility || "standard") as ListingVisibility);
  }, [item.visibility]);

  return (
    <div className={`rounded-3xl border p-3.5 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-3 py-1 font-semibold ${isDark ? "bg-[#173052] text-slate-100" : "bg-white text-slate-700"}`}>#{item.id}</span>
            <span className={`rounded-full px-3 py-1 font-semibold ${item.status === "published" ? (isDark ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700") : item.status === "moderation_pending" ? (isDark ? "bg-amber-900/40 text-amber-300" : "bg-amber-50 text-amber-700") : item.status === "rejected" ? (isDark ? "bg-red-900/40 text-red-300" : "bg-red-50 text-red-700") : (isDark ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700")}`}>{item.status}</span>
            <span className={`rounded-full px-3 py-1 font-semibold ${isDark ? "bg-[#173052] text-slate-300" : "bg-white text-slate-600"}`}>{item.module}</span>
            <span className={`rounded-full px-3 py-1 font-semibold ${item.visibility === "featured" ? (isDark ? "bg-[#FFD700]/20 text-[#FFD700]" : "bg-amber-50 text-amber-700") : item.visibility === "boosted" ? (isDark ? "bg-sky-900/40 text-sky-300" : "bg-sky-50 text-sky-700") : (isDark ? "bg-[#173052] text-slate-300" : "bg-white text-slate-600")}`}>{item.visibility}</span>
          </div>
          <h3 className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.title}</h3>
          <div className={`flex flex-wrap gap-x-4 gap-y-1 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            <span>{locale === "ua" ? "Власник" : locale === "es" ? "Propietario" : "Owner"}: {item.owner_type}</span>
            <span>{locale === "ua" ? "Створено" : locale === "es" ? "Creado" : "Created"}: {formatDate(item.created_at, locale)}</span>
            <span>{locale === "ua" ? "Спливає" : locale === "es" ? "Expira" : "Expires"}: {formatDate(item.expires_at, locale)}</span>
            <span>{locale === "ua" ? "Перегляди" : locale === "es" ? "Vistas" : "Views"}: {item.views_count}</span>
            <span>{locale === "ua" ? "Збереження" : locale === "es" ? "Guardados" : "Saves"}: {item.saved_count}</span>
            <span>{locale === "ua" ? "Ранг" : locale === "es" ? "Ranking" : "Rank"}: {item.ranking_score ?? 0}</span>
            <span>{locale === "ua" ? "Фото" : locale === "es" ? "Fotos" : "Photos"}: {images.length}</span>
          </div>
          {item.moderation_reason ? (
            <p className={`text-sm ${isDark ? "text-amber-300" : "text-amber-700"}`}>{item.moderation_reason}</p>
          ) : null}
        </div>

        <div className="flex w-full max-w-md flex-col gap-2 lg:items-end">
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link to={`/${item.module}/${item.id}`} className={`inline-flex rounded-2xl px-3 py-2 text-sm font-semibold ${isDark ? "bg-[#173052] text-slate-100" : "bg-white text-slate-700"}`}>
              {locale === "ua" ? "Public view" : locale === "es" ? "Vista pública" : "Public view"}
            </Link>
            {needsModeration ? (
              <Link to="/admin/listings/moderation" className={`inline-flex rounded-2xl px-3 py-2 text-sm font-semibold ${isDark ? "bg-[#FFD700] text-slate-900" : "bg-blue-50 text-[#0057B8]"}`}>
                {locale === "ua" ? "Відкрити модерацію" : locale === "es" ? "Abrir moderación" : "Open moderation"}
              </Link>
            ) : null}
            <button
              type="button"
              disabled={isMutating}
              onClick={() => onVisibilityAction(item.id, canRestore ? "restore" : "archive")}
              className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold ${isMutating ? "cursor-not-allowed opacity-60" : ""} ${isDark ? "bg-[#173052] text-slate-100" : "bg-white text-slate-700"}`}
            >
              {canRestore ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              {canRestore
                ? (locale === "ua" ? "Відновити" : locale === "es" ? "Restaurar" : "Restore")
                : (locale === "ua" ? "Призупинити" : locale === "es" ? "Archivar" : "Suspend")}
            </button>
            <button
              type="button"
              disabled={isMutating}
              onClick={() => {
                if (window.confirm(locale === "ua" ? "Видалити оголошення?" : locale === "es" ? "¿Eliminar anuncio?" : "Delete listing?")) {
                  onVisibilityAction(item.id, "delete");
                }
              }}
              className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold ${isMutating ? "cursor-not-allowed opacity-60" : ""} ${isDark ? "bg-red-900/30 text-red-300" : "bg-red-50 text-red-700"}`}
            >
              <Trash2 className="h-4 w-4" />
              {locale === "ua" ? "Видалити" : locale === "es" ? "Eliminar" : "Delete"}
            </button>
          </div>

          <div className={`grid w-full gap-2 rounded-2xl border p-2 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"} sm:grid-cols-[minmax(0,1fr)_auto]`}>
            <select
              value={promotionMode}
              onChange={(event) => setPromotionMode(event.target.value as ListingVisibility)}
              disabled={isMutating}
              className={`rounded-xl border px-3 py-2 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
            >
              <option value="standard">{locale === "ua" ? "Стандарт" : locale === "es" ? "Estándar" : "Standard"}</option>
              <option value="boosted">{locale === "ua" ? "Буст" : locale === "es" ? "Impulso" : "Boosted"}</option>
              <option value="featured">{locale === "ua" ? "Featured" : locale === "es" ? "Destacado" : "Featured"}</option>
            </select>
            <button
              type="button"
              disabled={isMutating || promotionMode === item.visibility}
              onClick={() => onPromotionAction(item.id, promotionMode)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${isMutating || promotionMode === item.visibility ? "cursor-not-allowed opacity-60" : ""} ${isDark ? "bg-[#FFD700] text-slate-900" : "bg-blue-50 text-[#0057B8]"}`}
            >
              <Sparkles className="h-4 w-4" />
              {locale === "ua" ? "Застосувати промо" : locale === "es" ? "Aplicar promoción" : "Apply promo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminListingsPage() {
  const { theme } = useTheme();
  const { locale, t } = useI18n();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [module, setModule] = useState<(typeof MODULE_OPTIONS)[number]>("all");
  const [ownerType, setOwnerType] = useState<(typeof OWNER_OPTIONS)[number]>("all");
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "views_desc" | "expires_soon">("newest");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(0);
  }, [status, module, ownerType, searchText, sort]);

  const listingsQuery = useQuery({
    queryKey: ["admin-listings-catalog", status, module, ownerType, searchText, sort, offset],
    queryFn: () => fetchAdminListings({
      status,
      module: module === "all" ? undefined : module,
      ownerType: ownerType === "all" ? undefined : ownerType,
      q: searchText.trim() || undefined,
      sort,
      limit: PAGE_SIZE,
      offset,
    }),
  });

  const page = listingsQuery.data;
  const items = page?.items ?? [];
  const stats = useMemo(() => ({
    total: page?.total ?? 0,
    pageTotal: items.length,
    pending: items.filter((item) => item.status === "moderation_pending").length,
    published: items.filter((item) => item.status === "published").length,
    promoted: items.filter((item) => item.is_promoted || item.is_featured).length,
  }), [items, page?.total]);

  const visibilityMutation = useMutation({
    mutationFn: ({ listingId, action }: { listingId: number; action: "archive" | "restore" | "delete" }) =>
      updateAdminListingVisibility(listingId, { action }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-listings-catalog"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success(locale === "ua" ? "Стан оголошення оновлено" : locale === "es" ? "Estado del anuncio actualizado" : "Listing state updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Request failed");
    },
  });

  const promotionMutation = useMutation({
    mutationFn: ({ listingId, mode }: { listingId: number; mode: ListingVisibility }) =>
      updateAdminListingPromotion(listingId, { mode }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-listings-catalog"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success(locale === "ua" ? "Промо оголошення оновлено" : locale === "es" ? "Promoción del anuncio actualizada" : "Listing promotion updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Request failed");
    },
  });

  const isMutating = visibilityMutation.isPending || promotionMutation.isPending;

  return (
    <div className="space-y-5">
      <section className={`rounded-3xl border p-5 md:p-6 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#0057B8]">
          <ClipboardList className="h-5 w-5" />
        </div>
        <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          {locale === "ua" ? "Каталог оголошень" : locale === "es" ? "Catálogo de anuncios" : "Listings catalog"}
        </h2>
        <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          {locale === "ua"
            ? "Живий реєстр усіх оголошень платформи з фільтрами за статусом, модулем, типом власника та швидкими переходами в public view або moderation flow."
            : locale === "es"
              ? "Registro en vivo de todos los anuncios de la plataforma con filtros por estado, módulo, tipo de propietario y accesos rápidos a vista pública o moderación."
              : "Live registry of all platform listings with filters by status, module, owner type, and quick jumps to public view or moderation flow."}
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard isDark={isDark} label={locale === "ua" ? "Усього у вибірці" : locale === "es" ? "Total filtrado" : "Matched total"} value={stats.total} icon={ClipboardList} />
        <StatCard isDark={isDark} label={locale === "ua" ? "На модерації" : locale === "es" ? "En moderación" : "In moderation"} value={stats.pending} icon={ShieldAlert} />
        <StatCard isDark={isDark} label={locale === "ua" ? "Опубліковані" : locale === "es" ? "Publicados" : "Published"} value={stats.published} icon={Eye} />
        <StatCard isDark={isDark} label={locale === "ua" ? "Промо на сторінці" : locale === "es" ? "Promo en página" : "Promo on page"} value={stats.promoted} icon={Sparkles} />
      </section>

      <section className={`rounded-3xl border p-4 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
        <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_160px_180px_180px_180px]">
          <label className={`flex items-center gap-3 rounded-2xl border px-3 ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-300" : "border-slate-300 bg-white text-slate-700"}`}>
            <Search className="h-4 w-4" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={locale === "ua" ? "Пошук по title, id, owner, city" : locale === "es" ? "Buscar por título, id, owner, ciudad" : "Search by title, id, owner, city"}
              className="h-10 w-full bg-transparent text-sm outline-none"
            />
          </label>

          <select value={status} onChange={(event) => setStatus(event.target.value as (typeof STATUS_OPTIONS)[number])} className={`rounded-2xl border px-3 py-2.5 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}>
            {STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? (locale === "ua" ? "Усі статуси" : locale === "es" ? "Todos los estados" : "All statuses") : item}
              </option>
            ))}
          </select>

          <select value={module} onChange={(event) => setModule(event.target.value as (typeof MODULE_OPTIONS)[number])} className={`rounded-2xl border px-3 py-2.5 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}>
            {MODULE_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? (locale === "ua" ? "Усі модулі" : locale === "es" ? "Todos los módulos" : "All modules") : t(`mod.${item}`)}
              </option>
            ))}
          </select>

          <select value={ownerType} onChange={(event) => setOwnerType(event.target.value as (typeof OWNER_OPTIONS)[number])} className={`rounded-2xl border px-3 py-2.5 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}>
            {OWNER_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? (locale === "ua" ? "Усі власники" : locale === "es" ? "Todos los propietarios" : "All owners") : item}
              </option>
            ))}
          </select>

          <select value={sort} onChange={(event) => setSort(event.target.value as "newest" | "oldest" | "views_desc" | "expires_soon")} className={`rounded-2xl border px-3 py-2.5 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}>
            <option value="newest">{locale === "ua" ? "Оновлені спочатку" : locale === "es" ? "Actualizados primero" : "Updated first"}</option>
            <option value="oldest">{locale === "ua" ? "Найстарші" : locale === "es" ? "Más antiguos" : "Oldest"}</option>
            <option value="views_desc">{locale === "ua" ? "За переглядами" : locale === "es" ? "Por vistas" : "By views"}</option>
            <option value="expires_soon">{locale === "ua" ? "Спливають скоро" : locale === "es" ? "Expiran pronto" : "Expiring soon"}</option>
          </select>
        </div>

        <div className="mt-5 space-y-2.5">
          {listingsQuery.isLoading ? (
            <div className={`rounded-2xl border p-4 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
              {locale === "ua" ? "Завантаження каталогу..." : locale === "es" ? "Cargando catálogo..." : "Loading catalog..."}
            </div>
          ) : null}

          {listingsQuery.isError ? (
            <div className={`rounded-2xl border p-4 text-sm ${isDark ? "border-red-900/40 bg-red-950/20 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}>
              {listingsQuery.error instanceof Error ? listingsQuery.error.message : "Failed to load admin listings catalog"}
            </div>
          ) : null}

          {!listingsQuery.isLoading && !listingsQuery.isError && items.length === 0 ? (
            <div className={`rounded-2xl border p-5 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
              {locale === "ua" ? "Каталог порожній за поточними фільтрами." : locale === "es" ? "El catálogo está vacío con los filtros actuales." : "Catalog is empty for the current filters."}
            </div>
          ) : null}

          {!listingsQuery.isLoading && !listingsQuery.isError && items.length > 0 ? (
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {locale === "ua"
                ? `На цій сторінці ${stats.pageTotal} позицій із ${stats.total} знайдених.`
                : locale === "es"
                  ? `Esta página muestra ${stats.pageTotal} elementos de ${stats.total} encontrados.`
                  : `This page shows ${stats.pageTotal} items out of ${stats.total} matched.`}
            </p>
          ) : null}

          {items.map((item) => (
            <AdminListingCard
              key={item.id}
              item={item}
              locale={locale}
              isDark={isDark}
              isMutating={isMutating}
              onVisibilityAction={(listingId, action) => visibilityMutation.mutate({ listingId, action })}
              onPromotionAction={(listingId, mode) => promotionMutation.mutate({ listingId, mode })}
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

function StatCard({
  isDark,
  label,
  value,
  icon: Icon,
}: {
  isDark: boolean;
  label: string;
  value: number;
  icon: typeof ClipboardList;
}) {
  return (
    <div className={`rounded-3xl border p-4 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
          <p className={`mt-2 text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{value}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isDark ? "bg-[#1a2d4c] text-[#FFD700]" : "bg-blue-50 text-[#0057B8]"}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}
