import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, User, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@metagptx/web-sdk";
import GlobalSearch from "@/components/GlobalSearch";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/lib/ThemeContext";

const client = createClient();

const HEADER_IMAGE =
  "https://mgx-backend-cdn.metadl.com/generate/images/1049271/2026-03-23/c10bc500-2a23-49c2-90d6-8787ee4b4906.png";

interface CategoryLayoutProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
  children: React.ReactNode;
}

export default function CategoryLayout({
  icon: Icon,
  title,
  subtitle,
  color,
  bgColor,
  children,
}: CategoryLayoutProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await client.auth.me();
        if (user?.data) {
          setIsLoggedIn(true);
        }
      } catch {
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = async () => {
    await client.auth.toLogin();
  };

  const handleLogout = async () => {
    await client.auth.logout();
    setIsLoggedIn(false);
    setShowMenu(false);
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark
          ? "bg-gradient-to-b from-[#0a1628] via-[#0d1f3c] to-[#0a1628]"
          : "bg-gradient-to-b from-blue-50/40 via-white to-yellow-50/30"
      }`}
    >
      {/* Navigation Bar */}
      <nav
        className={`sticky top-0 z-20 border-b transition-colors duration-300 ${
          isDark
            ? "bg-[#0d1a2e]/95 backdrop-blur-md border-[#1a3050] shadow-lg shadow-black/20"
            : "bg-white/90 backdrop-blur-md border-blue-100 shadow-sm"
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-xl font-extrabold tracking-tight">
              <span className={isDark ? "text-[#4a9eff]" : "text-[#0057B8]"}>
                UA
              </span>
              <span className="text-[#FFD700]">HAB</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <GlobalSearch />
            <nav className="flex items-center gap-1 shrink-0">
              <span
                className={`text-xs font-medium px-2 py-1 rounded-md border transition-colors ${
                  isDark
                    ? "text-[#4a9eff] bg-[#0057B8]/20 border-[#0057B8]/30"
                    : "text-[#0057B8] bg-blue-50 border-blue-100"
                }`}
              >
                🇺🇦 UA
              </span>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-md cursor-pointer border border-transparent transition-all ${
                  isDark
                    ? "text-gray-500 bg-[#1a2a40] hover:bg-[#FFD700]/10 hover:text-[#FFD700] hover:border-[#FFD700]/20"
                    : "text-gray-400 bg-gray-50 hover:bg-yellow-50 hover:text-[#B8860B] hover:border-yellow-200"
                }`}
              >
                🇪🇸 ES
              </span>
            </nav>
            {/* Theme Toggle */}
            <ThemeToggle />
            {/* Auth button */}
            <div className="relative">
              {isLoggedIn ? (
                <>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isDark
                        ? "bg-gradient-to-br from-[#FFD700] to-[#e6c200] hover:shadow-md hover:shadow-yellow-500/20"
                        : "bg-gradient-to-br from-[#0057B8] to-[#003d80] hover:shadow-md hover:shadow-blue-200"
                    }`}
                  >
                    <User
                      className={`w-4 h-4 ${isDark ? "text-[#0d1a2e]" : "text-white"}`}
                    />
                  </button>
                  {showMenu && (
                    <div
                      className={`absolute right-0 top-full mt-2 w-36 border rounded-xl shadow-xl z-50 ${
                        isDark
                          ? "bg-[#162236] border-[#1a3050] shadow-black/40"
                          : "bg-white border-gray-200 shadow-gray-200/50"
                      }`}
                    >
                      <button
                        onClick={handleLogout}
                        className={`w-full px-3 py-2.5 text-sm flex items-center gap-2 rounded-xl transition-colors ${
                          isDark
                            ? "text-gray-400 hover:bg-red-900/30 hover:text-red-400"
                            : "text-gray-600 hover:bg-red-50 hover:text-red-600"
                        }`}
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Вийти
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={handleLogin}
                  className={`h-8 px-3.5 text-xs font-semibold rounded-lg transition-all active:scale-95 ${
                    isDark
                      ? "text-[#0d1a2e] bg-gradient-to-r from-[#FFD700] to-[#e6c200] hover:shadow-md hover:shadow-yellow-500/20"
                      : "text-white bg-gradient-to-r from-[#0057B8] to-[#0070E0] hover:shadow-md hover:shadow-blue-200"
                  }`}
                >
                  Увійти
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mini Hero Banner */}
      <div className="relative w-full h-32 sm:h-36 overflow-hidden">
        <img
          src={HEADER_IMAGE}
          alt="Costa Blanca, Іспанія"
          className="w-full h-full object-cover"
        />
        <div
          className={`absolute inset-0 ${
            isDark
              ? "bg-gradient-to-b from-[#0057B8]/30 via-[#0d1a2e]/30 to-[#0d1f3c]"
              : "bg-gradient-to-b from-[#0057B8]/20 via-transparent to-white/95"
          }`}
        />
      </div>

      {/* Ukrainian accent stripe */}
      <div
        className={`w-full h-1 ${
          isDark
            ? "bg-gradient-to-r from-[#4a9eff] via-[#0057B8] to-[#FFD700] shadow-md shadow-blue-500/20"
            : "bg-gradient-to-r from-[#0057B8] via-[#0057B8] to-[#FFD700]"
        }`}
      />

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          to="/"
          className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors mb-6 ${
            isDark
              ? "text-[#4a9eff] hover:text-[#FFD700]"
              : "text-[#0057B8] hover:text-[#003d80]"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Головна
        </Link>

        {/* Page header */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className={`rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
              isDark ? "bg-opacity-30" : ""
            } ${bgColor}`}
            style={{ width: "3.25rem", height: "3.25rem" }}
          >
            <Icon className={`w-6 h-6 ${color}`} strokeWidth={2} />
          </div>
          <div>
            <h1
              className={`text-xl font-extrabold ${isDark ? "text-gray-100" : "text-gray-900"}`}
            >
              {title}
            </h1>
            <p
              className={`text-sm mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              {subtitle}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className={isDark ? "text-gray-200" : ""}>{children}</div>
      </main>

      {/* Footer */}
      <footer
        className={`border-t transition-colors duration-300 ${
          isDark
            ? "border-[#1a3050] bg-gradient-to-r from-[#0a1628]/50 to-[#0d1a2e]/50"
            : "border-blue-100/50 bg-gradient-to-r from-blue-50/30 to-yellow-50/30"
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-sm font-extrabold">
              <span className={isDark ? "text-[#4a9eff]" : "text-[#0057B8]"}>
                UA
              </span>
              <span className="text-[#FFD700]">HAB</span>
            </span>
          </div>
          <p
            className={`text-xs text-center ${isDark ? "text-gray-600" : "text-gray-400"}`}
          >
            © 2026 UAHAB · Українці в Іспанії та далі
          </p>
        </div>
      </footer>
    </div>
  );
}