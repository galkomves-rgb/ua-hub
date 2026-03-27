import { Link } from "react-router-dom";
import { Building2, Shield, Sparkles, Users } from "lucide-react";
import UahubLayout from "@/components/UahubLayout";
import { BusinessCard, ListingCard, PlatformModuleCard, SectionHeader } from "@/components/PlatformCards";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";
import { useGlobalCity } from "@/lib/global-preferences";
import {
  BUSINESS_PROFILES,
  IMAGES,
  LISTINGS,
  MODULES,
  MODULE_ORDER,
  getListingsByModule,
} from "@/lib/platform-data";

export default function UahubHomePage() {
  const { theme } = useTheme();
  const { locale } = useI18n();
  const { city } = useGlobalCity();
  const isDark = theme === "dark";
  const selectedCity = city === "All Spain" ? "all" : city;

  const cityListings = selectedCity === "all"
    ? LISTINGS
    : LISTINGS.filter((listing) => listing.city === selectedCity);
  const cityBusinesses = selectedCity === "all"
    ? BUSINESS_PROFILES
    : BUSINESS_PROFILES.filter((business) => business.city === selectedCity);

  const featuredListings = cityListings.filter((listing) => listing.is_featured || listing.is_promoted).slice(0, 4);
  const latestListings = cityListings.slice(0, 6);
  const verifiedBusinesses = cityBusinesses.filter((business) => business.is_verified).slice(0, 4);
  const eventListings = getListingsByModule("events")
    .filter((listing) => selectedCity === "all" || listing.city === selectedCity)
    .slice(0, 3);

  return (
    <UahubLayout hideModuleNav>
      <section className="relative overflow-hidden">
        <img src={IMAGES.hero} alt="UAHUB" className="h-[420px] w-full object-cover" />
        <div className={`absolute inset-0 ${isDark ? "bg-gradient-to-r from-[#081425] via-[#081425]/70 to-[#081425]/20" : "bg-gradient-to-r from-[#0c376b]/75 via-[#0c376b]/40 to-white/10"}`} />
        <div className="absolute inset-0 mx-auto flex max-w-7xl items-end px-4 pb-10 lg:px-6">
          <div className="max-w-3xl">
            <h1 className="max-w-2xl text-4xl font-black leading-tight text-white md:text-5xl">
              {locale === "ua"
                ? "Єдина модульна платформа для українців в Іспанії"
                : locale === "es"
                  ? "Una sola plataforma modular para ucranianos en España"
                  : "One modular platform for Ukrainians in Spain"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
              {locale === "ua"
                ? "Робота, житло, послуги, події, спільнота, організації та бізнес-каталог зібрані в одному зручному просторі для життя в Іспанії."
                : locale === "es"
                  ? "Trabajo, vivienda, servicios, eventos, comunidad, organizaciones y directorio empresarial reunidos en un solo espacio práctico para la vida en España."
                  : "Jobs, housing, services, events, community, organizations, and a business directory gathered in one practical space for life in Spain."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/jobs" className="rounded-2xl bg-[#FFD700] px-5 py-3 text-sm font-semibold text-[#0d1a2e]">
                {locale === "ua" ? "Перейти до модулів" : locale === "es" ? "Explorar módulos" : "Explore modules"}
              </Link>
              <Link to="/pricing" className="rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm">
                {locale === "ua" ? "Монетизація" : locale === "es" ? "Monetización" : "Monetization"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 lg:px-6">
        <section>
          <SectionHeader
            title={locale === "ua" ? "Основні модулі" : locale === "es" ? "Módulos principales" : "Core modules"}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {MODULE_ORDER.map((moduleId) => {
              const module = MODULES[moduleId];
              return (
                <PlatformModuleCard
                  key={moduleId}
                  id={moduleId}
                  icon={module.icon}
                  lightColor={module.lightColor}
                  darkColor={module.darkColor}
                  lightIconBg={module.lightIconBg}
                  darkIconBg={module.darkIconBg}
                />
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: Shield,
              title: locale === "ua" ? "Верифікація бізнесу" : locale === "es" ? "Verificación empresarial" : "Business verification",
              description:
                locale === "ua"
                  ? "Перевірені бізнеси мають окремий бейдж, сторінку профілю та групування всіх оголошень."
                  : locale === "es"
                    ? "Los negocios verificados tienen una insignia separada y una página propia."
                    : "Verified businesses get a dedicated badge, profile page, and grouped listings.",
            },
            {
              icon: Users,
              title: locale === "ua" ? "Для людей, бізнесу та організацій" : locale === "es" ? "Para personas, negocios y organizaciones" : "For people, businesses, and organizations",
              description:
                locale === "ua"
                  ? "Кожен формат має свій зручний спосіб подачі оголошень, профілі та видимість на платформі."
                  : locale === "es"
                    ? "Cada formato tiene su propia forma de publicar anuncios, gestionar perfiles y mostrarse en la plataforma."
                    : "Each format has its own way to publish listings, manage profiles, and appear on the platform.",
            },
            {
              icon: Sparkles,
              title: locale === "ua" ? "Прозорі платні можливості" : locale === "es" ? "Opciones de pago claras" : "Clear paid options",
              description:
                locale === "ua"
                  ? "Безкоштовні можливості для спільноти поєднуються з окремими платними інструментами для бізнесу, реклами та просування."
                  : locale === "es"
                    ? "Las opciones gratuitas para la comunidad conviven con herramientas de pago para negocios, promoción y publicidad."
                    : "Free community features sit alongside paid tools for businesses, promotion, and advertising.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className={`rounded-3xl border p-5 ${isDark ? "border-[#1a3050] bg-[#111d32]" : "border-slate-200 bg-white"}`}
            >
              <item.icon className={`mb-4 h-6 w-6 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
              <h3 className={`mb-2 text-lg font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.title}</h3>
              <p className={`text-sm leading-7 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{item.description}</p>
            </div>
          ))}
        </section>

        <section>
          <SectionHeader
            title={locale === "ua" ? "Рекомендовані оголошення" : locale === "es" ? "Anuncios destacados" : "Featured listings"}
            linkTo="/search"
            linkLabel={locale === "ua" ? "Усі результати" : locale === "es" ? "Todos" : "See all"}
          />
          <div className="grid gap-4 lg:grid-cols-4">
            {featuredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <SectionHeader
              title={locale === "ua" ? "Найближчі події" : locale === "es" ? "Próximos eventos" : "Upcoming events"}
              linkTo="/events"
              linkLabel={locale === "ua" ? "Усі події" : locale === "es" ? "Todos los eventos" : "All events"}
            />
            <div className="grid gap-4 md:grid-cols-3">
              {eventListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
          <div>
            <SectionHeader
              title={locale === "ua" ? "Перевірені бізнеси" : locale === "es" ? "Negocios verificados" : "Verified businesses"}
              linkTo="/business"
              linkLabel={locale === "ua" ? "Каталог" : locale === "es" ? "Directorio" : "Directory"}
            />
            <div className="space-y-4">
              {verifiedBusinesses.map((business) => (
                <BusinessCard key={business.id} biz={business} />
              ))}
            </div>
          </div>
        </section>

        <section>
          <SectionHeader
            title={locale === "ua" ? "Останні публікації" : locale === "es" ? "Últimas publicaciones" : "Latest posts"}
            linkTo="/account"
            linkLabel={locale === "ua" ? "Мій акаунт" : locale === "es" ? "Mi cuenta" : "My account"}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {latestListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>

        <section
          className={`grid gap-4 rounded-[32px] border p-6 lg:grid-cols-3 ${
            isDark ? "border-[#1a3050] bg-[#0d1a2e]" : "border-slate-200 bg-white"
          }`}
        >
          {[
            {
              icon: Building2,
              title: locale === "ua" ? "Бізнес-профіль" : locale === "es" ? "Perfil de negocio" : "Business profile",
              body:
                locale === "ua"
                  ? "Окрема бізнес-сторінка з логотипом, описом, контактами та всіма пов'язаними оголошеннями."
                  : locale === "es"
                    ? "Página empresarial dedicada con contactos y anuncios agrupados."
                    : "Dedicated business page with contacts and grouped listings.",
            },
            {
              icon: Users,
              title: locale === "ua" ? "Спільнота для зареєстрованих" : locale === "es" ? "Comunidad para usuarios registrados" : "Community for registered users",
              body:
                locale === "ua"
                  ? "Групи, знайомства та взаємодія всередині спільноти відкриваються після входу в акаунт."
                  : locale === "es"
                    ? "Los grupos, contactos e interacciones de la comunidad se abren después de iniciar sesión."
                    : "Groups, connections, and community interactions open after sign-in.",
            },
            {
              icon: Shield,
              title: locale === "ua" ? "Зручна навігація" : locale === "es" ? "Navegación clara" : "Clear navigation",
              body:
                locale === "ua"
                  ? "Модулі та категорії організовані так, щоб було легко шукати оголошення, фільтрувати їх і швидко переходити між розділами."
                  : locale === "es"
                    ? "Los módulos y categorías están organizados para facilitar la búsqueda, el filtrado y la navegación entre secciones."
                    : "Modules and categories are organized to make search, filtering, and navigation straightforward.",
            },
          ].map((item) => (
            <div key={item.title} className={`rounded-3xl p-5 ${isDark ? "bg-[#111d32]" : "bg-slate-50"}`}>
              <item.icon className={`mb-4 h-5 w-5 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
              <h3 className={`mb-2 text-base font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.title}</h3>
              <p className={`text-sm leading-7 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{item.body}</p>
            </div>
          ))}
        </section>
      </div>
    </UahubLayout>
  );
}
