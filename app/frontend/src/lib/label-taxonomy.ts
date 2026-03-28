export type LabelId =
  | "verified"
  | "premium"
  | "featured"
  | "business"
  | "private"
  | "free"
  | "new"
  | "urgent"
  | "remote"
  | "online";

const LABEL_PRIORITY: LabelId[] = [
  "verified",
  "premium",
  "featured",
  "urgent",
  "new",
  "remote",
  "online",
  "business",
  "private",
  "free",
];

const MODULE_LABELS: Record<string, LabelId[]> = {
  jobs: ["verified", "featured", "urgent", "remote", "new", "business", "private"],
  housing: ["featured", "urgent", "new", "verified", "business", "private"],
  services: ["verified", "premium", "featured", "new", "business", "private", "online"],
  marketplace: ["featured", "free", "new", "urgent", "verified", "business", "private"],
  events: ["featured", "free", "new", "verified", "online", "business", "private"],
  community: ["online", "urgent", "new", "verified", "free", "business", "private"],
  organizations: ["verified", "free", "featured", "new", "business"],
  business: ["verified", "premium", "featured", "new"],
};

function sortByPriority(labels: LabelId[]): LabelId[] {
  return [...labels].sort((a, b) => LABEL_PRIORITY.indexOf(a) - LABEL_PRIORITY.indexOf(b));
}

export function normalizeSectionLabels(moduleId: string, labels: string[] | undefined): LabelId[] {
  const allowed = new Set<LabelId>(MODULE_LABELS[moduleId] ?? LABEL_PRIORITY);
  const normalized = new Set<LabelId>();

  (labels ?? []).forEach((label) => {
    if (allowed.has(label as LabelId)) {
      normalized.add(label as LabelId);
    }
  });

  return sortByPriority(Array.from(normalized));
}

export function deriveListingLabels(listing: {
  module: string;
  badges?: string[];
  ownerType?: string;
  owner_type?: string;
  createdAt?: string;
  created_at?: string;
  isVerified?: boolean;
  is_verified?: boolean;
  isFeatured?: boolean;
  is_featured?: boolean;
  isPromoted?: boolean;
  is_promoted?: boolean;
}): LabelId[] {
  const labels = new Set<LabelId>(normalizeSectionLabels(listing.module, listing.badges));
  const ownerType = listing.ownerType ?? listing.owner_type;
  const createdAt = listing.createdAt ?? listing.created_at;
  const createdDate = createdAt ? new Date(createdAt) : null;
  const isRecent = createdDate instanceof Date && !Number.isNaN(createdDate.getTime())
    ? createdDate >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    : false;

  if (ownerType === "business_profile" || ownerType === "organization") {
    labels.add("business");
  }
  if (ownerType === "private_user") {
    labels.add("private");
  }
  if (listing.isVerified ?? listing.is_verified) {
    labels.add("verified");
  }
  if (listing.isFeatured ?? listing.is_featured) {
    labels.add("featured");
  }
  if (listing.isPromoted ?? listing.is_promoted) {
    labels.add("premium");
  }
  if (isRecent) {
    labels.add("new");
  }

  return sortByPriority(Array.from(labels));
}

export function deriveBusinessLabels(biz: {
  isVerified?: boolean;
  verified?: boolean;
  isPremium?: boolean;
  premium?: boolean;
}): LabelId[] {
  const labels = new Set<LabelId>();
  const isVerified = Boolean(biz.isVerified ?? biz.verified);
  const isPremium = Boolean(biz.isPremium ?? biz.premium);

  if (isVerified) labels.add("verified");
  if (isPremium) labels.add("premium");
  if (!isVerified && !isPremium) labels.add("new");

  return sortByPriority(Array.from(labels));
}

export function getModuleLabelSystem(): Record<string, LabelId[]> {
  return MODULE_LABELS;
}
