import { expect, test, type Page, type Route } from "@playwright/test";

type MockOptions = {
  authenticated?: boolean;
  onboardingCompleted?: boolean;
  profileExists?: boolean;
  myListings?: Array<{
    id: number;
    title: string;
    module: string;
    category: string;
    owner_type: string;
    pricing_tier: "free" | "basic" | "business";
    visibility: "standard" | "boosted" | "featured";
    ranking_score: number;
    status: "draft" | "moderation_pending" | "published" | "rejected" | "expired" | "archived" | "active";
    created_at: string;
    expires_at: string | null;
    views_count: number;
    unread_messages_count: number;
    saved_count: number;
    is_featured: boolean;
    is_promoted: boolean;
    is_verified: boolean;
    moderation_reason: string | null;
    badges: string | null;
    images_json: string | null;
  }>;
  paywalledSubmitListingIds?: number[];
  savedListings?: Array<{
    listing_id: number;
    title: string;
    city: string;
    price: string | null;
    module: string;
    saved_at: string;
    status: string | null;
    primary_image: string | null;
  }>;
};

function json(route: Route, payload: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

async function mockAccountApi(page: Page, options: MockOptions = {}) {
  const now = "2026-03-26T12:00:00.000Z";
  const user = {
    id: "user-1",
    email: "user@example.com",
    name: "Test User",
    role: "user",
  };

  let profile = options.profileExists
    ? {
        user_id: user.id,
        name: "Test User",
        avatar_url: null,
        city: "Madrid",
        bio: "Existing bio",
        preferred_language: "en",
        account_type: "private",
        onboarding_completed: true,
        is_public_profile: false,
        show_as_public_author: false,
        allow_marketing_emails: false,
        is_verified: false,
        created_at: now,
        updated_at: now,
      }
    : null;

  const myListings = [
    ...(options.myListings ?? [
      {
        id: 101,
        title: "Draft plumber profile",
        module: "services",
        category: "Home Services",
        owner_type: "private_user",
        pricing_tier: "free",
        visibility: "standard",
        ranking_score: 2,
        status: "draft",
        created_at: now,
        expires_at: null,
        views_count: 12,
        unread_messages_count: 1,
        saved_count: 3,
        is_featured: false,
        is_promoted: false,
        is_verified: false,
        moderation_reason: null,
        badges: null,
        images_json: "[]",
      },
      {
        id: 102,
        title: "Published apartment in Malaga",
        module: "housing",
        category: "Apartments",
        owner_type: "private_user",
        pricing_tier: "basic",
        visibility: "featured",
        ranking_score: 7,
        status: "published",
        created_at: now,
        expires_at: "2026-04-05T12:00:00.000Z",
        views_count: 40,
        unread_messages_count: 2,
        saved_count: 8,
        is_featured: true,
        is_promoted: false,
        is_verified: false,
        moderation_reason: null,
        badges: null,
        images_json: "[]",
      },
      {
        id: 103,
        title: "Expired legal consultation",
        module: "services",
        category: "Legal",
        owner_type: "private_user",
        pricing_tier: "free",
        visibility: "standard",
        ranking_score: 1,
        status: "expired",
        created_at: now,
        expires_at: "2026-03-01T12:00:00.000Z",
        views_count: 6,
        unread_messages_count: 0,
        saved_count: 1,
        is_featured: false,
        is_promoted: false,
        is_verified: false,
        moderation_reason: null,
        badges: null,
        images_json: "[]",
      },
      {
        id: 104,
        title: "Rejected translator profile",
        module: "services",
        category: "Translation",
        owner_type: "private_user",
        pricing_tier: "basic",
        visibility: "standard",
        ranking_score: 0,
        status: "rejected",
        created_at: now,
        expires_at: null,
        views_count: 4,
        unread_messages_count: 0,
        saved_count: 0,
        is_featured: false,
        is_promoted: false,
        is_verified: false,
        moderation_reason: "Add more details",
        badges: null,
        images_json: "[]",
      },
    ]),
  ];
  const paywalledSubmitListingIds = new Set(options.paywalledSubmitListingIds ?? []);

  const savedListings = [
    ...(options.savedListings ?? [
      {
        listing_id: 77,
        title: "Painter in Valencia",
        city: "Valencia",
        price: "120 EUR",
        module: "services",
        saved_at: now,
        status: "published",
        primary_image: null,
      },
    ]),
  ];

  await page.addInitScript(({ authenticated }) => {
    window.localStorage.setItem("uahab-locale", "en");
    if (authenticated) {
      window.localStorage.setItem("auth_token", "test-token");
    } else {
      window.localStorage.removeItem("auth_token");
    }
    window.confirm = () => true;
  }, { authenticated: options.authenticated ?? false });

  await page.route("**/api/config", async (route) => {
    await json(route, { API_BASE_URL: "http://127.0.0.1:8000" });
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/api/v1/auth/capabilities" && method === "GET") {
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
      return;
    }

    if (path === "/api/v1/auth/me" && method === "GET") {
      if (!options.authenticated) {
        await json(route, { detail: "Unauthorized" }, 401);
        return;
      }
      await json(route, user);
      return;
    }

    if (path === "/api/v1/profiles/onboarding/status" && method === "GET") {
      if (!options.authenticated) {
        await json(route, { detail: "Unauthorized" }, 401);
        return;
      }
      await json(route, {
        completed: options.onboardingCompleted ?? true,
        has_user_profile: Boolean(profile),
        has_business_profile: false,
        account_type: "private",
        next_step: (options.onboardingCompleted ?? true) ? "done" : "user_profile",
      });
      return;
    }

    if (path === "/api/v1/account/dashboard" && method === "GET") {
      await json(route, {
        active_listings_count: myListings.filter((item) => item.status === "published" || item.status === "active").length,
        draft_listings_count: myListings.filter((item) => item.status === "draft").length,
        saved_listings_count: savedListings.length,
        unread_messages_count: 3,
        business_profiles_count: 0,
        expiring_soon_count: 1,
        moderation_issues_count: 0,
      });
      return;
    }

    if (path === "/api/v1/profiles/user" && method === "GET") {
      if (!profile) {
        await json(route, { detail: "User profile not found" }, 404);
        return;
      }
      await json(route, profile);
      return;
    }

    if (path === "/api/v1/profiles/user" && method === "POST") {
      const body = request.postDataJSON() as Record<string, unknown>;
      profile = {
        user_id: user.id,
        name: String(body.name ?? ""),
        avatar_url: body.avatar_url ?? null,
        city: String(body.city ?? ""),
        bio: String(body.bio ?? ""),
        preferred_language: String(body.preferred_language ?? "en"),
        account_type: String(body.account_type ?? "private"),
        onboarding_completed: true,
        is_public_profile: Boolean(body.is_public_profile ?? false),
        show_as_public_author: Boolean(body.show_as_public_author ?? false),
        allow_marketing_emails: Boolean(body.allow_marketing_emails ?? false),
        is_verified: false,
        created_at: now,
        updated_at: now,
      };
      await json(route, profile, 200);
      return;
    }

    if (path === "/api/v1/profiles/user" && method === "PUT") {
      if (!profile) {
        await json(route, { detail: "User profile not found" }, 404);
        return;
      }

      const body = request.postDataJSON() as Record<string, unknown>;
      profile = {
        ...profile,
        name: body.name === undefined ? profile.name : String(body.name ?? ""),
        avatar_url: body.avatar_url === undefined ? profile.avatar_url : body.avatar_url ?? null,
        city: body.city === undefined ? profile.city : String(body.city ?? ""),
        bio: body.bio === undefined ? profile.bio : String(body.bio ?? ""),
        preferred_language:
          body.preferred_language === undefined
            ? profile.preferred_language
            : String(body.preferred_language ?? "en"),
        is_public_profile:
          body.is_public_profile === undefined
            ? profile.is_public_profile
            : Boolean(body.is_public_profile),
        show_as_public_author:
          body.show_as_public_author === undefined
            ? profile.show_as_public_author
            : Boolean(body.show_as_public_author),
        allow_marketing_emails:
          body.allow_marketing_emails === undefined
            ? profile.allow_marketing_emails
            : Boolean(body.allow_marketing_emails),
        updated_at: now,
      };
      await json(route, profile, 200);
      return;
    }

    if (path === "/api/v1/listings/search/my" && method === "GET") {
      const status = url.searchParams.get("status");
      const module = url.searchParams.get("module");
      const query = url.searchParams.get("q")?.toLowerCase() ?? "";
      const sort = url.searchParams.get("sort") ?? "newest";

      let filteredListings = [...myListings];

      if (status) {
        filteredListings = filteredListings.filter((item) => item.status === status);
      }
      if (module) {
        filteredListings = filteredListings.filter((item) => item.module === module);
      }
      if (query) {
        filteredListings = filteredListings.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query),
        );
      }

      filteredListings.sort((left, right) => {
        if (sort === "oldest") {
          return left.created_at.localeCompare(right.created_at);
        }
        if (sort === "views_desc") {
          return right.views_count - left.views_count;
        }
        if (sort === "expires_soon") {
          return (left.expires_at ?? "9999-12-31").localeCompare(right.expires_at ?? "9999-12-31");
        }
        return right.created_at.localeCompare(left.created_at);
      });

      await json(route, filteredListings);
      return;
    }

    if (/^\/api\/v1\/listings\/\d+\/archive$/.test(path) && method === "POST") {
      const listingId = Number(path.split("/")[4]);
      const listing = myListings.find((item) => item.id === listingId);
      if (!listing) {
        await json(route, { detail: "Listing not found" }, 404);
        return;
      }
      listing.status = "archived";
      await json(route, { id: listingId, status: "archived" });
      return;
    }

    if (/^\/api\/v1\/listings\/\d+\/renew$/.test(path) && method === "POST") {
      const listingId = Number(path.split("/")[4]);
      const listing = myListings.find((item) => item.id === listingId);
      if (!listing) {
        await json(route, { detail: "Listing not found" }, 404);
        return;
      }
      listing.status = "draft";
      await json(route, { id: listingId, status: "draft" });
      return;
    }

    if (/^\/api\/v1\/listings\/\d+\/submit$/.test(path) && method === "POST") {
      const listingId = Number(path.split("/")[4]);
      const listing = myListings.find((item) => item.id === listingId);
      if (!listing) {
        await json(route, { detail: "Listing not found" }, 404);
        return;
      }
      if (paywalledSubmitListingIds.has(listingId)) {
        await json(
          route,
          {
            detail: {
              message: "Complete payment to publish this listing.",
              required_product_code: "next_private_listing_30",
              paywall_reason: "payment_required_for_basic_listing",
              listing_id: listingId,
            },
          },
          402,
        );
        return;
      }
      listing.status = "moderation_pending";
      await json(route, { id: listingId, status: "moderation_pending" });
      return;
    }

    if (path === "/api/v1/billing/overview" && method === "GET") {
      await json(route, {
        currency: "EUR",
        business_subscriptions: [],
        active_boosts: [],
        usage: {
          active_listings_count: myListings.filter((item) => item.status === "published" || item.status === "active").length,
          total_listing_quota: 10,
          remaining_listing_quota: 8,
          active_boosts_count: 0,
        },
        payment_summary: {
          paid_payments_count: 0,
          pending_payments_count: 0,
          failed_payments_count: 0,
          total_spend: 0,
          currency: "EUR",
        },
        available_products: [
          {
            code: "next_private_listing_30",
            title: "Next private listing for 30 days",
            description: "Every new paid private listing after the first trial costs €4.99 for 30 days.",
            category: "listing_purchase",
            target_type: "listing",
            amount: 4.99,
            currency: "EUR",
            duration_days: 30,
            listing_quota: null,
            is_recurring: false,
            billing_mode: "payment",
            trial_days: null,
          },
          {
            code: "boost",
            title: "Boost",
            description: "Temporarily pushes an active paid private listing higher in the feed for 3 days.",
            category: "listing_promotion",
            target_type: "listing",
            amount: 2.99,
            currency: "EUR",
            duration_days: 3,
            listing_quota: null,
            is_recurring: false,
            billing_mode: "payment",
            trial_days: null,
          },
        ],
      });
      return;
    }

    if (path === "/api/v1/billing/history" && method === "GET") {
      await json(route, []);
      return;
    }

    if (path === "/api/v1/profiles/business/user/my" && method === "GET") {
      await json(route, []);
      return;
    }

    if (path === "/api/v1/saved/listings" && method === "GET") {
      await json(route, savedListings);
      return;
    }

    if (path.startsWith("/api/v1/saved/listings/") && method === "DELETE") {
      const listingId = Number(path.split("/").pop());
      const itemIndex = savedListings.findIndex((item) => item.listing_id === listingId);
      if (itemIndex >= 0) {
        savedListings.splice(itemIndex, 1);
        await json(route, { message: "Saved listing removed successfully" });
        return;
      }
      await json(route, { detail: "Saved listing not found" }, 404);
      return;
    }

    if (path === "/api/v1/saved/businesses" && method === "GET") {
      await json(route, []);
      return;
    }

    if (path === "/api/v1/saved/search-alerts" && method === "GET") {
      await json(route, []);
      return;
    }

    if (path === "/api/v1/saved/search-history" && method === "GET") {
      await json(route, []);
      return;
    }

    await json(route, { detail: `Unhandled mock route: ${method} ${path}` }, 404);
  });
}

