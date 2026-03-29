export type BusinessPlanCode =
  | "business_presence"
  | "business_priority"
  | "agency_starter"
  | "agency_growth"
  | "agency_pro";

export type BusinessPlanLike = BusinessPlanCode | string | null | undefined;

export interface BusinessPlanInsight {
  code: BusinessPlanCode;
  labelKey: string;
  audienceKey: string;
  benefitKeys: string[];
  cabinetKeys: string[];
  upgradeTo: BusinessPlanCode | null;
}

const PLAN_INSIGHTS: Record<BusinessPlanCode, BusinessPlanInsight> = {
  business_presence: {
    code: "business_presence",
    labelKey: "account.billing.plan.business_presence",
    audienceKey: "pricing.business.presence.bestFor.one",
    benefitKeys: [
      "pricing.business.presence.feature.oneOffer",
      "pricing.business.presence.advantage.one",
      "pricing.business.presence.advantage.two",
    ],
    cabinetKeys: [
      "pricing.business.presence.cabinet.one",
      "pricing.business.presence.cabinet.two",
    ],
    upgradeTo: "business_priority",
  },
  business_priority: {
    code: "business_priority",
    labelKey: "account.billing.plan.business_priority",
    audienceKey: "pricing.business.priority.bestFor.one",
    benefitKeys: [
      "pricing.business.priority.feature.priority",
      "pricing.business.priority.advantage.one",
      "pricing.business.priority.advantage.two",
    ],
    cabinetKeys: [
      "pricing.business.priority.cabinet.one",
      "pricing.business.priority.cabinet.two",
    ],
    upgradeTo: "agency_starter",
  },
  agency_starter: {
    code: "agency_starter",
    labelKey: "account.billing.plan.agency_starter",
    audienceKey: "pricing.agencies.starter.bestFor.one",
    benefitKeys: [
      "pricing.agencies.starter.feature.tenListings",
      "pricing.agencies.starter.advantage.one",
      "pricing.agencies.starter.advantage.two",
    ],
    cabinetKeys: [
      "pricing.agencies.starter.cabinet.one",
      "pricing.agencies.starter.cabinet.two",
    ],
    upgradeTo: "agency_growth",
  },
  agency_growth: {
    code: "agency_growth",
    labelKey: "account.billing.plan.agency_growth",
    audienceKey: "pricing.agencies.growth.bestFor.one",
    benefitKeys: [
      "pricing.agencies.growth.feature.thirtyListings",
      "pricing.agencies.growth.advantage.one",
      "pricing.agencies.growth.advantage.two",
    ],
    cabinetKeys: [
      "pricing.agencies.growth.cabinet.one",
      "pricing.agencies.growth.cabinet.two",
    ],
    upgradeTo: "agency_pro",
  },
  agency_pro: {
    code: "agency_pro",
    labelKey: "account.billing.plan.agency_pro",
    audienceKey: "pricing.agencies.pro.bestFor.one",
    benefitKeys: [
      "pricing.agencies.pro.feature.hundredListings",
      "pricing.agencies.pro.advantage.one",
      "pricing.agencies.pro.advantage.two",
    ],
    cabinetKeys: [
      "pricing.agencies.pro.cabinet.one",
      "pricing.agencies.pro.cabinet.two",
    ],
    upgradeTo: null,
  },
};

export function normalizeBusinessPlanCode(plan: BusinessPlanLike): BusinessPlanCode | null {
  if (!plan) {
    return null;
  }
  return plan in PLAN_INSIGHTS ? plan : null;
}

export function getBusinessPlanInsight(plan: BusinessPlanLike): BusinessPlanInsight | null {
  const normalized = normalizeBusinessPlanCode(plan);
  return normalized ? PLAN_INSIGHTS[normalized] : null;
}
