import { expect, test, type Route } from "@playwright/test";

function json(route: Route, payload: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

test("pricing page renders backend product catalog values instead of hardcoded frontend prices", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("uahab-locale", "en");
    window.localStorage.removeItem("auth_token");
  });

  await page.route("**/api/config", async (route) => {
    await json(route, { API_BASE_URL: "http://127.0.0.1:8000" });
  });

  await page.route("**/api/v1/billing/products", async (route) => {
    await json(route, [
      { code: "listing_free", title: "Free", description: "Go live for 5 days.", category: "listing_trial", target_type: "listing", amount: 0, currency: "eur", duration_days: 5, listing_quota: 1, is_recurring: false },
      { code: "listing_basic", title: "Basic listing", description: "Stay live for 11 days.", category: "listing_purchase", target_type: "listing", amount: 3.49, currency: "eur", duration_days: 11, listing_quota: null, is_recurring: false },
      { code: "promotion_boost", title: "Boost", description: "Your listing appears first for 4 days.", category: "listing_promotion", target_type: "listing", amount: 7.25, currency: "eur", duration_days: 4, listing_quota: null, is_recurring: false },
      { code: "promotion_featured", title: "Featured", description: "Show at the top for 9 days.", category: "listing_promotion", target_type: "listing", amount: 12.5, currency: "eur", duration_days: 9, listing_quota: null, is_recurring: false },
      { code: "business_starter", title: "Starter", description: "Publish up to 6 listings.", category: "business_subscription", target_type: "business_profile", amount: 15, currency: "eur", duration_days: 30, listing_quota: 6, is_recurring: true },
      { code: "business_growth", title: "Growth", description: "Priority placement for up to 33 listings.", category: "business_subscription", target_type: "business_profile", amount: 31, currency: "eur", duration_days: 30, listing_quota: 33, is_recurring: true },
      { code: "business_pro", title: "Pro", description: "Unlimited publishing with top visibility.", category: "business_subscription", target_type: "business_profile", amount: 77, currency: "eur", duration_days: 30, listing_quota: null, is_recurring: true },
    ]);
  });

  await page.goto("/pricing");

  await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible();
  await expect(page.getByText("Go live for 5 days.")).toBeVisible();
  await expect(page.getByText("€3.49")).toBeVisible();
  await expect(page.getByText("€7.25")).toBeVisible();
  await expect(page.getByText("€12.50")).toBeVisible();

  await page.getByRole("button", { name: "Business" }).click();
  await expect(page.getByText("€31")).toBeVisible();
  await expect(page.getByText("Publish up to 6 listings.")).toBeVisible();
  await expect(page.getByText("Priority placement for up to 33 listings.")).toBeVisible();
  await expect(page.getByText("€77")).toBeVisible();
});
