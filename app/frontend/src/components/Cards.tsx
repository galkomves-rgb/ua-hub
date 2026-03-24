import { Link } from "react-router-dom";
import {
  MapPin, Clock, CheckCircle, Star, Zap, Briefcase, User,
  Wifi, Globe, Heart, Calendar, BadgeCheck, ArrowRight,
} from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";
import type { Listing, BusinessProfile } from "@/lib/platform";

// ─── Badge Component ───
function Badge({ type }: { type: string }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  const config: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
    verified: { label: t("card.verified"), icon: CheckCircle, cls: isDark ? "text-emerald-400 bg-emerald-900/30 border-emerald-700/40" : "text-emerald-600 bg-emerald-50 border-emerald-200" },
    premium: { label: t("card.premium"), icon: Star, cls: isDark ? "text-amber-400 bg-amber-900/30 border-amber-700/40" : "text-amber-600 bg-amber-50 border-amber-200" },
    featured: { label: t("card.featured"), icon: Zap, cls: isDark ? "text-blue-400 bg-blue-900/30 border-blue-700/40" : "text-blue-600 bg-blue-50 border-blue-200" },
    business: { label: t("card.business"), icon: Briefcase, cls: isDark ? "text-indigo-400 bg-indigo-900/30 border-indigo-700/40" : "text-indigo-600 bg-indigo-50 border-indigo-200" },
    private: { label: t("card.private"), icon: User, cls: isDark ? "text-gray-400 bg-gray-800 border-gray-700" : "text-gray-500 bg-gray-50 border-gray-200" },
    free: { label: t("card.free"), icon: Heart, cls: isDark ? "text-green-400 bg-green-900/30 border-green-700/40" : "text-green-600 bg-green-50 border-green-200" },
    new: { label: t("card.new"), icon: Zap, cls: isDark ? "text-cyan-400 bg-cyan-900/30 border-cyan-700/40" : "text-cyan-600 bg-cyan-50 border-cyan-200" },
    urgent: { label: t("card.urgent"), icon: Zap, cls: isDark ? "text-red-400 bg-red-900/30 border-red-700/40" : "text-red-600 bg-red-50 border-red-200" },
    remote: { label: t("card.remote"), icon: Wifi, cls: isDark ? "text-purple-400 bg-purple-900/30 border-purple-700/40" : "text-purple-600 bg-purple-50 border-purple-200" },
    online: { label: t("card.online"), icon: Globe, cls: isDark ? "text-teal-400 bg-teal-900/30 border-teal-700/40" : "text-teal-600 bg-teal-50 border-teal-200" },
  };

  const c = config[type];
  if (!c) return null;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded border ${c.cls}`}>
      <Icon className="w-2.5 h-2.5" />
      {c.label}
    </span>
  );
}

// ─── Listing Card ───
export function ListingCard({ listing }: { listing: Listing }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  const isEvent = listing.module === "events";
  const hasImage = !!listing.image;

  return (
    <Link
      to={`/${listing.module}/${listing.id}`}
      className={`group block rounded-xl overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 ${
        isDark
          ? "bg-[#111d32] border-[#1a3050] hover:border-[#253d5c] hover:shadow-lg hover:shadow-[#0057B8]/5"
          : "bg-white border-gray-200/80 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-100"
      }`}
    >
      {/* Image area */}
      {hasImage && (
        <div className="relative h-40 overflow-hidden">
          <img src={listing.image} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      )}

      <div className="p-4">
        {/* Badges */}
        {listing.badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {listing.badges.map((b) => <Badge key={b} type={b} />)}
          </div>
        )}

        {/* Title */}
        <h3 className={`text-sm font-bold leading-snug mb-1 line-clamp-2 group-hover:text-[#0057B8] transition-colors ${
          isDark ? "text-gray-100 group-hover:text-[#4a9eff]" : "text-gray-900"
        }`}>
          {listing.title}
        </h3>

        {/* Description */}
        <p className={`text-xs leading-relaxed mb-3 line-clamp-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
          {listing.description}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap mb-2">
          {listing.price && (
            <span className={`text-sm font-bold ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`}>
              {listing.price} {listing.currency}
            </span>
          )}
          {isEvent && listing.date && (
            <span className={`flex items-center gap-1 text-xs ${isDark ? "text-amber-400" : "text-amber-600"}`}>
              <Calendar className="w-3 h-3" />
              {listing.date}
            </span>
          )}
          {listing.meta?.time && (
            <span className={`flex items-center gap-1 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              <Clock className="w-3 h-3" />
              {listing.meta.time}
            </span>
          )}
        </div>

        {/* Module-specific meta */}
        {listing.meta && (
          <div className="flex flex-wrap gap-2 mb-3">
            {Object.entries(listing.meta).filter(([k]) => !["time", "place"].includes(k)).map(([key, val]) => (
              <span key={key} className={`text-[11px] px-2 py-0.5 rounded-md ${
                isDark ? "bg-[#1a2a40] text-gray-400" : "bg-gray-50 text-gray-500"
              }`}>
                {val}
              </span>
            ))}
          </div>
        )}

        {/* Footer: location + owner */}
        <div className={`flex items-center justify-between pt-2 border-t ${isDark ? "border-[#1a3050]" : "border-gray-100"}`}>
          <span className={`flex items-center gap-1 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            <MapPin className="w-3 h-3" />
            {listing.city}
          </span>
          <span className={`flex items-center gap-1 text-[11px] ${isDark ? "text-gray-600" : "text-gray-400"}`}>
            {listing.ownerType === "business_profile" ? <Briefcase className="w-3 h-3" /> : <User className="w-3 h-3" />}
            {listing.ownerType}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Business Card ───
export function BusinessCard({ biz }: { biz: BusinessProfile }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Link
      to={`/business/${biz.id}`}
      className={`group block rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 ${
        isDark
          ? `bg-[#111d32] hover:shadow-lg hover:shadow-[#0057B8]/5 ${biz.premium ? "border-[#FFD700]/30 hover:border-[#FFD700]/50" : "border-[#1a3050] hover:border-[#253d5c]"}`
          : `bg-white hover:shadow-lg hover:shadow-gray-100 ${biz.premium ? "border-amber-200 hover:border-amber-300" : "border-gray-200/80 hover:border-gray-300"}`
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Logo placeholder */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${
          isDark ? "bg-[#1a2a40] text-[#4a9eff]" : "bg-blue-50 text-[#0057B8]"
        }`}>
          {biz.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-sm font-bold truncate group-hover:text-[#0057B8] transition-colors ${
              isDark ? "text-gray-100 group-hover:text-[#4a9eff]" : "text-gray-900"
            }`}>
              {biz.name}
            </h3>
            {biz.isVerified && <BadgeCheck className={`w-4 h-4 shrink-0 ${isDark ? "text-emerald-400" : "text-emerald-500"}`} />}
            {biz.isPremium && <Star className={`w-3.5 h-3.5 shrink-0 ${isDark ? "text-[#FFD700]" : "text-amber-500"}`} />}
          </div>
          <p className={`text-xs mb-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{biz.category}</p>
          <p className={`text-xs leading-relaxed line-clamp-2 mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {biz.description}
          </p>
          <div className="flex items-center justify-between">
            <span className={`flex items-center gap-1 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              <MapPin className="w-3 h-3" /> {biz.city}
            </span>
            {biz.rating && (
              <span className={`flex items-center gap-1 text-xs font-semibold ${isDark ? "text-[#FFD700]" : "text-amber-500"}`}>
                <Star className="w-3 h-3 fill-current" /> {biz.rating}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Module Card (for homepage grid) ───
export function ModuleCard({ id, icon: Icon, lightColor, darkColor, lightIconBg, darkIconBg, count }: {
  id: string;
  icon: React.ElementType;
  lightColor: string;
  darkColor: string;
  lightIconBg: string;
  darkIconBg: string;
  count?: number;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  return (
    <Link
      to={`/${id}`}
      className={`group block rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5 border ${
        isDark
          ? "bg-[#111d32] border-[#1a3050] hover:border-[#253d5c] hover:shadow-lg hover:shadow-[#0057B8]/5"
          : "bg-white border-gray-200/80 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-100"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
          isDark ? darkIconBg : lightIconBg
        }`}>
          <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isDark ? darkColor : lightColor}`} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`text-sm font-bold leading-tight transition-colors ${
            isDark ? "text-gray-100 group-hover:text-[#FFD700]" : "text-gray-900 group-hover:text-[#0057B8]"
          }`}>
            {t(`mod.${id}`)}
          </h3>
          <p className={`text-xs mt-0.5 truncate ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            {t(`mod.${id}.desc`)}
          </p>
        </div>
        <ArrowRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 ${
          isDark ? "text-gray-500" : "text-gray-300"
        }`} />
      </div>
    </Link>
  );
}

// ─── Section Header ───
export function SectionHeader({ title, linkTo, linkLabel }: { title: string; linkTo?: string; linkLabel?: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? "text-gray-100" : "text-gray-800"}`}>
        <span className="w-1 h-5 bg-gradient-to-b from-[#0057B8] to-[#FFD700] rounded-full" />
        {title}
      </h2>
      {linkTo && (
        <Link to={linkTo} className={`text-xs font-medium flex items-center gap-1 transition-colors ${
          isDark ? "text-[#4a9eff] hover:text-[#FFD700]" : "text-[#0057B8] hover:text-[#003d80]"
        }`}>
          {linkLabel} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}