test("redirects anonymous account access to auth", async ({ page }) => {
  await mockAccountApi(page, { authenticated: false });

  await page.goto("/account");

  await page.waitForURL("**/auth");
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole("heading", { name: "Login / Register" })).toBeVisible();
});

test("canonicalizes bare account route to dashboard tab for authenticated users", async ({ page }) => {
  await mockAccountApi(page, {
    authenticated: true,
    onboardingCompleted: true,
    profileExists: true,
  });

  await page.goto("/account");

  await page.waitForURL("**/account?tab=dashboard");
  await expect(page).toHaveURL(/\/account\?tab=dashboard$/);
  await expect(page.getByText("Your current platform status")).toBeVisible();
});

test("keeps explicit tab query state on initial load", async ({ page }) => {
  await mockAccountApi(page, {
    authenticated: true,
    onboardingCompleted: true,
    profileExists: true,
  });

  await page.goto("/account?tab=profile");

  await expect(page).toHaveURL(/\/account\?tab=profile$/);
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
});

test("tab switching updates the url deterministically", async ({ page }) => {
  await mockAccountApi(page, {
    authenticated: true,
    onboardingCompleted: true,
    profileExists: true,
  });

  await page.goto("/account?tab=dashboard");
  await expect(page).toHaveURL(/\/account\?tab=dashboard$/);

  await page.getByRole("button", { name: "Saved" }).click();
  await expect(page).toHaveURL(/\/account\?tab=saved$/);
  await expect(page.getByRole("heading", { name: "Saved listings" })).toBeVisible();

  await page.getByRole("button", { name: "Billing" }).click();
  await expect(page).toHaveURL(/\/account\?tab=billing$/);
  await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();

  await page.getByRole("button", { name: "Dashboard" }).click();
  await expect(page).toHaveURL(/\/account\?tab=dashboard$/);
  await expect(page.getByText("Your current platform status")).toBeVisible();
});

