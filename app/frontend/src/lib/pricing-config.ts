export type PricingSegmentId = "individuals" | "business" | "agencies";

export type PricingStateMarker =
  | "always_free"
  | "private_trial_active"
  | "extend_to_30"
  | "next_paid_private_listing"
  | "addon_available"
  | "subscription_trial"
  | "recurring_after_trial";

export type PricingCtaTarget = "create" | "billing";

export type PricingDisplayMode = "money" | "text";

export interface PricingCardConfig {
  id: string;
  titleKey: string;
  subtitleKey: string;
  displayMode: PricingDisplayMode;
  amount?: number;
  currency?: string;
  billingIntervalKey?: string;
  prominentLabelKey?: string;
  trialNoteKey?: string;
  helperNoteKey?: string;
  includedKeys: string[];
  bestForKeys?: string[];
  advantageKeys?: string[];
  cabinetKeys?: string[];
  ctaKey: string;
  ctaTarget: PricingCtaTarget;
  recommended?: boolean;
  billingKind: "always_free" | "one_time" | "subscription";
  stateMarkers: PricingStateMarker[];
  checkoutProductCode?: string | null;
}

export interface PricingAddonConfig {
  id: "boost" | "featured";
  titleKey: string;
  subtitleKey: string;
  amount: number;
  currency: string;
  durationDays: number;
  visibilityType: "boosted" | "featured";
  activeStateKey: string;
  availabilityKeys: string[];
  checkoutProductCode: string;
  stateMarkers: PricingStateMarker[];
}

export interface PricingStepConfig {
  id: string;
  titleKey: string;
  bodyKey: string;
}

export interface PricingFaqConfig {
  id: string;
  questionKey: string;
  answerKey: string;
}

export interface PricingSegmentConfig {
  id: PricingSegmentId;
  labelKey: string;
  summaryKey: string;
  cards: PricingCardConfig[];
  steps: PricingStepConfig[];
  faq: PricingFaqConfig[];
}

export const PRICING_ALWAYS_FREE_ITEM_KEYS = [
  "pricing.individuals.alwaysFree.jobs",
  "pricing.individuals.alwaysFree.housingSearch",
  "pricing.individuals.alwaysFree.roomSearch",
  "pricing.individuals.alwaysFree.communityPosts",
  "pricing.individuals.alwaysFree.volunteering",
  "pricing.individuals.alwaysFree.nonProfit",
  "pricing.individuals.alwaysFree.communityInitiatives",
  "pricing.individuals.alwaysFree.communityEvents",
] as const;

export const PRICING_ADDONS: PricingAddonConfig[] = [
  {
    id: "boost",
    titleKey: "pricing.addons.boost.title",
    subtitleKey: "pricing.addons.boost.subtitle",
    amount: 2.99,
    currency: "EUR",
    durationDays: 3,
    visibilityType: "boosted",
    activeStateKey: "pricing.addons.boost.activeState",
    availabilityKeys: [
      "pricing.addons.availableForPaid",
      "pricing.addons.activeOnly",
      "pricing.addons.noStacking",
    ],
    checkoutProductCode: "boost",
    stateMarkers: ["addon_available"],
  },
  {
    id: "featured",
    titleKey: "pricing.addons.featured.title",
    subtitleKey: "pricing.addons.featured.subtitle",
    amount: 5.99,
    currency: "EUR",
    durationDays: 7,
    visibilityType: "featured",
    activeStateKey: "pricing.addons.featured.activeState",
    availabilityKeys: [
      "pricing.addons.availableForPaid",
      "pricing.addons.activeOnly",
      "pricing.addons.noStacking",
    ],
    checkoutProductCode: "featured",
    stateMarkers: ["addon_available"],
  },
] as const;

