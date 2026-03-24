import {
  BadgeCheck,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  Car,
  CheckCircle,
  Church,
  Dumbbell,
  FileText,
  Gift,
  Globe,
  GraduationCap,
  Hammer,
  Handshake,
  Heart,
  Home,
  HousePlus,
  Laptop,
  Landmark,
  MapPin,
  Music,
  Scale,
  Scissors,
  Shield,
  Shirt,
  ShoppingBag,
  Stethoscope,
  Store,
  Truck,
  Users,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Locale } from "@/lib/i18n";

export const IMAGES = {
  hero: "https://mgx-backend-cdn.metadl.com/generate/images/1049271/2026-03-24/f2fc3c5a-d914-4f72-b4f7-5ef55b64a4b2.png",
  jobs: "https://mgx-backend-cdn.metadl.com/generate/images/1049271/2026-03-24/c7ee3ff7-381f-40fa-9b95-edd6f1954ac8.png",
  housing: "https://mgx-backend-cdn.metadl.com/generate/images/1049271/2026-03-24/2e07c498-c2ad-4fe2-b3c3-912de671181b.png",
  services: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80",
  marketplace: "https://images.unsplash.com/photo-1515169067868-5387ec356754?auto=format&fit=crop&w=1200&q=80",
  events: "https://mgx-backend-cdn.metadl.com/generate/images/1049271/2026-03-24/36b0d423-4c13-45cf-b990-477dc237d22e.png",
  community: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
  organizations: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80",
  business: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
};

export type ModuleId =
  | "jobs"
  | "housing"
  | "services"
  | "marketplace"
  | "events"
  | "community"
  | "organizations"
  | "business";

export type OwnerType = "private_user" | "business_profile" | "organization";
export type ListingTier = "free" | "basic" | "featured" | "urgent" | "promoted";
export type ListingStatus = "draft" | "published" | "expired" | "archived" | "moderation";
export type ListingType = "offer" | "request" | "resource" | "event";
export type AdvertisingPlacement = "sidebar_left" | "sidebar_right" | "homepage_top" | "inline";

export interface LocalizedText {
  ua: string;
  es: string;
  en: string;
}

export interface SubcategoryConfig {
  id: string;
  label: LocalizedText;
}

export interface CategoryConfig {
  id: string;
  label: LocalizedText;
  icon: LucideIcon;
  subcategories?: SubcategoryConfig[];
}

export interface ModuleConfig {
  id: ModuleId;
  route: string;
  label: LocalizedText;
  description: LocalizedText;
  icon: LucideIcon;
  lightColor: string;
  darkColor: string;
  lightIconBg: string;
  darkIconBg: string;
  borderColor: string;
  banner: string;
  categories: CategoryConfig[];
}

export interface Listing {
  id: string;
  module: ModuleId;
  category: string;
  subcategory?: string;
  listing_type: ListingType;
  title: string;
  description: string;
  price?: number | null;
  salary?: number | null;
  currency?: string | null;
  images: string[];
  location: string;
  city: string;
  region: string;
  country: string;
  owner_type: OwnerType;
  owner_id: string;
  owner_name: string;
  created_at: string;
  updated_at: string;
  expiry_date: string;
  status: ListingStatus;
  is_featured: boolean;
  is_promoted: boolean;
  is_verified: boolean;
  tier: ListingTier;
  metadata?: Record<string, string>;
  contact_label?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string;
  city: string;
  bio: string;
  preferred_language: Locale;
  created_at: string;
  updated_at: string;
}

export interface BusinessProfile {
  id: string;
  owner_user_id: string;
  slug: string;
  business_name: string;
  logo: string;
  cover: string;
  category: string;
  city: string;
  description: string;
  contacts: string[];
  website: string;
  is_verified: boolean;
  is_premium: boolean;
  listing_quota?: number;
}

export interface AccountStats {
  active: number;
  expired: number;
  saved: number;
}

export interface AccountState {
  profile: UserProfile;
  savedListingIds: string[];
  savedBusinessIds: string[];
}

export interface NewcomerGuideSection {
  id: string;
  title: LocalizedText;
  summary: LocalizedText;
  items: LocalizedText[];
}

export interface ListingTierPlan {
  id: Exclude<ListingTier, "free">;
  label: LocalizedText;
  price: number;
  durationDays: number;
  features: LocalizedText[];
}

export interface BusinessSubscriptionPlan {
  id: string;
  label: LocalizedText;
  monthlyPrice: number;
  visibility: LocalizedText;
  listingQuota?: number;
  features: LocalizedText[];
}

export interface PromotionPlacement {
  id: AdvertisingPlacement;
  label: LocalizedText;
  price: number;
}

export const MODULE_ORDER: ModuleId[] = [
  "jobs",
  "housing",
  "services",
  "marketplace",
  "events",
  "community",
  "organizations",
  "business",
];

export const CITY_OPTIONS = [
  "All Spain",
  "Madrid",
  "Barcelona",
  "Valencia",
  "Alicante",
  "Malaga",
  "Sevilla",
  "Bilbao",
  "Murcia",
  "Palma",
] as const;

