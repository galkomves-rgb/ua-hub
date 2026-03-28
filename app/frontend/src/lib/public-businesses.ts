import { getAPIBaseURL } from "@/lib/config";

export interface PublicBusinessRecord {
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

export interface PublicBusinessCardData {
  id: string;
  slug: string;
  business_name: string;
  category: string;
  city: string;
  description: string;
  logo_url: string | null;
  cover_url: string | null;
  is_verified: boolean;
  is_premium: boolean;
  verification_status: string;
  subscription_plan: string | null;
  listing_quota: number | null;
  active_listings_count: number;
  total_views_count: number;
  saved_by_users_count: number;
  google_place_id: string | null;
  google_maps_rating: string | null;
  google_maps_review_count: number | null;
  google_maps_rating_updated_at: string | null;
}

function mapPublicBusiness(record: PublicBusinessRecord): PublicBusinessCardData {
  return {
    id: record.slug,
    slug: record.slug,
    business_name: record.name,
    category: record.category,
    city: record.city,
    description: record.description,
    logo_url: record.logo_url,
    cover_url: record.cover_url,
    is_verified: record.is_verified,
    is_premium: record.is_premium,
    verification_status: record.verification_status,
    subscription_plan: record.subscription_plan,
    listing_quota: record.listing_quota,
    active_listings_count: record.active_listings_count,
    total_views_count: record.total_views_count,
    saved_by_users_count: record.saved_by_users_count,
    google_place_id: record.google_place_id,
    google_maps_rating: record.google_maps_rating,
    google_maps_review_count: record.google_maps_review_count,
    google_maps_rating_updated_at: record.google_maps_rating_updated_at,
  };
}

async function publicFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${getAPIBaseURL()}${path}`);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchPublicBusinesses(filters?: {
  category?: string;
  city?: string;
  isVerified?: boolean;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.category) {
    params.set("category", filters.category);
  }
  if (filters?.city) {
    params.set("city", filters.city);
  }
  if (typeof filters?.isVerified === "boolean") {
    params.set("is_verified", String(filters.isVerified));
  }
  params.set("limit", String(filters?.limit ?? 50));
  params.set("offset", String(filters?.offset ?? 0));

  const response = await publicFetch<{ items: PublicBusinessRecord[] }>(`/api/v1/profiles/business?${params.toString()}`);
  return response.items.map(mapPublicBusiness);
}

export async function fetchPublicBusiness(slug: string) {
  const response = await publicFetch<PublicBusinessRecord>(`/api/v1/profiles/business/${slug}`);
  return mapPublicBusiness(response);
}
