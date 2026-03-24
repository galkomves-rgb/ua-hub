import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, SlidersHorizontal, X, ChevronDown, ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import { ListingCard, BusinessCard, SectionHeader } from "@/components/Cards";
import AdBanner from "@/components/AdBanner";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";
import { MODULES, SAMPLE_LISTINGS, SAMPLE_BUSINESSES, CITIES, IMAGES } from "@/lib/platform";

export default function ModulePage() {
  const location = useLocation();
  const moduleId = location.pathname.split("/")[1] || "";
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  const mod = moduleId ? MODULES[moduleId] : null;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  const isBusiness = moduleId === "business";

  // Filter listings
  const filteredListings = useMemo(() => {
    if (!moduleId) return [];
    let items = SAMPLE_LISTINGS.filter((l) => l.module === moduleId);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)
      );
    }
    if (selectedCategory !== "all") {
      items = items.filter((l) => l.category === selectedCategory);
    }
    if (selectedCity !== "all") {
      items = items.filter((l) => l.city === selectedCity);
    }
    if (selectedType === "business") {
      items = items.filter((l) => l.ownerType === "business_profile");
    } else if (selectedType === "private") {
      items = items.filter((l) => l.ownerType === "private_user");
    }

    // Sort
    if (sortBy === "newest") {
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (sortBy === "price_asc") {
      items.sort((a, b) => (parseFloat(a.price || "0") - parseFloat(b.price || "0")));
    } else if (sortBy === "price_desc") {
      items.sort((a, b) => (parseFloat(b.price || "0") - parseFloat(a.price || "0")));
    }

    return items;
  }, [moduleId, searchQuery, selectedCategory, selectedCity, selectedType, sortBy]);

  // Filter businesses
  const filteredBusinesses = useMemo(() => {
    let items = [...SAMPLE_BUSINESSES];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (b) => b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q) || b.category.toLowerCase().includes(q)
      );
    }
    if (selectedCity !== "all") {
      items = items.filter((b) => b.city === selectedCity);
    }
    if (selectedType === "verified") {
      items = items.filter((b) => b.isVerified);
    } else if (selectedType === "premium") {
      items = items.filter((b) => b.isPremium);
    }
    return items;
  }, [searchQuery, selectedCity, selectedType]);

  if (!mod) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h1 className={`text-xl font-bold mb-4 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
            Розділ не знайдено
          </h1>
          <Link to="/" className={`text-sm font-medium ${isDark ? "text-[#4a9eff]" : "text-[#0057B8]"}`}>
            ← {t("nav.home")}
          </Link>
        </div>
      </Layout>
    );
  }

  const Icon = mod.icon;
  const banner = mod.banner || IMAGES.hero;
  const categories = mod.categories;
  const activeListings = isBusiness ? filteredBusinesses : filteredListings;
  const activeCities = isBusiness
    ? [...new Set(SAMPLE_BUSINESSES.map((b) => b.city))]
    : [...new Set(SAMPLE_LISTINGS.filter((l) => l.module === moduleId).map((l) => l.city))];

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedCity("all");
    setSelectedType("all");
    setSearchQuery("");
  };

  const hasActiveFilters = selectedCategory !== "all" || selectedCity !== "all" || selectedType !== "all" || searchQuery.trim() !== "";

  return (
    <Layout>
      {/* Module Banner */}
      <div className="relative w-full h-36 sm:h-44 overflow-hidden">
        <img src={banner} alt={t(`mod.${moduleId}`)} className="w-full h-full object-cover" />
        <div className={`absolute inset-0 ${
          isDark
            ? "bg-gradient-to-b from-transparent via-[#0d1a2e]/50 to-[#0a1628]"
            : "bg-gradient-to-b from-transparent via-black/10 to-[#F8F9FB]"
        }`} />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <div className="max-w-6xl mx-auto flex items-end gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-sm ${
              isDark ? "bg-[#0d1a2e]/80" : "bg-white/80"
            }`}>
              <Icon className={`w-6 h-6 ${isDark ? mod.darkColor : mod.lightColor}`} />
            </div>
            <div>
              <h1 className={`text-xl sm:text-2xl font-extrabold drop-shadow-sm ${isDark ? "text-white" : "text-white"}`}>
                {t(`mod.${moduleId}`)}
              </h1>
              <p className={`text-xs drop-shadow-sm ${isDark ? "text-gray-300" : "text-white/80"}`}>
                {t(`mod.${moduleId}.desc`)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={`w-full h-0.5 ${isDark ? `bg-gradient-to-r from-transparent via-blue-500/30 to-transparent` : "bg-gradient-to-r from-transparent via-gray-200 to-transparent"}`} />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Back link */}
        <Link to="/" className={`inline-flex items-center gap-1.5 text-xs font-medium mb-4 transition-colors ${
          isDark ? "text-[#4a9eff] hover:text-[#FFD700]" : "text-[#0057B8] hover:text-[#003d80]"
        }`}>
          <ArrowLeft className="w-3.5 h-3.5" /> {t("nav.home")}
        </Link>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ─── Sidebar: Categories ─── */}
          <aside className="lg:w-56 shrink-0">
            {/* Categories */}
            {!isBusiness && (
              <div className={`rounded-xl border p-3 mb-4 ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {t("filter.category")}
                </h3>
                <div className="space-y-0.5">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedCategory === "all"
                        ? isDark ? "text-[#FFD700] bg-[#FFD700]/10" : "text-[#0057B8] bg-blue-50"
                        : isDark ? "text-gray-400 hover:bg-[#1a2a40]" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {t("filter.all")}
                  </button>
                  {categories.map((cat) => {
                    const CatIcon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${
                          selectedCategory === cat.id
                            ? isDark ? "text-[#FFD700] bg-[#FFD700]/10" : "text-[#0057B8] bg-blue-50"
                            : isDark ? "text-gray-400 hover:bg-[#1a2a40]" : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <CatIcon className="w-3.5 h-3.5" />
                        {cat.labelKey}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Business filter tabs */}
            {isBusiness && (
              <div className={`rounded-xl border p-3 mb-4 ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {t("filter.type")}
                </h3>
                <div className="space-y-0.5">
                  {[
                    { id: "all", label: t("biz.all") },
                    { id: "verified", label: t("biz.verified") },
                    { id: "premium", label: t("biz.premium") },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedType(opt.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedType === opt.id
                          ? isDark ? "text-[#FFD700] bg-[#FFD700]/10" : "text-[#0057B8] bg-blue-50"
                          : isDark ? "text-gray-400 hover:bg-[#1a2a40]" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* City filter */}
            <div className={`rounded-xl border p-3 ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {t("filter.city")}
              </h3>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                <button
                  onClick={() => setSelectedCity("all")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedCity === "all"
                      ? isDark ? "text-[#FFD700] bg-[#FFD700]/10" : "text-[#0057B8] bg-blue-50"
                      : isDark ? "text-gray-400 hover:bg-[#1a2a40]" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t("filter.all")}
                </button>
                {activeCities.map((city) => (
                  <button
                    key={city}
                    onClick={() => setSelectedCity(city)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedCity === city
                        ? isDark ? "text-[#FFD700] bg-[#FFD700]/10" : "text-[#0057B8] bg-blue-50"
                        : isDark ? "text-gray-400 hover:bg-[#1a2a40]" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* ─── Main Content ─── */}
          <div className="flex-1 min-w-0">
            {/* Search + Sort bar */}
            <div className={`flex flex-col sm:flex-row gap-3 mb-5`}>
              {/* Search */}
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-gray-500" : "text-gray-300"}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("nav.search")}
                  className={`w-full h-9 pl-9 pr-9 text-sm rounded-lg border transition-all focus:outline-none ${
                    isDark
                      ? "bg-[#111d32] border-[#1a3050] text-gray-200 placeholder:text-gray-600 focus:border-[#4a9eff]"
                      : "bg-white border-gray-200 text-gray-700 placeholder:text-gray-300 focus:border-blue-400"
                  }`}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? "text-gray-500" : "text-gray-300"}`}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`h-9 pl-3 pr-8 text-xs font-medium rounded-lg border appearance-none cursor-pointer transition-all focus:outline-none ${
                    isDark
                      ? "bg-[#111d32] border-[#1a3050] text-gray-300 focus:border-[#4a9eff]"
                      : "bg-white border-gray-200 text-gray-600 focus:border-blue-400"
                  }`}
                >
                  <option value="newest">{t("sort.newest")}</option>
                  <option value="featured">{t("sort.featured")}</option>
                  <option value="price_asc">{t("sort.price_asc")}</option>
                  <option value="price_desc">{t("sort.price_desc")}</option>
                </select>
                <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${isDark ? "text-gray-500" : "text-gray-400"}`} />
              </div>

              {/* Mobile filter toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`lg:hidden h-9 px-3 flex items-center gap-1.5 text-xs font-medium rounded-lg border transition-all ${
                  isDark ? "bg-[#111d32] border-[#1a3050] text-gray-300" : "bg-white border-gray-200 text-gray-600"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {t("filter.category")}
              </button>
            </div>

            {/* Active filters */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {selectedCategory !== "all" && (
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg ${isDark ? "bg-[#1a2a40] text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                    {categories.find((c) => c.id === selectedCategory)?.labelKey}
                    <button onClick={() => setSelectedCategory("all")}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedCity !== "all" && (
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg ${isDark ? "bg-[#1a2a40] text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                    {selectedCity}
                    <button onClick={() => setSelectedCity("all")}><X className="w-3 h-3" /></button>
                  </span>
                )}
                <button onClick={clearFilters} className={`text-xs font-medium ${isDark ? "text-red-400" : "text-red-500"}`}>
                  Скинути
                </button>
              </div>
            )}

            {/* Ad Banner */}
            <AdBanner position="banner" module={moduleId} />

            {/* Results count */}
            <p className={`text-xs mb-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              {activeListings.length} {t("common.results")}
            </p>

            {/* Listings grid */}
            {activeListings.length === 0 ? (
              <div className={`text-center py-16 rounded-xl border ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
                <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("common.noResults")}</p>
              </div>
            ) : isBusiness ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(filteredBusinesses as BusinessProfile[]).map((biz) => (
                  <BusinessCard key={biz.id} biz={biz} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

// BusinessProfile type used above via cast
import type { BusinessProfile } from "@/lib/platform";