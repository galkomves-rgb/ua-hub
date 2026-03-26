import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  BadgeEuro,
  BellRing,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  Rocket,
  Store,
} from "lucide-react";
import {
  createBillingCheckout,
  fetchBillingHistory,
  fetchBillingOverview,
  fetchMyBusinessProfiles,
  fetchMyListings,
  verifyBillingCheckout,
  type BillingHistoryItem,
  type BillingOverviewResponse,
  type BillingProduct,
} from "@/lib/account-api";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

function formatDate(value: string | null | undefined, locale: "ua" | "es" | "en") {
  if (!value) {
    return null;
  }
  try {
    const formatterLocale = locale === "ua" ? "uk-UA" : locale === "es" ? "es-ES" : "en-GB";
    return new Intl.DateTimeFormat(formatterLocale, { day: "numeric", month: "short", year: "numeric" }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
}

function formatMoney(amount: number, currency: string, locale: "ua" | "es" | "en") {
  try {
    const formatterLocale = locale === "ua" ? "uk-UA" : locale === "es" ? "es-ES" : "en-GB";
    return new Intl.NumberFormat(formatterLocale, {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency.toUpperCase()}`;
  }
}

function ProductCard({
  product,
  selected,
  onSelect,
}: {
  product: BillingProduct;
  selected: boolean;
  onSelect: () => void;
}) {
  const { theme } = useTheme();
  const { locale, t } = useI18n();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-2xl border p-4 text-left transition-colors ${
        selected
          ? isDark
            ? "border-[#FFD700] bg-[#16253f]"
            : "border-[#0057B8] bg-blue-50"
          : isDark
            ? "border-[#22416b] bg-[#0d1a2e] hover:bg-[#11203a]"
            : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{product.title}</h3>
          <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{product.description}</p>
        </div>
        {selected ? <CheckCircle2 className={`h-5 w-5 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} /> : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className={`rounded-full px-2.5 py-1 ${isDark ? "bg-[#1a2d4c] text-slate-200" : "bg-slate-100 text-slate-700"}`}>
          {formatMoney(product.amount, product.currency, locale)}
        </span>
        {product.duration_days ? (
          <span className={`rounded-full px-2.5 py-1 ${isDark ? "bg-[#1a2d4c] text-slate-200" : "bg-slate-100 text-slate-700"}`}>
            {product.duration_days} {t("account.billing.days")}
          </span>
        ) : null}
        {product.listing_quota ? (
          <span className={`rounded-full px-2.5 py-1 ${isDark ? "bg-[#1a2d4c] text-slate-200" : "bg-slate-100 text-slate-700"}`}>
            {product.listing_quota} {t("account.billing.listingsQuota")}
          </span>
        ) : null}
      </div>
    </button>
  );
}

export function AccountBillingPanel() {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProductCode, setSelectedProductCode] = useState<string | null>(null);
  const [selectedBusinessSlug, setSelectedBusinessSlug] = useState<string>("");
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const overviewQuery = useQuery({ queryKey: ["account-billing-overview"], queryFn: fetchBillingOverview });
  const historyQuery = useQuery({ queryKey: ["account-billing-history"], queryFn: () => fetchBillingHistory(100) });
  const businessQuery = useQuery({ queryKey: ["account-business-profiles"], queryFn: fetchMyBusinessProfiles });
  const listingsQuery = useQuery({ queryKey: ["account-billing-listings"], queryFn: () => fetchMyListings() });

  const verifyMutation = useMutation({
    mutationFn: verifyBillingCheckout,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["account-billing-overview"] });
      await queryClient.invalidateQueries({ queryKey: ["account-billing-history"] });
      await queryClient.invalidateQueries({ queryKey: ["account-business-profiles"] });
      await queryClient.invalidateQueries({ queryKey: ["account-listings"] });
      setStatusMessage(`${t("account.billing.checkoutVerified")}: ${response.payment.title}`);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("session_id");
      nextParams.delete("checkout");
      setSearchParams(nextParams, { replace: true });
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : t("account.billing.checkoutVerifyError"));
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: createBillingCheckout,
    onSuccess: (response) => {
      if (response.checkout_url) {
        window.location.href = response.checkout_url;
        return;
      }
      setStatusMessage(t("account.billing.checkoutMissingUrl"));
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : t("account.billing.checkoutCreateError"));
    },
  });

  useEffect(() => {
    const checkoutState = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");
    if (checkoutState === "success" && sessionId && !verifyMutation.isPending && !verifyMutation.isSuccess) {
      verifyMutation.mutate({ session_id: sessionId });
      return;
    }
    if (checkoutState === "cancel") {
      setStatusMessage(t("account.billing.checkoutCancelled"));
    }
  }, [searchParams]);

  const overview = overviewQuery.data;
  const history = historyQuery.data ?? [];
  const products = overview?.available_products ?? [];
  const businesses = businessQuery.data ?? [];
  const listings = (listingsQuery.data ?? []).filter((item) => item.status === "active" || item.status === "published");

  useEffect(() => {
    if (!selectedProductCode && products.length > 0) {
      setSelectedProductCode(products[0].code);
    }
  }, [products, selectedProductCode]);

  useEffect(() => {
    if (!selectedBusinessSlug && businesses[0]?.slug) {
      setSelectedBusinessSlug(businesses[0].slug);
    }
  }, [businesses, selectedBusinessSlug]);

  useEffect(() => {
    if (selectedListingId === null && listings[0]?.id) {
      setSelectedListingId(listings[0].id);
    }
  }, [listings, selectedListingId]);

  const selectedProduct = useMemo(
    () => products.find((item) => item.code === selectedProductCode) ?? null,
    [products, selectedProductCode],
  );

  const purchaseDisabled = useMemo(() => {
    if (!selectedProduct) {
      return true;
    }
    if (selectedProduct.target_type === "business_profile") {
      return !selectedBusinessSlug;
    }
    if (selectedProduct.target_type === "listing") {
      return !selectedListingId;
    }
    return false;
  }, [selectedBusinessSlug, selectedListingId, selectedProduct]);

  const handleCheckout = () => {
    if (!selectedProduct) {
      return;
    }

    checkoutMutation.mutate({
      product_code: selectedProduct.code,
      business_slug: selectedProduct.target_type === "business_profile" ? selectedBusinessSlug : undefined,
      listing_id: selectedProduct.target_type === "listing" ? selectedListingId ?? undefined : undefined,
    });
  };

  const subscriptionCards = overview?.business_subscriptions ?? [];
  const activeBoosts = overview?.active_boosts ?? [];

  return (
    <section className="space-y-6">
      <div className={`rounded-3xl border p-5 md:p-6 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
        <div className="mb-5 flex items-center gap-3">
          <CreditCard className={`h-5 w-5 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
          <div>
            <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("account.billing.title")}</h2>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("account.billing.subtitle")}</p>
          </div>
        </div>

        {overviewQuery.isLoading ? (
          <p className={isDark ? "text-slate-400" : "text-slate-500"}>{t("common.loading")}</p>
        ) : overviewQuery.isError ? (
          <p className={isDark ? "text-red-300" : "text-red-600"}>
            {overviewQuery.error instanceof Error ? overviewQuery.error.message : t("account.loadError")}
          </p>
        ) : overview ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className={`rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                <p className={`text-xs uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{t("account.billing.totalSpend")}</p>
                <p className={`mt-3 text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  {formatMoney(overview.payment_summary.total_spend, overview.payment_summary.currency, locale)}
                </p>
              </div>
              <div className={`rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                <p className={`text-xs uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{t("account.billing.activeBoosts")}</p>
                <p className={`mt-3 text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{overview.usage.active_boosts_count}</p>
              </div>
              <div className={`rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                <p className={`text-xs uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{t("account.billing.activeQuota")}</p>
                <p className={`mt-3 text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  {overview.usage.active_listings_count}/{overview.usage.total_listing_quota}
                </p>
              </div>
              <div className={`rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                <p className={`text-xs uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{t("account.billing.pendingPayments")}</p>
                <p className={`mt-3 text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{overview.payment_summary.pending_payments_count}</p>
              </div>
            </div>

            {statusMessage ? (
              <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                {statusMessage}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className={`rounded-3xl border p-5 md:p-6 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
          <div className="mb-5 flex items-center gap-3">
            <BadgeEuro className={`h-5 w-5 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
            <div>
              <h3 className={`text-lg font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("account.billing.purchaseTitle")}</h3>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("account.billing.purchaseSubtitle")}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {products.map((product) => (
              <ProductCard
                key={product.code}
                product={product}
                selected={selectedProductCode === product.code}
                onSelect={() => setSelectedProductCode(product.code)}
              />
            ))}
          </div>

          {selectedProduct?.target_type === "business_profile" ? (
            <div className="mt-5">
              <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>{t("account.billing.selectBusiness")}</label>
              <select
                value={selectedBusinessSlug}
                onChange={(event) => setSelectedBusinessSlug(event.target.value)}
                className={`w-full rounded-xl border px-3 py-2 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}
              >
                {businesses.map((business) => (
                  <option key={business.slug} value={business.slug}>{business.name}</option>
                ))}
              </select>
            </div>
          ) : null}

          {selectedProduct?.target_type === "listing" ? (
            <div className="mt-5">
              <label className={`mb-2 block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>{t("account.billing.selectListing")}</label>
              <select
                value={selectedListingId ?? ""}
                onChange={(event) => setSelectedListingId(Number(event.target.value))}
                className={`w-full rounded-xl border px-3 py-2 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}
              >
                {listings.map((listing) => (
                  <option key={listing.id} value={listing.id}>{listing.title}</option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCheckout}
              disabled={purchaseDisabled || checkoutMutation.isPending}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${isDark ? "bg-[#FFD700] text-[#0d1a2e]" : "bg-[#0057B8] text-white"} ${(purchaseDisabled || checkoutMutation.isPending) ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <Rocket className="h-4 w-4" />
              {checkoutMutation.isPending ? t("account.billing.redirectingCheckout") : t("account.billing.proceedToCheckout")}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`rounded-3xl border p-5 md:p-6 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
            <div className="mb-5 flex items-center gap-3">
              <Store className={`h-5 w-5 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
              <div>
                <h3 className={`text-lg font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("account.billing.subscriptions")}</h3>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("account.billing.subscriptionsSubtitle")}</p>
              </div>
            </div>

            {subscriptionCards.length === 0 ? (
              <div className={`rounded-2xl border border-dashed p-5 text-sm ${isDark ? "border-[#22416b] text-slate-400" : "border-slate-200 text-slate-500"}`}>{t("account.billing.noSubscriptions")}</div>
            ) : (
              <div className="space-y-3">
                {subscriptionCards.map((item) => (
                  <div key={item.slug} className={`rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.business_name}</h4>
                        <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{item.plan_code || t("account.billing.noPlan")}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.subscription_status === "active" ? isDark ? "bg-emerald-950/40 text-emerald-300" : "bg-emerald-50 text-emerald-700" : isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                        {item.subscription_status || t("account.billing.inactive")}
                      </span>
                    </div>
                    <div className={`mt-3 grid gap-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      <p>{t("account.billing.renewalDate")}: {formatDate(item.renewal_date, locale) || t("account.billing.notAvailable")}</p>
                      <p>{t("account.billing.quotaUsage")}: {item.active_listings_count}/{item.listing_quota ?? 0}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`rounded-3xl border p-5 md:p-6 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
            <div className="mb-5 flex items-center gap-3">
              <BellRing className={`h-5 w-5 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
              <div>
                <h3 className={`text-lg font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("account.billing.boosts")}</h3>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("account.billing.boostsSubtitle")}</p>
              </div>
            </div>

            {activeBoosts.length === 0 ? (
              <div className={`rounded-2xl border border-dashed p-5 text-sm ${isDark ? "border-[#22416b] text-slate-400" : "border-slate-200 text-slate-500"}`}>{t("account.billing.noBoosts")}</div>
            ) : (
              <div className="space-y-3">
                {activeBoosts.map((item) => (
                  <div key={`${item.payment_id}-${item.listing_id}`} className={`rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                    <h4 className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.listing_title}</h4>
                    <div className={`mt-2 grid gap-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      <p>{t("account.billing.boostType")}: {item.entitlement_type}</p>
                      <p>{t("account.billing.expiresAt")}: {formatDate(item.ends_at, locale) || t("account.billing.notAvailable")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`rounded-3xl border p-5 md:p-6 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
        <div className="mb-5 flex items-center gap-3">
          <FileText className={`h-5 w-5 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
          <div>
            <h3 className={`text-lg font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("account.billing.historyTitle")}</h3>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("account.billing.historySubtitle")}</p>
          </div>
        </div>

        {historyQuery.isLoading ? (
          <p className={isDark ? "text-slate-400" : "text-slate-500"}>{t("common.loading")}</p>
        ) : historyQuery.isError ? (
          <p className={isDark ? "text-red-300" : "text-red-600"}>{historyQuery.error instanceof Error ? historyQuery.error.message : t("account.loadError")}</p>
        ) : history.length === 0 ? (
          <div className={`rounded-2xl border border-dashed p-5 text-sm ${isDark ? "border-[#22416b] text-slate-400" : "border-slate-200 text-slate-500"}`}>{t("account.billing.noHistory")}</div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className={`rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.title}</h4>
                    <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{item.target_label || item.product_code}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{formatMoney(item.amount_total, item.currency, locale)}</p>
                    <p className={`mt-1 text-xs font-semibold uppercase tracking-[0.16em] ${item.status === "paid" ? isDark ? "text-emerald-300" : "text-emerald-700" : isDark ? "text-amber-300" : "text-amber-700"}`}>{item.status}</p>
                  </div>
                </div>
                <div className={`mt-3 grid gap-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  <p>{t("account.billing.createdAt")}: {formatDate(item.created_at, locale)}</p>
                  <p>{t("account.billing.period")}: {formatDate(item.period_start, locale) || t("account.billing.notAvailable")} - {formatDate(item.period_end, locale) || t("account.billing.notAvailable")}</p>
                  {item.failure_reason ? <p>{t("account.billing.failureReason")}: {item.failure_reason}</p> : null}
                </div>
                {(item.receipt_url || item.invoice_url) ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.receipt_url ? (
                      <a href={item.receipt_url} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${isDark ? "bg-[#1a2d4c] text-slate-100 hover:bg-[#22385f]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                        <ExternalLink className="h-4 w-4" />
                        {t("account.billing.receipt")}
                      </a>
                    ) : null}
                    {item.invoice_url ? (
                      <a href={item.invoice_url} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${isDark ? "bg-[#1a2d4c] text-slate-100 hover:bg-[#22385f]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                        <ExternalLink className="h-4 w-4" />
                        {t("account.billing.invoice")}
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}