export const PRICING_SEGMENTS: PricingSegmentConfig[] = [
  {
    id: "individuals",
    labelKey: "pricing.segment.individuals",
    summaryKey: "pricing.segment.individuals.summary",
    cards: [
      {
        id: "first-paid-listing",
        titleKey: "pricing.individuals.first.title",
        subtitleKey: "pricing.individuals.first.subtitle",
        displayMode: "text",
        prominentLabelKey: "pricing.individuals.first.priceLabel",
        trialNoteKey: "pricing.individuals.first.trialNote",
        helperNoteKey: "pricing.individuals.first.helperNote",
        includedKeys: [
          "pricing.individuals.first.feature.oneTrial",
          "pricing.individuals.first.feature.noCard",
          "pricing.individuals.first.feature.keepSameListing",
          "pricing.individuals.first.feature.verification",
        ],
        bestForKeys: [
          "pricing.individuals.first.bestFor.one",
          "pricing.individuals.first.bestFor.two",
        ],
        advantageKeys: [
          "pricing.individuals.first.advantage.one",
          "pricing.individuals.first.advantage.two",
        ],
        cabinetKeys: [
          "pricing.individuals.first.cabinet.one",
          "pricing.individuals.first.cabinet.two",
        ],
        ctaKey: "pricing.individuals.first.cta",
        ctaTarget: "create",
        recommended: true,
        billingKind: "always_free",
        stateMarkers: ["private_trial_active", "extend_to_30"],
        checkoutProductCode: null,
      },
      {
        id: "next-paid-listings",
        titleKey: "pricing.individuals.next.title",
        subtitleKey: "pricing.individuals.next.subtitle",
        displayMode: "money",
        amount: 4.99,
        currency: "EUR",
        billingIntervalKey: "pricing.billing.per30Days",
        trialNoteKey: "pricing.individuals.next.trialNote",
        helperNoteKey: "pricing.individuals.next.helperNote",
        includedKeys: [
          "pricing.individuals.next.feature.eachNewListing",
          "pricing.individuals.next.feature.noTrialReset",
          "pricing.individuals.next.feature.noLifetimeExtension",
          "pricing.individuals.next.feature.valueCapture",
        ],
        bestForKeys: [
          "pricing.individuals.next.bestFor.one",
          "pricing.individuals.next.bestFor.two",
        ],
        advantageKeys: [
          "pricing.individuals.next.advantage.one",
          "pricing.individuals.next.advantage.two",
        ],
        cabinetKeys: [
          "pricing.individuals.next.cabinet.one",
          "pricing.individuals.next.cabinet.two",
        ],
        ctaKey: "pricing.individuals.next.cta",
        ctaTarget: "create",
        billingKind: "one_time",
        stateMarkers: ["next_paid_private_listing"],
        checkoutProductCode: "next_private_listing_30",
      },
    ],
    steps: [
      {
        id: "private-step-1",
        titleKey: "pricing.how.individuals.step1.title",
        bodyKey: "pricing.how.individuals.step1.body",
      },
      {
        id: "private-step-2",
        titleKey: "pricing.how.individuals.step2.title",
        bodyKey: "pricing.how.individuals.step2.body",
      },
      {
        id: "private-step-3",
        titleKey: "pricing.how.individuals.step3.title",
        bodyKey: "pricing.how.individuals.step3.body",
      },
    ],
    faq: [
      { id: "free", questionKey: "pricing.faq.free.q", answerKey: "pricing.faq.free.a" },
      { id: "trial", questionKey: "pricing.faq.trial.q", answerKey: "pricing.faq.trial.a" },
      { id: "after7", questionKey: "pricing.faq.after7.q", answerKey: "pricing.faq.after7.a" },
      { id: "card", questionKey: "pricing.faq.card.q", answerKey: "pricing.faq.card.a" },
      { id: "boost", questionKey: "pricing.faq.boost.q", answerKey: "pricing.faq.boost.a" },
      { id: "featured", questionKey: "pricing.faq.featured.q", answerKey: "pricing.faq.featured.a" },
    ],
  },
  {
    id: "business",
    labelKey: "pricing.segment.business",
    summaryKey: "pricing.segment.business.summary",
    cards: [
      {
        id: "business-presence",
        titleKey: "pricing.business.presence.title",
        subtitleKey: "pricing.business.presence.subtitle",
        displayMode: "money",
        amount: 9.99,
        currency: "EUR",
        billingIntervalKey: "pricing.billing.perMonth",
        trialNoteKey: "pricing.business.trialNote",
        helperNoteKey: "pricing.business.helperNote",
        includedKeys: [
          "pricing.business.presence.feature.oneOffer",
          "pricing.business.presence.feature.businessProfile",
          "pricing.business.presence.feature.contactCta",
          "pricing.business.presence.feature.directoryVisibility",
        ],
        bestForKeys: [
          "pricing.business.presence.bestFor.one",
          "pricing.business.presence.bestFor.two",
        ],
        advantageKeys: [
          "pricing.business.presence.advantage.one",
          "pricing.business.presence.advantage.two",
        ],
        cabinetKeys: [
          "pricing.business.presence.cabinet.one",
          "pricing.business.presence.cabinet.two",
        ],
        ctaKey: "pricing.business.presence.cta",
        ctaTarget: "billing",
        billingKind: "subscription",
        stateMarkers: ["subscription_trial", "recurring_after_trial"],
        checkoutProductCode: "business_presence",
      },
      {
        id: "business-priority",
        titleKey: "pricing.business.priority.title",
        subtitleKey: "pricing.business.priority.subtitle",
        displayMode: "money",
        amount: 19.99,
        currency: "EUR",
        billingIntervalKey: "pricing.billing.perMonth",
        trialNoteKey: "pricing.business.trialNote",
        helperNoteKey: "pricing.business.helperNote",
        includedKeys: [
          "pricing.business.priority.feature.oneOffer",
          "pricing.business.priority.feature.priority",
          "pricing.business.priority.feature.highlight",
          "pricing.business.priority.feature.badge",
        ],
        bestForKeys: [
          "pricing.business.priority.bestFor.one",
          "pricing.business.priority.bestFor.two",
        ],
        advantageKeys: [
          "pricing.business.priority.advantage.one",
          "pricing.business.priority.advantage.two",
        ],
        cabinetKeys: [
          "pricing.business.priority.cabinet.one",
          "pricing.business.priority.cabinet.two",
        ],
        ctaKey: "pricing.business.priority.cta",
        ctaTarget: "billing",
        recommended: true,
        billingKind: "subscription",
        stateMarkers: ["subscription_trial", "recurring_after_trial"],
        checkoutProductCode: "business_priority",
      },
    ],
    steps: [
      {
        id: "business-step-1",
        titleKey: "pricing.how.business.step1.title",
        bodyKey: "pricing.how.business.step1.body",
      },
      {
        id: "business-step-2",
        titleKey: "pricing.how.business.step2.title",
        bodyKey: "pricing.how.business.step2.body",
      },
      {
        id: "business-step-3",
        titleKey: "pricing.how.business.step3.title",
        bodyKey: "pricing.how.business.step3.body",
      },
    ],
    faq: [
      { id: "trial-billing", questionKey: "pricing.faq.subscriptionTrial.q", answerKey: "pricing.faq.subscriptionTrial.a" },
      { id: "cancel", questionKey: "pricing.faq.cancel.q", answerKey: "pricing.faq.cancel.a" },
      { id: "boost", questionKey: "pricing.faq.boost.q", answerKey: "pricing.faq.boost.a" },
      { id: "featured", questionKey: "pricing.faq.featured.q", answerKey: "pricing.faq.featured.a" },
    ],
  },
  {
    id: "agencies",
    labelKey: "pricing.segment.agencies",
    summaryKey: "pricing.segment.agencies.summary",
    cards: [
      {
        id: "agency-starter",
        titleKey: "pricing.agencies.starter.title",
        subtitleKey: "pricing.agencies.starter.subtitle",
        displayMode: "money",
        amount: 24.99,
        currency: "EUR",
        billingIntervalKey: "pricing.billing.perMonth",
        trialNoteKey: "pricing.agencies.trialNote",
        helperNoteKey: "pricing.agencies.helperNote",
        includedKeys: [
          "pricing.agencies.starter.feature.tenListings",
          "pricing.agencies.starter.feature.branding",
          "pricing.agencies.starter.feature.contactCta",
          "pricing.agencies.starter.feature.visibility",
        ],
        bestForKeys: [
          "pricing.agencies.starter.bestFor.one",
          "pricing.agencies.starter.bestFor.two",
        ],
        advantageKeys: [
          "pricing.agencies.starter.advantage.one",
          "pricing.agencies.starter.advantage.two",
        ],
        cabinetKeys: [
          "pricing.agencies.starter.cabinet.one",
          "pricing.agencies.starter.cabinet.two",
        ],
        ctaKey: "pricing.agencies.starter.cta",
        ctaTarget: "billing",
        billingKind: "subscription",
        stateMarkers: ["subscription_trial", "recurring_after_trial"],
        checkoutProductCode: "agency_starter",
      },
      {
        id: "agency-growth",
        titleKey: "pricing.agencies.growth.title",
        subtitleKey: "pricing.agencies.growth.subtitle",
        displayMode: "money",
        amount: 49.99,
        currency: "EUR",
        billingIntervalKey: "pricing.billing.perMonth",
        trialNoteKey: "pricing.agencies.trialNote",
        helperNoteKey: "pricing.agencies.helperNote",
        includedKeys: [
          "pricing.agencies.growth.feature.thirtyListings",
          "pricing.agencies.growth.feature.branding",
          "pricing.agencies.growth.feature.recommended",
          "pricing.agencies.growth.feature.strongerVisibility",
        ],
        bestForKeys: [
          "pricing.agencies.growth.bestFor.one",
          "pricing.agencies.growth.bestFor.two",
        ],
        advantageKeys: [
          "pricing.agencies.growth.advantage.one",
          "pricing.agencies.growth.advantage.two",
        ],
        cabinetKeys: [
          "pricing.agencies.growth.cabinet.one",
          "pricing.agencies.growth.cabinet.two",
        ],
        ctaKey: "pricing.agencies.growth.cta",
        ctaTarget: "billing",
        recommended: true,
        billingKind: "subscription",
        stateMarkers: ["subscription_trial", "recurring_after_trial"],
        checkoutProductCode: "agency_growth",
      },
      {
        id: "agency-pro",
        titleKey: "pricing.agencies.pro.title",
        subtitleKey: "pricing.agencies.pro.subtitle",
        displayMode: "money",
        amount: 79.99,
        currency: "EUR",
        billingIntervalKey: "pricing.billing.perMonth",
        trialNoteKey: "pricing.agencies.trialNote",
        helperNoteKey: "pricing.agencies.helperNote",
        includedKeys: [
          "pricing.agencies.pro.feature.hundredListings",
          "pricing.agencies.pro.feature.branding",
          "pricing.agencies.pro.feature.priority",
          "pricing.agencies.pro.feature.strongestVisibility",
        ],
        bestForKeys: [
          "pricing.agencies.pro.bestFor.one",
          "pricing.agencies.pro.bestFor.two",
        ],
        advantageKeys: [
          "pricing.agencies.pro.advantage.one",
          "pricing.agencies.pro.advantage.two",
        ],
        cabinetKeys: [
          "pricing.agencies.pro.cabinet.one",
          "pricing.agencies.pro.cabinet.two",
        ],
        ctaKey: "pricing.agencies.pro.cta",
        ctaTarget: "billing",
        billingKind: "subscription",
        stateMarkers: ["subscription_trial", "recurring_after_trial"],
        checkoutProductCode: "agency_pro",
      },
    ],
    steps: [
      {
        id: "agency-step-1",
        titleKey: "pricing.how.agencies.step1.title",
        bodyKey: "pricing.how.agencies.step1.body",
      },
      {
        id: "agency-step-2",
        titleKey: "pricing.how.agencies.step2.title",
        bodyKey: "pricing.how.agencies.step2.body",
      },
      {
        id: "agency-step-3",
        titleKey: "pricing.how.agencies.step3.title",
        bodyKey: "pricing.how.agencies.step3.body",
      },
    ],
    faq: [
      { id: "trial-billing", questionKey: "pricing.faq.subscriptionTrial.q", answerKey: "pricing.faq.subscriptionTrial.a" },
      { id: "cancel", questionKey: "pricing.faq.cancel.q", answerKey: "pricing.faq.cancel.a" },
      { id: "boost", questionKey: "pricing.faq.boost.q", answerKey: "pricing.faq.boost.a" },
      { id: "featured", questionKey: "pricing.faq.featured.q", answerKey: "pricing.faq.featured.a" },
    ],
  },
] as const;
