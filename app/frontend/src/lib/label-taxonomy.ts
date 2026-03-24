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

export function deriveBusinessLabels(biz: {
  isVerified?: boolean;
  verified?: boolean;
  isPremium?: boolean;
  premium?: boolean;
  rating?: number;
}): LabelId[] {
  const labels = new Set<LabelId>();
  const isVerified = Boolean(biz.isVerified ?? biz.verified);
  const isPremium = Boolean(biz.isPremium ?? biz.premium);

  if (isVerified) labels.add("verified");
  if (isPremium) labels.add("premium");
  if (!isVerified && !isPremium) labels.add("new");
  if ((biz.rating ?? 0) >= 4.7) labels.add("featured");

  return sortByPriority(Array.from(labels));
}

export function getModuleLabelSystem(): Record<string, LabelId[]> {
  return MODULE_LABELS;
}
