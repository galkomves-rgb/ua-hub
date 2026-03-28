import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Menu, X, User, LogOut, Plus, ChevronDown, MessageSquare, Search,
  Briefcase, Home, Wrench, ShoppingBag, Calendar, Users, Building2, Store,
} from "lucide-react";
import { authApi, redirectToAuthEntry, refreshAuthTokenIfPossible } from "@/lib/auth";
import { useTheme } from "@/lib/ThemeContext";
import { useGlobalCity } from "@/lib/global-preferences";
import { useI18n, LOCALES } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { getAPIBaseURL } from "@/lib/config";
import { SAMPLE_BUSINESSES, SAMPLE_LISTINGS } from "@/lib/platform";

const MODULE_NAV = [
  { id: "jobs", icon: Briefcase, path: "/jobs" },
  { id: "housing", icon: Home, path: "/housing" },
  { id: "services", icon: Wrench, path: "/services" },
  { id: "marketplace", icon: ShoppingBag, path: "/marketplace" },
  { id: "events", icon: Calendar, path: "/events" },
  { id: "community", icon: Users, path: "/community" },
  { id: "organizations", icon: Building2, path: "/organizations" },
  { id: "business", icon: Store, path: "/business" },
];

interface LayoutProps {
  children: ReactNode;
  hideModuleNav?: boolean;
}