export const MODULES: Record<ModuleId, ModuleConfig> = {
  jobs: {
    id: "jobs",
    route: "/jobs",
    label: { ua: "Робота", es: "Trabajo", en: "Jobs" },
    description: {
      ua: "Вакансії, пошук роботи та допомога з працевлаштуванням",
      es: "Vacantes, búsqueda laboral y apoyo de empleo",
      en: "Vacancies, job search, and employment support",
    },
    icon: Briefcase,
    lightColor: "text-blue-700",
    darkColor: "text-blue-300",
    lightIconBg: "bg-blue-50",
    darkIconBg: "bg-blue-900/40",
    borderColor: "border-blue-400",
    banner: IMAGES.jobs,
    categories: [
      {
        id: "vacancies",
        label: { ua: "Вакансії", es: "Vacantes", en: "Vacancies" },
        icon: Briefcase,
        subcategories: [
          { id: "full-time", label: { ua: "Повна зайнятість", es: "Tiempo completo", en: "Full-time" } },
          { id: "part-time", label: { ua: "Часткова зайнятість", es: "Media jornada", en: "Part-time" } },
          { id: "remote", label: { ua: "Віддалено", es: "Remoto", en: "Remote" } },
        ],
      },
      { id: "job-seekers", label: { ua: "Шукаю роботу", es: "Busco trabajo", en: "Looking for work" }, icon: Users },
      { id: "employment-help", label: { ua: "Допомога з працевлаштуванням", es: "Ayuda laboral", en: "Employment help" }, icon: Handshake },
      { id: "partnerships", label: { ua: "Партнерства", es: "Colaboraciones", en: "Partnerships" }, icon: Building2 },
    ],
  },
  housing: {
    id: "housing",
    route: "/housing",
    label: { ua: "Житло", es: "Vivienda", en: "Housing" },
    description: {
      ua: "Оренда, пошук житла та базова адаптація в Іспанії",
      es: "Alquiler, búsqueda de vivienda y adaptación básica",
      en: "Rentals, housing search, and relocation basics",
    },
    icon: Home,
    lightColor: "text-emerald-600",
    darkColor: "text-emerald-300",
    lightIconBg: "bg-emerald-50",
    darkIconBg: "bg-emerald-900/40",
    borderColor: "border-emerald-400",
    banner: IMAGES.housing,
    categories: [
      {
        id: "apartment-rent",
        label: { ua: "Оренда квартири", es: "Alquiler de piso", en: "Apartment rent" },
        icon: Home,
        subcategories: [
          { id: "studio", label: { ua: "Студія", es: "Estudio", en: "Studio" } },
          { id: "1-room", label: { ua: "1-кімнатна", es: "1 dormitorio", en: "1 bedroom" } },
          { id: "2-room", label: { ua: "2-кімнатна", es: "2 dormitorios", en: "2 bedroom" } },
        ],
      },
      { id: "room-rent", label: { ua: "Оренда кімнати", es: "Alquiler de habitación", en: "Room rent" }, icon: HousePlus },
      { id: "house-rent", label: { ua: "Оренда будинку", es: "Alquiler de casa", en: "House rent" }, icon: Home },
      { id: "shared", label: { ua: "Спільне житло", es: "Compartido", en: "Shared housing" }, icon: Users },
      { id: "looking", label: { ua: "Шукаю житло", es: "Busco vivienda", en: "Looking for housing" }, icon: MapPin },
    ],
  },
  services: {
    id: "services",
    route: "/services",
    label: { ua: "Послуги", es: "Servicios", en: "Services" },
    description: {
      ua: "Послуги приватних фахівців, бізнесів та ресурсних центрів",
      es: "Servicios de profesionales, empresas y centros de apoyo",
      en: "Services from specialists, businesses, and resource centers",
    },
    icon: Wrench,
    lightColor: "text-violet-600",
    darkColor: "text-violet-300",
    lightIconBg: "bg-violet-50",
    darkIconBg: "bg-violet-900/40",
    borderColor: "border-violet-400",
    banner: IMAGES.services,
    categories: [
      { id: "translation", label: { ua: "Переклади та документи", es: "Traducciones y documentos", en: "Translation and documents" }, icon: FileText },
      { id: "legal", label: { ua: "Юридичні послуги", es: "Servicios legales", en: "Legal services" }, icon: Scale },
      { id: "health", label: { ua: "Здоров'я та психологія", es: "Salud y psicología", en: "Health and psychology" }, icon: Stethoscope },
      { id: "beauty", label: { ua: "Краса", es: "Belleza", en: "Beauty" }, icon: Scissors },
      { id: "construction", label: { ua: "Будівництво та ремонт", es: "Construcción y reformas", en: "Construction and repair" }, icon: Hammer },
      { id: "digital", label: { ua: "Digital та IT", es: "Digital e IT", en: "Digital and IT" }, icon: Laptop },
      { id: "horeca", label: { ua: "HoReCa", es: "Hostelería", en: "HoReCa" }, icon: UtensilsCrossed },
      { id: "delivery", label: { ua: "Логістика", es: "Logística", en: "Logistics" }, icon: Truck },
      { id: "photo-video", label: { ua: "Фото та відео", es: "Foto y video", en: "Photo and video" }, icon: Camera },
      { id: "auto", label: { ua: "Авто-послуги", es: "Servicios auto", en: "Auto services" }, icon: Car },
    ],
  },
  marketplace: {
    id: "marketplace",
    route: "/marketplace",
    label: { ua: "Маркетплейс", es: "Marketplace", en: "Marketplace" },
    description: {
      ua: "Продаж, купівля, обмін і безкоштовна передача речей",
      es: "Compra, venta, intercambio y cesión gratuita",
      en: "Buying, selling, exchange, and free giveaways",
    },
    icon: ShoppingBag,
    lightColor: "text-orange-600",
    darkColor: "text-orange-300",
    lightIconBg: "bg-orange-50",
    darkIconBg: "bg-orange-900/40",
    borderColor: "border-orange-400",
    banner: IMAGES.marketplace,
    categories: [
      { id: "electronics", label: { ua: "Електроніка", es: "Electrónica", en: "Electronics" }, icon: Laptop },
      { id: "furniture", label: { ua: "Меблі", es: "Muebles", en: "Furniture" }, icon: Home },
      { id: "clothing", label: { ua: "Одяг", es: "Ropa", en: "Clothing" }, icon: Shirt },
      { id: "kids", label: { ua: "Дитячі товари", es: "Niños", en: "Kids" }, icon: GraduationCap },
      { id: "auto-parts", label: { ua: "Авто та запчастини", es: "Auto y recambios", en: "Auto and parts" }, icon: Car },
      { id: "free", label: { ua: "Віддам безкоштовно", es: "Gratis", en: "Free" }, icon: Gift },
      { id: "wanted", label: { ua: "Шукаю", es: "Busco", en: "Wanted" }, icon: MapPin },
    ],
  },
  events: {
    id: "events",
    route: "/events",
    label: { ua: "Події", es: "Eventos", en: "Events" },
    description: {
      ua: "Культурні, освітні, бізнесові та громадські події",
      es: "Eventos culturales, educativos, empresariales y comunitarios",
      en: "Cultural, educational, business, and community events",
    },
    icon: Calendar,
    lightColor: "text-amber-600",
    darkColor: "text-amber-300",
    lightIconBg: "bg-amber-50",
    darkIconBg: "bg-amber-900/40",
    borderColor: "border-amber-400",
    banner: IMAGES.events,
    categories: [
      { id: "cultural", label: { ua: "Культурні події", es: "Culturales", en: "Cultural" }, icon: Music },
      { id: "educational", label: { ua: "Освітні події", es: "Educativos", en: "Educational" }, icon: GraduationCap },
      { id: "networking", label: { ua: "Нетворкінг", es: "Networking", en: "Networking" }, icon: Handshake },
      { id: "community-meetups", label: { ua: "Зустрічі громади", es: "Encuentros comunitarios", en: "Community meetups" }, icon: Users },
      { id: "charity", label: { ua: "Благодійність", es: "Solidaridad", en: "Charity" }, icon: Heart },
    ],
  },
  community: {
    id: "community",
    route: "/community",
    label: { ua: "Спільнота", es: "Comunidad", en: "Community" },
    description: {
      ua: "Закрита зареєстрована спільнота для взаємодії та ініціатив",
      es: "Comunidad cerrada para usuarios registrados",
      en: "Members-only community for registered users",
    },
    icon: Users,
    lightColor: "text-rose-500",
    darkColor: "text-rose-300",
    lightIconBg: "bg-rose-50",
    darkIconBg: "bg-rose-900/40",
    borderColor: "border-rose-400",
    banner: IMAGES.community,
    categories: [
      { id: "clubs", label: { ua: "Клуби за інтересами", es: "Clubes", en: "Clubs" }, icon: Users },
      { id: "volunteering", label: { ua: "Волонтерство", es: "Voluntariado", en: "Volunteering" }, icon: Heart },
      { id: "parents", label: { ua: "Батьківські спільноти", es: "Padres", en: "Parents" }, icon: Users },
      { id: "newcomers", label: { ua: "Допомога новачкам", es: "Ayuda a recién llegados", en: "Newcomer help" }, icon: Handshake },
      { id: "local", label: { ua: "Місцеві ініціативи", es: "Iniciativas locales", en: "Local initiatives" }, icon: Globe },
    ],
  },
  organizations: {
    id: "organizations",
    route: "/organizations",
    label: { ua: "Організації та ресурси", es: "Organizaciones y recursos", en: "Organizations and resources" },
    description: {
      ua: "Організації, школи, асоціації, ресурсні та гуманітарні центри",
      es: "Organizaciones, escuelas, asociaciones y centros de apoyo",
      en: "Organizations, schools, associations, and support centers",
    },
    icon: Building2,
    lightColor: "text-sky-600",
    darkColor: "text-sky-300",
    lightIconBg: "bg-sky-50",
    darkIconBg: "bg-sky-900/40",
    borderColor: "border-sky-400",
    banner: IMAGES.organizations,
    categories: [
      { id: "associations", label: { ua: "Асоціації", es: "Asociaciones", en: "Associations" }, icon: Building2 },
      { id: "schools", label: { ua: "Українські школи", es: "Escuelas ucranianas", en: "Ukrainian schools" }, icon: BookOpen },
      { id: "consular", label: { ua: "Консульські ресурси", es: "Recursos consulares", en: "Consular resources" }, icon: Landmark },
      { id: "humanitarian", label: { ua: "Гуманітарні ініціативи", es: "Iniciativas humanitarias", en: "Humanitarian initiatives" }, icon: Heart },
      { id: "adaptation", label: { ua: "Адаптація та інтеграція", es: "Adaptación e integración", en: "Adaptation and integration" }, icon: Shield },
      { id: "churches", label: { ua: "Церкви", es: "Iglesias", en: "Churches" }, icon: Church },
    ],
  },
  business: {
    id: "business",
    route: "/business",
    label: { ua: "Бізнес-каталог", es: "Directorio empresarial", en: "Business directory" },
    description: {
      ua: "Каталог українських бізнесів із підписками, верифікацією та пакетами видимості",
      es: "Directorio de negocios ucranianos con suscripción y verificación",
      en: "Business directory with subscriptions, verification, and visibility tiers",
    },
    icon: Store,
    lightColor: "text-indigo-600",
    darkColor: "text-indigo-300",
    lightIconBg: "bg-indigo-50",
    darkIconBg: "bg-indigo-900/40",
    borderColor: "border-indigo-400",
    banner: IMAGES.business,
    categories: [
      { id: "verified-biz", label: { ua: "Перевірені", es: "Verificados", en: "Verified" }, icon: CheckCircle },
      { id: "premium-biz", label: { ua: "Преміум", es: "Premium", en: "Premium" }, icon: BadgeCheck },
      { id: "new-biz", label: { ua: "Нові бізнеси", es: "Nuevos", en: "New businesses" }, icon: Store },
    ],
  },
};

