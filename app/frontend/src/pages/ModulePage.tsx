import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, X, ChevronDown, ArrowLeft, Home, Plus } from "lucide-react";
import Layout from "@/components/Layout";
import { ListingCard, BusinessCard, SectionHeader } from "@/components/Cards";
import AdBanner from "@/components/AdBanner";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";
import { useGlobalCity } from "@/lib/global-preferences";
import { fetchPublicListings } from "@/lib/public-listings";
import { MODULES, SAMPLE_BUSINESSES, IMAGES } from "@/lib/platform";

function normalizeCityFilter(value: string): string {
  return value === "All Spain" ? "all" : value;
}

export default function ModulePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const moduleId = location.pathname.split("/")[1] || "";
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  const mod = moduleId ? MODULES[moduleId] : null;
  const { city: globalCity, setCity: setGlobalCity } = useGlobalCity();
  const normalizedGlobalCity = normalizeCityFilter(globalCity);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCity, setSelectedCity] = useState(normalizedGlobalCity);
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setSelectedCity(normalizeCityFilter(globalCity));
  }, [globalCity]);

  const isBusiness = moduleId === "business";
  const publicListingsQuery = useQuery({
    queryKey: ["public-module-listings", moduleId, selectedCategory, selectedCity],
    queryFn: () => fetchPublicListings({
      module: moduleId,
      category: selectedCategory === "all" ? undefined : selectedCategory,
      city: selectedCity === "all" ? undefined : selectedCity,
      limit: 100,
    }),
    enabled: Boolean(moduleId) && !isBusiness,
  });
  const allModuleListingsQuery = useQuery({
    queryKey: ["public-module-listings-all", moduleId],
    queryFn: () => fetchPublicListings({ module: moduleId, limit: 100 }),
    enabled: Boolean(moduleId) && !isBusiness,
  });

  // Filter listings
  const filteredListings = useMemo(() => {
    if (!moduleId) return [];
    let items = [...(publicListingsQuery.data ?? [])];

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
  }, [moduleId, publicListingsQuery.data, searchQuery, selectedCategory, selectedCity, selectedType, sortBy]);

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
  const activeCities = useMemo(() => {
    const citySet = new Set<string>();

    if (isBusiness) {
      SAMPLE_BUSINESSES.forEach((business) => {
        if (business.city?.trim()) {
          citySet.add(business.city.trim());
        }
      });
    } else {
      (allModuleListingsQuery.data ?? []).forEach((listing) => {
          if (listing.city?.trim()) {
            citySet.add(listing.city.trim());
          }
        });
    }

    return Array.from(citySet).sort((a, b) => a.localeCompare(b));
  }, [allModuleListingsQuery.data, isBusiness, moduleId]);

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedCity(normalizedGlobalCity);
    setSelectedType("all");
    setSearchQuery("");
  };

  const hasActiveFilters = selectedCategory !== "all" || selectedCity !== "all" || selectedType !== "all" || searchQuery.trim() !== "";
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

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
          <div className="max-w-6xl mx-auto flex items-end justify-between gap-3">
            <div className="flex items-end gap-3">
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
            <Link
              to="/create"
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFD700] to-[#e6c200] px-4 text-xs font-semibold text-[#1a1a00] shadow-lg shadow-yellow-500/20 transition-all hover:shadow-yellow-500/30 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("hero.cta")}
            </Link>
          </div>
        </div>
      </div>

      <div className={`w-full h-0.5 ${isDark ? `bg-gradient-to-r from-transparent via-blue-500/30 to-transparent` : "bg-gradient-to-r from-transparent via-gray-200 to-transparent"}`} />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-4 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={handleBack}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              isDark
                ? "text-gray-200 bg-[#1a2a40] border border-[#253d5c] hover:border-[#FFD700]/30"
                : "text-gray-700 bg-gray-50 border border-gray-200 hover:border-blue-300"
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("detail.back")}
          </button>
          <Link
            to="/"
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              isDark
                ? "text-gray-200 bg-[#1a2a40] border border-[#253d5c] hover:border-[#FFD700]/30"
                : "text-gray-700 bg-gray-50 border border-gray-200 hover:border-blue-300"
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            {t("nav.home")}
          </Link>
        </div>

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
                  onClick={() => {
                    setSelectedCity("all");
                    setGlobalCity("All Spain");
                  }}
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
                    onClick={() => {
                      setSelectedCity(city);
                      setGlobalCity(city);
                    }}
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
                    <button onClick={() => {
                      setSelectedCity("all");
                      setGlobalCity("All Spain");
                    }}><X className="w-3 h-3" /></button>
                  </span>
                )}
                <button onClick={clearFilters} className={`text-xs font-medium ${isDark ? "text-red-400" : "text-red-500"}`}>
                  Скинути
                </button>
              </div>
            )}

            {/* Ad Banner */}
            <AdBanner position="banner" module={moduleId} />

            {!isBusiness && publicListingsQuery.isError ? (
              <div className={`mb-4 rounded-xl border p-4 text-sm ${isDark ? "border-red-900/40 bg-red-950/20 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}>
                {publicListingsQuery.error instanceof Error ? publicListingsQuery.error.message : "Failed to load listings"}
              </div>
            ) : null}

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
