import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Heart, MapPin, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import {
  fetchSavedBusinesses,
  fetchSavedListings,
  removeSavedBusiness,
  removeSavedListing,
  type SavedBusinessCard,
  type SavedListingCard,
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
    </article>
  );
}

export function AccountSavedPanel() {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();

  const listingsQuery = useQuery({
    queryKey: ["account-saved-listings"],
    queryFn: fetchSavedListings,
  });
  const businessesQuery = useQuery({
    queryKey: ["account-saved-businesses"],
    queryFn: fetchSavedBusinesses,
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
    </section>
  );
}
