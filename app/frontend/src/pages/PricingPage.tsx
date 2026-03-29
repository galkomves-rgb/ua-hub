import { useMemo, useState } from "react";
import { Check, ChevronRight, Sparkles, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { PRICING_ADDONS, PRICING_ALWAYS_FREE_ITEM_KEYS, PRICING_SEGMENTS, type PricingCardConfig, type PricingSegmentId } from "@/lib/pricing-config";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

function getInitialSelectedCardIds() {
  return {
    business: PRICING_SEGMENTS.find((item) => item.id === "business")?.cards[0]?.id ?? "",
    agencies: PRICING_SEGMENTS.find((item) => item.id === "agencies")?.cards[0]?.id ?? "",
  } satisfies Record<"business" | "agencies", string>;
}

function formatMoney(amount: number, currency: string, locale: "ua" | "es" | "en") {
  try {
    const formatterLocale = locale === "ua" ? "uk-UA" : locale === "es" ? "es-ES" : "en-GB";
    return new Intl.NumberFormat(formatterLocale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function resolveCtaHref(target: PricingCardConfig["ctaTarget"], isAuthenticated: boolean) {
  if (!isAuthenticated) {
    return "/auth";
  }
  if (target === "create") {
    return "/create";
  }
  return "/account?tab=billing";
}

function SegmentButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
        active
          ? isDark
            ? "bg-[#FFD700] text-[#0d1a2e]"
            : "bg-[#0057B8] text-white"
          : isDark
            ? "text-slate-300 hover:bg-[#16253f]"
            : "text-slate-600 hover:bg-white"
      }`}
    >
      {label}
    </button>
  );
}

function PricingCard({
  card,
  selected,
  onSelect,
  requiresSelection,
  onPrimaryAction,
  onSelectNext,
  onSelectPrevious,
}: {
  card: PricingCardConfig;
  selected: boolean;
  onSelect: () => void;
  requiresSelection: boolean;
  onPrimaryAction: () => void;
  onSelectNext?: () => void;
  onSelectPrevious?: () => void;
}) {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const isDark = theme === "dark";

  const prominentValue =
    card.displayMode === "money" && typeof card.amount === "number" && card.currency
      ? formatMoney(card.amount, card.currency, locale)
      : card.prominentLabelKey
        ? t(card.prominentLabelKey)
        : null;

  const cardStateClass = selected
    ? isDark
      ? "border-[#FFD700] bg-[#11203a] shadow-[0_18px_45px_rgba(6,15,31,0.45),0_0_0_3px_rgba(255,215,0,0.18)]"
      : "border-[#0057B8] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12),0_0_0_3px_rgba(0,87,184,0.14)]"
    : card.recommended
      ? isDark
        ? "border-[#FFD700]/60 bg-[#11203a] shadow-[0_14px_34px_rgba(6,15,31,0.32)]"
        : "border-amber-400 bg-white shadow-[0_14px_32px_rgba(245,158,11,0.14)]"
      : isDark
        ? "border-[#22416b] bg-[#11203a]"
        : "border-slate-200 bg-white";

  const cardInteractionClass = selected
    ? "translate-y-[-4px]"
    : card.recommended
      ? isDark
        ? "hover:-translate-y-1 hover:border-[#FFD700] hover:shadow-[0_18px_36px_rgba(6,15,31,0.36)]"
        : "hover:-translate-y-1 hover:border-amber-500 hover:shadow-[0_18px_34px_rgba(245,158,11,0.18)]"
      : isDark
        ? "hover:-translate-y-1 hover:border-[#4a9eff] hover:shadow-[0_16px_36px_rgba(6,15,31,0.32)]"
        : "hover:-translate-y-1 hover:border-[#0057B8]/55 hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)]";

  const focusClass = requiresSelection
    ? isDark
      ? "cursor-pointer focus:outline-none focus-visible:border-[#FFD700] focus-visible:ring-4 focus-visible:ring-[#FFD700]/15"
      : "cursor-pointer focus:outline-none focus-visible:border-[#0057B8] focus-visible:ring-4 focus-visible:ring-[#0057B8]/10"
    : "";

  const ctaClass = selected || (!requiresSelection && card.recommended)
    ? isDark
      ? "bg-[#FFD700] text-[#0d1a2e] hover:bg-[#ffe45c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD700]"
      : "bg-[#0057B8] text-white hover:bg-[#00489a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057B8]"
    : card.recommended
      ? isDark
        ? "border border-[#FFD700]/50 bg-[#FFD700]/10 text-[#FFD700] hover:bg-[#FFD700]/18 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD700]"
        : "border border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
      : isDark
        ? "bg-[#1a2d4c] text-slate-100 hover:bg-[#21385f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a9eff]"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057B8]";

  return (
    <article
      role={requiresSelection ? "radio" : undefined}
      tabIndex={requiresSelection ? (selected ? 0 : -1) : -1}
      aria-checked={requiresSelection ? selected : undefined}
      aria-label={requiresSelection ? t(card.titleKey) : undefined}
      aria-describedby={requiresSelection ? `${card.id}-pricing-description` : undefined}
      onClick={requiresSelection ? onSelect : undefined}
      onKeyDown={requiresSelection ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
          return;
        }
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          onSelectNext?.();
          return;
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          onSelectPrevious?.();
        }
      } : undefined}
      className={`relative overflow-hidden rounded-3xl border p-5 transition-[transform,border-color,box-shadow,background-color] duration-200 md:p-6 ${cardStateClass} ${cardInteractionClass} ${focusClass}`}
      data-selected={selected ? "true" : "false"}
    >
      {card.recommended ? (
        <div className={`absolute inset-x-0 top-0 h-1 ${isDark ? "bg-[#FFD700]" : "bg-amber-400"}`} aria-hidden="true" />
      ) : null}

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={`text-lg font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t(card.titleKey)}</h3>
          <p id={`${card.id}-pricing-description`} className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t(card.subtitleKey)}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {card.recommended ? (
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${isDark ? "bg-[#FFD700]/15 text-[#FFD700]" : "bg-amber-50 text-amber-700"}`}>
              {t("pricing.badge.recommended")}
            </span>
          ) : null}
          {selected ? (
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${isDark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
              {t("pricing.card.selected")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mb-4">
        <p className={`text-3xl font-extrabold ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`}>{prominentValue}</p>
        {card.billingIntervalKey ? (
          <p className={`mt-1 text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t(card.billingIntervalKey)}</p>
        ) : null}
      </div>

      {card.trialNoteKey ? (
        <div className={`mb-4 rounded-2xl px-4 py-3 text-sm font-medium ${isDark ? "bg-[#0d1a2e] text-slate-200" : "bg-slate-50 text-slate-700"}`}>
          {t(card.trialNoteKey)}
        </div>
      ) : null}

      <ul className="space-y-2">
        {card.includedKeys.map((featureKey) => (
          <li key={featureKey} className={`flex items-start gap-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${isDark ? "text-emerald-300" : "text-emerald-600"}`} />
            <span>{t(featureKey)}</span>
          </li>
        ))}
      </ul>

      {card.helperNoteKey ? (
        <p className={`mt-4 text-xs leading-5 ${isDark ? "text-slate-500" : "text-slate-500"}`}>{t(card.helperNoteKey)}</p>
      ) : null}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (requiresSelection && !selected) {
            onSelect();
            return;
          }
          onPrimaryAction();
        }}
        aria-label={requiresSelection && !selected ? `${t("pricing.card.selectFirst")}: ${t(card.titleKey)}` : t(card.ctaKey)}
        className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${ctaClass}`}
      >
        {requiresSelection && !selected ? t("pricing.card.selectFirst") : t(card.ctaKey)}
        <ChevronRight className="h-4 w-4" />
      </button>
    </article>
  );
}

export default function PricingPage() {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDark = theme === "dark";
  const [segment, setSegment] = useState<PricingSegmentId>("individuals");
  const [selectedPaidCardId, setSelectedPaidCardId] = useState<Record<"business" | "agencies", string>>(getInitialSelectedCardIds);

  const activeSegment = useMemo(
    () => PRICING_SEGMENTS.find((item) => item.id === segment) ?? PRICING_SEGMENTS[0],
    [segment],
  );
  const requiresSelection = segment === "business" || segment === "agencies";
  const selectedCardId = segment === "business"
    ? selectedPaidCardId.business
    : segment === "agencies"
      ? selectedPaidCardId.agencies
      : "";
  const selectedCard = requiresSelection
    ? activeSegment.cards.find((card) => card.id === selectedCardId) ?? activeSegment.cards[0]
    : null;

  const handleSelectedPlanAction = (card: PricingCardConfig) => {
    navigate(resolveCtaHref(card.ctaTarget, Boolean(user)));
  };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className={`text-3xl font-black tracking-tight md:text-5xl ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            {t("pricing.hero.title")}
          </h1>
          <p className={`mx-auto mt-4 max-w-2xl text-sm md:text-base ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            {t("pricing.hero.subtitle")}
          </p>
        </section>

        <section className={`mx-auto mt-8 flex max-w-3xl flex-col gap-2 rounded-3xl border p-2 md:flex-row ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-slate-50"}`}>
          {PRICING_SEGMENTS.map((item) => (
            <SegmentButton
              key={item.id}
              active={item.id === segment}
              label={t(item.labelKey)}
              onClick={() => setSegment(item.id)}
            />
          ))}
        </section>

        <section className={`mt-8 rounded-3xl border px-5 py-4 text-sm ${isDark ? "border-[#22416b] bg-[#11203a] text-slate-300" : "border-slate-200 bg-white text-slate-600"}`}>
          {t(activeSegment.summaryKey)}
        </section>

        {segment === "individuals" ? (
          <section className={`mt-8 rounded-3xl border p-5 md:p-6 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
            <div className="mb-5 flex items-center gap-3">
              <Star className={`h-5 w-5 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
              <div>
                <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("pricing.individuals.alwaysFree.title")}</h2>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("pricing.individuals.alwaysFree.subtitle")}</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {PRICING_ALWAYS_FREE_ITEM_KEYS.map((itemKey) => (
                <div
                  key={itemKey}
                  className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}
                >
                  {t(itemKey)}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section
          className={`mt-8 grid gap-4 ${segment === "agencies" ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}
          role={requiresSelection ? "radiogroup" : undefined}
          aria-label={requiresSelection ? `${t("pricing.selection.groupLabel")}: ${t(activeSegment.labelKey)}` : undefined}
        >
          {activeSegment.cards.map((card, index) => (
            <PricingCard
              key={card.id}
              card={card}
              selected={Boolean(requiresSelection && selectedCardId === card.id)}
              requiresSelection={requiresSelection}
              onPrimaryAction={() => handleSelectedPlanAction(card)}
              onSelectPrevious={requiresSelection
                ? () => {
                  const previousCard = activeSegment.cards[(index - 1 + activeSegment.cards.length) % activeSegment.cards.length];
                  setSelectedPaidCardId((current) => (
                    segment === "business"
                      ? { ...current, business: previousCard.id }
                      : { ...current, agencies: previousCard.id }
                  ));
                }
                : undefined}
              onSelectNext={requiresSelection
                ? () => {
                  const nextCard = activeSegment.cards[(index + 1) % activeSegment.cards.length];
                  setSelectedPaidCardId((current) => (
                    segment === "business"
                      ? { ...current, business: nextCard.id }
                      : { ...current, agencies: nextCard.id }
                  ));
                }
                : undefined}
              onSelect={() => {
                if (!requiresSelection) {
                  return;
                }
                setSelectedPaidCardId((current) => (
                  segment === "business"
                    ? { ...current, business: card.id }
                    : { ...current, agencies: card.id }
                ));
              }}
            />
          ))}
        </section>

        {requiresSelection && selectedCard ? (
          <section className={`mt-5 rounded-3xl border p-5 md:p-6 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                  {t("pricing.selection.current")}
                </p>
                <h2 className={`mt-1 text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t(selectedCard.titleKey)}</h2>
                <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t(selectedCard.subtitleKey)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleSelectedPlanAction(selectedCard)}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-colors ${
                  isDark
                    ? "bg-[#FFD700] text-[#0d1a2e] hover:bg-[#ffe45c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD700]"
                    : "bg-[#0057B8] text-white hover:bg-[#00489a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057B8]"
                }`}
              >
                {t(selectedCard.ctaKey)}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        ) : null}

        {segment === "individuals" ? (
          <section className={`mt-8 rounded-3xl border p-5 md:p-6 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
            <div className="mb-5 flex items-center gap-3">
              <Sparkles className={`h-5 w-5 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
              <div>
                <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("pricing.addons.title")}</h2>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("pricing.addons.subtitle")}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {PRICING_ADDONS.map((addon) => (
                <article key={addon.id} className={`rounded-3xl border p-5 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className={`text-lg font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t(addon.titleKey)}</h3>
                      <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t(addon.subtitleKey)}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${isDark ? "bg-[#1a2d4c] text-fuchsia-300" : "bg-fuchsia-50 text-fuchsia-700"}`}>
                      {t("pricing.badge.addOn")}
                    </span>
                  </div>

                  <p className={`text-3xl font-extrabold ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`}>
                    {formatMoney(addon.amount, addon.currency, locale)}
                  </p>
                  <p className={`mt-1 text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {addon.durationDays} {t("pricing.billing.days")}
                  </p>

                  <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-[#11203a] text-slate-200" : "bg-white text-slate-700"}`}>
                    {t(addon.activeStateKey)}
                  </div>

                  <ul className="mt-4 space-y-2">
                    {addon.availabilityKeys.map((itemKey) => (
                      <li key={itemKey} className={`flex items-start gap-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${isDark ? "text-emerald-300" : "text-emerald-600"}`} />
                        <span>{t(itemKey)}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className={`mt-8 rounded-3xl border p-5 md:p-6 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
          <div className="mb-5">
            <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("pricing.how.title")}</h2>
            <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("pricing.how.subtitle")}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {activeSegment.steps.map((step, index) => (
              <article key={step.id} className={`rounded-3xl border p-5 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${isDark ? "bg-[#1a2d4c] text-[#FFD700]" : "bg-blue-50 text-[#0057B8]"}`}>
                  {t("pricing.stepLabel")} {index + 1}
                </span>
                <h3 className={`mt-4 text-lg font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t(step.titleKey)}</h3>
                <p className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{t(step.bodyKey)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`mt-8 rounded-3xl border p-5 md:p-6 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
          <div className="mb-5">
            <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("pricing.faq.title")}</h2>
            <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("pricing.faq.subtitle")}</p>
          </div>

          <div className="space-y-3">
            {activeSegment.faq.map((item) => (
              <article key={item.id} className={`rounded-3xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                <h3 className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t(item.questionKey)}</h3>
                <p className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{t(item.answerKey)}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
