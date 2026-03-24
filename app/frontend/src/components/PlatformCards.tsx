import { Link } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle,
  Globe,
  MapPin,
  Star,
  User,
  Zap,
} from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";
import {
  getCategoryLabel,
  getListingBadges,
  getListingPriceLabel,
  getModuleDescription,
  getModuleLabel,
  getOwnerProfileLink,
  localizeText,
  type BusinessProfile,
  type Listing,
  type ModuleId,
} from "@/lib/platform-data";

function Badge({ type }: { type: string }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  const config: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
    verified: {
      label: t("card.verified"),
      icon: CheckCircle,
      cls: isDark ? "text-emerald-400 bg-emerald-900/30 border-emerald-700/40" : "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    premium: {
      label: t("card.premium"),
      icon: Star,
      cls: isDark ? "text-amber-400 bg-amber-900/30 border-amber-700/40" : "text-amber-600 bg-amber-50 border-amber-200",
    },
    featured: {
      label: t("card.featured"),
      icon: Star,
      cls: isDark ? "text-blue-400 bg-blue-900/30 border-blue-700/40" : "text-blue-600 bg-blue-50 border-blue-200",
    },
    business: {
      label: t("card.business"),
      icon: Briefcase,
      cls: isDark ? "text-indigo-300 bg-indigo-900/30 border-indigo-700/40" : "text-indigo-600 bg-indigo-50 border-indigo-200",
    },
    private: {
      label: t("card.private"),
      icon: User,
      cls: isDark ? "text-slate-300 bg-slate-800 border-slate-700" : "text-slate-500 bg-slate-50 border-slate-200",
    },
    free: {
      label: t("card.free"),
      icon: CheckCircle,
      cls: isDark ? "text-green-400 bg-green-900/30 border-green-700/40" : "text-green-600 bg-green-50 border-green-200",
    },
    urgent: {
      label: t("card.urgent"),
      icon: Zap,
      cls: isDark ? "text-red-400 bg-red-900/30 border-red-700/40" : "text-red-600 bg-red-50 border-red-200",
    },
    remote: {
      label: t("card.remote"),
      icon: Globe,
      cls: isDark ? "text-purple-400 bg-purple-900/30 border-purple-700/40" : "text-purple-600 bg-purple-50 border-purple-200",
    },
    online: {
      label: t("card.online"),
      icon: Globe,
      cls: isDark ? "text-teal-400 bg-teal-900/30 border-teal-700/40" : "text-teal-600 bg-teal-50 border-teal-200",
    },
  };

  const badge = config[type];
  if (!badge) {
    return null;
  }

  const Icon = badge.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${badge.cls}`}>
      <Icon className="h-3 w-3" />
      {badge.label}
    </span>
  );
}

export function ListingCard({ listing }: { listing: Listing }) {
  const { theme } = useTheme();
  const { locale } = useI18n();
  const isDark = theme === "dark";
  const priceLabel = getListingPriceLabel(listing);
  const badges = getListingBadges(listing);
  const ownerLink = getOwnerProfileLink(listing);

  return (
    <Link
      to={`/${listing.module}/${listing.id}`}
      className={`group block overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 ${
        isDark
          ? "border-[#1a3050] bg-[#111d32] hover:border-[#29527f] hover:shadow-lg hover:shadow-[#0b2a50]/20"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60"
      }`}
    >
      <div className="relative h-44 overflow-hidden">
        <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      </div>
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          {badges.map((badge) => (
            <Badge key={badge} type={badge} />
          ))}
        </div>
        <div>
          <p className={`mb-1 text-[11px] uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            {getCategoryLabel(listing.module, listing.category, locale)}
          </p>
          <h3 className={`line-clamp-2 text-base font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{listing.title}</h3>
        </div>
        <p className={`line-clamp-3 text-sm leading-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{listing.description}</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(listing.metadata ?? {}).slice(0, 3).map(([key, value]) => (
            <span
              key={key}
              className={`rounded-full px-2.5 py-1 text-[11px] ${isDark ? "bg-[#16253d] text-slate-300" : "bg-slate-100 text-slate-600"}`}
            >
              {value}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between border-t pt-3 text-sm">
          <div>
            {priceLabel ? (
              <p className={`font-bold ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`}>{priceLabel}</p>
            ) : (
              <p className={`font-medium ${isDark ? "text-green-300" : "text-green-600"}`}>{locale === "ua" ? "Безкоштовно" : locale === "es" ? "Gratis" : "Free"}</p>
            )}
            <p className={`mt-1 flex items-center gap-1 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              <MapPin className="h-3.5 w-3.5" />
              {listing.city}
            </p>
          </div>
          <div className={`text-right text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <p>{listing.owner_name}</p>
            {ownerLink ? <p className="text-[#0057B8]">{locale === "ua" ? "Бізнес-профіль" : locale === "es" ? "Perfil" : "Profile"}</p> : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function BusinessCard({ biz }: { biz: BusinessProfile }) {
  const { theme } = useTheme();
  const { locale } = useI18n();
  const isDark = theme === "dark";

  return (
    <Link
      to={`/business/${biz.slug}`}
      className={`group block rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 ${
        isDark
          ? `bg-[#111d32] ${biz.is_premium ? "border-[#FFD700]/40" : "border-[#1a3050]"}`
          : `bg-white ${biz.is_premium ? "border-amber-300" : "border-slate-200"}`
      }`}
    >
      <div className="flex gap-4">
        <img src={biz.logo} alt={biz.business_name} className="h-14 w-14 rounded-2xl object-cover" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className={`truncate text-base font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{biz.business_name}</h3>
            {biz.is_verified ? <CheckCircle className={`h-4 w-4 ${isDark ? "text-emerald-400" : "text-emerald-500"}`} /> : null}
            {biz.is_premium ? <Star className={`h-4 w-4 ${isDark ? "text-[#FFD700]" : "text-amber-500"}`} /> : null}
          </div>
          <p className={`mb-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{biz.category}</p>
          <p className={`line-clamp-2 text-sm leading-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{biz.description}</p>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className={`flex items-center gap-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              <MapPin className="h-3.5 w-3.5" />
              {biz.city}
            </span>
            <span className={`font-medium ${isDark ? "text-slate-300" : "text-slate-500"}`}>
              {biz.listing_quota ?? 0} {locale === "ua" ? "оголошень" : locale === "es" ? "anuncios" : "listings"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function PlatformModuleCard({
  id,
  icon: Icon,
  lightColor,
  darkColor,
  lightIconBg,
  darkIconBg,
}: {
  id: ModuleId;
  icon: React.ElementType;
  lightColor: string;
  darkColor: string;
  lightIconBg: string;
  darkIconBg: string;
}) {
  const { theme } = useTheme();
  const { locale } = useI18n();
  const isDark = theme === "dark";

  return (
    <Link
      to={`/${id}`}
      className={`group block rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 ${
        isDark
          ? "border-[#1a3050] bg-[#111d32] hover:border-[#29527f]"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isDark ? darkIconBg : lightIconBg}`}>
          <Icon className={`h-5 w-5 ${isDark ? darkColor : lightColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`text-sm font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{getModuleLabel(id, locale)}</h3>
          <p className={`truncate text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{getModuleDescription(id, locale)}</p>
        </div>
        <ArrowRight className={`h-4 w-4 ${isDark ? "text-slate-500" : "text-slate-300"}`} />
      </div>
    </Link>
  );
}

export function SectionHeader({ title, linkTo, linkLabel }: { title: string; linkTo?: string; linkLabel?: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className={`flex items-center gap-2 text-lg font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-[#0057B8] to-[#FFD700]" />
        {title}
      </h2>
      {linkTo && linkLabel ? (
        <Link to={linkTo} className={`flex items-center gap-1 text-xs font-medium ${isDark ? "text-[#4a9eff]" : "text-[#0057B8]"}`}>
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
