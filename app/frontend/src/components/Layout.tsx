import { useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Menu, X, User, LogOut, Plus, ChevronDown, MessageSquare, Search,
  Briefcase, Home, Wrench, ShoppingBag, Calendar, Users, Building2, Store,
} from "lucide-react";
import { createClient } from "@metagptx/web-sdk";
import { useTheme } from "@/lib/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";
import { useI18n, LOCALES } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

const client = createClient();

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
  const [unreadCount, setUnreadCount] = useState(0);
  const { theme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await client.auth.me();
        if (user?.data) {
          setIsLoggedIn(true);
          // Load unread count
          try {
            const res = await client.callApi("/api/v1/messaging/unread-count", { method: "GET" });
            if (res?.data?.count) setUnreadCount(res.data.count);
          } catch { /* ignore */ }
        }
      } catch {
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    setShowMobileMenu(false);
  }, [location.pathname]);

  const handleLogin = async () => { await client.auth.toLogin(); };
  const handleLogout = async () => {
    await client.auth.logout();
    setIsLoggedIn(false);
    setShowUserMenu(false);
  };

  const currentLocale = LOCALES.find((l) => l.code === locale) || LOCALES[0];

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
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <span className="text-xl font-extrabold tracking-tight">
                <span className={isDark ? "text-[#4a9eff]" : "text-[#0057B8]"}>UA</span>
                <span className="text-[#FFD700]">HAB</span>
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              {MODULE_NAV.slice(0, 5).map((mod) => {
                const Icon = mod.icon;
                const isActive = location.pathname.startsWith(mod.path);
                return (
                  <Link
                    key={mod.id}
                    to={mod.path}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                      isActive
                        ? isDark
                          ? "text-[#FFD700] bg-[#FFD700]/10"
                          : "text-[#0057B8] bg-blue-50"
                        : isDark
                          ? "text-gray-400 hover:text-gray-200 hover:bg-[#1a2a40]"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t(`mod.${mod.id}`)}
                  </Link>
                );
              })}
              {/* More dropdown */}
              <div className="relative group">
                <button className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  isDark ? "text-gray-400 hover:text-gray-200 hover:bg-[#1a2a40]" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}>
                  {t("nav.modules")} <ChevronDown className="w-3 h-3" />
                </button>
                <div className={`absolute top-full left-0 mt-1 w-48 border rounded-xl shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all ${
                  isDark ? "bg-[#162236] border-[#1a3050]" : "bg-white border-gray-200"
                }`}>
                  {MODULE_NAV.slice(5).map((mod) => {
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
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Create listing CTA */}
              <Link
                to="/create"
                className={`hidden sm:flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg transition-all active:scale-95 ${
                  isDark
                    ? "text-[#0d1a2e] bg-gradient-to-r from-[#FFD700] to-[#e6c200] hover:shadow-md hover:shadow-yellow-500/20"
                    : "text-white bg-gradient-to-r from-[#0057B8] to-[#0070E0] hover:shadow-md hover:shadow-blue-200"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                {t("nav.create")}
              </Link>

              {/* Search */}
              <Link
                to="/search"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  isDark ? "text-gray-400 hover:bg-[#1a2a40] hover:text-gray-200" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                }`}
              >
                <Search className="w-4 h-4" />
              </Link>

              {/* Messages */}
              {isLoggedIn && (
                <Link
                  to="/messages"
                  className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isDark ? "text-gray-400 hover:bg-[#1a2a40] hover:text-gray-200" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Language Switcher */}
              <div className="relative">
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg border transition-colors ${
                    isDark
                      ? "text-gray-300 bg-[#1a2a40] border-[#253d5c] hover:border-[#FFD700]/30"
                      : "text-gray-600 bg-gray-50 border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {currentLocale.flag} {currentLocale.label}
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
                          {l.flag} {l.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <ThemeToggle />

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