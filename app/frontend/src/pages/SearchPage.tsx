import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, X, ArrowLeft, Clock, TrendingUp } from "lucide-react";
import Layout from "@/components/Layout";
import { ListingCard, BusinessCard } from "@/components/Cards";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";
import { SAMPLE_LISTINGS, SAMPLE_BUSINESSES, MODULES, MODULE_ORDER } from "@/lib/platform";
import type { Listing, BusinessProfile } from "@/lib/platform";

const RECENT_SEARCHES_KEY = "uahab-recent-searches";
const MAX_RECENT = 8;

export default function SearchPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [selectedModule, setSelectedModule] = useState("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      try { setRecentSearches(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  const saveSearch = (q: string) => {
    if (!q.trim()) return;
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const handleSearch = (q: string) => {
    setQuery(q);
    if (q.trim()) {
      setSearchParams({ q: q.trim() });
      saveSearch(q.trim());
    } else {
      setSearchParams({});
    }
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const filteredListings = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    let items = SAMPLE_LISTINGS.filter(
      (l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q) || l.city.toLowerCase().includes(q)
    );
    if (selectedModule !== "all") {
      items = items.filter((l) => l.module === selectedModule);
    }
    return items;
  }, [query, selectedModule]);

  const filteredBusinesses = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return SAMPLE_BUSINESSES.filter(
      (b) => b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q) || b.category.toLowerCase().includes(q)
    );
  }, [query]);

  const totalResults = filteredListings.length + (selectedModule === "all" ? filteredBusinesses.length : 0);
  const showResults = query.trim().length > 0;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Link to="/" className={`${isDark ? "text-[#4a9eff]" : "text-[#0057B8]"}`}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className={`text-xl font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>
            {t("search.title")}
          </h1>
        </div>

        {/* Search input */}
        <div className="relative mb-5">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? "text-gray-500" : "text-gray-300"}`} />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t("search.placeholder")}
            autoFocus
            className={`w-full h-12 pl-12 pr-10 text-sm rounded-xl border transition-all focus:outline-none ${
              isDark
                ? "bg-[#111d32] border-[#1a3050] text-gray-200 placeholder:text-gray-600 focus:border-[#4a9eff]"
                : "bg-white border-gray-200 text-gray-700 placeholder:text-gray-300 focus:border-blue-400"
            }`}
          />
          {query && (
            <button onClick={() => handleSearch("")} className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDark ? "text-gray-500" : "text-gray-300"}`}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Module filter tabs */}
        {showResults && (
          <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedModule("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedModule === "all"
                  ? isDark ? "text-[#FFD700] bg-[#FFD700]/10" : "text-[#0057B8] bg-blue-50"
                  : isDark ? "text-gray-400 hover:bg-[#1a2a40]" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {t("filter.all")} ({filteredListings.length + filteredBusinesses.length})
            </button>
            {MODULE_ORDER.map((modId) => {
              const count = SAMPLE_LISTINGS.filter(
                (l) => l.module === modId && (l.title.toLowerCase().includes(query.toLowerCase()) || l.description.toLowerCase().includes(query.toLowerCase()))
              ).length;
              if (count === 0) return null;
              const Icon = MODULES[modId].icon;
              return (
                <button
                  key={modId}
                  onClick={() => setSelectedModule(modId)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedModule === modId
                      ? isDark ? "text-[#FFD700] bg-[#FFD700]/10" : "text-[#0057B8] bg-blue-50"
                      : isDark ? "text-gray-400 hover:bg-[#1a2a40]" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {t(`mod.${modId}`)} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Recent searches */}
        {!showResults && recentSearches.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-bold flex items-center gap-2 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                <Clock className="w-4 h-4" />
                {t("search.recent")}
              </h2>
              <button onClick={clearRecent} className={`text-xs font-medium ${isDark ? "text-red-400" : "text-red-500"}`}>
                Очистити
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSearch(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isDark ? "bg-[#1a2a40] text-gray-300 hover:bg-[#253d5c]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popular searches when no query */}
        {!showResults && recentSearches.length === 0 && (
          <div className="mb-6">
            <h2 className={`text-sm font-bold flex items-center gap-2 mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
              <TrendingUp className="w-4 h-4" />
              Популярні запити
            </h2>
            <div className="flex flex-wrap gap-2">
              {["робота", "квартира", "переклад", "юрист", "NIE", "вакансія", "кімната", "волонтер"].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSearch(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isDark ? "bg-[#1a2a40] text-gray-400 hover:bg-[#253d5c]" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {showResults && (
          <div>
            <p className={`text-xs mb-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              {totalResults} {t("common.results")} "{query}"
            </p>

            {totalResults === 0 && (
              <div className={`text-center py-16 rounded-xl border ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
                <Search className={`w-8 h-8 mx-auto mb-3 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  {t("search.noResults")} "{query}"
                </p>
              </div>
            )}

            {/* Business results */}
            {selectedModule === "all" && filteredBusinesses.length > 0 && (
              <div className="mb-6">
                <h3 className={`text-sm font-bold mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                  {t("mod.business")} ({filteredBusinesses.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredBusinesses.map((biz) => (
                    <BusinessCard key={biz.id} biz={biz} />
                  ))}
                </div>
              </div>
            )}

            {/* Listing results */}
            {filteredListings.length > 0 && (
              <div>
                <h3 className={`text-sm font-bold mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                  {t("common.listings")} ({filteredListings.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredListings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}