export const ACCOUNT_PROFILE: AccountState = {
  profile: {
    id: "profile-1",
    user_id: "user-1",
    name: "Олена К.",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
    city: "Valencia",
    bio: "Перекладачка UA/ES/EN, допомагаю з документами й адаптацією новоприбулих.",
    preferred_language: "ua",
    created_at: "2026-02-10T10:00:00Z",
    updated_at: "2026-03-24T08:30:00Z",
  },
  savedListingIds: ["s1", "h2", "e1"],
  savedBusinessIds: ["biz-ua-translations", "biz-legal-ua-spain"],
};

export const BUSINESS_PROFILES: BusinessProfile[] = [
  {
    id: "biz-ua-translations",
    owner_user_id: "user-10",
    slug: "ua-translations",
    business_name: "UA Translations",
    logo: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=300&q=80",
    cover: IMAGES.services,
    category: "Переклади та документи",
    city: "Madrid",
    description: "Сертифіковані переклади, апостиль, супровід документів та іспанські процедури для українців в Іспанії.",
    contacts: ["+34 611 223 344", "hello@uatranslations.es"],
    website: "https://uatranslations.es",
    is_verified: true,
    is_premium: true,
    listing_quota: 25,
  },
  {
    id: "biz-legal-ua-spain",
    owner_user_id: "user-11",
    slug: "legal-ua-spain",
    business_name: "Legal UA Spain",
    logo: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=300&q=80",
    cover: IMAGES.services,
    category: "Юридичні послуги",
    city: "Barcelona",
    description: "Юридичні консультації з NIE, TIE, резиденції, трудових договорів та реєстрації автономо.",
    contacts: ["+34 677 112 809", "team@legaluaspain.es"],
    website: "https://legaluaspain.es",
    is_verified: true,
    is_premium: true,
    listing_quota: 20,
  },
  {
    id: "biz-techua-solutions",
    owner_user_id: "user-12",
    slug: "techua-solutions",
    business_name: "TechUA Solutions",
    logo: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=300&q=80",
    cover: IMAGES.business,
    category: "Digital та IT",
    city: "Barcelona",
    description: "Розробка сайтів, CRM, маркетингова підтримка та digital-аудит для малого українського бізнесу.",
    contacts: ["+34 699 555 441", "info@techua.solutions"],
    website: "https://techua.solutions",
    is_verified: true,
    is_premium: false,
    listing_quota: 10,
  },
  {
    id: "org-ua-help-madrid",
    owner_user_id: "user-13",
    slug: "ua-help-madrid",
    business_name: "UA Help Madrid",
    logo: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=300&q=80",
    cover: IMAGES.organizations,
    category: "Гуманітарні ініціативи",
    city: "Madrid",
    description: "Ресурсний центр для новоприбулих: супровід, допомога з документами, житлом та орієнтацією в міських сервісах.",
    contacts: ["+34 611 000 955", "support@uahelpmadrid.org"],
    website: "https://uahelpmadrid.org",
    is_verified: true,
    is_premium: false,
    listing_quota: 50,
  },
  {
    id: "biz-restaurante-sol",
    owner_user_id: "user-14",
    slug: "restaurante-sol",
    business_name: "Restaurante Sol",
    logo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=300&q=80",
    cover: IMAGES.business,
    category: "HoReCa",
    city: "Madrid",
    description: "Український ресторан у Мадриді з домашньою кухнею, кейтерингом і вакансіями для громади.",
    contacts: ["+34 688 234 901", "hola@restaurantesol.es"],
    website: "https://restaurantesol.es",
    is_verified: true,
    is_premium: false,
    listing_quota: 12,
  },
];

