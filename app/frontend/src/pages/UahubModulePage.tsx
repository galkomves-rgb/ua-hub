import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Lock, Search, SlidersHorizontal } from "lucide-react";
import UahubLayout from "@/components/UahubLayout";
import { BusinessCard, ListingCard, SectionHeader } from "@/components/PlatformCards";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";
import { useGlobalCity } from "@/lib/global-preferences";
import {
  BUSINESS_PROFILES,
  MODULES,
  getCategoryLabel,
  getListingsByModule,
  getModuleDescription,
  getModuleLabel,
  localizeText,
  type Listing,
  type ModuleId,
} from "@/lib/platform-data";

function parseRoute(pathname: string): ModuleId {
  return pathname.split("/")[1] as ModuleId;
}

export default function UahubModulePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const moduleId = parseRoute(location.pathname);
  const { theme } = useTheme();
  const { locale, t } = useI18n();
  const { city } = useGlobalCity();
  const { user, login } = useAuth();
  const isDark = theme === "dark";
  const module = MODULES[moduleId];
  const [category, setCategory] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [priceMode, setPriceMode] = useState("all");
  const [query, setQuery] = useState("");

  const listings = useMemo(() => getListingsByModule(moduleId), [moduleId]);

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const matchesCategory = category === "all" ? true : listing.category === category;
      const matchesCity = city === "All Spain" ? true : listing.city === city;
      const matchesOwner =
        ownerFilter === "all"
          ? true
          : ownerFilter === "private"
            ? listing.owner_type === "private_user"
            : ownerFilter === "business"
              ? listing.owner_type === "business_profile"
              : listing.owner_type === "organization";
      const matchesVerified = verifiedOnly ? listing.is_verified : true;
      const matchesPrice =
        priceMode === "all"
          ? true
          : priceMode === "paid"
            ? Boolean(listing.price || listing.salary)
            : !listing.price && !listing.salary;
      const matchesQuery =
        query.trim() === ""
          ? true
          : [listing.title, listing.description, listing.owner_name, listing.city]
              .join(" ")
              .toLowerCase()
              .includes(query.trim().toLowerCase());

      return matchesCategory && matchesCity && matchesOwner && matchesVerified && matchesPrice && matchesQuery;
    });
  }, [category, city, listings, ownerFilter, priceMode, query, verifiedOnly]);

  const filteredBusinesses = useMemo(() => {
    return BUSINESS_PROFILES.filter((business) => {
      const matchesCity = city === "All Spain" ? true : business.city === city;
      const matchesQuery =
        query.trim() === ""
          ? true
          : [business.business_name, business.description, business.city]
              .join(" ")
              .toLowerCase()
              .includes(query.trim().toLowerCase());
      const matchesCategory =
        category === "all"
          ? true
          : category === "verified-biz"
            ? business.is_verified
            : category === "premium-biz"
              ? business.is_premium
              : true;
      const matchesVerified = verifiedOnly ? business.is_verified : true;
      return matchesCity && matchesQuery && matchesCategory && matchesVerified;
    });
  }, [category, city, query, verifiedOnly]);

  if (!module) {
    return null;
  }

  const communityLocked = moduleId === "community" && !user;
  const activeCount = moduleId === "business" ? filteredBusinesses.length : filteredListings.length;
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  return (
    <UahubLayout>
      <section className="relative overflow-hidden">
        <img src={module.banner} alt={getModuleLabel(moduleId, locale)} className="h-60 w-full object-cover" />
        <div className={`absolute inset-0 ${isDark ? "bg-gradient-to-r from-[#081425] via-[#081425]/70 to-transparent" : "bg-gradient-to-r from-[#0c376b]/70 via-[#0c376b]/35 to-transparent"}`} />
        <div className="absolute inset-0 mx-auto flex max-w-7xl items-end px-4 pb-8 lg:px-6">
          <div>
            <p className="mb-2 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
              {locale === "ua" ? "Модуль" : locale === "es" ? "Módulo" : "Module"}
            </p>
            <h1 className="text-4xl font-black text-white">{getModuleLabel(moduleId, locale)}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85">{getModuleDescription(moduleId, locale)}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <div className="mb-6 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={handleBack}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
              isDark
                ? "border-[#22416b] bg-[#11203a] text-slate-200 hover:border-[#FFD700]/40"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300"
            }`}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {locale === "ua" ? "Назад" : locale === "es" ? "Atrás" : "Back"}
          </button>
          <Link
            to="/"
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
              isDark
                ? "border-[#22416b] bg-[#11203a] text-slate-200 hover:border-[#FFD700]/40"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300"
            }`}
          >
            <Home className="h-3.5 w-3.5" />
            {locale === "ua" ? "На головну" : locale === "es" ? "Inicio" : "Home"}
          </Link>
        </div>

        {communityLocked ? (
          <div className={`rounded-[32px] border p-10 text-center ${isDark ? "border-[#1a3050] bg-[#111d32]" : "border-slate-200 bg-white"}`}>
            <Lock className={`mx-auto mb-4 h-10 w-10 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
            <h2 className={`mb-3 text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              {locale === "ua" ? "Спільнота доступна після входу" : locale === "es" ? "La comunidad requiere inicio de sesión" : "Community requires sign-in"}
            </h2>
            <p className={`mx-auto max-w-2xl text-sm leading-7 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {locale === "ua"
                ? "Цей розділ доступний лише зареєстрованим користувачам. Увійдіть, щоб бачити спільноту, спілкуватися та брати участь у локальних ініціативах."
                : locale === "es"
                  ? "Esta sección solo está disponible para usuarios registrados. Inicia sesión para ver la comunidad, comunicarte y participar en iniciativas locales."
                  : "This section is available only to registered users. Sign in to view the community, connect with others, and take part in local initiatives."}
            </p>
            <button
              type="button"
              onClick={login}
              className={`mt-6 rounded-2xl px-5 py-3 text-sm font-semibold ${isDark ? "bg-[#FFD700] text-[#0d1a2e]" : "bg-[#0057B8] text-white"}`}
            >
              {locale === "ua" ? "Увійти / Реєстрація" : locale === "es" ? "Entrar / Registro" : "Login / Register"}
            </button>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
            <aside className={`rounded-[28px] border p-5 ${isDark ? "border-[#1a3050] bg-[#111d32]" : "border-slate-200 bg-white"}`}>
              <div className="mb-4 flex items-center gap-2">
                <SlidersHorizontal className={`h-4 w-4 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
                <h2 className={`text-sm font-bold uppercase tracking-[0.18em] ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {locale === "ua" ? "Фільтри" : locale === "es" ? "Filtros" : "Filters"}
                </h2>
              </div>

              <div className="mb-4">
                <label className={`mb-2 block text-xs font-semibold uppercase tracking-[0.16em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {locale === "ua" ? "Категорія" : locale === "es" ? "Categoría" : "Category"}
                </label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-200" : "border-slate-200 bg-white text-slate-700"}`}
                >
                  <option value="all">{locale === "ua" ? "Усі" : locale === "es" ? "Todos" : "All"}</option>
                  {module.categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {localizeText(item.label, locale)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className={`mb-2 block text-xs font-semibold uppercase tracking-[0.16em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {locale === "ua" ? "Власник" : locale === "es" ? "Propietario" : "Owner"}
                </label>
                <select
                  value={ownerFilter}
                  onChange={(event) => setOwnerFilter(event.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-200" : "border-slate-200 bg-white text-slate-700"}`}
                >
                  <option value="all">{locale === "ua" ? "Усі" : locale === "es" ? "Todos" : "All"}</option>
                  <option value="private">{locale === "ua" ? "Приватні" : locale === "es" ? "Privado" : "Private"}</option>
                  <option value="business">{locale === "ua" ? "Бізнес" : locale === "es" ? "Negocio" : "Business"}</option>
                  <option value="organization">{locale === "ua" ? "Організації" : locale === "es" ? "Organizaciones" : "Organizations"}</option>
                </select>
              </div>

              <div className="mb-4">
                <label className={`mb-2 block text-xs font-semibold uppercase tracking-[0.16em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {locale === "ua" ? "Ціна" : locale === "es" ? "Precio" : "Price"}
                </label>
                <select
                  value={priceMode}
                  onChange={(event) => setPriceMode(event.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-200" : "border-slate-200 bg-white text-slate-700"}`}
                >
                  <option value="all">{locale === "ua" ? "Усі" : locale === "es" ? "Todos" : "All"}</option>
                  <option value="paid">{locale === "ua" ? "Платні" : locale === "es" ? "De pago" : "Paid"}</option>
                  <option value="free">{locale === "ua" ? "Безкоштовні" : locale === "es" ? "Gratis" : "Free"}</option>
                </select>
              </div>

              <label className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-200" : "border-slate-200 bg-white text-slate-700"}`}>
                <input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} />
                {locale === "ua" ? "Лише verified" : locale === "es" ? "Solo verificados" : "Verified only"}
              </label>
            </aside>

            <div>
              <div className={`mb-5 flex flex-col gap-3 rounded-[28px] border p-5 md:flex-row md:items-center md:justify-between ${isDark ? "border-[#1a3050] bg-[#111d32]" : "border-slate-200 bg-white"}`}>
                <div>
                  <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {city === "All Spain" ? (locale === "ua" ? "Уся Іспанія" : locale === "es" ? "Toda España" : "All Spain") : city}
                  </p>
                  <h2 className={`text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{activeCount} {locale === "ua" ? "результатів" : locale === "es" ? "resultados" : "results"}</h2>
                </div>
                <div className={`flex items-center gap-2 rounded-2xl border px-3 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                  <Search className={`h-4 w-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t("search.placeholder")}
                    className={`h-11 w-full bg-transparent text-sm outline-none ${isDark ? "text-slate-100 placeholder:text-slate-500" : "text-slate-700 placeholder:text-slate-400"}`}
                  />
                </div>
              </div>

              {moduleId === "business" ? (
                <div className="space-y-4">
                  {filteredBusinesses.map((business) => (
                    <BusinessCard key={business.id} biz={business} />
                  ))}
                </div>
              ) : (
                <>
                  <SectionHeader title={locale === "ua" ? "Оголошення" : locale === "es" ? "Anuncios" : "Listings"} />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredListings.map((listing: Listing) => (
                      <ListingCard key={listing.id} listing={listing} />
                    ))}
                  </div>
                  {filteredListings.length === 0 ? (
                    <div className={`rounded-[28px] border p-10 text-center ${isDark ? "border-[#1a3050] bg-[#111d32] text-slate-400" : "border-slate-200 bg-white text-slate-500"}`}>
                      {locale === "ua" ? "Нічого не знайдено за цими фільтрами" : locale === "es" ? "No hay resultados con estos filtros" : "No results match these filters"}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </UahubLayout>
  );
}
