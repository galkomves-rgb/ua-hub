import { getAPIBaseURL } from "@/lib/config";

export type CitySuggestion = {
  name: string;
  region: string | null;
  country: string | null;
  country_code: string | null;
  postal_code: string | null;
  display_name: string;
  latitude: number | null;
  longitude: number | null;
};

type FetchCitySuggestionsOptions = {
  limit?: number;
  countryCode?: string;
  language?: string;
};

export async function fetchCitySuggestions(
  query: string,
  options: FetchCitySuggestionsOptions = {},
): Promise<CitySuggestion[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) {
    return [];
  }

  const params = new URLSearchParams({
    q: normalizedQuery,
    limit: String(options.limit ?? 8),
  });

  if (options.countryCode?.trim()) {
    params.set("country_code", options.countryCode.trim());
  }

  if (options.language?.trim()) {
    params.set("language", options.language.trim());
  }

  const response = await fetch(`${getAPIBaseURL()}/api/v1/locations/cities/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error("CITY_LOOKUP_FAILED");
  }

  return response.json();
}