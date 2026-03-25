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

export interface UserProfileResponse {
  user_id: string;
  name: string;
  avatar_url: string | null;
  city: string;
  bio: string;
  preferred_language: "ua" | "es" | "en";
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
  avatar_url: string | null;
  is_public_profile?: boolean;
  show_as_public_author?: boolean;
  allow_marketing_emails?: boolean;
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
  is_featured: boolean;
  is_promoted: boolean;
  is_verified: boolean;
}

export interface MessagingConversationSummary {
  other_user_id: string;
  listing_id: string | null;
  listing_title: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  is_sender: boolean;
}

export interface MessagingInboxResponse {
  conversations: MessagingConversationSummary[];
  total_unread: number;
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
  subscription_plan: string | null;
  listing_quota: number | null;
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

export function fetchMyListings(status?: ListingManagementStatus) {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
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