export const LISTINGS: Listing[] = [
  {
    id: "j1",
    module: "jobs",
    category: "vacancies",
    subcategory: "full-time",
    listing_type: "offer",
    title: "Офіціант/ка в ресторан",
    description: "Шукаємо офіціанта зі знанням іспанської. Контракт, стабільний графік, допомога з адаптацією на місці.",
    salary: 1400,
    currency: "EUR",
    images: [IMAGES.jobs],
    location: "Centro, Madrid",
    city: "Madrid",
    region: "Madrid",
    country: "Spain",
    owner_type: "business_profile",
    owner_id: "biz-restaurante-sol",
    owner_name: "Restaurante Sol",
    created_at: "2026-03-22T10:00:00Z",
    updated_at: "2026-03-24T08:00:00Z",
    expiry_date: "2026-04-22T10:00:00Z",
    status: "published",
    is_featured: false,
    is_promoted: false,
    is_verified: true,
    tier: "basic",
    metadata: { schedule: "Пн-Пт", format: "Офлайн", contract: "Контракт" },
    contact_label: "Написати роботодавцю",
  },
  {
    id: "j2",
    module: "jobs",
    category: "vacancies",
    subcategory: "remote",
    listing_type: "offer",
    title: "Frontend Developer (React)",
    description: "Повноцінна віддалена роль для React-розробника в українсько-іспанській команді. English required.",
    salary: 3200,
    currency: "EUR",
    images: [IMAGES.jobs],
    location: "Remote across Spain",
    city: "Barcelona",
    region: "Catalonia",
    country: "Spain",
    owner_type: "business_profile",
    owner_id: "biz-techua-solutions",
    owner_name: "TechUA Solutions",
    created_at: "2026-03-23T10:00:00Z",
    updated_at: "2026-03-24T09:00:00Z",
    expiry_date: "2026-04-23T10:00:00Z",
    status: "published",
    is_featured: true,
    is_promoted: true,
    is_verified: true,
    tier: "promoted",
    metadata: { format: "Remote", contract: "Full-time", language: "EN + ES" },
  },
  {
    id: "j3",
    module: "jobs",
    category: "job-seekers",
    listing_type: "request",
    title: "Шукаю роботу перекладачкою UA/ES/EN",
    description: "5 років досвіду, письмові та усні переклади, супровід у міграційних та медичних установах.",
    currency: "EUR",
    images: [IMAGES.services],
    location: "Valencia city",
    city: "Valencia",
    region: "Valencian Community",
    country: "Spain",
    owner_type: "private_user",
    owner_id: "user-1",
    owner_name: "Олена К.",
    created_at: "2026-03-24T07:00:00Z",
    updated_at: "2026-03-24T07:00:00Z",
    expiry_date: "2026-04-24T07:00:00Z",
    status: "published",
    is_featured: false,
    is_promoted: false,
    is_verified: false,
    tier: "free",
    metadata: { availability: "Full-time", format: "Hybrid" },
  },
  {
    id: "h1",
    module: "housing",
    category: "apartment-rent",
    subcategory: "2-room",
    listing_type: "offer",
    title: "2-кімнатна квартира біля метро",
    description: "Світла квартира 65 м², мебльована, поруч парк, супермаркет, школа та метро.",
    price: 850,
    currency: "EUR",
    images: [IMAGES.housing],
    location: "Arganzuela",
    city: "Madrid",
    region: "Madrid",
    country: "Spain",
    owner_type: "private_user",
    owner_id: "user-2",
    owner_name: "Ірина М.",
    created_at: "2026-03-23T10:00:00Z",
    updated_at: "2026-03-23T10:00:00Z",
    expiry_date: "2026-04-23T10:00:00Z",
    status: "published",
    is_featured: false,
    is_promoted: false,
    is_verified: false,
    tier: "basic",
    metadata: { rooms: "2", area: "65 м²", furnished: "Так" },
  },
  {
    id: "h2",
    module: "housing",
    category: "room-rent",
    listing_type: "offer",
    title: "Кімната в центрі Барселони",
    description: "Окрема кімната у спільній квартирі, швидкий інтернет, пральна машина, можна заселятися одразу.",
    price: 450,
    currency: "EUR",
    images: [IMAGES.housing],
    location: "Eixample",
    city: "Barcelona",
    region: "Catalonia",
    country: "Spain",
    owner_type: "private_user",
    owner_id: "user-3",
    owner_name: "Марія Д.",
    created_at: "2026-03-22T09:00:00Z",
    updated_at: "2026-03-23T11:00:00Z",
    expiry_date: "2026-04-22T09:00:00Z",
    status: "published",
    is_featured: true,
    is_promoted: false,
    is_verified: false,
    tier: "featured",
    metadata: { utility: "Included", format: "Private room" },
  },
  {
    id: "h3",
    module: "housing",
    category: "looking",
    listing_type: "request",
    title: "Шукаю квартиру у Валенсії для сім'ї",
    description: "Сім'я з дитиною шукає 2-кімнатну квартиру з меблями, бюджет до 700 EUR, бажано біля школи.",
    images: [IMAGES.housing],
    location: "Valencia metropolitan area",
    city: "Valencia",
    region: "Valencian Community",
    country: "Spain",
    owner_type: "private_user",
    owner_id: "user-4",
    owner_name: "Андрій Т.",
    created_at: "2026-03-24T06:30:00Z",
    updated_at: "2026-03-24T06:30:00Z",
    expiry_date: "2026-04-24T06:30:00Z",
    status: "published",
    is_featured: false,
    is_promoted: false,
    is_verified: false,
    tier: "free",
    metadata: { budget: "700 EUR", family: "2+1" },
  },
  {
    id: "s1",
    module: "services",
    category: "translation",
    listing_type: "offer",
    title: "Переклади UA-ES-EN, апостиль, супровід",
    description: "Переклад документів, запис у державні установи, апостиль, легалізація та супровід у нотаріуса.",
    price: 30,
    currency: "EUR",
    images: [IMAGES.services],
    location: "Chamberi",
    city: "Madrid",
    region: "Madrid",
    country: "Spain",
    owner_type: "business_profile",
    owner_id: "biz-ua-translations",
    owner_name: "UA Translations",
    created_at: "2026-03-20T10:00:00Z",
    updated_at: "2026-03-24T08:00:00Z",
    expiry_date: "2026-04-20T10:00:00Z",
    status: "published",
    is_featured: false,
    is_promoted: true,
    is_verified: true,
    tier: "promoted",
    metadata: { format: "Online + Offline", turnaround: "24h" },
  },
  {
    id: "s2",
    module: "services",
    category: "legal",
    listing_type: "offer",
    title: "Юридична консультація з NIE/TIE та резиденції",
    description: "Консультації щодо документів, контрактів, реєстрації автономо, возз'єднання сім'ї та податкових питань.",
    price: 50,
    currency: "EUR",
    images: [IMAGES.services],
    location: "Barcelona center",
    city: "Barcelona",
    region: "Catalonia",
    country: "Spain",
    owner_type: "business_profile",
    owner_id: "biz-legal-ua-spain",
    owner_name: "Legal UA Spain",
    created_at: "2026-03-21T12:00:00Z",
    updated_at: "2026-03-24T07:00:00Z",
    expiry_date: "2026-04-21T12:00:00Z",
    status: "published",
    is_featured: true,
    is_promoted: false,
    is_verified: true,
    tier: "featured",
    metadata: { format: "Online + Office", language: "UA / ES / EN" },
  },
  {
    id: "m1",
    module: "marketplace",
    category: "electronics",
    listing_type: "offer",
    title: "MacBook Pro 14 M3, як новий",
    description: "Повний комплект, гарантія Apple до 2027 року, акумулятор 99%, коробка та чек в наявності.",
    price: 1800,
    currency: "EUR",
    images: [IMAGES.marketplace],
    location: "Chamartin",
    city: "Madrid",
    region: "Madrid",
    country: "Spain",
    owner_type: "private_user",
    owner_id: "user-5",
    owner_name: "Дмитро К.",
    created_at: "2026-03-22T11:30:00Z",
    updated_at: "2026-03-24T08:15:00Z",
    expiry_date: "2026-04-22T11:30:00Z",
    status: "published",
    is_featured: true,
    is_promoted: false,
    is_verified: false,
    tier: "featured",
    metadata: { condition: "Like new", warranty: "2027" },
  },
  {
    id: "m2",
    module: "marketplace",
    category: "free",
    listing_type: "offer",
    title: "Віддам дитячий одяг 2-4 роки",
    description: "Кілька пакетів одягу в гарному стані, самовивіз. Допоможе новоприбулим сім'ям.",
    images: [IMAGES.marketplace],
    location: "Alicante center",
    city: "Alicante",
    region: "Valencian Community",
    country: "Spain",
    owner_type: "private_user",
    owner_id: "user-6",
    owner_name: "Оксана П.",
    created_at: "2026-03-24T09:15:00Z",
    updated_at: "2026-03-24T09:15:00Z",
    expiry_date: "2026-04-24T09:15:00Z",
    status: "published",
    is_featured: false,
    is_promoted: false,
    is_verified: false,
    tier: "free",
    metadata: { pickup: "Self pickup" },
  },
  {
    id: "e1",
    module: "events",
    category: "cultural",
    listing_type: "event",
    title: "Великодній ярмарок української громади",
    description: "Ярмарок із майстерками, борщем, музикою та збором коштів на гуманітарні ініціативи.",
    images: [IMAGES.events],
    location: "Plaza Mayor",
    city: "Madrid",
    region: "Madrid",
    country: "Spain",
    owner_type: "organization",
    owner_id: "org-ua-help-madrid",
    owner_name: "UA Help Madrid",
    created_at: "2026-03-15T10:00:00Z",
    updated_at: "2026-03-22T10:00:00Z",
    expiry_date: "2026-04-12T18:00:00Z",
    status: "published",
    is_featured: true,
    is_promoted: false,
    is_verified: true,
    tier: "free",
    metadata: { date: "2026-04-12", time: "11:00 - 18:00" },
  },
  {
    id: "e2",
    module: "events",
    category: "educational",
    listing_type: "event",
    title: "Воркшоп: як знайти роботу в Іспанії",
    description: "Семінар про CV, локальні сайти вакансій, контракти, права працівників і подачу на співбесіди.",
    images: [IMAGES.events],
    location: "Coworking Central",
    city: "Barcelona",
    region: "Catalonia",
    country: "Spain",
    owner_type: "organization",
    owner_id: "org-ua-help-madrid",
    owner_name: "UA Help Madrid",
    created_at: "2026-03-20T12:00:00Z",
    updated_at: "2026-03-21T12:00:00Z",
    expiry_date: "2026-04-05T20:00:00Z",
    status: "published",
    is_featured: false,
    is_promoted: false,
    is_verified: true,
    tier: "free",
    metadata: { date: "2026-04-05", time: "18:00 - 20:00" },
  },
  {
    id: "c1",
    module: "community",
    category: "newcomers",
    listing_type: "resource",
    title: "Закрита група підтримки для новоприбулих",
    description: "Приватна спільнота для взаємодопомоги, локальних порад та обміну досвідом після переїзду.",
    images: [IMAGES.community],
    location: "Online",
    city: "All Spain",
    region: "Spain",
    country: "Spain",
    owner_type: "organization",
    owner_id: "org-ua-help-madrid",
    owner_name: "UA Help Madrid",
    created_at: "2026-03-18T09:00:00Z",
    updated_at: "2026-03-22T09:00:00Z",
    expiry_date: "2026-12-31T00:00:00Z",
    status: "published",
    is_featured: false,
    is_promoted: false,
    is_verified: true,
    tier: "free",
    metadata: { access: "Registered users only", moderation: "Enabled" },
  },
  {
    id: "o1",
    module: "organizations",
    category: "associations",
    listing_type: "resource",
    title: "Асоціація українців Іспанії",
    description: "Культурні проєкти, підтримка громад, юридичні консультації та координація регіональних ініціатив.",
    images: [IMAGES.organizations],
    location: "Madrid office",
    city: "Madrid",
    region: "Madrid",
    country: "Spain",
    owner_type: "organization",
    owner_id: "org-ua-help-madrid",
    owner_name: "UA Help Madrid",
    created_at: "2026-01-01T10:00:00Z",
    updated_at: "2026-03-01T10:00:00Z",
    expiry_date: "2026-12-31T00:00:00Z",
    status: "published",
    is_featured: false,
    is_promoted: false,
    is_verified: true,
    tier: "free",
    metadata: { support: "Legal + integration", coverage: "All Spain" },
  },
];

