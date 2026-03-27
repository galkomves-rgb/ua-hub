import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from routers.locations import router as locations_router
from schemas.locations import CitySuggestionResponse
from services.location_service import LocationSearchService


@pytest.fixture
def api_client():
    test_app = FastAPI()
    test_app.include_router(locations_router)

    transport = ASGITransport(app=test_app)

    async def _factory():
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            yield client

    return _factory


@pytest.mark.asyncio
async def test_city_search_returns_normalized_results(monkeypatch, api_client):
    async def fake_search(self, *, query, limit=8, country_code=None, language=None):
        assert query == "28013"
        assert limit == 5
        assert country_code == "es"
        assert language == "uk"
        return [
            CitySuggestionResponse(
                name="Madrid",
                region="Comunidad de Madrid",
                country="Spain",
                country_code="ES",
                postal_code="28013",
                display_name="Madrid, Comunidad de Madrid, Spain, 28013",
                latitude=40.0,
                longitude=-3.0,
            )
        ]

    monkeypatch.setattr(LocationSearchService, "search_cities", fake_search)

    async for client in api_client():
        response = await client.get("/api/v1/locations/cities/search", params={"q": "28013", "limit": 5, "country_code": "es", "language": "uk"})

    assert response.status_code == 200
    assert response.json() == [
        {
            "name": "Madrid",
            "region": "Comunidad de Madrid",
            "country": "Spain",
            "country_code": "ES",
            "postal_code": "28013",
            "display_name": "Madrid, Comunidad de Madrid, Spain, 28013",
            "latitude": 40.0,
            "longitude": -3.0,
        }
    ]


def test_location_service_normalizes_city_payload():
    service = LocationSearchService()

    results = service._normalize_results(
        [
            {
                "lat": "40.4167",
                "lon": "-3.70325",
                "importance": 0.9,
                "display_name": "Madrid, Comunidad de Madrid, Spain",
                "address": {
                    "city": "Madrid",
                    "state": "Comunidad de Madrid",
                    "country": "Spain",
                    "country_code": "es",
                    "postcode": "28013",
                },
            },
            {
                "lat": "40.4167",
                "lon": "-3.70325",
                "importance": 0.4,
                "display_name": "Madrid, Comunidad de Madrid, Spain",
                "address": {
                    "city": "Madrid",
                    "state": "Comunidad de Madrid",
                    "country": "Spain",
                    "country_code": "es",
                    "postcode": "28013",
                },
            },
        ],
        preferred_country_code="es",
    )

    assert len(results) == 1
    assert results[0].name == "Madrid"
    assert results[0].country_code == "ES"
    assert results[0].postal_code == "28013"