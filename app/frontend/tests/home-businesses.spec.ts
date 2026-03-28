import { expect, test, type Page, type Route } from "@playwright/test";

function json(route: Route, payload: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

async function mockHomeApis(page: Page, businesses: Array<Record<string, unknown>>) {
  await page.route("**/api/config", async (route) => {
    await json(route, { API_BASE_URL: "http://127.0.0.1:8000" });
  });

  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await json(route, {
      google: false,
      apple: false,
      email_login: true,
      email_signup: true,
      phone: false,
      turnstile_enabled: false,
      email_confirmation_required: false,
      dev_auth_enabled: false,
    });
  });

  await page.route("**/api/v1/auth/me", async (route) => {
    await json(route, { detail: "Unauthorized" }, 401);
  });

  await page.route("**/api/v1/listings**", async (route) => {
    await json(route, { items: [] });
  });

  await page.route("**/api/v1/profiles/business**", async (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path.includes("/api/v1/profiles/business/")) {
      const slug = path.split("/").pop();
      const item = businesses.find((biz) => biz.slug === slug);
      if (!item) {
        await json(route, { detail: "Business profile not found" }, 404);
        return;
      }
      await json(route, item);
      return;
    }

    await json(route, { items: businesses });
  });
}

function makeBusiness(overrides: Partial<Record<string, unknown>>) {
  return {
    owner_user_id: "owner-1",
    slug: "real-biz-1",
    name: "Real Biz One",
    category: "Services",
    city: "Madrid",
    description: "Real backend business",
    logo_url: null,
    cover_url: null,
    contacts_json: JSON.stringify({ phone: "+34 600 000 001", email: "hello@realbiz.es", website: "https://realbiz.es" }),
    tags_json: JSON.stringify(["service"]),
    website: "https://realbiz.es",
    is_verified: true,
    is_premium: false,
    active_listings_count: 2,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
    ...overrides,
  };
}

test("homepage verified businesses uses backend data and shows Google Maps source label only when mapped", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("uahab-locale", "en");
    window.localStorage.removeItem("auth_token");
  });

  await mockHomeApis(page, [
    makeBusiness({
      slug: "real-biz-1",
      name: "Real Biz One",
      google_maps_rating: "4.8",
      google_maps_rating_source: "google_maps_place",
    }),
    makeBusiness({
      slug: "real-biz-2",
      name: "Real Biz Two",
      google_maps_rating: "4.5",
      google_maps_rating_source: null,
    }),
    makeBusiness({
      slug: "not-verified",
      name: "Not Verified",
      is_verified: false,
      google_maps_rating: "4.9",
      google_maps_rating_source: "google_maps_place",
    }),
  ]);

  await page.goto("/");

  const verifiedSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Verified businesses" }) }).first();
  await expect(verifiedSection.getByText("Real Biz One")).toBeVisible();
  await expect(verifiedSection.getByText("Real Biz Two")).toBeVisible();
  await expect(verifiedSection.getByText("Not Verified")).toHaveCount(0);
  await expect(verifiedSection.getByText("Google Maps rating")).toHaveCount(1);
  await expect(verifiedSection.getByRole("link", { name: "Show all" })).toHaveAttribute("href", "/business");
});

test("business directory renders real backend businesses instead of sample list", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("uahab-locale", "en");
    window.localStorage.removeItem("auth_token");
  });

  await mockHomeApis(page, [
    makeBusiness({ slug: "agency-1", name: "Agency One", is_verified: true, is_premium: true }),
    makeBusiness({ slug: "agency-2", name: "Agency Two", is_verified: false, is_premium: false }),
  ]);

  await page.goto("/business");

  await expect(page.getByText("Agency One")).toBeVisible();
  await expect(page.getByText("Agency Two")).toBeVisible();
  await expect(page.getByText("UA Translations")).toHaveCount(0);
});