export const NEWCOMER_GUIDES: NewcomerGuideSection[] = [
  {
    id: "documents",
    title: { ua: "Документи", es: "Documentos", en: "Documents" },
    summary: {
      ua: "NIE, TIE, прописка, медична картка та базові реєстрації після переїзду.",
      es: "NIE, TIE, padrón, tarjeta sanitaria y registros básicos.",
      en: "NIE, TIE, padrón, health card, and basic registrations.",
    },
    items: [
      { ua: "Порядок отримання NIE та TIE", es: "Cómo obtener NIE y TIE", en: "How to get NIE and TIE" },
      { ua: "Що потрібно для прописки", es: "Qué necesitas para empadronarte", en: "What you need for padrón" },
      { ua: "Як зберігати копії та переклади документів", es: "Cómo organizar copias y traducciones", en: "How to organize copies and translations" },
    ],
  },
  {
    id: "health-system",
    title: { ua: "Система охорони здоров'я", es: "Sistema de salud", en: "Health system" },
    summary: {
      ua: "Де отримати медичну допомогу, сімейного лікаря та невідкладні контакти.",
      es: "Dónde obtener atención médica y contactos de urgencia.",
      en: "How to access healthcare, your GP, and emergency contacts.",
    },
    items: [
      { ua: "Реєстрація в centro de salud", es: "Registro en centro de salud", en: "Registering at a health center" },
      { ua: "Невідкладна допомога та номер 112", es: "Urgencias y 112", en: "Emergency care and 112" },
      { ua: "Психологічна підтримка українською", es: "Apoyo psicológico en ucraniano", en: "Psychological support in Ukrainian" },
    ],
  },
  {
    id: "banking",
    title: { ua: "Банкінг", es: "Banca", en: "Banking" },
    summary: {
      ua: "Відкриття рахунку, базові тарифи та перекази в Іспанії.",
      es: "Apertura de cuenta, tarifas básicas y transferencias.",
      en: "Opening an account, basic fees, and transfers in Spain.",
    },
    items: [
      { ua: "Які документи потрібні банку", es: "Qué documentos pide el banco", en: "Which documents a bank requires" },
      { ua: "Як уникати зайвих комісій", es: "Cómo evitar comisiones", en: "How to avoid unnecessary fees" },
      { ua: "Поради для безпечних онлайн-платежів", es: "Consejos para pagos online seguros", en: "Tips for safer online payments" },
    ],
  },
  {
    id: "housing-basics",
    title: { ua: "Основи житла", es: "Bases de vivienda", en: "Housing basics" },
    summary: {
      ua: "Як орендувати житло, перевіряти власника та готуватися до договору.",
      es: "Cómo alquilar, verificar propietario y preparar contrato.",
      en: "How to rent, verify an owner, and prepare for a lease.",
    },
    items: [
      { ua: "Що питати перед підписанням договору", es: "Qué preguntar antes de firmar", en: "What to ask before signing" },
      { ua: "Як перевірити депозит і комісії", es: "Cómo revisar fianza y comisiones", en: "How to check deposits and fees" },
      { ua: "Які витрати додаються до оренди", es: "Qué gastos se añaden al alquiler", en: "Which costs come with rent" },
    ],
  },
  {
    id: "work-basics",
    title: { ua: "Основи працевлаштування", es: "Bases de trabajo", en: "Work basics" },
    summary: {
      ua: "Пошук роботи, контракти, права працівника та старт у локальному ринку.",
      es: "Búsqueda de empleo, contratos y derechos laborales.",
      en: "Job search, contracts, worker rights, and local market basics.",
    },
    items: [
      { ua: "Як читати іспанський трудовий контракт", es: "Cómo leer un contrato laboral", en: "How to read a Spanish job contract" },
      { ua: "Де шукати легальні вакансії", es: "Dónde buscar vacantes legales", en: "Where to find legitimate jobs" },
      { ua: "Як підготувати CV під Іспанію", es: "Cómo adaptar tu CV", en: "How to adapt your CV for Spain" },
    ],
  },
];

