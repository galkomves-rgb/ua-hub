import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, MessageSquare, Search, Shield, User, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import ThemeToggle from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUserProfile } from "@/lib/account-api";
import { getAPIBaseURL } from "@/lib/config";
import { useTheme } from "@/lib/ThemeContext";
import { LOCALES, useI18n } from "@/lib/i18n";
import { useGlobalCity } from "@/lib/global-preferences";
import { BUSINESS_PROFILES, LISTINGS, MODULES, MODULE_ORDER, getModuleLabel, searchBusinesses, searchListings } from "@/lib/platform-data";

interface LayoutProps {
  children: ReactNode;
  hideModuleNav?: boolean;
}

export default function UahubLayout({ children, hideModuleNav }: LayoutProps) {
  const { theme } = useTheme();
  const { locale, setLocale } = useI18n();
  const { city, setCity } = useGlobalCity();
  const { user, login, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDark = theme === "dark";
  const [query, setQuery] = useState("");
  const [showModules, setShowModules] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const userProfileQuery = useQuery({
    queryKey: ["header-user-profile", user?.id],
    queryFn: fetchUserProfile,
    enabled: Boolean(user),
    retry: false,
  });
  const avatarUrl = userProfileQuery.data?.avatar_url || null;
  const avatarFallback = (user?.name || user?.email || "U").trim().charAt(0).toUpperCase();

  type SearchSuggestion = {
    id: string;
    label: string;
    kind: "module" | "listing" | "business" | "city";
    path: string;
    icon?: React.ElementType;
  };

  const localeOption = useMemo(() => LOCALES.find((item) => item.code === locale) ?? LOCALES[0], [locale]);

  useEffect(() => {
    const loadUnread = async () => {
      if (!user) {
        setUnreadCount(0);
        return;
      }

      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch(`${getAPIBaseURL()}/api/v1/messaging/unread-count`, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error("Unread count request failed");
        }

        const data = await response.json();
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
  }, [user]);

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

  const submitSearch = () => {
    const nextQuery = query.trim();
    setShowSearchSuggestions(false);
    navigate(nextQuery ? `/search?q=${encodeURIComponent(nextQuery)}` : "/search");
    setShowMobileMenu(false);
  };

  const availableCities = useMemo(() => {
    const citySet = new Set<string>();

    LISTINGS.forEach((listing) => {
      if (listing.city?.trim()) {
        citySet.add(listing.city.trim());
      }
    });

    BUSINESS_PROFILES.forEach((business) => {
      if (business.city?.trim()) {
        citySet.add(business.city.trim());
      }
    });

    if (city !== "All Spain" && city.trim()) {
      citySet.add(city.trim());
    }

    return Array.from(citySet).sort((a, b) => a.localeCompare(b));
  }, [city]);

  const searchSuggestions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2) {
      return {
        modules: [] as SearchSuggestion[],
        cities: [] as SearchSuggestion[],
        listings: [] as SearchSuggestion[],
        businesses: [] as SearchSuggestion[],
      };
    }

    const rankByMatch = (label: string) => {
      const target = label.toLowerCase();
      if (target.startsWith(normalized)) return 0;
      if (target.includes(` ${normalized}`)) return 1;
      return 2;
    };

    const sortByRelevance = (items: SearchSuggestion[]) =>
      [...items].sort((a, b) => {
        const rankDiff = rankByMatch(a.label) - rankByMatch(b.label);
        if (rankDiff !== 0) return rankDiff;
        return a.label.localeCompare(b.label);
      });

    const moduleSuggestions = MODULE_ORDER
      .map((moduleId) => ({
        id: `module-${moduleId}`,
        label: getModuleLabel(moduleId, locale),
        kind: "module" as const,
        path: `/${moduleId}`,
        icon: MODULES[moduleId].icon,
      }))
      .filter((item) => item.label.toLowerCase().includes(normalized));

    const listingSuggestions = searchListings(query)
      .slice(0, 5)
      .map((listing) => ({
        id: `listing-${listing.id}`,
        label: listing.title,
        kind: "listing" as const,
        path: `/search?q=${encodeURIComponent(listing.title)}`,
      }));

    const businessSuggestions = searchBusinesses(query)
      .slice(0, 4)
      .map((business) => ({
        id: `business-${business.id}`,
        label: business.business_name,
        kind: "business" as const,
        path: `/search?q=${encodeURIComponent(business.business_name)}`,
      }));

    const citySuggestions = availableCities
      .filter((cityOption) => cityOption.toLowerCase().includes(normalized))
      .slice(0, 3)
      .map((cityOption) => ({
        id: `city-${cityOption}`,
        label: cityOption,
        kind: "city" as const,
        path: `/search?q=${encodeURIComponent(cityOption)}`,
      }));

    return {
      modules: sortByRelevance(moduleSuggestions).slice(0, 5),
      cities: sortByRelevance(citySuggestions).slice(0, 5),
      listings: sortByRelevance(listingSuggestions).slice(0, 4),
      businesses: sortByRelevance(businessSuggestions).slice(0, 4),
    };
  }, [availableCities, locale, query]);

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

  const isModuleRoute = MODULE_ORDER.some((moduleId) => location.pathname.startsWith(`/${moduleId}`));

  return (
    <div
      className={`min-h-screen ${
        isDark
          ? "bg-[radial-gradient(circle_at_top,_rgba(11,57,112,0.35),_transparent_35%),linear-gradient(180deg,#081425_0%,#0b1930_45%,#081425_100%)]"
          : "bg-[radial-gradient(circle_at_top,_rgba(0,87,184,0.12),_transparent_30%),linear-gradient(180deg,#f8fbff_0%,#f5f7fb_55%,#eef3fb_100%)]"
      }`}
    >
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md ${
          isDark ? "border-[#193255] bg-[#081425]/90" : "border-slate-200/80 bg-white/90"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:px-6">
          <Link to="/" className="shrink-0">
            <span className={`flex items-center rounded-xl px-2 py-1 ${isDark ? "bg-white/95 shadow-sm" : "bg-transparent"}`}>
              <img src="/uahab-logo.svg" alt="UAHAB" className="h-8 w-auto sm:h-9" />
            </span>
          </Link>

          <div className="relative hidden lg:block">
            <button
              type="button"
              onClick={() => setShowModules((current) => !current)}
              className={`flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-medium ${
                isDark ? "border-[#22416b] bg-[#11203a] text-slate-200" : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {locale === "ua" ? "Розділи" : locale === "es" ? "Secciones" : "Modules"}
              <ChevronDown className="h-4 w-4" />
            </button>
            {showModules ? (
              <div
                className={`absolute left-0 top-full mt-2 w-72 rounded-2xl border p-2 shadow-xl ${
                  isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"
                }`}
              >
                {MODULE_ORDER.map((moduleId) => (
                  <Link
                    key={moduleId}
                    to={`/${moduleId}`}
                    onClick={() => setShowModules(false)}
                    className={`block rounded-xl px-3 py-2 text-sm ${
                      isDark ? "text-slate-200 hover:bg-[#162b49]" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {getModuleLabel(moduleId, locale)}
                  </Link>
                ))}
                <Link
                  to="/newcomer"
                  onClick={() => setShowModules(false)}
                  className={`block rounded-xl px-3 py-2 text-sm ${
                    isDark ? "text-slate-200 hover:bg-[#162b49]" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {locale === "ua" ? "Новоприбулим" : locale === "es" ? "Recién llegados" : "Newcomer help"}
                </Link>
              </div>
            ) : null}
          </div>

          <div ref={searchRef} className="relative hidden flex-1 lg:block">
            <div
              className={`flex items-center gap-2 rounded-2xl border px-3 ${
                isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"
              }`}
            >
              <Search className={`h-4 w-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
              <input
                value={query}
                onFocus={() => setShowSearchSuggestions(true)}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setShowSearchSuggestions(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    submitSearch();
                  }
                }}
                placeholder={locale === "ua" ? "Швидкий пошук" : locale === "es" ? "Búsqueda rápida" : "Quick search"}
                className={`h-11 w-full bg-transparent text-sm outline-none ${isDark ? "text-slate-100 placeholder:text-slate-500" : "text-slate-700 placeholder:text-slate-400"}`}
              />
            </div>

            {showSearchSuggestions && query.trim().length >= 2 ? (
              <div
                className={`absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border shadow-xl ${
                  isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"
                }`}
              >
                {totalSuggestions > 0 ? (
                  <>
                    {searchSuggestions.modules.length > 0 && (
                      <div className={`px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
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
                            setQuery(suggestion.label);
                            navigate(suggestion.path);
                          }}
                          className={`w-full px-3 py-2.5 text-left transition-colors ${
                            isDark ? "hover:bg-[#162b49]" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {Icon ? (
                              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${isDark ? "bg-[#1f3350] text-[#4a9eff]" : "bg-blue-50 text-[#0057B8]"}`}>
                                <Icon className="h-3 w-3" />
                              </span>
                            ) : null}
                            <div className={`text-sm ${isDark ? "text-slate-100" : "text-slate-800"}`}>{suggestion.label}</div>
                          </div>
                          <div className={`mt-0.5 text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{getSuggestionTypeLabel(suggestion.kind)}</div>
                        </button>
                      );
                    })}

                    {searchSuggestions.cities.length > 0 && (
                      <div className={`px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        {locale === "ua" ? "Міста" : locale === "es" ? "Ciudades" : "Cities"}
                      </div>
                    )}
                    {searchSuggestions.cities.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => {
                          setShowSearchSuggestions(false);
                          setQuery(suggestion.label);
                          navigate(suggestion.path);
                        }}
                        className={`w-full px-3 py-2.5 text-left transition-colors ${
                          isDark ? "hover:bg-[#162b49]" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className={`text-sm ${isDark ? "text-slate-100" : "text-slate-800"}`}>{suggestion.label}</div>
                        <div className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{getSuggestionTypeLabel(suggestion.kind)}</div>
                      </button>
                    ))}

                    {searchSuggestions.listings.length > 0 && (
                      <div className={`px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        {locale === "ua" ? "Оголошення" : locale === "es" ? "Anuncios" : "Listings"}
                      </div>
                    )}
                    {searchSuggestions.listings.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => {
                          setShowSearchSuggestions(false);
                          setQuery(suggestion.label);
                          navigate(suggestion.path);
                        }}
                        className={`w-full px-3 py-2.5 text-left transition-colors ${
                          isDark ? "hover:bg-[#162b49]" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className={`text-sm ${isDark ? "text-slate-100" : "text-slate-800"}`}>{suggestion.label}</div>
                        <div className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{getSuggestionTypeLabel(suggestion.kind)}</div>
                      </button>
                    ))}

                    {searchSuggestions.businesses.length > 0 && (
                      <div className={`px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        {locale === "ua" ? "Бізнеси" : locale === "es" ? "Negocios" : "Businesses"}
                      </div>
                    )}
                    {searchSuggestions.businesses.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => {
                          setShowSearchSuggestions(false);
                          setQuery(suggestion.label);
                          navigate(suggestion.path);
                        }}
                        className={`w-full px-3 py-2.5 text-left transition-colors ${
                          isDark ? "hover:bg-[#162b49]" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className={`text-sm ${isDark ? "text-slate-100" : "text-slate-800"}`}>{suggestion.label}</div>
                        <div className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{getSuggestionTypeLabel(suggestion.kind)}</div>
                      </button>
                    ))}
                  </>
                ) : (
                  <div className={`px-3 py-2.5 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {locale === "ua" ? "Нічого не знайдено" : locale === "es" ? "Sin resultados" : "No results"}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="hidden lg:block">
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className={`h-11 rounded-2xl border px-4 text-sm outline-none ${
                isDark ? "border-[#22416b] bg-[#11203a] text-slate-200" : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              <option value="All Spain">{locale === "ua" ? "Вся Іспанія" : locale === "es" ? "Toda España" : "All Spain"}</option>
              {availableCities.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="relative hidden lg:block">
            <button
              type="button"
              onClick={() => setShowLangMenu((current) => !current)}
              className={`flex h-11 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold ${
                isDark ? "border-[#22416b] bg-[#11203a] text-slate-200" : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              <img src={localeOption.flagIcon} alt={localeOption.label} className="h-3.5 w-5 rounded-sm object-cover" />
              <span>{localeOption.label}</span>
            </button>
            {showLangMenu ? (
              <div
                className={`absolute right-0 top-full mt-2 w-28 rounded-2xl border p-2 shadow-xl ${
                  isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"
                }`}
              >
                {LOCALES.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => {
                      setLocale(option.code);
                      setShowLangMenu(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                      isDark ? "text-slate-200 hover:bg-[#162b49]" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <img src={option.flagIcon} alt={option.label} className="h-3.5 w-5 rounded-sm object-cover" />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {user ? (
            <Link
              to="/messages"
              className={`relative hidden h-11 w-11 items-center justify-center rounded-2xl border lg:flex ${
                isDark ? "border-[#22416b] bg-[#11203a] text-slate-200" : "border-slate-200 bg-white text-slate-700"
              }`}
              aria-label={t("nav.messages")}
            >
              <MessageSquare className="h-4 w-4" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Link>
          ) : null}

          <ThemeToggle />

          <div className="relative hidden lg:block">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowAccountMenu((current) => !current)}
                  className={`flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-medium ${
                    isDark ? "border-[#22416b] bg-[#11203a] text-slate-100" : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {avatarUrl ? (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={avatarUrl} alt={user.name ?? user.email} className="object-cover" />
                      <AvatarFallback className={isDark ? "bg-[#1a2d4c] text-slate-100" : "bg-slate-100 text-slate-700"}>
                        {avatarFallback}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  <span>{user.name ?? user.email}</span>
                </button>
                {showAccountMenu ? (
                  <div
                    className={`absolute right-0 top-full mt-2 w-52 rounded-2xl border p-2 shadow-xl ${
                      isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"
                    }`}
                  >
                    <Link
                      to="/account"
                      className={`block rounded-xl px-3 py-2 text-sm ${isDark ? "text-slate-200 hover:bg-[#162b49]" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {locale === "ua" ? "Мій акаунт" : locale === "es" ? "Mi cuenta" : "My account"}
                    </Link>
                    {isAdmin ? (
                      <Link
                        to="/admin"
                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${isDark ? "text-slate-200 hover:bg-[#162b49]" : "text-slate-700 hover:bg-slate-50"}`}
                      >
                        <Shield className="h-4 w-4" />
                        {locale === "ua" ? "Адмін центр" : locale === "es" ? "Centro admin" : "Admin center"}
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={logout}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                        isDark ? "text-red-300 hover:bg-red-950/30" : "text-red-600 hover:bg-red-50"
                      }`}
                    >
                      <LogOut className="h-4 w-4" />
                      {locale === "ua" ? "Вийти" : locale === "es" ? "Salir" : "Sign out"}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <button
                type="button"
                onClick={login}
                className={`h-11 rounded-2xl px-4 text-sm font-semibold ${
                  isDark ? "bg-[#FFD700] text-[#0d1a2e]" : "bg-[#0057B8] text-white"
                }`}
              >
                {locale === "ua" ? "Увійти / Реєстрація" : locale === "es" ? "Entrar / Registro" : "Login / Register"}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowMobileMenu((current) => !current)}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border lg:hidden ${
              isDark ? "border-[#22416b] bg-[#11203a] text-slate-200" : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {showMobileMenu ? (
          <div className={`border-t px-4 py-4 lg:hidden ${isDark ? "border-[#193255]" : "border-slate-200"}`}>
            <div className="mb-3 flex items-center gap-2 rounded-2xl border px-3">
              <Search className={`h-4 w-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    submitSearch();
                  }
                }}
                placeholder={locale === "ua" ? "Пошук" : locale === "es" ? "Buscar" : "Search"}
                className={`h-11 w-full bg-transparent text-sm outline-none ${isDark ? "text-slate-100" : "text-slate-700"}`}
              />
            </div>
            <div className="grid gap-3">
              <select
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className={`h-11 rounded-2xl border px-4 text-sm ${
                  isDark ? "border-[#22416b] bg-[#11203a] text-slate-200" : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <option value="All Spain">{locale === "ua" ? "Вся Іспанія" : locale === "es" ? "Toda España" : "All Spain"}</option>
                {availableCities.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-2">
                {LOCALES.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => setLocale(option.code)}
                    className={`rounded-2xl border px-3 py-2 text-sm font-medium ${
                      locale === option.code
                        ? isDark
                          ? "border-[#FFD700]/40 bg-[#FFD700]/10 text-[#FFD700]"
                          : "border-[#0057B8]/30 bg-blue-50 text-[#0057B8]"
                        : isDark
                          ? "border-[#22416b] bg-[#11203a] text-slate-200"
                          : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <img src={option.flagIcon} alt={option.label} className="h-3.5 w-5 rounded-sm object-cover" />
                      <span>{option.label}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="grid gap-2">
                {MODULE_ORDER.map((moduleId) => (
                  <Link
                    key={moduleId}
                    to={`/${moduleId}`}
                    onClick={() => setShowMobileMenu(false)}
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      isDark ? "border-[#22416b] bg-[#11203a] text-slate-200" : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {getModuleLabel(moduleId, locale)}
                  </Link>
                ))}
                <Link
                  to="/newcomer"
                  onClick={() => setShowMobileMenu(false)}
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    isDark ? "border-[#22416b] bg-[#11203a] text-slate-200" : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {locale === "ua" ? "Новоприбулим" : locale === "es" ? "Recién llegados" : "Newcomer help"}
                </Link>
              </div>
              {user ? (
                <Link
                  to="/account"
                  onClick={() => setShowMobileMenu(false)}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                    isDark ? "bg-[#FFD700] text-[#0d1a2e]" : "bg-[#0057B8] text-white"
                  }`}
                >
                  {locale === "ua" ? "Мій акаунт" : locale === "es" ? "Mi cuenta" : "My account"}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={login}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                    isDark ? "bg-[#FFD700] text-[#0d1a2e]" : "bg-[#0057B8] text-white"
                  }`}
                >
                  {locale === "ua" ? "Увійти / Реєстрація" : locale === "es" ? "Entrar / Registro" : "Login / Register"}
                </button>
              )}
            </div>
          </div>
        ) : null}

        {!hideModuleNav && isModuleRoute ? (
          <div className={`hidden border-t lg:block ${isDark ? "border-[#193255]" : "border-slate-200"}`}>
            <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-6 py-3">
              {MODULE_ORDER.map((moduleId) => {
                const active = location.pathname.startsWith(`/${moduleId}`);
                return (
                  <Link
                    key={moduleId}
                    to={`/${moduleId}`}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
                      active
                        ? isDark
                          ? "bg-[#FFD700]/10 text-[#FFD700]"
                          : "bg-blue-50 text-[#0057B8]"
                        : isDark
                          ? "text-slate-400 hover:bg-[#11203a] hover:text-slate-200"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    }`}
                  >
                    {getModuleLabel(moduleId, locale)}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </header>

      <main>{children}</main>
    </div>
  );
}
