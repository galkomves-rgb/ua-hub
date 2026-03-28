import { getAPIBaseURL } from "@/lib/config";
import { ReauthenticationRequiredError, refreshAuthTokenIfPossible } from "@/lib/auth";

export interface AccountDashboardResponse {
  active_listings_count: number;
  draft_listings_count: number;
  saved_listings_count: number;
  unread_messages_count: number;
  business_profiles_count: number;
  expiring_soon_count: number;
  moderation_issues_count: number;
}

export interface SavedListingCard {
  listing_id: number;
  title: string;
  city: string;
  price: string | null;
  module: string;
  saved_at: string;
  status: string | null;
  primary_image: string | null;
}

export interface SavedBusinessCard {
  business_id: number;
  business_name: string;
  category: string;
  city: string;
  is_verified: boolean;
  is_premium: boolean;
  saved_at: string;
  logo_url: string | null;
}

export interface SearchAlertItem {
  id: number;
  user_id: string;
  query: string;
  module: string | null;
  city: string | null;
  filters_json: string | null;
  email_alerts_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SearchAlertPayload {
  query: string;
  module: string | null;
  city: string | null;
  filters_json: string;
  email_alerts_enabled: boolean;
}

export interface SearchAlertUpdatePayload {
  query?: string;
  module?: string | null;
  city?: string | null;
  filters_json?: string;
  email_alerts_enabled?: boolean;
}

export interface SearchHistoryItem {
  id: number;
  user_id: string;
  query: string;
  created_at: string;
}

export interface BillingProduct {
  code: string;
  title: string;
  description: string;
  category: string;
  target_type: string;
  amount: number;
  currency: string;
  duration_days: number | null;
  listing_quota: number | null;
  is_recurring: boolean;
  billing_mode: "free" | "payment" | "subscription";
  trial_days: number | null;
}

export interface BillingSubscriptionSummary {
  business_profile_id: number;
  slug: string;
  business_name: string;
  plan_code: string | null;
  subscription_status: string | null;
  payment_status: string | null;
  renewal_date: string | null;
  listing_quota: number | null;
  active_listings_count: number;
  remaining_listing_quota: number | null;
  is_premium: boolean;
}

export interface BillingBoostSummary {
  payment_id: number;
  listing_id: number;
  listing_title: string;
  product_code: string;
  entitlement_type: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
}

export interface BillingUsageSummary {
  active_listings_count: number;
  total_listing_quota: number;
  remaining_listing_quota: number;
  active_boosts_count: number;
}

export interface BillingPaymentSummary {
  paid_payments_count: number;
  pending_payments_count: number;
  failed_payments_count: number;
  total_spend: number;
  currency: string;
}

export interface BillingOverviewResponse {
  currency: string;
  business_subscriptions: BillingSubscriptionSummary[];
  active_boosts: BillingBoostSummary[];
  usage: BillingUsageSummary;
  payment_summary: BillingPaymentSummary;
  available_products: BillingProduct[];
}

export interface BillingHistoryItem {
  id: number;
  title: string;
  product_code: string;
  product_type: string;
  target_type: string;
  target_label: string | null;
  status: string;
  entitlement_status: string | null;
  amount_total: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  period_start: string | null;
  period_end: string | null;
  receipt_url: string | null;
  invoice_url: string | null;
  failure_reason: string | null;
}

export interface BillingCheckoutPayload {
  product_code: string;
  business_slug?: string;
  listing_id?: number;
  success_url?: string;
  cancel_url?: string;
}

export interface BillingCheckoutResponse {
  payment_id: number;
  session_id: string;
  checkout_url: string | null;
}

export interface BillingVerifyPayload {
  session_id: string;
}

export interface BillingVerifyResponse {
  payment: BillingHistoryItem;
}

export interface AdminOverviewCounts {
  moderation_pending_count: number;
  rejected_listings_count: number;
  published_listings_count: number;
  total_listings_count: number;
  total_users_count: number;
  total_business_profiles_count: number;
  open_reports_count: number;
  pending_payments_count: number;
  payment_issues_count: number;
  active_subscriptions_count: number;
}

export interface AdminOverviewListingItem {
  id: number;
  title: string;
  module: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AdminOverviewReportItem {
  id: number;
  reported_user_id: string;
  listing_id: string | null;
  reason: string;
  status: string;
  created_at: string;
}

export interface AdminOverviewPaymentItem {
  id: number;
  title: string;
  status: string;
  amount_total: number;
  currency: string;
  created_at: string;
  failure_reason: string | null;
}

export interface AdminOverviewResponse {
  counts: AdminOverviewCounts;
  recent_pending_listings: AdminOverviewListingItem[];
  recent_reports: AdminOverviewReportItem[];
  recent_payment_issues: AdminOverviewPaymentItem[];
}

export interface AdminPagedResponse<TItem> {
  total: number;
  limit: number;
  offset: number;
  items: TItem[];
}

export interface AdminReportItem {
  id: number;
  reporter_user_id: string;
  reported_user_id: string;
  listing_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  moderation_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface AdminReportReviewPayload {
  status: string;
  moderation_note?: string | null;
}

export interface AdminBillingPaymentItem {
  id: number;
  user_id: string;
  listing_id: number | null;
  business_profile_id: number | null;
  title: string;
  product_code: string;
  product_type: string;
  target_type: string;
  target_label: string | null;
  status: string;
  entitlement_status: string | null;
  amount_total: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  period_end: string | null;
  failure_reason: string | null;
}

export interface AdminBillingPaymentOverridePayload {
  payment_status: string;
  entitlement_status?: string | null;
  note?: string | null;
}

export interface AdminUserItem {
  id: string;
  email: string;
  name: string | null;
  role: string;
  profile_name: string | null;
  city: string | null;
  account_type: string | null;
  is_public_profile: boolean;
  show_as_public_author: boolean;
  listings_count: number;
  business_profiles_count: number;
  created_at: string | null;
  last_login: string | null;
}

export interface AdminUserRoleUpdatePayload {
  role: string;
}

export interface AdminExpirationRunResponse {
  as_of: string;
  expired_listings: number;
  expired_listing_ids: number[];
  expired_promotions: number;
  expired_promotion_ids: number[];
  expired_subscriptions: number;
  expired_subscription_ids: number[];
  affected_listing_ids: number[];
  affected_business_profile_ids: number[];
}

export interface UserProfileResponse {
  user_id: string;
  name: string;
  avatar_url: string | null;
  city: string;
  bio: string;
  preferred_language: "ua" | "es" | "en";
  account_type: "private" | "business";
  onboarding_completed: boolean;
  is_public_profile: boolean;
  show_as_public_author: boolean;
  allow_marketing_emails: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfilePayload {
  name: string;
  city: string;
  bio: string;
  preferred_language: "ua" | "es" | "en";
  account_type?: "private" | "business";
  avatar_url: string | null;
  is_public_profile?: boolean;
  show_as_public_author?: boolean;
  allow_marketing_emails?: boolean;
}

export interface OnboardingStatusResponse {
  completed: boolean;
  has_user_profile: boolean;
  has_business_profile: boolean;
  account_type: "private" | "business" | null;
  next_step: string;
}

export interface OnboardingCompletePayload {
  name: string;
  city: string;
  bio: string;
  preferred_language: "ua" | "es" | "en";
  account_type: "private" | "business";
  avatar_url: string | null;
  is_public_profile: boolean;
  show_as_public_author: boolean;
  allow_marketing_emails: boolean;
}

export type ListingManagementStatus =
  | "draft"
  | "moderation_pending"
  | "published"
  | "rejected"
  | "expired"
  | "archived"
  | "active";

export type ListingPricingTier = "free" | "basic" | "business";
export type ListingVisibility = "standard" | "boosted" | "featured";

export interface ListingManagementItem {
  id: number;
  title: string;
  module: string;
  category: string;
  owner_type: string;
  pricing_tier?: ListingPricingTier | null;
  visibility?: ListingVisibility | null;
  ranking_score?: number;
  status: ListingManagementStatus;
  created_at: string;
  expires_at: string | null;
  views_count: number;
  unread_messages_count: number;
  saved_count: number;
  is_featured: boolean;
  is_promoted: boolean;
  is_verified: boolean;
  moderation_reason: string | null;
  badges: string | null;
  images_json: string | null;
}

export interface ListingModerationPayload {
  decision: "approve" | "reject";
  moderation_reason?: string | null;
  module?: string | null;
  category?: string | null;
  badges?: string[] | null;
}

export interface ModerationAuditItem {
  id: number;
  listing_id: number;
  actor_user_id: string | null;
  action: string;
  from_status: string | null;
  to_status: string | null;
  notes: string | null;
  metadata: Record<string, string | string[] | null | undefined>;
  created_at: string;
}

export interface MonetizedListingCreatePayload {
  module: string;
  category: string;
  subcategory?: string | null;
  title: string;
  description: string;
  price?: string | null;
  currency: string;
  city: string;
  region?: string | null;
  owner_type: "private_user" | "business_profile" | "organization";
  owner_id: string;
  images_json: string;
  meta_json: string;
  pricing_tier?: ListingPricingTier | null;
}

export interface ListingUpdatePayload {
  title?: string;
  description?: string;
  price?: string | null;
  city?: string;
  category?: string;
  subcategory?: string | null;
  region?: string | null;
  images_json?: string;
  meta_json?: string;
}

export interface SubscriptionCurrentResponse {
  profile_type: "private" | "business";
  has_active_subscription: boolean;
  plan: "business_presence" | "business_priority" | "agency_starter" | "agency_growth" | "agency_pro" | null;
  status: string | null;
  expires_at: string | null;
  listing_quota: number | null;
  active_listings_count: number;
  remaining_listing_quota: number | null;
  paywall_reason: string | null;
}

export type BillingProductCode =
  | "listing_free"
  | "listing_extend_30"
  | "next_private_listing_30"
  | "boost"
  | "featured"
  | "business_presence"
  | "business_priority"
  | "agency_starter"
  | "agency_growth"
  | "agency_pro";

export interface PaymentCreatePayload {
  type: BillingProductCode;
  listing_id?: number;
  business_slug?: string;
  success_url?: string;
  cancel_url?: string;
}

export interface PaymentCreateResponse {
  payment_id: number;
  session_id: string;
  checkout_url: string | null;
  type: PaymentCreatePayload["type"];
}

export interface CreateListingPaywallError {
  message: string;
  required_product_code: BillingProductCode;
  paywall_reason: string;
  listing_id: number;
}

export interface MessagingConversationSummary {
  other_user_id: string;
  listing_id: string | null;
  listing_title: string | null;
  linked_listing_url: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  is_sender: boolean;
  participant: MessagingParticipant;
}

export interface MessagingInboxResponse {
  conversations: MessagingConversationSummary[];
  total_unread: number;
}

export interface MessagingParticipant {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  participant_type: string;
  business_name: string | null;
  business_slug: string | null;
}

export interface MessagingConversationState {
  participant: MessagingParticipant;
  linked_listing_url: string | null;
  blocked_by_current_user: boolean;
  blocked_by_other_user: boolean;
  can_send: boolean;
  latest_report_status: string | null;
  latest_report_reason: string | null;
  latest_reported_at: string | null;
}

export interface MessagingMessage {
  id: number;
  user_id: string;
  recipient_id: string;
  listing_id: string | null;
  listing_title: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface SendMessagePayload {
  recipient_id: string;
  listing_id?: string;
  listing_title?: string;
  content: string;
}

export interface ReportMessagingUserPayload {
  other_user_id: string;
  listing_id?: string;
  message_id?: number;
  reason: string;
  details?: string;
}

export interface BusinessProfileResponse {
  owner_user_id: string;
  slug: string;
  name: string;
  category: string;
  city: string;
  description: string;
  logo_url: string | null;
  cover_url: string | null;
  contacts_json: string;
  tags_json: string;
  rating: string;
  website: string | null;
  social_links_json: string;
  service_areas_json: string;
  is_verified: boolean;
  is_premium: boolean;
  verification_status: string;
  verification_requested_at: string | null;
  verification_notes: string | null;
  subscription_plan: string | null;
  subscription_request_status: string | null;
  subscription_requested_plan: string | null;
  subscription_requested_at: string | null;
  subscription_renewal_date: string | null;
  listing_quota: number | null;
  active_listings_count: number;
  total_views_count: number;
  saved_by_users_count: number;
  profile_completeness: number;
  public_preview_url: string | null;
  google_place_id: string | null;
  google_maps_rating: string | null;
  google_maps_review_count: number | null;
  google_maps_rating_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessProfilePayload {
  slug: string;
  name: string;
  category: string;
  city: string;
  description: string;
  logo_url: string | null;
  cover_url: string | null;
  contacts_json: string;
  tags_json: string;
  rating: string;
  website: string | null;
  social_links_json: string;
  service_areas_json: string;
}

export interface BusinessVerificationPayload {
  message?: string | null;
}

export interface BusinessSubscriptionPayload {
  plan: "basic" | "premium" | "business";
}

async function accountFetch<T>(
  path: string,
  init?: RequestInit,
  options?: { notFoundError?: string },
): Promise<T> {
  const request = async (token: string | null) =>
    fetch(`${getAPIBaseURL()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
    });

  const initialToken = localStorage.getItem("auth_token");
  let response = await request(initialToken);

  if (response.status === 401) {
    const refreshedToken = await refreshAuthTokenIfPossible();
    if (refreshedToken) {
      response = await request(refreshedToken);
    }

    if (response.status === 401) {
      if (initialToken) {
        throw new ReauthenticationRequiredError();
      }
      throw new Error("Authentication required");
    }
  }

  if (response.status === 404) {
    throw new Error(options?.notFoundError || "NOT_FOUND");
  }

  if (!response.ok) {
    let detail = "Request failed";
    try {
      const data = await response.json();
      detail = extractApiErrorMessage(data, detail);
    } catch {
      // Keep generic message
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

function extractApiErrorMessage(data: unknown, fallback = "Request failed") {
  if (!data || typeof data !== "object") {
    return fallback;
  }

  const detail = "detail" in data ? data.detail : null;
  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const location = Array.isArray((item as { loc?: unknown }).loc)
          ? ((item as { loc: unknown[] }).loc
              .filter((part) => part !== "body")
              .map((part) => String(part))
              .join(" → ") || null)
          : null;
        const message = typeof (item as { msg?: unknown }).msg === "string"
          ? (item as { msg: string }).msg.trim()
          : null;

        if (!message) {
          return null;
        }

        return location ? `${location}: ${message}` : message;
      })
      .filter((item): item is string => Boolean(item));

    if (messages.length > 0) {
      return messages.join("; ");
    }
  }

  if (detail && typeof detail === "object") {
    const nestedMessage = "message" in detail ? detail.message : null;
    if (typeof nestedMessage === "string" && nestedMessage.trim()) {
      return nestedMessage.trim();
    }
  }

  const message = "message" in data ? data.message : null;
  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }

  return fallback;
}

export function fetchAccountDashboard() {
  return accountFetch<AccountDashboardResponse>("/api/v1/account/dashboard");
}

export function fetchSavedListings() {
  return accountFetch<SavedListingCard[]>("/api/v1/saved/listings");
}

export function saveListing(listingId: number) {
  return accountFetch<{ id: number; user_id: string; listing_id: number; created_at: string }>(`/api/v1/saved/listings/${listingId}`, {
    method: 'POST',
  });
}

export function fetchSavedBusinesses() {
  return accountFetch<SavedBusinessCard[]>("/api/v1/saved/businesses");
}

export function removeSavedListing(listingId: number) {
  return accountFetch<void>(`/api/v1/saved/listings/${listingId}`, { method: "DELETE" });
}

export function removeSavedBusiness(businessId: number) {
  return accountFetch<void>(`/api/v1/saved/businesses/${businessId}`, { method: "DELETE" });
}

export function fetchSearchAlerts() {
  return accountFetch<SearchAlertItem[]>("/api/v1/saved/search-alerts");
}

export function createSearchAlert(payload: SearchAlertPayload) {
  return accountFetch<SearchAlertItem>("/api/v1/saved/search-alerts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSearchAlert(alertId: number, payload: SearchAlertUpdatePayload) {
  return accountFetch<SearchAlertItem>(`/api/v1/saved/search-alerts/${alertId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteSearchAlert(alertId: number) {
  return accountFetch<void>(`/api/v1/saved/search-alerts/${alertId}`, { method: "DELETE" });
}

export function fetchSearchHistory(limit = 8) {
  return accountFetch<SearchHistoryItem[]>(`/api/v1/saved/search-history?limit=${limit}`);
}

export function saveSearchHistory(query: string) {
  return accountFetch<SearchHistoryItem>("/api/v1/saved/search-history", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export function deleteSearchHistory(historyId: number) {
  return accountFetch<void>(`/api/v1/saved/search-history/${historyId}`, { method: "DELETE" });
}

export function clearSearchHistory() {
  return accountFetch<{ deleted_count: number }>("/api/v1/saved/search-history", {
    method: "DELETE",
  });
}

export function fetchBillingOverview() {
  return accountFetch<BillingOverviewResponse>("/api/v1/billing/overview");
}

export function fetchBillingProducts() {
  return accountFetch<BillingProduct[]>("/api/v1/billing/products");
}

export function fetchCurrentSubscription() {
  return accountFetch<SubscriptionCurrentResponse>("/api/v1/subscriptions/current");
}

export function fetchBillingHistory(limit = 100) {
  return accountFetch<BillingHistoryItem[]>(`/api/v1/billing/history?limit=${limit}`);
}

export function createBillingCheckout(payload: BillingCheckoutPayload) {
  return accountFetch<BillingCheckoutResponse>("/api/v1/billing/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createPayment(payload: PaymentCreatePayload) {
  return accountFetch<PaymentCreateResponse>("/api/v1/payments/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function confirmPayment(payload: BillingVerifyPayload) {
  return accountFetch<{ payment: BillingHistoryItem }>("/api/v1/payments/confirm", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyBillingCheckout(payload: BillingVerifyPayload) {
  return accountFetch<BillingVerifyResponse>("/api/v1/billing/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchUserProfile() {
  return accountFetch<UserProfileResponse>("/api/v1/profiles/user", undefined, {
    notFoundError: "PROFILE_NOT_FOUND",
  });
}

export function createUserProfile(payload: UserProfilePayload) {
  return accountFetch<UserProfileResponse>("/api/v1/profiles/user", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUserProfile(payload: UserProfilePayload) {
  return accountFetch<UserProfileResponse>("/api/v1/profiles/user", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function fetchOnboardingStatus() {
  return accountFetch<OnboardingStatusResponse>("/api/v1/profiles/onboarding/status");
}

export function completeOnboarding(payload: OnboardingCompletePayload) {
  return accountFetch<UserProfileResponse>("/api/v1/profiles/onboarding/complete", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchMyListings(filters?: {
  status?: ListingManagementStatus;
  module?: string;
  q?: string;
  sort?: "newest" | "oldest" | "views_desc" | "expires_soon";
}) {
  const params = new URLSearchParams();
  if (filters?.status) {
    params.set("status", filters.status);
  }
  if (filters?.module) {
    params.set("module", filters.module);
  }
  if (filters?.q) {
    params.set("q", filters.q);
  }
  if (filters?.sort) {
    params.set("sort", filters.sort);
  }
  const suffix = params.toString();
  return accountFetch<ListingManagementItem[]>(
    `/api/v1/listings/search/my${suffix ? `?${suffix}` : ""}`,
  );
}

export function fetchMyMonetizedListings() {
  return accountFetch<ListingManagementItem[]>("/api/v1/listings/my");
}

export async function createMonetizedListing(payload: MonetizedListingCreatePayload) {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${getAPIBaseURL()}/api/v1/listings/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  const parsed = raw ? JSON.parse(raw) : null;

  if (response.status === 402) {
    throw Object.assign(new Error(parsed?.detail?.message || "Payment required"), {
      code: "PAYMENT_REQUIRED",
      paywall: parsed?.detail as CreateListingPaywallError,
    });
  }

  if (!response.ok) {
    throw new Error(extractApiErrorMessage(parsed, `Request failed with status ${response.status}`));
  }

  return parsed as { listing: { id: number }; payment_required: boolean; required_product_code: string | null; message: string | null };
}

export function createBoostPromotion(listingId: number) {
  return accountFetch<PaymentCreateResponse>("/api/v1/promotions/boost", {
    method: "POST",
    body: JSON.stringify({ listing_id: listingId }),
  });
}

export function createFeaturedPromotion(listingId: number) {
  return accountFetch<PaymentCreateResponse>("/api/v1/promotions/featured", {
    method: "POST",
    body: JSON.stringify({ listing_id: listingId }),
  });
}

export function activateSubscription(payload: { plan: "starter" | "growth" | "pro"; business_slug: string }) {
  return accountFetch<PaymentCreateResponse>("/api/v1/subscriptions/activate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function archiveListing(listingId: number) {
  return accountFetch<{ id: number; status: ListingManagementStatus }>(
    `/api/v1/listings/${listingId}/archive`,
    { method: "POST" },
  );
}

export async function updateListing(listingId: number, payload: ListingUpdatePayload) {
  return accountFetch<ListingManagementItem>(`/api/v1/listings/${listingId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function renewListing(listingId: number) {
  return accountFetch<{ id: number; status: ListingManagementStatus }>(
    `/api/v1/listings/${listingId}/renew`,
    { method: "POST" },
  );
}

export async function boostListing(listingId: number) {
  return accountFetch<{ id: number; status: ListingManagementStatus }>(
    `/api/v1/listings/${listingId}/boost`,
    { method: "POST" },
  );
}

export async function submitListing(listingId: number) {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${getAPIBaseURL()}/api/v1/listings/${listingId}/submit`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const raw = await response.text();
  const parsed = raw ? JSON.parse(raw) : null;

  if (response.status === 402) {
    throw Object.assign(new Error(parsed?.detail?.message || "Payment required"), {
      code: "PAYMENT_REQUIRED",
      paywall: parsed?.detail as CreateListingPaywallError,
    });
  }

  if (!response.ok) {
    throw new Error(extractApiErrorMessage(parsed, `Request failed with status ${response.status}`));
  }

  return parsed as { id: number; status: ListingManagementStatus };
}

export async function duplicateListing(listingId: number) {
  return accountFetch<{ id: number }>(`/api/v1/listings/${listingId}/duplicate`, {
    method: "POST",
  });
}

export async function deleteListing(listingId: number) {
  return accountFetch<void>(`/api/v1/listings/${listingId}`, {
    method: "DELETE",
  });
}

export function fetchModerationQueue(filters?: {
  status?: "moderation_pending" | "rejected" | "all";
  module?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.status) {
    params.set("status", filters.status);
  }
  if (filters?.module) {
    params.set("module", filters.module);
  }
  if (filters?.q) {
    params.set("q", filters.q);
  }
  if (typeof filters?.limit === "number") {
    params.set("limit", String(filters.limit));
  }
  if (typeof filters?.offset === "number") {
    params.set("offset", String(filters.offset));
  }
  const suffix = params.toString();
  return accountFetch<AdminPagedResponse<ListingManagementItem>>(
    `/api/v1/admin/listings/moderation-queue${suffix ? `?${suffix}` : ""}`,
  );
}

export function fetchAdminListings(filters?: {
  status?: ListingManagementStatus | "all";
  module?: string;
  ownerType?: string;
  q?: string;
  sort?: "newest" | "oldest" | "views_desc" | "expires_soon";
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters?.module) {
    params.set("module", filters.module);
  }
  if (filters?.ownerType) {
    params.set("owner_type", filters.ownerType);
  }
  if (filters?.q) {
    params.set("q", filters.q);
  }
  if (filters?.sort) {
    params.set("sort", filters.sort);
  }
  if (typeof filters?.limit === "number") {
    params.set("limit", String(filters.limit));
  }
  if (typeof filters?.offset === "number") {
    params.set("offset", String(filters.offset));
  }
  const suffix = params.toString();
  return accountFetch<AdminPagedResponse<ListingManagementItem>>(`/api/v1/admin/listings/catalog${suffix ? `?${suffix}` : ""}`);
}

export function fetchModerationAuditTrail(listingId: number, limit = 20) {
  return accountFetch<ModerationAuditItem[]>(`/api/v1/admin/listings/${listingId}/audit?limit=${limit}`);
}

export function moderateListing(listingId: number, payload: ListingModerationPayload) {
  return accountFetch<{ id: number; status: ListingManagementStatus }>(
    `/api/v1/admin/listings/${listingId}/moderate`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function fetchAdminOverview() {
  return accountFetch<AdminOverviewResponse>("/api/v1/admin/overview");
}

export function fetchAdminReports(filters?: {
  status?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters?.q) {
    params.set("q", filters.q);
  }
  if (typeof filters?.limit === "number") {
    params.set("limit", String(filters.limit));
  }
  if (typeof filters?.offset === "number") {
    params.set("offset", String(filters.offset));
  }
  const suffix = params.toString();
  return accountFetch<AdminPagedResponse<AdminReportItem>>(`/api/v1/admin/reports${suffix ? `?${suffix}` : ""}`);
}

export function reviewAdminReport(reportId: number, payload: AdminReportReviewPayload) {
  return accountFetch<AdminReportItem>(`/api/v1/admin/reports/${reportId}/review`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchAdminBillingPayments(filters?: {
  status?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters?.q) {
    params.set("q", filters.q);
  }
  if (typeof filters?.limit === "number") {
    params.set("limit", String(filters.limit));
  }
  if (typeof filters?.offset === "number") {
    params.set("offset", String(filters.offset));
  }
  const suffix = params.toString();
  return accountFetch<AdminPagedResponse<AdminBillingPaymentItem>>(`/api/v1/admin/billing/payments${suffix ? `?${suffix}` : ""}`);
}

export function overrideAdminBillingPayment(paymentId: number, payload: AdminBillingPaymentOverridePayload) {
  return accountFetch<BillingHistoryItem>(`/api/v1/admin/billing/payments/${paymentId}/override`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchAdminUsers(filters?: {
  role?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.role && filters.role !== "all") {
    params.set("role", filters.role);
  }
  if (filters?.q) {
    params.set("q", filters.q);
  }
  if (typeof filters?.limit === "number") {
    params.set("limit", String(filters.limit));
  }
  if (typeof filters?.offset === "number") {
    params.set("offset", String(filters.offset));
  }
  const suffix = params.toString();
  return accountFetch<AdminPagedResponse<AdminUserItem>>(`/api/v1/admin/users${suffix ? `?${suffix}` : ""}`);
}

export function updateAdminUserRole(userId: string, payload: AdminUserRoleUpdatePayload) {
  return accountFetch<AdminUserItem>(`/api/v1/admin/users/${userId}/role`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function runAdminExpirationJobs(asOf?: string) {
  const suffix = asOf ? `?as_of=${encodeURIComponent(asOf)}` : "";
  return accountFetch<AdminExpirationRunResponse>(`/api/v1/admin/monetization/run-expirations${suffix}`, {
    method: "POST",
  });
}

export function fetchMessagingInbox() {
  return accountFetch<MessagingInboxResponse>("/api/v1/messaging/inbox");
}

export function fetchMessagingConversation(otherUserId: string, listingId?: string | null) {
  const params = new URLSearchParams({ other_user_id: otherUserId });
  if (listingId) {
    params.set("listing_id", listingId);
  }
  return accountFetch<MessagingMessage[]>(`/api/v1/messaging/conversation?${params.toString()}`);
}

export function fetchMessagingConversationState(otherUserId: string, listingId?: string | null) {
  const params = new URLSearchParams({ other_user_id: otherUserId });
  if (listingId) {
    params.set("listing_id", listingId);
  }
  return accountFetch<MessagingConversationState>(`/api/v1/messaging/conversation-state?${params.toString()}`);
}

export function markMessagesRead(messageIds: number[]) {
  return accountFetch<{ marked_read: number }>("/api/v1/messaging/mark-read", {
    method: "POST",
    body: JSON.stringify({ message_ids: messageIds }),
  });
}

export function sendMessage(payload: SendMessagePayload) {
  return accountFetch<MessagingMessage>("/api/v1/messaging/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function blockMessagingUser(otherUserId: string, reason?: string) {
  return accountFetch<{ other_user_id: string; is_blocked: boolean; blocked_at: string | null }>(
    "/api/v1/messaging/block",
    {
      method: "POST",
      body: JSON.stringify({ other_user_id: otherUserId, reason }),
    },
  );
}

export function unblockMessagingUser(otherUserId: string) {
  return accountFetch<{ other_user_id: string; is_blocked: boolean; blocked_at: string | null }>(
    `/api/v1/messaging/block/${encodeURIComponent(otherUserId)}`,
    { method: "DELETE" },
  );
}

export function reportMessagingUser(payload: ReportMessagingUserPayload) {
  return accountFetch<{ id: number; other_user_id: string; status: string; reason: string; created_at: string }>(
    "/api/v1/messaging/report",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function fetchMyBusinessProfiles() {
  return accountFetch<BusinessProfileResponse[]>("/api/v1/profiles/business/user/my");
}

export function createBusinessProfile(payload: BusinessProfilePayload) {
  return accountFetch<BusinessProfileResponse>("/api/v1/profiles/business", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateBusinessProfile(slug: string, payload: BusinessProfilePayload) {
  return accountFetch<BusinessProfileResponse>(`/api/v1/profiles/business/${slug}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function requestBusinessVerification(slug: string, payload: BusinessVerificationPayload) {
  return accountFetch<BusinessProfileResponse>(`/api/v1/profiles/business/${slug}/verify-request`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function requestBusinessSubscription(slug: string, payload: BusinessSubscriptionPayload) {
  return accountFetch<BusinessProfileResponse>(`/api/v1/profiles/business/${slug}/subscription-request`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