export const LISTING_TIER_PLANS: ListingTierPlan[] = [
  {
    id: "basic",
    label: { ua: "Basic", es: "Básico", en: "Basic" },
    price: 9,
    durationDays: 30,
    features: [
      { ua: "Стандартне розміщення", es: "Publicación estándar", en: "Standard listing placement" },
      { ua: "До 8 фото", es: "Hasta 8 fotos", en: "Up to 8 photos" },
      { ua: "Базова статистика", es: "Estadísticas básicas", en: "Basic stats" },
    ],
  },
  {
    id: "featured",
    label: { ua: "Featured", es: "Destacado", en: "Featured" },
    price: 19,
    durationDays: 30,
    features: [
      { ua: "Виділення в модулі", es: "Destacado en módulo", en: "Featured in module" },
      { ua: "Пріоритет у видачі", es: "Prioridad en resultados", en: "Priority in results" },
      { ua: "До 12 фото", es: "Hasta 12 fotos", en: "Up to 12 photos" },
    ],
  },
  {
    id: "urgent",
    label: { ua: "Urgent", es: "Urgente", en: "Urgent" },
    price: 24,
    durationDays: 14,
    features: [
      { ua: "Терміновий бейдж", es: "Insignia urgente", en: "Urgent badge" },
      { ua: "Короткий підйом у видачі", es: "Impulso corto", en: "Short-term boost" },
      { ua: "Підійде для термінових пошуків", es: "Para necesidades urgentes", en: "Designed for urgent needs" },
    ],
  },
  {
    id: "promoted",
    label: { ua: "Promoted", es: "Promocionado", en: "Promoted" },
    price: 39,
    durationDays: 30,
    features: [
      { ua: "Промо-блоки у видачі", es: "Bloques promocionados", en: "Promoted placements" },
      { ua: "Показ у головних блоках", es: "Visibilidad en homepage", en: "Homepage visibility" },
      { ua: "Максимальна видимість", es: "Máxima visibilidad", en: "Maximum visibility" },
    ],
  },
];

