import { Link } from "react-router-dom";
import { Building2, Shield, Sparkles, Users } from "lucide-react";
import UahubLayout from "@/components/UahubLayout";
import { BusinessCard, ListingCard, PlatformModuleCard, SectionHeader } from "@/components/PlatformCards";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";
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
  const isDark = theme === "dark";

  const featuredListings = LISTINGS.filter((listing) => listing.is_featured || listing.is_promoted).slice(0, 4);
  const latestListings = LISTINGS.slice(0, 6);
  const verifiedBusinesses = BUSINESS_PROFILES.filter((business) => business.is_verified).slice(0, 4);
  const eventListings = getListingsByModule("events").slice(0, 3);

  return (
    <UahubLayout hideModuleNav>
      <section className="relative overflow-hidden">
        <img src={IMAGES.hero} alt="UAHUB" className="h-[420px] w-full object-cover" />
        <div className={`absolute inset-0 ${isDark ? "bg-gradient-to-r from-[#081425] via-[#081425]/70 to-[#081425]/20" : "bg-gradient-to-r from-[#0c376b]/75 via-[#0c376b]/40 to-white/10"}`} />
        <div className="absolute inset-0 mx-auto flex max-w-7xl items-end px-4 pb-10 lg:px-6">
          <div className="max-w-3xl">
            <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
              UAHUB v7.1
            </p>
            <h1 className="max-w-2xl text-4xl font-black leading-tight text-white md:text-5xl">
              {locale === "ua"
                ? "Єдина модульна платформа для українців в Іспанії"
                : locale === "es"
                  ? "Una sola plataforma modular para ucranianos en España"
                  : "One modular platform for Ukrainians in Spain"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
              {locale === "ua"
                ? "Робота, житло, послуги, події, спільнота, організації та бізнес-каталог працюють як одна система з єдиною таксономією, профілями власників і монетизацією."
                : locale === "es"
                  ? "Trabajo, vivienda, servicios, eventos, comunidad, organizaciones y directorio empresarial funcionan como un solo sistema con taxonomía unificada, perfiles de propietarios y monetización."
                  : "Jobs, housing, services, events, community, organizations, and business directory work as one system with unified taxonomy, owner profiles, and monetization."}
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
            linkTo="/newcomer"
            linkLabel={locale === "ua" ? "Допомога новачкам" : locale === "es" ? "Ayuda inicial" : "Newcomer help"}
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
              title: locale === "ua" ? "Розділення власників" : locale === "es" ? "Separación de propietarios" : "Owner separation",
              description:
                locale === "ua"
                  ? "Приватні користувачі, бізнеси та організації мають різні ролі, подачу та відображення."
                  : locale === "es"
                    ? "Usuarios privados, negocios y organizaciones tienen reglas de propiedad distintas."
                    : "Private users, businesses, and organizations have separate ownership logic.",
            },
            {
              icon: Sparkles,
              title: locale === "ua" ? "Монетизація без хаосу" : locale === "es" ? "Monetización clara" : "Structured monetization",
              description:
                locale === "ua"
                  ? "Безкоштовні соціальні шари відділені від платних listing tiers, бізнес-підписок та реклами."
                  : locale === "es"
                    ? "La capa social gratuita está separada de los tiers de pago y publicidad."
                    : "Free social layers are separated from paid listing tiers, subscriptions, and advertising.",
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
              title: locale === "ua" ? "Закрита community-layer" : locale === "es" ? "Capa social cerrada" : "Closed community layer",
              body:
                locale === "ua"
                  ? "Соціальні взаємодії доступні лише зареєстрованим користувачам і готові до модерації."
                  : locale === "es"
                    ? "La capa social está limitada a usuarios registrados y preparada para moderación."
                    : "Community interactions are members-only and moderation-ready.",
            },
            {
              icon: Shield,
              title: locale === "ua" ? "Єдине джерело таксономії" : locale === "es" ? "Taxonomía única" : "Single taxonomy source",
              body:
                locale === "ua"
                  ? "Модулі, категорії та підкатегорії централізовані й використовуються в навігації, пошуку, фільтрах та формах."
                  : locale === "es"
                    ? "Módulos, categorías y subcategorías viven en una sola estructura."
                    : "Modules, categories, and subcategories live in a single centralized structure.",
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
