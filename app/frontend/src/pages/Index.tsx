import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, TrendingUp, Shield, Users as UsersIcon } from "lucide-react";
import Layout from "@/components/Layout";
import { ListingCard, BusinessCard, ModuleCard, SectionHeader } from "@/components/Cards";
import { deriveListingLabels } from "@/lib/label-taxonomy";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";
import { useGlobalCity } from "@/lib/global-preferences";
import { fetchPublicListings } from "@/lib/public-listings";
import { MODULES, MODULE_ORDER, SAMPLE_BUSINESSES, IMAGES } from "@/lib/platform";

export default function HomePage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { city: globalCity } = useGlobalCity();
  const isDark = theme === "dark";

  const selectedCity = globalCity === "All Spain" ? "all" : globalCity;
  const cityFilteredBusinesses = selectedCity === "all"
    ? SAMPLE_BUSINESSES
    : SAMPLE_BUSINESSES.filter((business) => business.city === selectedCity);
  const listingsQuery = useQuery({
    queryKey: ["public-home-listings", selectedCity],
    queryFn: () => fetchPublicListings({ city: selectedCity === "all" ? undefined : selectedCity, limit: 100 }),
  });
  const cityFilteredListings = listingsQuery.data ?? [];

  const featuredListings = useMemo(
    () => cityFilteredListings.filter((listing) => deriveListingLabels(listing).includes("featured")).slice(0, 4),
    [cityFilteredListings],
  );
  const upcomingEvents = cityFilteredListings.filter((l) => l.module === "events").slice(0, 3);
  const verifiedBusinesses = cityFilteredBusinesses
    .filter((b) => (b as { isVerified?: boolean; verified?: boolean }).isVerified || (b as { verified?: boolean }).verified)
    .slice(0, 4);
  const latestListings = cityFilteredListings.slice(0, 6);

  return (
    <Layout hideModuleNav>
      {/* ─── Hero ─── */}
      <div className="relative w-full overflow-hidden" style={{ height: "clamp(280px, 40vh, 420px)" }}>
        <img
          src={IMAGES.hero}
          alt="Costa Blanca, Spain"
          className="w-full h-full object-cover"
        />
        <div className={`absolute inset-0 ${
          isDark
            ? "bg-gradient-to-b from-[#0057B8]/30 via-[#0d1a2e]/40 to-[#0a1628]"
            : "bg-gradient-to-b from-[#0057B8]/20 via-black/10 to-[#F8F9FB]"
        }`} />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-6xl mx-auto px-4 pb-8 w-full">
            <h1 className={`text-3xl sm:text-4xl font-extrabold mb-2 drop-shadow-md ${
              isDark ? "text-white" : "text-white"
            }`}>
              {t("hero.title")}
            </h1>
            <p className={`text-sm sm:text-base mb-5 max-w-xl drop-shadow-sm ${
              isDark ? "text-gray-300" : "text-white/90"
            }`}>
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/create"
                className="inline-flex items-center gap-2 h-10 px-5 text-sm font-semibold rounded-xl bg-gradient-to-r from-[#FFD700] to-[#e6c200] text-[#1a1a00] hover:shadow-lg hover:shadow-yellow-500/30 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                {t("hero.cta")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Ukrainian accent stripe */}
      <div className={`w-full h-1 ${
        isDark
          ? "bg-gradient-to-r from-[#4a9eff] via-[#0057B8] to-[#FFD700]"
          : "bg-gradient-to-r from-[#0057B8] via-[#0057B8] to-[#FFD700]"
      }`} />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* ─── Modules Grid ─── */}
        <section>
          <SectionHeader title={t("home.modules")} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {MODULE_ORDER.map((modId) => {
              const mod = MODULES[modId];
              return (
                <ModuleCard
                  key={modId}
                  id={modId}
                  icon={mod.icon}
                  lightColor={mod.lightColor}
                  darkColor={mod.darkColor}
                  lightIconBg={mod.lightIconBg}
                  darkIconBg={mod.darkIconBg}
                />
              );
            })}
          </div>
        </section>

        {/* ─── Featured Listings ─── */}
        <section>
          <SectionHeader title={t("home.featured")} linkTo="/jobs" linkLabel={t("common.showAll")} />
          {listingsQuery.isError ? (
            <div className={`mb-4 rounded-xl border p-4 text-sm ${isDark ? "border-red-900/40 bg-red-950/20 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}>
              {listingsQuery.error instanceof Error ? listingsQuery.error.message : "Failed to load listings"}
            </div>
          ) : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>

        {/* ─── Upcoming Events ─── */}
        <section>
          <SectionHeader title={t("home.events")} linkTo="/events" linkLabel={t("common.showAll")} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {upcomingEvents.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>

        {/* ─── Verified Businesses ─── */}
        <section>
          <SectionHeader title={t("home.businesses")} linkTo="/business" linkLabel={t("common.showAll")} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {verifiedBusinesses.map((biz) => (
              <BusinessCard key={biz.id} biz={biz} />
            ))}
          </div>
        </section>

        {/* ─── Latest Listings ─── */}
        <section>
          <SectionHeader title={t("sort.newest")} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {latestListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>

        {/* ─── CTA Section ─── */}
        <section className={`rounded-2xl p-8 text-center border ${
          isDark
            ? "bg-gradient-to-br from-[#0057B8]/20 via-[#111d32] to-[#FFD700]/10 border-[#1a3050]"
            : "bg-gradient-to-br from-blue-50 via-white to-yellow-50 border-gray-200"
        }`}>
          <h2 className={`text-xl font-bold mb-2 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
            {t("home.cta.title")}
          </h2>
          <p className={`text-sm mb-5 max-w-md mx-auto ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {t("home.cta.desc")}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/create"
              className={`inline-flex items-center gap-2 h-10 px-6 text-sm font-semibold rounded-xl transition-all active:scale-95 ${
                isDark
                  ? "bg-gradient-to-r from-[#FFD700] to-[#e6c200] text-[#0d1a2e] hover:shadow-md hover:shadow-yellow-500/20"
                  : "bg-gradient-to-r from-[#0057B8] to-[#0070E0] text-white hover:shadow-md hover:shadow-blue-200"
              }`}
            >
              <Plus className="w-4 h-4" />
              {t("home.cta.button")}
            </Link>
            <Link
              to="/pricing"
              className={`inline-flex items-center gap-2 h-10 px-6 text-sm font-semibold rounded-xl border transition-all ${
                isDark
                  ? "border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/10"
                  : "border-[#0057B8] text-[#0057B8] hover:bg-blue-50"
              }`}
            >
              {t("home.cta.business")}
            </Link>
          </div>
        </section>

        {/* ─── Trust Indicators ─── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Shield, title: isDark ? "Безпечна платформа" : "Безпечна платформа", desc: "Модерація оголошень та перевірені бізнеси" },
            { icon: UsersIcon, title: "Українська громада", desc: "Тисячі українців по всій Іспанії" },
            { icon: TrendingUp, title: "Зростаємо разом", desc: "Нові можливості щодня" },
          ].map((item, i) => (
            <div key={i} className={`flex items-start gap-3 rounded-xl p-4 border ${
              isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDark ? "bg-[#0057B8]/20" : "bg-blue-50"
              }`}>
                <item.icon className={`w-5 h-5 ${isDark ? "text-[#4a9eff]" : "text-[#0057B8]"}`} />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>{item.title}</h3>
                <p className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{item.desc}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </Layout>
  );
}