export const BUSINESS_SUBSCRIPTIONS: BusinessSubscriptionPlan[] = [
  {
    id: "business-starter",
    label: { ua: "Business Starter", es: "Business Starter", en: "Business Starter" },
    monthlyPrice: 29,
    visibility: { ua: "Бізнес-профіль у каталозі", es: "Perfil en directorio", en: "Business profile in directory" },
    listingQuota: 10,
    features: [
      { ua: "Сторінка бізнесу", es: "Página de negocio", en: "Business page" },
      { ua: "Групування оголошень", es: "Agrupación de anuncios", en: "Grouped listings" },
      { ua: "До 10 активних оголошень", es: "Hasta 10 anuncios activos", en: "Up to 10 active listings" },
    ],
  },
  {
    id: "business-growth",
    label: { ua: "Business Growth", es: "Business Growth", en: "Business Growth" },
    monthlyPrice: 59,
    visibility: { ua: "Преміум-присутність у каталозі", es: "Presencia premium", en: "Premium directory presence" },
    listingQuota: 30,
    features: [
      { ua: "Verified badge", es: "Insignia verificada", en: "Verified badge" },
      { ua: "Пріоритет у каталозі", es: "Prioridad en directorio", en: "Priority placement" },
      { ua: "До 30 активних оголошень", es: "Hasta 30 anuncios activos", en: "Up to 30 active listings" },
    ],
  },
];

export const PROMOTION_PLACEMENTS: PromotionPlacement[] = [
  { id: "sidebar_left", label: { ua: "Лівий сайдбар", es: "Sidebar izquierdo", en: "Left sidebar" }, price: 45 },
  { id: "sidebar_right", label: { ua: "Правий сайдбар", es: "Sidebar derecho", en: "Right sidebar" }, price: 45 },
  { id: "homepage_top", label: { ua: "Головна зверху", es: "Home superior", en: "Homepage top" }, price: 95 },
  { id: "inline", label: { ua: "Inline у модулі", es: "Inline en módulo", en: "Inline inside module" }, price: 35 },
];

export const FREE_POSTING_RULES = {
  community: true,
  organizations: true,
  jobs: ["job-seekers"],
  housing: ["looking"],
} as const;

export function localizeText(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.ua;
}

export function getModuleConfig(moduleId: ModuleId): ModuleConfig {
  return MODULES[moduleId];
}

