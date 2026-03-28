import { getAPIBaseURL } from "@/lib/config";
import type { BusinessProfile } from "@/lib/platform";

interface PublicBusinessRecord {
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
  website: string | null;
  is_verified: boolean;
  is_premium: boolean;
  active_listings_count?: number;
  rating?: string | null;
  google_maps_rating?: string | number | null;
  google_maps_rating_source?: string | null;
  created_at: string;
  updated_at: string;
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

function parseStrictGoogleRating(
  record: PublicBusinessRecord,
): { googleMapsRating?: number; googleMapsRatingSource?: string } {
  const source = record.google_maps_rating_source?.trim();
  if (!source) {
    return {};
  }

  const numeric = typeof record.google_maps_rating === "number"
    ? record.google_maps_rating
    : Number(record.google_maps_rating ?? "");

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return {};
  }

  return {
    googleMapsRating: Number(numeric.toFixed(1)),
    googleMapsRatingSource: source,
  };
}

export function mapPublicBusiness(record: PublicBusinessRecord): BusinessProfile {
  const contacts = parseJsonObject(record.contacts_json);
  const tags = parseJsonArray(record.tags_json);
  const { googleMapsRating, googleMapsRatingSource } = parseStrictGoogleRating(record);

  return {
    id: record.slug,
    ownerUserId: record.owner_user_id,
    slug: record.slug,
    name: record.name,
    logo: record.logo_url ?? undefined,
    cover: record.cover_url ?? undefined,
    category: record.category,
    city: record.city,
    description: record.description,
    contacts: {
      phone: contacts.phone,
      email: contacts.email,
      website: contacts.website ?? record.website ?? undefined,
    },
    isVerified: Boolean(record.is_verified),
    isPremium: Boolean(record.is_premium),
    tags,
    activeListingsCount: Number(record.active_listings_count ?? 0),
    googleMapsRating,
    googleMapsRatingSource,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
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
  params.set("limit", String(filters?.limit ?? 100));
  params.set("offset", String(filters?.offset ?? 0));

  const response = await publicFetch<{ items: PublicBusinessRecord[] }>(`/api/v1/profiles/business?${params.toString()}`);
  return response.items.map(mapPublicBusiness);
}

export async function fetchPublicBusinessBySlug(slug: string) {
  const response = await publicFetch<PublicBusinessRecord>(`/api/v1/profiles/business/${encodeURIComponent(slug)}`);
  return mapPublicBusiness(response);
}
