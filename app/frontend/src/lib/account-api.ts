import { getAPIBaseURL } from "@/lib/config";

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

export interface ListingManagementItem {
  id: number;
  title: string;
  module: string;
  category: string;
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
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${getAPIBaseURL()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  if (response.status === 404) {
    throw new Error(options?.notFoundError || "NOT_FOUND");
  }

  if (!response.ok) {
    let detail = "Request failed";
    try {
      const data = await response.json();
      if (typeof data?.detail === "string") {
        detail = data.detail;
      }
    } catch {
      // Keep generic message
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export function fetchAccountDashboard() {
  return accountFetch<AccountDashboardResponse>("/api/v1/account/dashboard");
}

export function fetchSavedListings() {
  return accountFetch<SavedListingCard[]>("/api/v1/saved/listings");
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

export function fetchBillingHistory(limit = 100) {
  return accountFetch<BillingHistoryItem[]>(`/api/v1/billing/history?limit=${limit}`);
}

export function createBillingCheckout(payload: BillingCheckoutPayload) {
  return accountFetch<BillingCheckoutResponse>("/api/v1/billing/checkout", {
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

export async function archiveListing(listingId: number) {
  return accountFetch<{ id: number; status: ListingManagementStatus }>(
    `/api/v1/listings/${listingId}/archive`,
    { method: "POST" },
  );
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
  return accountFetch<{ id: number; status: ListingManagementStatus }>(
    `/api/v1/listings/${listingId}/submit`,
    { method: "POST" },
  );
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
