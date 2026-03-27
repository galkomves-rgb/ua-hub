import logging
from typing import Any

import httpx

from core.config import settings
from schemas.locations import CitySuggestionResponse

logger = logging.getLogger(__name__)

CITY_KEYS = (
    "city",
    "town",
    "village",
    "municipality",
    "hamlet",
    "county",
    "state_district",
)

REGION_KEYS = ("state", "region", "county", "province", "state_district")


class LocationSearchService:
    async def search_cities(
        self,
        *,
        query: str,
        limit: int = 8,
        country_code: str | None = None,
        language: str | None = None,
    ) -> list[CitySuggestionResponse]:
        normalized_query = query.strip()
        if len(normalized_query) < 2:
            return []

        params = {
            "q": normalized_query,
            "format": "jsonv2",
            "addressdetails": 1,
            "limit": max(1, min(limit, 12)),
        }
        if country_code:
            params["countrycodes"] = country_code.lower()
        if settings.geocoding_contact_email:
            params["email"] = settings.geocoding_contact_email

        headers = {"User-Agent": settings.geocoding_user_agent}
        if language:
            headers["Accept-Language"] = language

        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, headers=headers) as client:
            response = await client.get(settings.geocoding_search_url, params=params)
            response.raise_for_status()
            payload = response.json()

        return self._normalize_results(payload, preferred_country_code=country_code)

    def _normalize_results(
        self,
        payload: list[dict[str, Any]],
        *,
        preferred_country_code: str | None = None,
    ) -> list[CitySuggestionResponse]:
        suggestions: list[CitySuggestionResponse] = []
        seen: set[tuple[str, str, str, str]] = set()
        preferred_country = preferred_country_code.lower() if preferred_country_code else None

        sorted_payload = sorted(
            payload,
            key=lambda item: (
                0 if (item.get("address", {}).get("country_code") or "").lower() == preferred_country else 1,
                -float(item.get("importance") or 0),
            ),
        )

        for item in sorted_payload:
            address = item.get("address") or {}
            name = self._extract_city_name(address, item)
            if not name:
                continue

            region = self._extract_region(address)
            country = address.get("country") or None
            country_code = (address.get("country_code") or "").upper() or None
            postal_code = address.get("postcode") or None
            display_name = item.get("display_name") or self._compose_display_name(name, region, country, postal_code)

            dedupe_key = (
                name.casefold(),
                (region or "").casefold(),
                (country or "").casefold(),
                postal_code or "",
            )
            if dedupe_key in seen:
                continue

            seen.add(dedupe_key)
            suggestions.append(
                CitySuggestionResponse(
                    name=name,
                    region=region,
                    country=country,
                    country_code=country_code,
                    postal_code=postal_code,
                    display_name=display_name,
                    latitude=self._to_float(item.get("lat")),
                    longitude=self._to_float(item.get("lon")),
                )
            )

        return suggestions

    def _extract_city_name(self, address: dict[str, Any], item: dict[str, Any]) -> str | None:
        for key in CITY_KEYS:
            value = address.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

        name = item.get("name") or item.get("display_name")
        if not isinstance(name, str) or not name.strip():
            return None
        return name.split(",", 1)[0].strip() or None

    def _extract_region(self, address: dict[str, Any]) -> str | None:
        for key in REGION_KEYS:
            value = address.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return None

    def _compose_display_name(
        self,
        name: str,
        region: str | None,
        country: str | None,
        postal_code: str | None,
    ) -> str:
        parts = [name]
        if region and region.casefold() != name.casefold():
          parts.append(region)
        if country:
          parts.append(country)
        if postal_code:
          parts.append(postal_code)
        return ", ".join(parts)

    def _to_float(self, value: Any) -> float | None:
        try:
            return float(value)
        except (TypeError, ValueError):
            return None
