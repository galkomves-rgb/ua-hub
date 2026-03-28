import { getAPIBaseURL } from "@/lib/config";

export interface PublicListingRecord {
  id: number;
  user_id: string;
  author_name?: string | null;
  author_avatar_url?: string | null;
  module: string;
  category: string;
  subcategory: string | null;
  title: string;
  description: string;
  price: string | null;
  currency: string;
  city: string;
  region: string | null;
  owner_type: "private_user" | "business_profile" | "organization";
  owner_id: string;
  badges: string | null;
  images_json: string;
  meta_json: string;
  status: string;
  is_featured: boolean;
  is_promoted: boolean;
  is_verified: boolean;
  moderation_reason: string | null;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface PublicListingCardData {
  id: string;
  rawId: number;
  userId: string;
  authorName?: string;
  authorAvatarUrl?: string;
  module: string;
  category: string;
  subcategory?: string;
  title: string;
  description: string;
  price?: string;
  currency?: string;
  city: string;
  region?: string;
  ownerType: "private_user" | "business_profile" | "organization";
  ownerId: string;
  badges: string[];
  images: string[];
  image?: string;
  meta: Record<string, string>;
  status: string;
  isFeatured: boolean;
  isPromoted: boolean;
  isVerified: boolean;
  moderationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  date?: string;
  mapsUrl?: string;
}

function parseJsonObject(rawValue: string | null | undefined): Record<string, string> {
  if (!rawValue) {
    return {};
  }
  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.entries(parsed).reduce<Record<string, string>>((accumulator, [key, value]) => {
      if (typeof value === "string") {
        accumulator[key] = value;
      }
      return accumulator;
    }, {});
  } catch {
    return {};
  }
}

function parseJsonArray(rawValue: string | null | undefined): string[] {
  if (!rawValue) {
    return [];
  }
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function formatCreatedDate(value: string): string {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString().slice(0, 10);
}

export function mapPublicListing(record: PublicListingRecord): PublicListingCardData {
  const meta = parseJsonObject(record.meta_json);
  const images = parseJsonArray(record.images_json);
  const badges = parseJsonArray(record.badges);
  const mapsUrl = meta.google_maps_url || meta.maps_url || meta.location_url;

  return {
    id: String(record.id),
    rawId: record.id,
    userId: record.user_id,
    authorName: record.author_name ?? undefined,
    authorAvatarUrl: record.author_avatar_url ?? undefined,
    module: record.module,
    category: record.category,
    subcategory: record.subcategory ?? undefined,
    title: record.title,
    description: record.description,
    price: record.price ?? undefined,
    currency: record.currency,
    city: record.city,
    region: record.region ?? undefined,
    ownerType: record.owner_type,
    ownerId: record.owner_id,
    badges,
    images,
    image: images[0],
    meta,
    status: record.status,
    isFeatured: record.is_featured,
    isPromoted: record.is_promoted,
    isVerified: record.is_verified,
    moderationReason: record.moderation_reason,
    createdAt: formatCreatedDate(record.created_at),
    updatedAt: record.updated_at,
    date: meta.event_date || meta.date,
    mapsUrl,
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

export async function fetchPublicListings(filters?: {
  module?: string;
  category?: string;
  city?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.module) {
    params.set("module", filters.module);
  }
  if (filters?.category) {
    params.set("category", filters.category);
  }
  if (filters?.city) {
    params.set("city", filters.city);
  }
  params.set("limit", String(filters?.limit ?? 100));
  params.set("offset", String(filters?.offset ?? 0));

  const response = await publicFetch<{ items: PublicListingRecord[] }>(`/api/v1/listings?${params.toString()}`);
  return response.items.map(mapPublicListing);
}

export async function fetchPublicListing(listingId: number) {
  const response = await publicFetch<PublicListingRecord>(`/api/v1/listings/${listingId}?record_view=false`);
  return mapPublicListing(response);
}

export async function fetchPublicBusinessListings(slug: string, filters?: {
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  params.set("limit", String(filters?.limit ?? 50));
  params.set("offset", String(filters?.offset ?? 0));

  const response = await publicFetch<PublicListingRecord[]>(`/api/v1/listings/business/${slug}?${params.toString()}`);
  return response.map(mapPublicListing);
}
