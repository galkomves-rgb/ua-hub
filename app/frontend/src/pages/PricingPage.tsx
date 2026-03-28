import { useMemo, useState } from "react";
import { Check, ChevronRight, Sparkles, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { PRICING_ADDONS, PRICING_ALWAYS_FREE_ITEM_KEYS, PRICING_SEGMENTS, type PricingCardConfig, type PricingSegmentId } from "@/lib/pricing-config";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

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

function PricingCard({ card }: { card: PricingCardConfig }) {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const prominentValue =
    card.displayMode === "money" && typeof card.amount === "number" && card.currency
      ? formatMoney(card.amount, card.currency, locale)
      : card.prominentLabelKey
        ? t(card.prominentLabelKey)
        : null;

  return (
    <article
      className={`rounded-3xl border p-5 md:p-6 ${
        card.recommended
          ? isDark
            ? "border-[#FFD700]/40 bg-[#11203a] ring-1 ring-[#FFD700]/20"
            : "border-[#0057B8] bg-white ring-1 ring-blue-100"
          : isDark
            ? "border-[#22416b] bg-[#11203a]"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={`text-lg font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t(card.titleKey)}</h3>
          <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t(card.subtitleKey)}</p>
        </div>
        {card.recommended ? (
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${isDark ? "bg-[#FFD700]/15 text-[#FFD700]" : "bg-blue-50 text-[#0057B8]"}`}>
            {t("pricing.badge.recommended")}
          </span>
        ) : null}
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
        onClick={() => navigate(resolveCtaHref(card.ctaTarget, Boolean(user)))}
        className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${
          card.recommended
            ? isDark
              ? "bg-[#FFD700] text-[#0d1a2e]"
              : "bg-[#0057B8] text-white"
            : isDark
              ? "bg-[#1a2d4c] text-slate-100 hover:bg-[#21385f]"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        {t(card.ctaKey)}
        <ChevronRight className="h-4 w-4" />
      </button>
    </article>
  );
}

export default function PricingPage() {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const isDark = theme === "dark";
  const [segment, setSegment] = useState<PricingSegmentId>("individuals");

  const activeSegment = useMemo(
    () => PRICING_SEGMENTS.find((item) => item.id === segment) ?? PRICING_SEGMENTS[0],
    [segment],
  );

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

        <section className={`mt-8 grid gap-4 ${segment === "agencies" ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
          {activeSegment.cards.map((card) => (
            <PricingCard key={card.id} card={card} />
          ))}
        </section>

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