test("redirects authenticated users to onboarding when profile setup is incomplete", async ({ page }) => {
  await mockAccountApi(page, {
    authenticated: true,
    onboardingCompleted: false,
  });

  await page.goto("/account");

  await page.waitForURL("**/onboarding");
  await expect(page.getByRole("heading", { name: "Complete registration" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Complete onboarding" })).toBeVisible();
});

test("creates a missing profile from the account profile tab", async ({ page }) => {
  await mockAccountApi(page, {
    authenticated: true,
    onboardingCompleted: true,
    profileExists: false,
  });

  await page.goto("/account?tab=profile");

  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  await expect(page.getByText("Your profile has not been created yet. Fill in the basic fields to create it now.")).toBeVisible();

  await page.locator('label:has-text("Public name") + input').fill("Olena QA");
  await page.locator('label:has-text("City") + input').fill("Barcelona");
  await page.locator('label:has-text("Bio") + textarea').fill("Community organizer");

  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(page.getByText("Profile updated")).toBeVisible();
  await expect(page.locator('label:has-text("Public name") + input')).toHaveValue("Olena QA");
});

test("updates an existing profile from the account profile tab", async ({ page }) => {
  await mockAccountApi(page, {
    authenticated: true,
    onboardingCompleted: true,
    profileExists: true,
  });

  await page.goto("/account?tab=profile");

  await expect(page.locator('label:has-text("Public name") + input')).toHaveValue("Test User");
  await page.locator('label:has-text("Public name") + input').fill("Nadiia Updated");
  await page.locator('label:has-text("City") + input').fill("Bilbao");
  await page.locator('label:has-text("Bio") + textarea').fill("Updated community lead");

  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(page.getByText("Profile updated")).toBeVisible();
  await expect(page.locator('label:has-text("Public name") + input')).toHaveValue("Nadiia Updated");
  await expect(page.locator('label:has-text("City") + input')).toHaveValue("Bilbao");
  await expect(page.locator('label:has-text("Bio") + textarea')).toHaveValue("Updated community lead");
});

test("renders saved listings on the saved tab", async ({ page }) => {
  await mockAccountApi(page, {
    authenticated: true,
    onboardingCompleted: true,
    savedListings: [
      {
        listing_id: 77,
        title: "Painter in Valencia",
        city: "Valencia",
        price: "120 EUR",
        module: "services",
        saved_at: "2026-03-26T12:00:00.000Z",
        status: "published",
        primary_image: null,
      },
      {
        listing_id: 91,
        title: "Apartment in Malaga",
        city: "Malaga",
        price: "900 EUR",
        module: "housing",
        saved_at: "2026-03-26T12:00:00.000Z",
        status: "draft",
        primary_image: "https://example.com/flat.jpg",
      },
    ],
  });

  await page.goto("/account?tab=saved");

  await expect(page.getByRole("heading", { name: "Saved listings" })).toBeVisible();
  await expect(page.getByText("Painter in Valencia")).toBeVisible();
  await expect(page.getByText("Apartment in Malaga")).toBeVisible();
  await expect(page.getByText("120 EUR")).toBeVisible();
  await expect(page.getByText("900 EUR")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove listing" })).toHaveCount(2);
});

test("removes saved listings from the saved tab", async ({ page }) => {
  await mockAccountApi(page, {
    authenticated: true,
    onboardingCompleted: true,
  });

  await page.goto("/account?tab=saved");

  await expect(page.getByRole("heading", { name: "Saved listings" })).toBeVisible();
  await expect(page.getByText("Painter in Valencia")).toBeVisible();

  await page.getByRole("button", { name: "Remove listing" }).click();

  await expect(page.getByText("Painter in Valencia")).toHaveCount(0);
  await expect(page.getByText("You do not have any saved listings yet.")).toBeVisible();
});

test("filters listings by module, status, and search text", async ({ page }) => {
  await mockAccountApi(page, {
    authenticated: true,
    onboardingCompleted: true,
    profileExists: true,
  });

  await page.goto("/account?tab=listings");

  const listingsPanel = page.locator("section").filter({ has: page.getByRole("heading", { name: "My listings" }) });

  await expect(page.getByRole("heading", { name: "My listings" })).toBeVisible();
  await expect(page.getByText("Published apartment in Malaga")).toBeVisible();

  await listingsPanel.locator("select").nth(0).selectOption("housing");
  await expect(page.getByText("Published apartment in Malaga")).toBeVisible();
  await expect(page.getByText("Draft plumber profile")).toHaveCount(0);

  await page.getByRole("button", { name: "Published" }).click();
  await expect(page.getByText("Published apartment in Malaga")).toBeVisible();

  await page.getByPlaceholder("Search my listings").fill("apartment");
  await expect(page.getByText("Published apartment in Malaga")).toBeVisible();

  await page.getByPlaceholder("Search my listings").fill("translator");
  await expect(page.getByText("You do not have any active listings.")).toBeVisible();
});

test("archives a published listing and reflects the archived backend state", async ({ page }) => {
  await mockAccountApi(page, {
    authenticated: true,
    onboardingCompleted: true,
    profileExists: true,
  });

  await page.goto("/account?tab=listings");

  const listingRow = page.locator("article").filter({ hasText: "Published apartment in Malaga" });
  await expect(listingRow).toContainText("Published");

  await listingRow.getByRole("button", { name: "Archive" }).click();

  await expect(listingRow).toContainText("Archived");
  await expect(listingRow.getByRole("button", { name: "Renew" })).toBeVisible();
  await expect(listingRow.getByRole("button", { name: "Archive" })).toHaveCount(0);
});

test("renews an expired listing and reflects the draft backend state", async ({ page }) => {
  await mockAccountApi(page, {
    authenticated: true,
    onboardingCompleted: true,
    profileExists: true,
  });

  await page.goto("/account?tab=listings");

  const listingRow = page.locator("article").filter({ hasText: "Expired legal consultation" });
  await expect(listingRow).toContainText("Expired");

  await listingRow.getByRole("button", { name: "Renew" }).click();

  await expect(listingRow).toContainText("Draft");
  await expect(listingRow.getByRole("button", { name: "Submit again" })).toBeVisible();
  await expect(listingRow.getByRole("button", { name: "Renew" })).toHaveCount(0);
});

test("submits a draft listing and reflects the moderation backend state", async ({ page }) => {
  await mockAccountApi(page, {
    authenticated: true,
    onboardingCompleted: true,
    profileExists: true,
  });

  await page.goto("/account?tab=listings");

  const listingRow = page.locator("article").filter({ hasText: "Draft plumber profile" });
  await expect(listingRow).toContainText("Draft");

  await listingRow.getByRole("button", { name: "Submit again" }).click();

  await expect(listingRow).toContainText("In moderation");
  await expect(listingRow.getByRole("button", { name: "Submit again" })).toHaveCount(0);
});

test("routes submit paywalls to billing with product and listing context", async ({ page }) => {
  await mockAccountApi(page, {
    authenticated: true,
    onboardingCompleted: true,
    profileExists: true,
    paywalledSubmitListingIds: [104],
  });

  await page.goto("/account?tab=listings");

  const listingRow = page.locator("article").filter({ hasText: "Rejected translator profile" });
  await listingRow.getByRole("button", { name: "Submit again" }).click();

  await expect(page).toHaveURL(/\/account\?(?=.*tab=billing)(?=.*product=next_private_listing_30)(?=.*listingId=104)/);
  await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
  await expect(page.locator('label:has-text("Listing") + select')).toBeVisible();
});
