import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Building2,
  Clock3,
  ExternalLink,
  Heart,
  MapPin,
  PencilLine,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  clearSearchHistory,
  createSearchAlert,
  deleteSearchAlert,
  deleteSearchHistory,
  fetchSavedBusinesses,
  fetchSavedListings,
  fetchSearchAlerts,
  fetchSearchHistory,
  removeSavedBusiness,
  removeSavedListing,
  updateSearchAlert,
  type SavedBusinessCard,
  type SavedListingCard,
  type SearchAlertItem,
  type SearchAlertPayload,
  type SearchHistoryItem,
} from "@/lib/account-api";
import { useTheme } from "@/lib/ThemeContext";
import { t, useI18n } from "@/lib/i18n";

function formatDate(value: string, locale: "ua" | "es" | "en") {
  try {
    const formatterLocale =
      locale === "ua" ? "uk-UA" : locale === "es" ? "es-ES" : "en-GB";
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

function getStatusLabel(status: string | null | undefined, locale: "ua" | "es" | "en") {
  if (!status) {
    return null;
  }
  const key = `account.status.${status}`;
  const translated = t(key, locale);
  return translated === key ? status : translated;
}

function SavedListingCard({
  item,
  onRemove,
  isRemoving,
}: {
  item: SavedListingCard;
  onRemove: (listingId: number) => void;
  isRemoving: boolean;
}) {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const isDark = theme === "dark";
  const statusLabel = getStatusLabel(item.status, locale);

  return (
    <article
      className={`overflow-hidden rounded-2xl border ${
        isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-white"
      }`}
    >
      <div className={`aspect-[16/8] ${isDark ? "bg-[#162b49]" : "bg-slate-100"}`}>
        {item.primary_image ? (
          <img src={item.primary_image} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className={`flex h-full items-center justify-center text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            {t("account.saved.noImage")}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <h3 className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.title}</h3>
            <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {getModuleLabel(item.module, locale)}
            </p>
          </div>
          {statusLabel ? (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                isDark ? "bg-[#1a2d4c] text-[#FFD700]" : "bg-blue-50 text-[#0057B8]"
              }`}
            >
              {statusLabel}
            </span>
          ) : null}
        </div>

        <div className={`space-y-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{item.city}</span>
          </p>
          {item.price ? (
            <p>
              <span className={`font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("account.saved.price")}:</span>{" "}
              {item.price}
            </p>
          ) : null}
          <p>
            <span className={`font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("account.saved.savedAt")}:</span>{" "}
            {formatDate(item.saved_at, locale)}
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              to={`/${item.module}/${item.listing_id}`}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
                isDark ? "bg-[#1a2d4c] text-slate-100 hover:bg-[#22385f]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <ExternalLink className="h-4 w-4" />
              {t("account.saved.viewListing")}
            </Link>
            <button
              type="button"
              onClick={() => onRemove(item.listing_id)}
              disabled={isRemoving}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
                isDark ? "bg-red-950/30 text-red-300 hover:bg-red-950/50" : "bg-red-50 text-red-600 hover:bg-red-100"
              } ${isRemoving ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <Trash2 className="h-4 w-4" />
              {isRemoving ? t("account.saved.removing") : t("account.saved.removeListing")}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function SavedBusinessCard({
  item,
  onRemove,
  isRemoving,
}: {
  item: SavedBusinessCard;
  onRemove: (businessId: number) => void;
  isRemoving: boolean;
}) {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const isDark = theme === "dark";

  return (
    <article
      className={`rounded-2xl border p-4 ${
        isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${isDark ? "bg-[#162b49]" : "bg-slate-100"}`}>
          {item.logo_url ? (
            <img src={item.logo_url} alt={item.business_name} className="h-full w-full object-cover" />
          ) : (
            <Building2 className={`h-6 w-6 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                {item.business_name}
              </h3>
              <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {item.category}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.is_verified ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isDark ? "bg-emerald-950/40 text-emerald-300" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("account.saved.verified")}
                </span>
              ) : null}
              {item.is_premium ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isDark ? "bg-amber-950/40 text-amber-300" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("account.saved.premium")}
                </span>
              ) : null}
            </div>
          </div>

          <div className={`mt-3 space-y-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{item.city}</span>
            </p>
            <p>
              <span className={`font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("account.saved.savedAt")}:</span>{" "}
              {formatDate(item.saved_at, locale)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <div className="flex flex-wrap justify-end gap-2">
          <Link
            to={`/business/${item.business_id}`}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
              isDark ? "bg-[#1a2d4c] text-slate-100 hover:bg-[#22385f]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <ExternalLink className="h-4 w-4" />
            {t("account.saved.viewBusiness")}
          </Link>
          <button
            type="button"
            onClick={() => onRemove(item.business_id)}
            disabled={isRemoving}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
              isDark ? "bg-red-950/30 text-red-300 hover:bg-red-950/50" : "bg-red-50 text-red-600 hover:bg-red-100"
            } ${isRemoving ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <Trash2 className="h-4 w-4" />
            {isRemoving ? t("account.saved.removing") : t("account.saved.removeBusiness")}
          </button>
        </div>
      </div>
    </article>
  );
}

