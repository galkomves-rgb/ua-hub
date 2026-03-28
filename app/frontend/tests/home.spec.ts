import { expect, test, type Page, type Route } from "@playwright/test";

function json(route: Route, payload: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

const baseListings = {
  total: 1,
  limit: 100,
  offset: 0,
  items: [
    {
      id: 501,
      user_id: "user-1",
      author_name: "Business Owner",
      author_avatar_url: null,
      module: "services",
      category: "translation",
      subcategory: null,
      title: "Certified translation service",
      description: "Official translations in Madrid",
      price: "45",
      currency: "EUR",
      city: "Madrid",
      region: null,
      owner_type: "business_profile",
      owner_id: "real-translations",
      badges: "[]",
      images_json: "[]",
      meta_json: "{}",
      status: "published",
      is_featured: true,
      is_promoted: false,
      is_verified: true,
      moderation_reason: null,
      views_count: 50,
      created_at: "2026-03-28T12:00:00.000Z",
      updated_at: "2026-03-28T12:00:00.000Z",
    },
  ],
};

async function openHome(
  page: Page,
  businesses: unknown[],
  locale: "ua" | "en" | "es" = "en",
) {
  await page.route("**/api/config", async (route) => {
    await json(route, { API_BASE_URL: "http://127.0.0.1:8000" });
  });

  await page.route("**/api/v1/listings**", async (route) => {
    await json(route, baseListings);
  });

  await page.route("**/api/v1/profiles/business**", async (route) => {
    await json(route, {
      total: businesses.length,
      limit: 12,
      offset: 0,
      items: businesses,
    });
  });

  await page.addInitScript((selectedLocale) => {
    window.localStorage.setItem("uahab-locale", selectedLocale);
    window.localStorage.removeItem("auth_token");
  }, locale);

  await page.goto("/");
  await page.evaluate((selectedLocale) => {
    window.localStorage.setItem("uahab-locale", selectedLocale);
    window.localStorage.removeItem("auth_token");
  }, locale);
  await page.reload();
}

test("homepage verified businesses section uses backend business data and real directory target", async ({ page }) => {
  await openHome(page, [
    {
      owner_user_id: "user-1",
      slug: "real-translations",
      name: "Real Translations Madrid",
      category: "Translations",
      city: "Madrid",
      description: "Official translations and document support",
      logo_url: "https://example.com/logo.png",
      cover_url: null,
      contacts_json: "{}",
      tags_json: "[]",
      rating: "0",
      website: "https://translations.example.com",
      social_links_json: "[]",
      service_areas_json: "[]",
      is_verified: true,
      is_premium: true,
      verification_status: "verified",
      verification_requested_at: null,
      verification_notes: null,
      subscription_plan: "business_priority",
      subscription_request_status: null,
      subscription_requested_plan: null,
      subscription_requested_at: null,
      subscription_renewal_date: "2026-04-20T12:00:00.000Z",
      listing_quota: 1,
      active_listings_count: 2,
      total_views_count: 120,
      saved_by_users_count: 5,
      profile_completeness: 90,
      public_preview_url: "/business/real-translations",
      google_place_id: null,
      google_maps_rating: null,
      google_maps_review_count: null,
      google_maps_rating_updated_at: null,
      created_at: "2026-03-20T12:00:00.000Z",
      updated_at: "2026-03-28T12:00:00.000Z",
    },
  ]);

  await expect(page.getByRole("heading", { name: "Verified businesses" })).toBeVisible();
  await expect(page.getByText("Real Translations Madrid")).toBeVisible();
  await expect(page.getByText("UA Translations")).toHaveCount(0);
  await expect(page.locator('a[href="/business?type=verified"]')).toBeVisible();
});

test("homepage hides Google rating when official mapping is unavailable", async ({ page }) => {
  await openHome(page, [
    {
      owner_user_id: "user-1",
      slug: "real-legal",
      name: "Real Legal Barcelona",
      category: "Legal",
      city: "Barcelona",
      description: "Business law and immigration support",
      logo_url: null,
      cover_url: null,
      contacts_json: "{}",
      tags_json: "[]",
      rating: "4.9",
      website: null,
      social_links_json: "[]",
      service_areas_json: "[]",
      is_verified: true,
      is_premium: false,
      verification_status: "verified",
      verification_requested_at: null,
      verification_notes: null,
      subscription_plan: "business_presence",
      subscription_request_status: null,
      subscription_requested_plan: null,
      subscription_requested_at: null,
      subscription_renewal_date: "2026-04-20T12:00:00.000Z",
      listing_quota: 1,
      active_listings_count: 1,
      total_views_count: 40,
      saved_by_users_count: 1,
      profile_completeness: 80,
      public_preview_url: "/business/real-legal",
      google_place_id: null,
      google_maps_rating: null,
      google_maps_review_count: null,
      google_maps_rating_updated_at: null,
      created_at: "2026-03-20T12:00:00.000Z",
      updated_at: "2026-03-28T12:00:00.000Z",
    },
  ]);

  await expect(page.getByText("Google Maps rating")).toHaveCount(0);
  await expect(page.getByText("4.9")).toHaveCount(0);
});

test("homepage shows Google Maps rating only when official place mapping exists", async ({ page }) => {
  await openHome(page, [
    {
      owner_user_id: "user-1",
      slug: "real-restaurant",
      name: "Real Restaurant Valencia",
      category: "Restaurant",
      city: "Valencia",
      description: "Ukrainian cuisine in Valencia",
      logo_url: null,
      cover_url: null,
      contacts_json: "{}",
      tags_json: "[]",
      rating: "0",
      website: null,
      social_links_json: "[]",
      service_areas_json: "[]",
      is_verified: true,
      is_premium: true,
      verification_status: "verified",
      verification_requested_at: null,
      verification_notes: null,
      subscription_plan: "business_priority",
      subscription_request_status: null,
      subscription_requested_plan: null,
      subscription_requested_at: null,
      subscription_renewal_date: "2026-04-20T12:00:00.000Z",
      listing_quota: 1,
      active_listings_count: 3,
      total_views_count: 90,
      saved_by_users_count: 4,
      profile_completeness: 88,
      public_preview_url: "/business/real-restaurant",
      google_place_id: "place_123",
      google_maps_rating: "4.8",
      google_maps_review_count: 37,
      google_maps_rating_updated_at: "2026-03-28T12:00:00.000Z",
      created_at: "2026-03-20T12:00:00.000Z",
      updated_at: "2026-03-28T12:00:00.000Z",
    },
  ]);

  await expect(page.getByText("Google Maps rating")).toBeVisible();
  await expect(page.getByText("4.8 (37)")).toBeVisible();
});