export function getModuleLabel(moduleId: ModuleId, locale: Locale): string {
  return localizeText(MODULES[moduleId].label, locale);
}

export function getModuleDescription(moduleId: ModuleId, locale: Locale): string {
  return localizeText(MODULES[moduleId].description, locale);
}

export function getCategoryConfig(moduleId: ModuleId, categoryId: string): CategoryConfig | undefined {
  return MODULES[moduleId].categories.find((category) => category.id === categoryId);
}

export function getCategoryLabel(moduleId: ModuleId, categoryId: string, locale: Locale): string {
  const category = getCategoryConfig(moduleId, categoryId);
  return category ? localizeText(category.label, locale) : categoryId;
}

export function getSubcategoryLabel(moduleId: ModuleId, categoryId: string, subcategoryId: string | undefined, locale: Locale): string {
  if (!subcategoryId) {
    return "";
  }

  const category = getCategoryConfig(moduleId, categoryId);
  const subcategory = category?.subcategories?.find((item) => item.id === subcategoryId);
  return subcategory ? localizeText(subcategory.label, locale) : subcategoryId;
}

export function getListingById(listingId: string): Listing | undefined {
  return LISTINGS.find((listing) => listing.id === listingId);
}

export function getListingsByModule(moduleId: ModuleId): Listing[] {
  return LISTINGS.filter((listing) => listing.module === moduleId);
}

export function getBusinessProfileById(businessId: string): BusinessProfile | undefined {
  return BUSINESS_PROFILES.find((business) => business.id === businessId);
}

export function getBusinessProfileBySlug(slug: string): BusinessProfile | undefined {
  return BUSINESS_PROFILES.find((business) => business.slug === slug);
}

export function getBusinessListings(businessId: string): Listing[] {
  return LISTINGS.filter((listing) => listing.owner_type === "business_profile" && listing.owner_id === businessId);
}

export function getListingsForAccount(userId: string): Listing[] {
  return LISTINGS.filter((listing) => listing.owner_id === userId);
}

export function getSavedListings(): Listing[] {
  return LISTINGS.filter((listing) => ACCOUNT_PROFILE.savedListingIds.includes(listing.id));
}

export function getSavedBusinesses(): BusinessProfile[] {
  return BUSINESS_PROFILES.filter((business) => ACCOUNT_PROFILE.savedBusinessIds.includes(business.id));
}

export function getAccountStats(): AccountStats {
  const listings = getListingsForAccount(ACCOUNT_PROFILE.profile.user_id);
  return {
    active: listings.filter((listing) => listing.status === "published").length,
    expired: listings.filter((listing) => listing.status === "expired").length,
    saved: ACCOUNT_PROFILE.savedListingIds.length + ACCOUNT_PROFILE.savedBusinessIds.length,
  };
}

export function isCategoryFree(moduleId: ModuleId, categoryId: string): boolean {
  if (moduleId === "community" || moduleId === "organizations") {
    return true;
  }

  const rule = FREE_POSTING_RULES[moduleId as keyof typeof FREE_POSTING_RULES];
  return Array.isArray(rule) ? rule.includes(categoryId) : Boolean(rule);
}

export function isListingFree(listing: Listing): boolean {
  return listing.tier === "free" || isCategoryFree(listing.module, listing.category);
}

export function getListingPriceLabel(listing: Listing): string | null {
  if (listing.salary) {
    return `${listing.salary.toLocaleString("en-US")} ${listing.currency ?? "EUR"}`;
  }
  if (listing.price) {
    return `${listing.price.toLocaleString("en-US")} ${listing.currency ?? "EUR"}`;
  }
  return null;
}

export function getListingBadges(listing: Listing): string[] {
  const badges = new Set<string>();

  if (listing.is_verified) {
    badges.add("verified");
  }
  if (listing.owner_type === "business_profile") {
    badges.add("business");
  }
  if (listing.owner_type === "private_user") {
    badges.add("private");
  }
  if (listing.owner_type === "organization") {
    badges.add("verified");
  }
  if (listing.is_featured) {
    badges.add("featured");
  }
  if (listing.tier === "urgent") {
    badges.add("urgent");
  }
  if (listing.tier === "promoted") {
    badges.add("premium");
  }
  if (isListingFree(listing)) {
    badges.add("free");
  }
  if (listing.metadata?.format?.toLowerCase().includes("remote")) {
    badges.add("remote");
  }
  if (listing.location.toLowerCase() === "online") {
    badges.add("online");
  }

  return Array.from(badges);
}

export function getOwnerProfileLink(listing: Listing): string | null {
  if (listing.owner_type !== "business_profile") {
    return null;
  }

  const business = getBusinessProfileById(listing.owner_id);
  return business ? `/business/${business.slug}` : null;
}

export function searchListings(query: string, moduleId?: ModuleId): Listing[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return moduleId ? getListingsByModule(moduleId) : LISTINGS;
  }

  return LISTINGS.filter((listing) => {
    if (moduleId && listing.module !== moduleId) {
      return false;
    }

    return [
      listing.title,
      listing.description,
      listing.city,
      listing.owner_name,
      listing.metadata ? Object.values(listing.metadata).join(" ") : "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized);
  });
}

export function searchBusinesses(query: string): BusinessProfile[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return BUSINESS_PROFILES;
  }

  return BUSINESS_PROFILES.filter((business) =>
    [business.business_name, business.category, business.city, business.description]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}

export function searchGuides(query: string): NewcomerGuideSection[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return NEWCOMER_GUIDES;
  }

  return NEWCOMER_GUIDES.filter((guide) =>
    [guide.title.ua, guide.title.es, guide.title.en, guide.summary.ua, ...guide.items.map((item) => item.ua)]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}

export const PRICING_PLANS = {
  listingTiers: LISTING_TIER_PLANS,
  businessSubscriptions: BUSINESS_SUBSCRIPTIONS,
  promotionPlacements: PROMOTION_PLACEMENTS,
  freePostingRules: FREE_POSTING_RULES,
};