function SearchAlertCard({
  item,
  onEdit,
  onRunSearch,
  onToggleEmail,
  onDelete,
  isUpdating,
  isDeleting,
}: {
  item: SearchAlertItem;
  onEdit: (item: SearchAlertItem) => void;
  onRunSearch: (query: string) => void;
  onToggleEmail: (item: SearchAlertItem) => void;
  onDelete: (item: SearchAlertItem) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}) {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const isDark = theme === "dark";

  return (
    <article
      className={`rounded-2xl border p-4 ${
        isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            {item.query}
          </h3>
          <div className={`mt-2 flex flex-wrap gap-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <span className={`rounded-full px-2.5 py-1 ${isDark ? "bg-[#162b49]" : "bg-slate-100"}`}>
              {item.module || t("account.saved.noModule")}
            </span>
            <span className={`rounded-full px-2.5 py-1 ${isDark ? "bg-[#162b49]" : "bg-slate-100"}`}>
              {item.city || t("account.saved.noCity")}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 ${
                item.email_alerts_enabled
                  ? isDark
                    ? "bg-emerald-950/40 text-emerald-300"
                    : "bg-emerald-50 text-emerald-700"
                  : isDark
                    ? "bg-slate-800 text-slate-300"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {item.email_alerts_enabled
                ? t("account.saved.emailAlertsOn")
                : t("account.saved.emailAlertsOff")}
            </span>
          </div>
        </div>
        <Bell className={`h-5 w-5 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
      </div>

      <p className={`mt-3 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
        {t("account.saved.lastUpdated")}: {formatDate(item.updated_at, locale)}
      </p>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => onRunSearch(item.query)}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
            isDark ? "bg-[#1a2d4c] text-slate-100 hover:bg-[#22385f]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <Search className="h-4 w-4" />
          {t("account.saved.runSearch")}
        </button>
        <button
          type="button"
          onClick={() => onToggleEmail(item)}
          disabled={isUpdating}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
            isDark ? "bg-[#173b2d] text-emerald-200 hover:bg-[#1b4837]" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          } ${isUpdating ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <Bell className="h-4 w-4" />
          {item.email_alerts_enabled
            ? t("account.saved.disableEmailAlerts")
            : t("account.saved.enableEmailAlerts")}
        </button>
        <button
          type="button"
          onClick={() => onEdit(item)}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
            isDark ? "bg-[#2b2348] text-violet-200 hover:bg-[#352b58]" : "bg-violet-50 text-violet-700 hover:bg-violet-100"
          }`}
        >
          <PencilLine className="h-4 w-4" />
          {t("account.saved.editAlert")}
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          disabled={isDeleting}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
            isDark ? "bg-red-950/30 text-red-300 hover:bg-red-950/50" : "bg-red-50 text-red-600 hover:bg-red-100"
          } ${isDeleting ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? t("account.saved.removing") : t("account.saved.deleteAlert")}
        </button>
      </div>
    </article>
  );
}

function SearchHistoryCard({
  item,
  onRunSearch,
  onDelete,
  isDeleting,
}: {
  item: SearchHistoryItem;
  onRunSearch: (query: string) => void;
  onDelete: (item: SearchHistoryItem) => void;
  isDeleting: boolean;
}) {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const isDark = theme === "dark";

  return (
    <article
      className={`rounded-2xl border p-4 ${
        isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            {item.query}
          </h3>
          <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {t("account.saved.savedAt")}: {formatDate(item.created_at, locale)}
          </p>
        </div>
        <Clock3 className={`h-5 w-5 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => onRunSearch(item.query)}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
            isDark ? "bg-[#1a2d4c] text-slate-100 hover:bg-[#22385f]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <Search className="h-4 w-4" />
          {t("account.saved.runSearch")}
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          disabled={isDeleting}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
            isDark ? "bg-red-950/30 text-red-300 hover:bg-red-950/50" : "bg-red-50 text-red-600 hover:bg-red-100"
          } ${isDeleting ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? t("account.saved.removing") : t("account.saved.deleteHistory")}
        </button>
      </div>
    </article>
  );
}

export function AccountSavedPanel() {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editingAlertId, setEditingAlertId] = useState<number | null>(null);
  const [alertForm, setAlertForm] = useState<SearchAlertPayload>({
    query: "",
    module: null,
    city: null,
    filters_json: "{}",
    email_alerts_enabled: true,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const listingsQuery = useQuery({
    queryKey: ["account-saved-listings"],
    queryFn: fetchSavedListings,
  });
  const businessesQuery = useQuery({
    queryKey: ["account-saved-businesses"],
    queryFn: fetchSavedBusinesses,
  });
  const alertsQuery = useQuery({
    queryKey: ["account-search-alerts"],
    queryFn: fetchSearchAlerts,
  });
  const historyQuery = useQuery({
    queryKey: ["account-search-history"],
    queryFn: () => fetchSearchHistory(12),
  });

  const removeListingMutation = useMutation({
    mutationFn: removeSavedListing,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account-saved-listings"] });
      void queryClient.invalidateQueries({ queryKey: ["account-dashboard"] });
    },
  });

  const removeBusinessMutation = useMutation({
    mutationFn: removeSavedBusiness,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account-saved-businesses"] });
    },
  });
  const createAlertMutation = useMutation({
    mutationFn: createSearchAlert,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account-search-alerts"] });
    },
  });
  const updateAlertMutation = useMutation({
    mutationFn: ({ alertId, payload }: { alertId: number; payload: Partial<SearchAlertPayload> }) =>
      updateSearchAlert(alertId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account-search-alerts"] });
    },
  });
  const deleteAlertMutation = useMutation({
    mutationFn: deleteSearchAlert,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account-search-alerts"] });
    },
  });
  const deleteHistoryMutation = useMutation({
    mutationFn: deleteSearchHistory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account-search-history"] });
    },
  });
  const clearHistoryMutation = useMutation({
    mutationFn: clearSearchHistory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account-search-history"] });
    },
  });

  const handleRemoveListing = (listingId: number) => {
    if (!window.confirm(t("account.saved.confirmRemoveListing"))) {
      return;
    }
    removeListingMutation.mutate(listingId);
  };

  const handleRemoveBusiness = (businessId: number) => {
    if (!window.confirm(t("account.saved.confirmRemoveBusiness"))) {
      return;
    }
    removeBusinessMutation.mutate(businessId);
  };

  const listings = listingsQuery.data ?? [];
  const businesses = businessesQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];
  const historyItems = historyQuery.data ?? [];

  const resetAlertForm = () => {
    setEditingAlertId(null);
    setAlertForm({
      query: "",
      module: null,
      city: null,
      filters_json: "{}",
      email_alerts_enabled: true,
    });
    setFormError(null);
  };

  const handleRunSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleEditAlert = (item: SearchAlertItem) => {
    setEditingAlertId(item.id);
    setAlertForm({
      query: item.query,
      module: item.module,
      city: item.city,
      filters_json: item.filters_json || "{}",
      email_alerts_enabled: item.email_alerts_enabled,
    });
    setFormError(null);
  };

  const handleSubmitAlert = async () => {
    const normalizedQuery = alertForm.query.trim();
    if (!normalizedQuery) {
      setFormError(t("account.saved.queryRequired"));
      return;
    }

    const payload: SearchAlertPayload = {
      query: normalizedQuery,
      module: alertForm.module?.trim() || null,
      city: alertForm.city?.trim() || null,
      filters_json: alertForm.filters_json || "{}",
      email_alerts_enabled: alertForm.email_alerts_enabled,
    };

    try {
      setFormError(null);
      if (editingAlertId) {
        await updateAlertMutation.mutateAsync({ alertId: editingAlertId, payload });
      } else {
        await createAlertMutation.mutateAsync(payload);
      }
      resetAlertForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("account.loadError"));
    }
  };

  const handleDeleteAlert = (item: SearchAlertItem) => {
    if (!window.confirm(t("account.saved.confirmDeleteAlert"))) {
      return;
    }
    deleteAlertMutation.mutate(item.id);
  };

  const handleToggleAlert = (item: SearchAlertItem) => {
    updateAlertMutation.mutate({
      alertId: item.id,
      payload: { email_alerts_enabled: !item.email_alerts_enabled },
    });
  };

  const handleDeleteHistory = (item: SearchHistoryItem) => {
    if (!window.confirm(t("account.saved.confirmDeleteHistory"))) {
      return;
    }
    deleteHistoryMutation.mutate(item.id);
  };

  const handleClearHistory = () => {
    if (!window.confirm(t("account.saved.confirmClearHistory"))) {
      return;
    }
    clearHistoryMutation.mutate();
  };

  return (
    <section className="space-y-6">
      <div
        className={`rounded-3xl border p-5 md:p-6 ${
          isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"
        }`}
      >
        <div className="mb-5 flex items-center gap-3">
          <Heart className={`h-5 w-5 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
          <div>
            <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              {t("account.saved.listings")}
            </h2>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {t("account.saved.listingsSubtitle")}
            </p>
          </div>
        </div>

        {listingsQuery.isLoading ? (
          <p className={isDark ? "text-slate-400" : "text-slate-500"}>{t("common.loading")}</p>
        ) : listingsQuery.isError ? (
          <p className={isDark ? "text-red-300" : "text-red-600"}>
            {listingsQuery.error instanceof Error ? listingsQuery.error.message : t("account.loadError")}
          </p>
        ) : listings.length === 0 ? (
          <div className={`rounded-2xl border border-dashed p-6 text-sm ${isDark ? "border-[#22416b] text-slate-400" : "border-slate-200 text-slate-500"}`}>
            {t("account.saved.emptyListings")}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {listings.map((item) => (
              <SavedListingCard
                key={item.listing_id}
                item={item}
                onRemove={handleRemoveListing}
                isRemoving={removeListingMutation.isPending && removeListingMutation.variables === item.listing_id}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className={`rounded-3xl border p-5 md:p-6 ${
          isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"
        }`}
      >
        <div className="mb-5 flex items-center gap-3">
          <Building2 className={`h-5 w-5 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
          <div>
            <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              {t("account.saved.businesses")}
            </h2>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {t("account.saved.businessesSubtitle")}
            </p>
          </div>
        </div>

        {businessesQuery.isLoading ? (
          <p className={isDark ? "text-slate-400" : "text-slate-500"}>{t("common.loading")}</p>
        ) : businessesQuery.isError ? (
          <p className={isDark ? "text-red-300" : "text-red-600"}>
            {businessesQuery.error instanceof Error ? businessesQuery.error.message : t("account.loadError")}
          </p>
        ) : businesses.length === 0 ? (
          <div className={`rounded-2xl border border-dashed p-6 text-sm ${isDark ? "border-[#22416b] text-slate-400" : "border-slate-200 text-slate-500"}`}>
            {t("account.saved.emptyBusinesses")}
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {businesses.map((item) => (
              <SavedBusinessCard
                key={item.business_id}
                item={item}
                onRemove={handleRemoveBusiness}
                isRemoving={
                  removeBusinessMutation.isPending && removeBusinessMutation.variables === item.business_id
                }
              />
            ))}
          </div>
        )}
      </div>

      <div
        className={`rounded-3xl border p-5 md:p-6 ${
          isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"
        }`}
      >
        <div className="mb-5 flex items-center gap-3">
          <Bell className={`h-5 w-5 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
          <div>
            <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              {t("account.saved.searchAlerts")}
            </h2>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {t("account.saved.searchAlertsSubtitle")}
            </p>
          </div>
        </div>

        <div className={`mb-5 rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              type="text"
              value={alertForm.query}
              onChange={(event) => setAlertForm((current) => ({ ...current, query: event.target.value }))}
              placeholder={t("account.saved.queryPlaceholder")}
              className={`rounded-xl border px-3 py-2 text-sm ${
                isDark ? "border-[#22416b] bg-[#11203a] text-slate-100" : "border-slate-200 bg-white text-slate-900"
              }`}
            />
            <input
              type="text"
              value={alertForm.module ?? ""}
              onChange={(event) =>
                setAlertForm((current) => ({ ...current, module: event.target.value || null }))
              }
              placeholder={t("account.saved.modulePlaceholder")}
              className={`rounded-xl border px-3 py-2 text-sm ${
                isDark ? "border-[#22416b] bg-[#11203a] text-slate-100" : "border-slate-200 bg-white text-slate-900"
              }`}
            />
            <input
              type="text"
              value={alertForm.city ?? ""}
              onChange={(event) =>
                setAlertForm((current) => ({ ...current, city: event.target.value || null }))
              }
              placeholder={t("account.saved.cityPlaceholder")}
              className={`rounded-xl border px-3 py-2 text-sm ${
                isDark ? "border-[#22416b] bg-[#11203a] text-slate-100" : "border-slate-200 bg-white text-slate-900"
              }`}
            />
          </div>

          <label className={`mt-3 inline-flex items-center gap-2 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
            <input
              type="checkbox"
              checked={alertForm.email_alerts_enabled}
              onChange={(event) =>
                setAlertForm((current) => ({ ...current, email_alerts_enabled: event.target.checked }))
              }
            />
            {t("account.saved.emailAlerts")}
          </label>

          {formError ? (
            <p className={`mt-3 text-sm ${isDark ? "text-red-300" : "text-red-600"}`}>{formError}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleSubmitAlert()}
              disabled={createAlertMutation.isPending || updateAlertMutation.isPending}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                isDark ? "bg-[#FFD700] text-[#0d1a2e]" : "bg-[#0057B8] text-white"
              } ${(createAlertMutation.isPending || updateAlertMutation.isPending) ? "cursor-not-allowed opacity-60" : ""}`}
            >
              {createAlertMutation.isPending || updateAlertMutation.isPending
                ? t("account.saved.savingAlert")
                : editingAlertId
                  ? t("account.saved.updateAlert")
                  : t("account.saved.createAlert")}
            </button>
            {editingAlertId ? (
              <button
                type="button"
                onClick={resetAlertForm}
                className={`rounded-xl px-4 py-2 text-sm font-medium ${
                  isDark ? "bg-[#1a2d4c] text-slate-100" : "bg-slate-100 text-slate-700"
                }`}
              >
                {t("account.saved.cancelEdit")}
              </button>
            ) : null}
          </div>
        </div>

        {alertsQuery.isLoading ? (
          <p className={isDark ? "text-slate-400" : "text-slate-500"}>{t("common.loading")}</p>
        ) : alertsQuery.isError ? (
          <p className={isDark ? "text-red-300" : "text-red-600"}>
            {alertsQuery.error instanceof Error ? alertsQuery.error.message : t("account.loadError")}
          </p>
        ) : alerts.length === 0 ? (
          <div className={`rounded-2xl border border-dashed p-6 text-sm ${isDark ? "border-[#22416b] text-slate-400" : "border-slate-200 text-slate-500"}`}>
            {t("account.saved.emptySearchAlerts")}
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {alerts.map((item) => (
              <SearchAlertCard
                key={item.id}
                item={item}
                onEdit={handleEditAlert}
                onRunSearch={handleRunSearch}
                onToggleEmail={handleToggleAlert}
                onDelete={handleDeleteAlert}
                isUpdating={updateAlertMutation.isPending && updateAlertMutation.variables?.alertId === item.id}
                isDeleting={deleteAlertMutation.isPending && deleteAlertMutation.variables === item.id}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className={`rounded-3xl border p-5 md:p-6 ${
          isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"
        }`}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock3 className={`h-5 w-5 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
            <div>
              <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                {t("account.saved.history")}
              </h2>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {t("account.saved.historySubtitle")}
              </p>
            </div>
          </div>
          {historyItems.length > 0 ? (
            <button
              type="button"
              onClick={handleClearHistory}
              disabled={clearHistoryMutation.isPending}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                isDark ? "bg-red-950/30 text-red-300 hover:bg-red-950/50" : "bg-red-50 text-red-600 hover:bg-red-100"
              } ${clearHistoryMutation.isPending ? "cursor-not-allowed opacity-60" : ""}`}
            >
              {clearHistoryMutation.isPending ? t("account.saved.clearingHistory") : t("account.saved.clearHistory")}
            </button>
          ) : null}
        </div>

        {historyQuery.isLoading ? (
          <p className={isDark ? "text-slate-400" : "text-slate-500"}>{t("common.loading")}</p>
        ) : historyQuery.isError ? (
          <p className={isDark ? "text-red-300" : "text-red-600"}>
            {historyQuery.error instanceof Error ? historyQuery.error.message : t("account.loadError")}
          </p>
        ) : historyItems.length === 0 ? (
          <div className={`rounded-2xl border border-dashed p-6 text-sm ${isDark ? "border-[#22416b] text-slate-400" : "border-slate-200 text-slate-500"}`}>
            {t("account.saved.emptyHistory")}
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {historyItems.map((item) => (
              <SearchHistoryCard
                key={item.id}
                item={item}
                onRunSearch={handleRunSearch}
                onDelete={handleDeleteHistory}
                isDeleting={deleteHistoryMutation.isPending && deleteHistoryMutation.variables === item.id}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
