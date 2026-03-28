import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Copy,
  Eye,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Star,
  Tag,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  archiveListing,
  deleteListing,
  duplicateListing,
  fetchMyListings,
  renewListing,
  submitListing,
  type ListingManagementItem,
  type ListingManagementStatus,
} from "@/lib/account-api";
import { useTheme } from "@/lib/ThemeContext";
import { t, useI18n } from "@/lib/i18n";

const STATUS_FILTERS: Array<"all" | ListingManagementStatus> = [
  "all",
  "draft",
  "moderation_pending",
  "published",
  "rejected",
  "expired",
  "archived",
];

const MODULE_FILTERS = ["all", "jobs", "housing", "services", "marketplace", "events", "community", "organizations"] as const;
const SORT_OPTIONS = ["newest", "oldest", "views_desc", "expires_soon"] as const;

type SortOption = (typeof SORT_OPTIONS)[number];

function formatDate(value: string | null | undefined, locale: "ua" | "es" | "en") {
  if (!value) {
    return null;
  }
  try {
    const formatterLocale = locale === "ua" ? "uk-UA" : locale === "es" ? "es-ES" : "en-GB";
    return new Intl.DateTimeFormat(formatterLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getModuleLabel(moduleId: string, locale: "ua" | "es" | "en") {
  const key = `mod.${moduleId}`;
  const translated = t(key, locale);
  return translated === key ? moduleId : translated;
}

function getStatusLabel(status: ListingManagementStatus, locale: "ua" | "es" | "en") {
  const key = `account.status.${status}`;
  const translated = t(key, locale);
  return translated === key ? status : translated;
}

function getPricingTierLabel(value: string | null | undefined, locale: "ua" | "es" | "en") {
  if (value === "free") return locale === "ua" ? "Free" : locale === "es" ? "Gratis" : "Free";
  if (value === "basic") return locale === "ua" ? "Basic" : locale === "es" ? "Básico" : "Basic";
  if (value === "business") return locale === "ua" ? "Business" : locale === "es" ? "Empresa" : "Business";
  return null;
}

function getVisibilityLabel(value: string | null | undefined, locale: "ua" | "es" | "en") {
  if (value === "boosted") return locale === "ua" ? "Boosted" : locale === "es" ? "Impulsado" : "Boosted";
  if (value === "featured") return locale === "ua" ? "Featured" : locale === "es" ? "Destacado" : "Featured";
  if (value === "standard") return locale === "ua" ? "Standard" : locale === "es" ? "Estándar" : "Standard";
  return null;
}

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

function ListingBadge({ label, tone }: { label: string; tone: "blue" | "amber" | "fuchsia" | "red" | "slate" }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const toneClasses =
    tone === "amber"
      ? isDark
        ? "bg-amber-950/40 text-amber-300"
        : "bg-amber-50 text-amber-700"
      : tone === "fuchsia"
        ? isDark
          ? "bg-fuchsia-950/40 text-fuchsia-300"
          : "bg-fuchsia-50 text-fuchsia-700"
        : tone === "red"
          ? isDark
            ? "bg-red-950/40 text-red-300"
            : "bg-red-50 text-red-700"
          : tone === "slate"
            ? isDark
              ? "bg-[#1a2d4c] text-slate-200"
              : "bg-slate-100 text-slate-700"
            : isDark
              ? "bg-[#1a2d4c] text-[#FFD700]"
              : "bg-blue-50 text-[#0057B8]";

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses}`}>{label}</span>;
}

function ListingRow({
  item,
  isPending,
  onArchive,
  onRenew,
  onBoost,
  onDuplicate,
  onDelete,
  onSubmit,
}: {
  item: ListingManagementItem;
  isPending: boolean;
  onArchive: (listingId: number) => void;
  onRenew: (listingId: number) => void;
  onBoost: (listingId: number) => void;
  onDuplicate: (listingId: number) => void;
  onDelete: (listingId: number) => void;
  onSubmit: (listingId: number) => void;
}) {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const isDark = theme === "dark";
  const badges = parseBadges(item.badges);
  const navigate = useNavigate();

  const canArchive = item.status !== "archived";
  const canRenew = item.status === "archived" || item.status === "expired";
  const canBoost = (item.status === "published" || item.status === "active") && !item.is_promoted;
  const canSubmit = item.status === "draft" || item.status === "rejected";

  return (
    <article
      className={`rounded-2xl border p-4 ${
        isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.title}</h3>
            <ListingBadge label={getStatusLabel(item.status, locale)} tone="blue" />
            {getPricingTierLabel(item.pricing_tier, locale) ? <ListingBadge label={getPricingTierLabel(item.pricing_tier, locale)!} tone="slate" /> : null}
            {item.visibility && item.visibility !== "standard" && getVisibilityLabel(item.visibility, locale) ? <ListingBadge label={getVisibilityLabel(item.visibility, locale)!} tone="fuchsia" /> : null}
            {item.is_featured ? <ListingBadge label={t("account.listings.featured")} tone="amber" /> : null}
            {item.is_promoted ? <ListingBadge label={t("account.listings.promoted")} tone="fuchsia" /> : null}
            {badges.includes("urgent") ? <ListingBadge label={t("account.listings.urgent")} tone="red" /> : null}
          </div>

          <div className={`grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            <p>
              <span className={`font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("account.listings.module")}:</span>{" "}
              {getModuleLabel(item.module, locale)}
            </p>
            <p>
              <span className={`font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("account.listings.category")}:</span>{" "}
              {item.category}
            </p>
            <p>
              <span className={`font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("account.listings.createdAt")}:</span>{" "}
              {formatDate(item.created_at, locale) || "—"}
            </p>
            <p>
              <span className={`font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("account.listings.expiresAt")}:</span>{" "}
              {formatDate(item.expires_at, locale) || t("account.listings.notSet")}
            </p>
            <p>
              <span className={`font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("account.listings.views")}:</span>{" "}
              {item.views_count}
            </p>
            <p>
              <span className={`font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("account.listings.messages")}:</span>{" "}
              {item.unread_messages_count}
            </p>
            <p>
              <span className={`font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("account.listings.saves")}:</span>{" "}
              {item.saved_count}
            </p>
            <p>
              <span className={`font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>Ranking:</span>{" "}
              {item.ranking_score ?? 0}
            </p>
          </div>

          {item.status === "rejected" && item.moderation_reason ? (
            <div className={`mt-4 rounded-2xl border p-3 text-sm ${isDark ? "border-red-900/40 bg-red-950/20 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}>
              <span className="font-semibold">{t("account.listings.moderationReason")}: </span>
              {item.moderation_reason}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-start gap-2 lg:max-w-[320px] lg:justify-end">
          <Link
            to={`/${item.module}/${item.id}`}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
              isDark ? "bg-[#1a2d4c] text-slate-100 hover:bg-[#21365a]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Eye className="h-4 w-4" />
            {t("account.listings.view")}
          </Link>

          <button
            type="button"
            onClick={() => navigate(`/create?edit=${item.id}`)}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
              isDark ? "bg-[#1a2d4c] text-slate-100 hover:bg-[#21365a]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Pencil className="h-4 w-4" />
            {t("account.listings.edit")}
          </button>

          <button
            type="button"
            onClick={() => onDuplicate(item.id)}
            disabled={isPending}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
              isDark ? "bg-[#1a2d4c] text-slate-100 hover:bg-[#21365a]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            } ${isPending ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <Copy className="h-4 w-4" />
            {t("account.listings.duplicate")}
          </button>

          {canSubmit ? (
            <button
              type="button"
              onClick={() => onSubmit(item.id)}
              disabled={isPending}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
                isDark ? "bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              } ${isPending ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <UploadCloud className="h-4 w-4" />
              {t("account.listings.submit")}
            </button>
          ) : null}

          {canBoost ? (
            <button
              type="button"
              onClick={() => onBoost(item.id)}
              disabled={isPending}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
                isDark ? "bg-fuchsia-950/30 text-fuchsia-300 hover:bg-fuchsia-950/50" : "bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100"
              } ${isPending ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <Sparkles className="h-4 w-4" />
              {t("account.listings.boost")}
            </button>
          ) : null}

          {canRenew ? (
            <button
              type="button"
              onClick={() => onRenew(item.id)}
              disabled={isPending}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
                isDark ? "bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              } ${isPending ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <RefreshCcw className="h-4 w-4" />
              {t("account.listings.renew")}
            </button>
          ) : null}

          {canArchive ? (
            <button
              type="button"
              onClick={() => onArchive(item.id)}
              disabled={isPending}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
                isDark ? "bg-red-950/30 text-red-300 hover:bg-red-950/50" : "bg-red-50 text-red-600 hover:bg-red-100"
              } ${isPending ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <Archive className="h-4 w-4" />
              {t("account.listings.archive")}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => onDelete(item.id)}
            disabled={isPending}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
              isDark ? "bg-red-950/30 text-red-300 hover:bg-red-950/50" : "bg-red-50 text-red-600 hover:bg-red-100"
            } ${isPending ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <Trash2 className="h-4 w-4" />
            {t("account.listings.delete")}
          </button>
        </div>
      </div>
    </article>
  );
}

export function AccountListingsPanel() {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<"all" | ListingManagementStatus>("all");
  const [moduleFilter, setModuleFilter] = useState<(typeof MODULE_FILTERS)[number]>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [searchText, setSearchText] = useState("");

  const listingsQuery = useQuery({
    queryKey: ["account-my-listings", statusFilter, moduleFilter, sort, searchText],
    queryFn: () =>
      fetchMyListings({
        status: statusFilter === "all" ? undefined : statusFilter,
        module: moduleFilter === "all" ? undefined : moduleFilter,
        q: searchText.trim() || undefined,
        sort,
      }),
  });

  const invalidateListings = async () => {
    await queryClient.invalidateQueries({ queryKey: ["account-my-listings"] });
    await queryClient.invalidateQueries({ queryKey: ["account-dashboard"] });
  };

  const archiveMutation = useMutation({ mutationFn: archiveListing, onSuccess: invalidateListings });
  const renewMutation = useMutation({ mutationFn: renewListing, onSuccess: invalidateListings });
  const submitMutation = useMutation({
    mutationFn: submitListing,
    onSuccess: invalidateListings,
    onError: (error) => {
      const paywall =
        error && typeof error === "object" && "paywall" in error
          ? (error as { paywall?: { required_product_code?: string; listing_id?: number } }).paywall
          : null;

      if (paywall?.required_product_code && paywall.listing_id) {
        navigate(`/account?tab=billing&product=${paywall.required_product_code}&listingId=${paywall.listing_id}`);
      }
    },
  });
  const deleteMutation = useMutation({ mutationFn: deleteListing, onSuccess: invalidateListings });
  const duplicateMutation = useMutation({
    mutationFn: duplicateListing,
    onSuccess: async (listing) => {
      await invalidateListings();
      navigate(`/create?edit=${listing.id}`);
    },
  });

  const activeMutationId =
    archiveMutation.variables ??
    renewMutation.variables ??
    submitMutation.variables ??
    deleteMutation.variables ??
    duplicateMutation.variables ??
    null;

  const items = useMemo(() => listingsQuery.data ?? [], [listingsQuery.data]);

  const emptyMessage =
    statusFilter === "draft"
      ? t("account.listings.emptyDraft")
      : statusFilter === "expired"
        ? t("account.listings.emptyExpired")
        : statusFilter === "published"
          ? t("account.listings.emptyActive")
          : t("account.listings.empty");

  const handleArchive = (listingId: number) => {
    if (!window.confirm(t("account.listings.confirmArchive"))) {
      return;
    }
    archiveMutation.mutate(listingId);
  };

  const handleDelete = (listingId: number) => {
    if (!window.confirm(t("account.listings.confirmDelete"))) {
      return;
    }
    deleteMutation.mutate(listingId);
  };

  return (
    <section className={`rounded-3xl border p-5 md:p-6 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("account.listings.title")}</h2>
          <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("account.listings.subtitle")}</p>
        </div>

        <Link
          to="/create"
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${
            isDark ? "bg-[#FFD700] text-[#0d1a2e]" : "bg-[#0057B8] text-white"
          }`}
        >
          <Plus className="h-4 w-4" />
          {t("account.listings.create")}
        </Link>
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
        <label className={`flex items-center gap-2 rounded-2xl border px-4 py-3 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-300 bg-white"}`}>
          <Search className={`h-4 w-4 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={t("account.listings.search")}
            className={`w-full bg-transparent text-sm outline-none ${isDark ? "text-slate-100 placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400"}`}
          />
        </label>

        <select
          value={moduleFilter}
          onChange={(event) => setModuleFilter(event.target.value as (typeof MODULE_FILTERS)[number])}
          className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
        >
          <option value="all">{t("account.listings.moduleAll")}</option>
          {MODULE_FILTERS.filter((item) => item !== "all").map((moduleId) => (
            <option key={moduleId} value={moduleId}>
              {getModuleLabel(moduleId, locale)}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as SortOption)}
          className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
        >
          <option value="newest">{t("account.listings.sort.newest")}</option>
          <option value="oldest">{t("account.listings.sort.oldest")}</option>
          <option value="views_desc">{t("account.listings.sort.views")}</option>
          <option value="expires_soon">{t("account.listings.sort.expiresSoon")}</option>
        </select>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => {
          const isActive = statusFilter === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-3 py-2 text-xs font-semibold ${
                isActive
                  ? isDark
                    ? "bg-[#1a2d4c] text-[#FFD700]"
                    : "bg-blue-50 text-[#0057B8]"
                  : isDark
                    ? "bg-[#0d1a2e] text-slate-300"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {status === "all" ? t("account.listings.filter.all") : t(`account.status.${status}`)}
            </button>
          );
        })}
      </div>

      {listingsQuery.isLoading ? (
        <div className={`rounded-2xl border p-6 text-sm ${isDark ? "border-[#22416b] text-slate-400" : "border-slate-200 text-slate-500"}`}>{t("common.loading")}</div>
      ) : listingsQuery.isError ? (
        <div className={`rounded-2xl border p-6 ${isDark ? "border-red-900/40 bg-red-950/20" : "border-red-200 bg-red-50"}`}>
          <p className={`text-sm ${isDark ? "text-red-300" : "text-red-600"}`}>
            {listingsQuery.error instanceof Error ? listingsQuery.error.message : t("account.loadError")}
          </p>
          <button
            type="button"
            onClick={() => void listingsQuery.refetch()}
            className={`mt-4 rounded-xl px-4 py-2 text-sm font-medium ${isDark ? "bg-[#1a2d4c] text-slate-100" : "bg-white text-slate-700"}`}
          >
            {t("account.retry")}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className={`rounded-2xl border border-dashed p-6 text-sm ${isDark ? "border-[#22416b] text-slate-400" : "border-slate-200 text-slate-500"}`}>
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <ListingRow
              key={item.id}
              item={item}
              isPending={activeMutationId === item.id}
              onArchive={handleArchive}
              onRenew={(listingId) => renewMutation.mutate(listingId)}
              onBoost={(listingId) => navigate(`/account?tab=billing&product=boost&listingId=${listingId}`)}
              onDuplicate={(listingId) => duplicateMutation.mutate(listingId)}
              onDelete={handleDelete}
              onSubmit={(listingId) => submitMutation.mutate(listingId)}
            />
          ))}
        </div>
      )}

      <div className={`mt-6 rounded-2xl border p-4 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-400" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
        <div className="flex items-start gap-2">
          <Tag className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t("account.listings.note")}</p>
        </div>
        <div className="mt-3 flex items-start gap-2">
          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t("account.listings.rejectedHint")}</p>
        </div>
      </div>
    </section>
  );
}
