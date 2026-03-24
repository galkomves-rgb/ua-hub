import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, Search, User, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { LOCALES, useI18n } from "@/lib/i18n";
import { useGlobalCity } from "@/lib/global-preferences";
import { CITY_OPTIONS, MODULES, MODULE_ORDER, getModuleLabel } from "@/lib/platform-data";

interface LayoutProps {
  children: ReactNode;
  hideModuleNav?: boolean;
}

export default function UahubLayout({ children, hideModuleNav }: LayoutProps) {
  const { theme } = useTheme();
  const { locale, setLocale } = useI18n();
  const { city, setCity } = useGlobalCity();
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDark = theme === "dark";
  const [query, setQuery] = useState("");
  const [showModules, setShowModules] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const localeOption = useMemo(() => LOCALES.find((item) => item.code === locale) ?? LOCALES[0], [locale]);

  const submitSearch = () => {
    const nextQuery = query.trim();
    navigate(nextQuery ? `/search?q=${encodeURIComponent(nextQuery)}` : "/search");
    setShowMobileMenu(false);
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
          <Link to="/" className="shrink-0 text-2xl font-black tracking-tight">
            <span className={isDark ? "text-[#4a9eff]" : "text-[#0057B8]"}>UA</span>
            <span className="text-[#FFD700]">HUB</span>
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

          <div className="hidden flex-1 lg:block">
            <div
              className={`flex items-center gap-2 rounded-2xl border px-3 ${
                isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"
              }`}
            >
              <Search className={`h-4 w-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    submitSearch();
                  }
                }}
                placeholder={locale === "ua" ? "Швидкий пошук" : locale === "es" ? "Búsqueda rápida" : "Quick search"}
                className={`h-11 w-full bg-transparent text-sm outline-none ${isDark ? "text-slate-100 placeholder:text-slate-500" : "text-slate-700 placeholder:text-slate-400"}`}
              />
            </div>
          </div>

          <div className="hidden lg:block">
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className={`h-11 rounded-2xl border px-4 text-sm outline-none ${
                isDark ? "border-[#22416b] bg-[#11203a] text-slate-200" : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {CITY_OPTIONS.map((option) => (
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
              <span>{localeOption.flag}</span>
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
                    <span>{option.flag}</span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

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
                  <User className="h-4 w-4" />
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
                {locale === "ua" ? "Увійти" : locale === "es" ? "Entrar" : "Sign in"}
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
                {CITY_OPTIONS.map((option) => (
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
                    {option.flag} {option.label}
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
                  {locale === "ua" ? "Увійти" : locale === "es" ? "Entrar" : "Sign in"}
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
