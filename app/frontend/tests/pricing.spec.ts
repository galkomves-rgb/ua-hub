import { expect, test, type Page, type Route } from "@playwright/test";

function json(route: Route, payload: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

async function openPricing(page: Page, locale: "ua" | "en" | "es") {
  await page.route("**/api/config", async (route) => {
    await json(route, { API_BASE_URL: "http://127.0.0.1:8000" });
  });

  await page.addInitScript((selectedLocale) => {
    window.localStorage.setItem("uahab-locale", selectedLocale);
    window.localStorage.removeItem("auth_token");
  }, locale);
  await page.goto("/pricing");
  await page.evaluate((selectedLocale) => {
    window.localStorage.setItem("uahab-locale", selectedLocale);
    window.localStorage.removeItem("auth_token");
  }, locale);
  await page.reload();
}

test("pricing page renders all three launch segments and individuals pricing logic", async ({ page }) => {
  await openPricing(page, "en");

  await expect(page.getByRole("button", { name: "For individuals" })).toBeVisible();
  await expect(page.getByRole("button", { name: "For professionals & business" })).toBeVisible();
  await expect(page.getByRole("button", { name: "For agencies" })).toBeVisible();
  await expect(page.getByText("Free when you are looking. Paid when you sell, rent out, or want more visibility.")).toBeVisible();

  await expect(page.getByRole("heading", { name: "Always free" })).toBeVisible();
  await expect(page.getByText("7 days free", { exact: true })).toBeVisible();
  await expect(page.getByText("Then €3.99 to complete the 30-day period", { exact: true })).toBeVisible();
  await expect(page.getByText("Next listings €4.99 / 30 days", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Boost", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Featured", exact: true })).toBeVisible();
});

test("pricing page shows exactly two business plans and three agency plans", async ({ page }) => {
  await openPricing(page, "en");

  await page.getByRole("button", { name: "For professionals & business" }).click();
  await expect(page.getByText("Plans for a stable presence of your service or business on the platform.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Business Presence" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Business Priority" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Business Presence" })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Business Priority" })).toHaveCount(1);
  const businessPresenceCard = page.getByRole("radio").filter({ has: page.getByRole("heading", { name: "Business Presence" }) });
  const businessPriorityCard = page.getByRole("radio").filter({ has: page.getByRole("heading", { name: "Business Priority" }) });
  await expect(businessPriorityCard).toHaveAttribute("aria-checked", "true");
  await expect(businessPresenceCard).toHaveAttribute("aria-checked", "false");
  await businessPresenceCard.click();
  await expect(businessPresenceCard).toHaveAttribute("aria-checked", "true");
  await expect(businessPriorityCard).toHaveAttribute("aria-checked", "false");

  await page.getByRole("button", { name: "For agencies" }).click();
  await expect(page.getByText("Plans for agencies that need to publish multiple active properties.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Agency Starter" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Agency Growth" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Agency Pro" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Agency Starter" })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Agency Growth" })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Agency Pro" })).toHaveCount(1);
  const agencyGrowthCard = page.getByRole("radio").filter({ has: page.getByRole("heading", { name: "Agency Growth" }) });
  const agencyStarterCard = page.getByRole("radio").filter({ has: page.getByRole("heading", { name: "Agency Starter" }) });
  await expect(agencyGrowthCard).toHaveAttribute("aria-checked", "true");
  await agencyStarterCard.click();
  await expect(agencyStarterCard).toHaveAttribute("aria-checked", "true");
  await expect(agencyGrowthCard).toHaveAttribute("aria-checked", "false");
});

test("pricing page major copy follows the selected locale without mixed-language fragments", async ({ page }) => {
  await openPricing(page, "ua");
  await expect(page.getByRole("button", { name: "Для людей" })).toBeVisible();
  await expect(page.getByText("Безкоштовно — коли ви шукаєте. Платно — коли продаєте, здаєте або хочете більше видимості.")).toBeVisible();
  await expect(page.getByText("Завжди безкоштовно")).toBeVisible();
  await expect(page.getByText("7 днів безкоштовно", { exact: true })).toBeVisible();
  await expect(page.getByText("Потім €3.99 до завершення 30 днів", { exact: true })).toBeVisible();
  await expect(page.getByText("Next listings €4.99 / 30 days")).toHaveCount(0);

  await openPricing(page, "es");
  await expect(page.getByRole("button", { name: "Para personas" })).toBeVisible();
  await expect(page.getByText("Gratis cuando buscas. De pago cuando vendes, alquilas o quieres más visibilidad.")).toBeVisible();
  await expect(page.getByText("Siempre gratis")).toBeVisible();
  await expect(page.getByText("7 días gratis", { exact: true })).toBeVisible();
  await expect(page.getByText("Después €3.99 para completar los 30 días", { exact: true })).toBeVisible();
  await expect(page.getByText("7 days free")).toHaveCount(0);
});