export default function Layout({ children, hideModuleNav }: LayoutProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { theme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const { city, setCity } = useGlobalCity();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef<HTMLDivElement | null>(null);

  type SearchSuggestion = {
    id: string;
    label: string;
    kind: "module" | "listing" | "business" | "city";
    path: string;
    icon?: React.ElementType;
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authApi.getCurrentUser();
        if (user) {
          setIsLoggedIn(true);
          return;
        }
        setIsLoggedIn(false);
        setUnreadCount(0);
      } catch {
        setIsLoggedIn(false);
        setUnreadCount(0);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      return;
    }

    const loadUnread = async () => {
      try {
        const requestUnread = (token: string | null) =>
          fetch(`${getAPIBaseURL()}/api/v1/messaging/unread-count`, {
            method: "GET",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

        const token = localStorage.getItem("auth_token");
        let res = await requestUnread(token);

        if (res.status === 401) {
          const refreshedToken = await refreshAuthTokenIfPossible();
          if (refreshedToken) {
            res = await requestUnread(refreshedToken);
          }
        }

        if (!res.ok) {
          throw new Error("Unread count request failed");
        }
        const data = await res.json();
        setUnreadCount(data?.count ?? 0);
      } catch {
        setUnreadCount(0);
      }
    };

    void loadUnread();
    const intervalId = window.setInterval(() => {
      void loadUnread();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [isLoggedIn]);

  useEffect(() => {
    setShowMobileMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowSearchSuggestions(false);
  }, [location.pathname]);

  const handleLogin = async () => { redirectToAuthEntry(); };
  const handleLogout = async () => {
    await authApi.logout();
    setIsLoggedIn(false);
    setShowUserMenu(false);
  };
  const handleSearchSubmit = () => {
    const q = searchQuery.trim();
    setShowSearchSuggestions(false);
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  const searchSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length < 2) {
      return {
        modules: [] as SearchSuggestion[],
        cities: [] as SearchSuggestion[],
        listings: [] as SearchSuggestion[],
        businesses: [] as SearchSuggestion[],
      };
    }

    const rankByMatch = (label: string) => {
      const normalized = label.toLowerCase();
      if (normalized.startsWith(query)) return 0;
      if (normalized.includes(` ${query}`)) return 1;
      return 2;
    };

    const sortByRelevance = (items: SearchSuggestion[]) =>
      [...items].sort((a, b) => {
        const rankDiff = rankByMatch(a.label) - rankByMatch(b.label);
        if (rankDiff !== 0) return rankDiff;
        return a.label.localeCompare(b.label);
      });

    const modules = MODULE_NAV
      .map((mod) => ({
        id: `module-${mod.id}`,
        label: t(`mod.${mod.id}`),
        kind: "module" as const,
        path: mod.path,
        icon: mod.icon,
      }))
      .filter((item) => item.label.toLowerCase().includes(query));

    const listings = SAMPLE_LISTINGS
      .filter((listing) =>
        [listing.title, listing.shortDesc, listing.city, listing.authorName]
          .join(" ")
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 5)
      .map((listing) => ({
        id: `listing-${listing.id}`,
        label: listing.title,
        kind: "listing" as const,
        path: `/search?q=${encodeURIComponent(listing.title)}`,
      }));

    const businesses = SAMPLE_BUSINESSES
      .filter((business) =>
        [business.name, business.category, business.shortDesc, business.city]
          .join(" ")
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 4)
      .map((business) => ({
        id: `business-${business.id}`,
        label: business.name,
        kind: "business" as const,
        path: `/search?q=${encodeURIComponent(business.name)}`,
      }));

    const dynamicCities = Array.from(
      new Set([
        ...SAMPLE_LISTINGS.map((listing) => listing.city),
        ...SAMPLE_BUSINESSES.map((business) => business.city),
      ].filter((cityOption) => cityOption?.trim())),
    );

    const cities = dynamicCities
      .filter((cityOption) => cityOption.toLowerCase().includes(query))
      .map((cityOption) => ({
        id: `city-${cityOption}`,
        label: cityOption,
        kind: "city" as const,
        path: `/search?q=${encodeURIComponent(cityOption)}`,
      }));

    return {
      modules: sortByRelevance(modules).slice(0, 5),
      cities: sortByRelevance(cities).slice(0, 5),
      listings: sortByRelevance(listings).slice(0, 4),
      businesses: sortByRelevance(businesses).slice(0, 4),
    };
  }, [searchQuery, t]);

  const totalSuggestions =
    searchSuggestions.modules.length +
    searchSuggestions.cities.length +
    searchSuggestions.listings.length +
    searchSuggestions.businesses.length;

  const getSuggestionTypeLabel = (kind: SearchSuggestion["kind"]) => {
    if (kind === "module") return locale === "ua" ? "Розділ" : locale === "es" ? "Sección" : "Module";
    if (kind === "listing") return locale === "ua" ? "Оголошення" : locale === "es" ? "Anuncio" : "Listing";
    if (kind === "business") return locale === "ua" ? "Бізнес" : locale === "es" ? "Negocio" : "Business";
    return locale === "ua" ? "Місто" : locale === "es" ? "Ciudad" : "City";
  };

  const currentLocale = LOCALES.find((l) => l.code === locale) || LOCALES[0];
  const allCityLabel = locale === "ua" ? "Вся Іспанія" : locale === "es" ? "Toda España" : "All Spain";
  const availableCities = useMemo(() => {
    const citySet = new Set<string>();

    SAMPLE_LISTINGS.forEach((listing) => {
      if (listing.city?.trim()) {
        citySet.add(listing.city.trim());
      }
    });

    SAMPLE_BUSINESSES.forEach((business) => {
      if (business.city?.trim()) {
        citySet.add(business.city.trim());
      }
    });

    if (city !== "All Spain" && city.trim()) {
      citySet.add(city.trim());
    }

    return Array.from(citySet).sort((a, b) => a.localeCompare(b));
  }, [city]);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDark
        ? "bg-gradient-to-b from-[#0a1628] via-[#0d1f3c] to-[#0a1628]"
        : "bg-[#F8F9FB]"
    }`}>
      {/* ─── Top Nav ─── */}
      <nav className={`sticky top-0 z-30 border-b transition-colors duration-300 ${
        isDark
          ? "bg-[#0d1a2e]/95 backdrop-blur-md border-[#1a3050] shadow-lg shadow-black/20"
          : "bg-white/95 backdrop-blur-md border-gray-200/60 shadow-sm"
      }`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="h-14 flex items-center justify-between gap-3">
            {/* Logo */}
            <Link to="/" className="shrink-0">
              <span className={`flex items-center rounded-xl px-2 py-1 ${isDark ? "bg-white/95 shadow-sm" : "bg-transparent"}`}>
                <img src="/uahab-logo.svg" alt="UAHAB" className="h-8 w-auto sm:h-9" />
              </span>
            </Link>

            {/* Desktop Search */}
            <div ref={searchRef} className="relative hidden md:flex flex-1 max-w-xl">
              <div className={`w-full h-9 flex items-center gap-2 rounded-lg border px-3 ${
                isDark ? "bg-[#1a2a40] border-[#253d5c]" : "bg-gray-50 border-gray-200"
              }`}>
                <Search className={`w-4 h-4 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                <input
                  value={searchQuery}
                  onFocus={() => setShowSearchSuggestions(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchSuggestions(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearchSubmit();
                  }}
                  placeholder={t("nav.search")}
                  className={`w-full bg-transparent text-sm outline-none ${
                    isDark ? "text-gray-200 placeholder:text-gray-500" : "text-gray-700 placeholder:text-gray-400"
                  }`}
                />
              </div>

              {showSearchSuggestions && searchQuery.trim().length >= 2 && (
                <div className={`absolute top-full left-0 right-0 mt-2 overflow-hidden rounded-xl border shadow-xl z-50 ${
                  isDark ? "bg-[#162236] border-[#1a3050]" : "bg-white border-gray-200"
                }`}>
                  {totalSuggestions > 0 ? (
                    <>
                      {searchSuggestions.modules.length > 0 && (
                        <div className={`px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                          {locale === "ua" ? "Розділи" : locale === "es" ? "Secciones" : "Modules"}
                        </div>
                      )}
                      {searchSuggestions.modules.map((suggestion) => {
                        const Icon = suggestion.icon;
                        return (
                          <button
                            key={suggestion.id}
                            type="button"
                            onClick={() => {
                              setShowSearchSuggestions(false);
                              setSearchQuery(suggestion.label);
                              navigate(suggestion.path);
                            }}
                            className={`w-full px-3 py-2.5 text-left transition-colors ${
                              isDark ? "hover:bg-[#1a2a40]" : "hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {Icon ? (
                                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${isDark ? "bg-[#1f3350] text-[#4a9eff]" : "bg-blue-50 text-[#0057B8]"}`}>
                                  <Icon className="h-3 w-3" />
                                </span>
                              ) : null}
                              <div className={`text-sm ${isDark ? "text-gray-200" : "text-gray-800"}`}>{suggestion.label}</div>
                            </div>
                            <div className={`mt-0.5 text-[11px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>{getSuggestionTypeLabel(suggestion.kind)}</div>
                          </button>
                        );
                      })}

                      {searchSuggestions.cities.length > 0 && (
                        <div className={`px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                          {locale === "ua" ? "Міста" : locale === "es" ? "Ciudades" : "Cities"}
                        </div>
                      )}
                      {searchSuggestions.cities.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() => {
                            setShowSearchSuggestions(false);
                            setSearchQuery(suggestion.label);
                            navigate(suggestion.path);
                          }}
                          className={`w-full px-3 py-2.5 text-left transition-colors ${
                            isDark ? "hover:bg-[#1a2a40]" : "hover:bg-gray-50"
                          }`}
                        >
                          <div className={`text-sm ${isDark ? "text-gray-200" : "text-gray-800"}`}>{suggestion.label}</div>
                          <div className={`text-[11px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>{getSuggestionTypeLabel(suggestion.kind)}</div>
                        </button>
                      ))}

                      {searchSuggestions.listings.length > 0 && (
                        <div className={`px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                          {locale === "ua" ? "Оголошення" : locale === "es" ? "Anuncios" : "Listings"}
                        </div>
                      )}
                      {searchSuggestions.listings.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() => {
                            setShowSearchSuggestions(false);
                            setSearchQuery(suggestion.label);
                            navigate(suggestion.path);
                          }}
                          className={`w-full px-3 py-2.5 text-left transition-colors ${
                            isDark ? "hover:bg-[#1a2a40]" : "hover:bg-gray-50"
                          }`}
                        >
                          <div className={`text-sm ${isDark ? "text-gray-200" : "text-gray-800"}`}>{suggestion.label}</div>
                          <div className={`text-[11px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>{getSuggestionTypeLabel(suggestion.kind)}</div>
                        </button>
                      ))}

                      {searchSuggestions.businesses.length > 0 && (
                        <div className={`px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                          {locale === "ua" ? "Бізнеси" : locale === "es" ? "Negocios" : "Businesses"}
                        </div>
                      )}
                      {searchSuggestions.businesses.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() => {
                            setShowSearchSuggestions(false);
                            setSearchQuery(suggestion.label);
                            navigate(suggestion.path);
                          }}
                          className={`w-full px-3 py-2.5 text-left transition-colors ${
                            isDark ? "hover:bg-[#1a2a40]" : "hover:bg-gray-50"
                          }`}
                        >
                          <div className={`text-sm ${isDark ? "text-gray-200" : "text-gray-800"}`}>{suggestion.label}</div>
                          <div className={`text-[11px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>{getSuggestionTypeLabel(suggestion.kind)}</div>
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className={`px-3 py-2.5 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      {locale === "ua" ? "Нічого не знайдено" : locale === "es" ? "Sin resultados" : "No results"}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right side (desktop order: categories -> city -> lang -> account) */}
            <div className="flex items-center gap-2">
              {/* Categories dropdown */}
              <div className="relative hidden md:block group">
                <button className={`flex items-center gap-1 h-8 px-2.5 text-xs font-medium rounded-lg border transition-colors ${
                  isDark
                    ? "text-gray-300 bg-[#1a2a40] border-[#253d5c] hover:border-[#FFD700]/30"
                    : "text-gray-600 bg-gray-50 border-gray-200 hover:border-blue-300"
                }`}>
                  {t("nav.modules")} <ChevronDown className="w-3 h-3" />
                </button>
                <div className={`absolute top-full right-0 mt-1 w-48 border rounded-xl shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all ${
                  isDark ? "bg-[#162236] border-[#1a3050]" : "bg-white border-gray-200"
                }`}>
                  {MODULE_NAV.map((mod) => {
                    const Icon = mod.icon;
                    return (
                      <Link
                        key={mod.id}
                        to={mod.path}
                        className={`flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl ${
                          isDark ? "text-gray-300 hover:bg-[#1a2a40]" : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {t(`mod.${mod.id}`)}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Global city selector (desktop) */}
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={`hidden md:block h-8 px-2.5 text-xs font-medium rounded-lg border transition-colors ${
                  isDark
                    ? "text-gray-300 bg-[#1a2a40] border-[#253d5c] hover:border-[#FFD700]/30"
                    : "text-gray-600 bg-gray-50 border-gray-200 hover:border-blue-300"
                }`}
              >
                <option value="All Spain">{allCityLabel}</option>
                {availableCities.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              {/* Language Switcher */}
              <div className="relative hidden md:block">
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg border transition-colors ${
                    isDark
                      ? "text-gray-300 bg-[#1a2a40] border-[#253d5c] hover:border-[#FFD700]/30"
                      : "text-gray-600 bg-gray-50 border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <img src={currentLocale.flagIcon} alt={currentLocale.label} className="w-4 h-3 rounded-sm object-cover" />
                  {currentLocale.label}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showLangMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                    <div className={`absolute right-0 top-full mt-1 w-32 border rounded-xl shadow-xl z-50 ${
                      isDark ? "bg-[#162236] border-[#1a3050]" : "bg-white border-gray-200"
                    }`}>
                      {LOCALES.map((l) => (
                        <button
                          key={l.code}
                          onClick={() => { setLocale(l.code as Locale); setShowLangMenu(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl ${
                            locale === l.code
                              ? isDark ? "text-[#FFD700] bg-[#FFD700]/10" : "text-[#0057B8] bg-blue-50"
                              : isDark ? "text-gray-300 hover:bg-[#1a2a40]" : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <img src={l.flagIcon} alt={l.label} className="w-4 h-3 rounded-sm object-cover" />
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Messages (desktop) */}
              {isLoggedIn && unreadCount > 0 && (
                <Link
                  to="/messages"
                  className={`relative hidden md:flex w-8 h-8 rounded-lg items-center justify-center transition-colors ${
                    isDark ? "text-gray-300 bg-[#1a2a40] border border-[#253d5c] hover:border-[#FFD700]/30" : "text-gray-600 bg-gray-50 border border-gray-200 hover:border-blue-300"
                  }`}
                  aria-label={t("nav.messages")}
                  title={t("nav.messages")}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </Link>
              )}

              {/* Auth */}
              <div className="relative">
                {isLoggedIn ? (
                  <>
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isDark
                          ? "bg-gradient-to-br from-[#FFD700] to-[#e6c200] hover:shadow-md hover:shadow-yellow-500/20"
                          : "bg-gradient-to-br from-[#0057B8] to-[#003d80] hover:shadow-md hover:shadow-blue-200"
                      }`}
                    >
                      <User className={`w-4 h-4 ${isDark ? "text-[#0d1a2e]" : "text-white"}`} />
                    </button>
                    {showUserMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                        <div className={`absolute right-0 top-full mt-2 w-44 border rounded-xl shadow-xl z-50 py-1 ${
                          isDark ? "bg-[#162236] border-[#1a3050]" : "bg-white border-gray-200"
                        }`}>
                          <Link to="/account" className={`flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                            isDark ? "text-gray-300 hover:bg-[#1a2a40]" : "text-gray-700 hover:bg-gray-50"
                          }`}>
                            <User className="w-3.5 h-3.5" /> {t("nav.account")}
                          </Link>
                          <button onClick={handleLogout} className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                            isDark ? "text-gray-400 hover:bg-red-900/30 hover:text-red-400" : "text-gray-600 hover:bg-red-50 hover:text-red-600"
                          }`}>
                            <LogOut className="w-3.5 h-3.5" /> {t("nav.logout")}
                          </button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <button onClick={handleLogin} className={`h-8 px-3 text-xs font-semibold rounded-lg transition-all active:scale-95 ${
                    isDark
                      ? "text-[#0d1a2e] bg-gradient-to-r from-[#FFD700] to-[#e6c200] hover:shadow-md hover:shadow-yellow-500/20"
                      : "text-white bg-gradient-to-r from-[#0057B8] to-[#0070E0] hover:shadow-md hover:shadow-blue-200"
                  }`}>
                    {t("nav.login")}
                  </button>
                )}
              </div>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className={`md:hidden w-8 h-8 rounded-lg flex items-center justify-center ${
                  isDark ? "text-gray-400 hover:bg-[#1a2a40]" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Module nav bar (desktop) */}
        {!hideModuleNav && (
          <div className={`hidden md:block border-t ${isDark ? "border-[#1a3050]" : "border-gray-100"}`}>
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex items-center gap-1 h-10 overflow-x-auto scrollbar-hide">
                {MODULE_NAV.map((mod) => {
                  const Icon = mod.icon;
                  const isActive = location.pathname.startsWith(mod.path);
                  return (
                    <Link
                      key={mod.id}
                      to={mod.path}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? isDark
                            ? "text-[#FFD700] bg-[#FFD700]/10"
                            : "text-[#0057B8] bg-blue-50"
                          : isDark
                            ? "text-gray-500 hover:text-gray-300 hover:bg-[#1a2a40]"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {t(`mod.${mod.id}`)}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Mobile menu */}
        {showMobileMenu && (
          <div className={`md:hidden border-t ${isDark ? "border-[#1a3050] bg-[#0d1a2e]" : "border-gray-100 bg-white"}`}>
            <div className="px-4 py-3 space-y-1">
              {MODULE_NAV.map((mod) => {
                const Icon = mod.icon;
                const isActive = location.pathname.startsWith(mod.path);
                return (
                  <Link
                    key={mod.id}
                    to={mod.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? isDark ? "text-[#FFD700] bg-[#FFD700]/10" : "text-[#0057B8] bg-blue-50"
                        : isDark ? "text-gray-300 hover:bg-[#1a2a40]" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {t(`mod.${mod.id}`)}
                  </Link>
                );
              })}
              <div className={`border-t my-2 ${isDark ? "border-[#1a3050]" : "border-gray-100"}`} />
              <Link
                to="/create"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold ${
                  isDark ? "text-[#FFD700]" : "text-[#0057B8]"
                }`}
              >
                <Plus className="w-4 h-4" />
                {t("nav.create")}
              </Link>
              <Link to="/pricing" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                isDark ? "text-gray-400 hover:bg-[#1a2a40]" : "text-gray-600 hover:bg-gray-50"
              }`}>
                {t("nav.pricing")}
              </Link>
              <Link to="/about" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                isDark ? "text-gray-400 hover:bg-[#1a2a40]" : "text-gray-600 hover:bg-gray-50"
              }`}>
                {t("nav.about")}
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ─── Main Content ─── */}
      <main className="flex-1">{children}</main>

      {/* ─── Footer ─── */}
      <footer className={`border-t transition-colors duration-300 ${
        isDark ? "border-[#1a3050] bg-[#0a1220]" : "border-gray-200/60 bg-white"
      }`}>
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="inline-block mb-3">
                <span className="text-xl font-extrabold">
                  <span className={isDark ? "text-[#4a9eff]" : "text-[#0057B8]"}>UA</span>
                  <span className="text-[#FFD700]">HAB</span>
                </span>
              </Link>
              <p className={`text-xs leading-relaxed ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                {t("hero.subtitle")}
              </p>
            </div>
            {/* Modules */}
            <div>
              <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {t("nav.modules")}
              </h4>
              <div className="space-y-2">
                {MODULE_NAV.slice(0, 5).map((mod) => (
                  <Link key={mod.id} to={mod.path} className={`block text-sm transition-colors ${
                    isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"
                  }`}>
                    {t(`mod.${mod.id}`)}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                &nbsp;
              </h4>
              <div className="space-y-2">
                {MODULE_NAV.slice(5).map((mod) => (
                  <Link key={mod.id} to={mod.path} className={`block text-sm transition-colors ${
                    isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"
                  }`}>
                    {t(`mod.${mod.id}`)}
                  </Link>
                ))}
              </div>
            </div>
            {/* Platform */}
            <div>
              <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {t("nav.about")}
              </h4>
              <div className="space-y-2">
                <Link to="/about" className={`block text-sm transition-colors ${isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}>
                  {t("footer.about")}
                </Link>
                <Link to="/pricing" className={`block text-sm transition-colors ${isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}>
                  {t("footer.pricing")}
                </Link>
                <Link to="/rules" className={`block text-sm transition-colors ${isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}>
                  {t("footer.rules")}
                </Link>
                <Link to="/contacts" className={`block text-sm transition-colors ${isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}>
                  {t("footer.contacts")}
                </Link>
              </div>
            </div>
          </div>
          {/* Bottom */}
          <div className={`border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 ${
            isDark ? "border-[#1a3050]" : "border-gray-100"
          }`}>
            <div className={`w-full h-1 rounded-full mb-3 sm:hidden ${
              isDark
                ? "bg-gradient-to-r from-[#4a9eff] via-[#0057B8] to-[#FFD700]"
                : "bg-gradient-to-r from-[#0057B8] via-[#0057B8] to-[#FFD700]"
            }`} />
            <p className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>
              {t("footer.copyright")}
            </p>
            <div className="flex items-center gap-4">
              <Link to="/rules" className={`text-xs transition-colors ${isDark ? "text-gray-600 hover:text-gray-400" : "text-gray-400 hover:text-gray-600"}`}>
                {t("footer.privacy")}
              </Link>
              <Link to="/rules" className={`text-xs transition-colors ${isDark ? "text-gray-600 hover:text-gray-400" : "text-gray-400 hover:text-gray-600"}`}>
                {t("footer.terms")}
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile FAB for create */}
      <Link
        to="/create"
        className={`sm:hidden fixed bottom-5 right-5 z-30 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-90 ${
          isDark
            ? "bg-gradient-to-br from-[#FFD700] to-[#e6c200] text-[#0d1a2e] shadow-yellow-500/30"
            : "bg-gradient-to-br from-[#0057B8] to-[#0070E0] text-white shadow-blue-300/40"
        }`}
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}
