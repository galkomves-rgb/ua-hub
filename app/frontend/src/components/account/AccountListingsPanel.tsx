import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Eye, RefreshCcw, Sparkles, Star, Tag } from "lucide-react";
import { Link } from "react-router-dom";
import {
  archiveListing,
  fetchMyListings,
  renewListing,
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

function ListingRow({
  item,
  onArchive,
  onRenew,
  isArchiving,
  isRenewing,
}: {
  item: ListingManagementItem;
  onArchive: (listingId: number) => void;
  onRenew: (listingId: number) => void;
  isArchiving: boolean;
  isRenewing: boolean;
}) {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const isDark = theme === "dark";
  const canArchive = item.status !== "archived";
  const canRenew = item.status === "archived" || item.status === "expired";

  return (
    <article
      className={`rounded-2xl border p-4 ${
        isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              {item.title}
            </h3>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                isDark ? "bg-[#1a2d4c] text-[#FFD700]" : "bg-blue-50 text-[#0057B8]"
              }`}
            >
              {getStatusLabel(item.status, locale)}
            </span>
            {item.is_featured ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  isDark ? "bg-amber-950/40 text-amber-300" : "bg-amber-50 text-amber-700"
                }`}
              >
                <Star className="h-3.5 w-3.5" />
                {t("account.listings.featured")}
              </span>
            ) : null}
            {item.is_promoted ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  isDark ? "bg-fuchsia-950/40 text-fuchsia-300" : "bg-fuchsia-50 text-fuchsia-700"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t("account.listings.promoted")}
              </span>
            ) : null}
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
          </div>
        </div>

        <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
          <Link
            to={`/${item.module}/${item.id}`}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
              isDark ? "bg-[#1a2d4c] text-slate-100 hover:bg-[#21365a]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Eye className="h-4 w-4" />
            {t("account.listings.view")}
          </Link>

          {canArchive ? (
            <button
              type="button"
              onClick={() => onArchive(item.id)}
              disabled={isArchiving}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
                isDark ? "bg-red-950/30 text-red-300 hover:bg-red-950/50" : "bg-red-50 text-red-600 hover:bg-red-100"
              } ${isArchiving ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <Archive className="h-4 w-4" />
              {isArchiving ? t("account.listings.archiving") : t("account.listings.archive")}
            </button>
          ) : null}

          {canRenew ? (
            <button
              type="button"
              onClick={() => onRenew(item.id)}
              disabled={isRenewing}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
                isDark ? "bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              } ${isRenewing ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <RefreshCcw className="h-4 w-4" />
              {isRenewing ? t("account.listings.renewing") : t("account.listings.renew")}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function AccountListingsPanel() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | ListingManagementStatus>("all");

  const listingsQuery = useQuery({
    queryKey: ["account-my-listings", statusFilter],
    queryFn: () => fetchMyListings(statusFilter === "all" ? undefined : statusFilter),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveListing,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account-my-listings"] });
      void queryClient.invalidateQueries({ queryKey: ["account-dashboard"] });
    },
  });

  const renewMutation = useMutation({
    mutationFn: renewListing,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account-my-listings"] });
      void queryClient.invalidateQueries({ queryKey: ["account-dashboard"] });
    },
  });

  const items = useMemo(() => listingsQuery.data ?? [], [listingsQuery.data]);

  const handleArchive = (listingId: number) => {
    if (!window.confirm(t("account.listings.confirmArchive"))) {
      return;
    }
    archiveMutation.mutate(listingId);
  };

  const handleRenew = (listingId: number) => {
    renewMutation.mutate(listingId);
  };

  return (
    <section
      className={`rounded-3xl border p-5 md:p-6 ${
        isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            {t("account.listings.title")}
          </h2>
          <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {t("account.listings.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
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
      </div>

      {listingsQuery.isLoading ? (
        <div className={`rounded-2xl border p-6 text-sm ${isDark ? "border-[#22416b] text-slate-400" : "border-slate-200 text-slate-500"}`}>
          {t("common.loading")}
        </div>
      ) : listingsQuery.isError ? (
        <div className={`rounded-2xl border p-6 ${isDark ? "border-red-900/40 bg-red-950/20" : "border-red-200 bg-red-50"}`}>
          <p className={`text-sm ${isDark ? "text-red-300" : "text-red-600"}`}>
            {listingsQuery.error instanceof Error ? listingsQuery.error.message : t("account.loadError")}
          </p>
          <button
            type="button"
            onClick={() => void listingsQuery.refetch()}
            className={`mt-4 rounded-xl px-4 py-2 text-sm font-medium ${
              isDark ? "bg-[#1a2d4c] text-slate-100" : "bg-white text-slate-700"
            }`}
          >
            {t("account.retry")}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className={`rounded-2xl border border-dashed p-6 text-sm ${isDark ? "border-[#22416b] text-slate-400" : "border-slate-200 text-slate-500"}`}>
          {t("account.listings.empty")}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <ListingRow
              key={item.id}
              item={item}
              onArchive={handleArchive}
              onRenew={handleRenew}
              isArchiving={archiveMutation.isPending && archiveMutation.variables === item.id}
              isRenewing={renewMutation.isPending && renewMutation.variables === item.id}
            />
          ))}
        </div>
      )}

      <div className={`mt-6 rounded-2xl border p-4 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-400" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
        <div className="flex items-start gap-2">
          <Tag className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t("account.listings.note")}</p>
        </div>
      </div>
    </section>
  );
}
