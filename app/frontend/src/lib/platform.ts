import {
  Briefcase, Home, Wrench, ShoppingBag, Calendar, Users, Building2, Store,
  Car, Laptop, Shirt, Baby, Dumbbell, Music, Ticket, Gift,
  Heart, BookOpen, Handshake, Globe, Paintbrush, Truck,
  GraduationCap, Church, Shield, Scale, Stethoscope,
  Camera, Scissors, Hammer, UtensilsCrossed, Wifi, MapPin,
  Star, CheckCircle, Clock, Zap, User, BadgeCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Images ───
export const IMAGES = {
  hero: "https://mgx-backend-cdn.metadl.com/generate/images/1049271/2026-03-24/f2fc3c5a-d914-4f72-b4f7-5ef55b64a4b2.png",
  jobs: "https://mgx-backend-cdn.metadl.com/generate/images/1049271/2026-03-24/c7ee3ff7-381f-40fa-9b95-edd6f1954ac8.png",
  housing: "https://mgx-backend-cdn.metadl.com/generate/images/1049271/2026-03-24/2e07c498-c2ad-4fe2-b3c3-912de671181b.png",
  events: "https://mgx-backend-cdn.metadl.com/generate/images/1049271/2026-03-24/36b0d423-4c13-45cf-b990-477dc237d22e.png",
  oldHero: "https://mgx-backend-cdn.metadl.com/generate/images/1049271/2026-03-23/c10bc500-2a23-49c2-90d6-8787ee4b4906.png",
};

// ─── Module Definition ───
export interface ModuleConfig {
  id: string;
  icon: LucideIcon;
  lightColor: string;
  darkColor: string;
  lightIconBg: string;
  darkIconBg: string;
  borderColor: string;
  banner?: string;
  categories: Category[];
}

export interface Category {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  subcategories?: { id: string; labelKey: string }[];
}

export interface Listing {
  id: string;
  userId: string;
  module: string;
  category: string;
  subcategory?: string;
  title: string;
  description: string;
  price?: string;
  currency?: string;
  city: string;
  region?: string;
  ownerType: "private_user" | "business_profile" | "organization";
  ownerId: string;
  badges: string[];
  images: string[];
  eventDate?: string;
  expiryDate?: string;
  status: "active" | "expired" | "draft";
  isFeatured: boolean;
  isPromoted: boolean;
  isVerified: boolean;
  meta?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  city: string;
  bio?: string;
  preferredLanguage: "ua" | "es" | "en";
  createdAt: string;
  updatedAt: string;
}

export interface BusinessProfile {
  id: string;
  ownerUserId: string;
  slug: string;
  name: string;
  logo?: string;
  cover?: string;
  category: string;
  city: string;
  description: string;
  contacts: { phone?: string; email?: string; website?: string };
  isVerified: boolean;
  isPremium: boolean;
  tags: string[];
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Cities ───
export const CITIES = [
  "Madrid", "Barcelona", "Valencia", "Alicante", "Málaga",
  "Sevilla", "Bilbao", "Zaragoza", "Murcia", "Palma",
  "Torrevieja", "Benidorm", "Marbella", "Granada", "Salamanca",
];

// ─── Modules ───
export const MODULES: Record<string, ModuleConfig> = {
  jobs: {
    id: "jobs",
    icon: Briefcase,
    lightColor: "text-blue-700",
    darkColor: "text-blue-300",
    lightIconBg: "bg-blue-50",
    darkIconBg: "bg-blue-900/40",
    borderColor: "border-blue-400",
    banner: IMAGES.jobs,
    categories: [
      { id: "vacancies", labelKey: "Вакансії", icon: Briefcase, subcategories: [
        { id: "full-time", labelKey: "Повна зайнятість" },
        { id: "part-time", labelKey: "Часткова зайнятість" },
        { id: "temporary", labelKey: "Тимчасова робота" },
        { id: "remote", labelKey: "Віддалена робота" },
      ]},
      { id: "job-seekers", labelKey: "Шукаю роботу", icon: User },
      { id: "employment-help", labelKey: "Допомога з працевлаштуванням", icon: Handshake },
      { id: "partnerships", labelKey: "Бізнес-партнерство", icon: Users },
      { id: "recruitment", labelKey: "Рекрутинг", icon: BadgeCheck },
    ],
  },
  housing: {
    id: "housing",
    icon: Home,
    lightColor: "text-emerald-600",
    darkColor: "text-emerald-300",
    lightIconBg: "bg-emerald-50",
    darkIconBg: "bg-emerald-900/40",
    borderColor: "border-emerald-400",
    banner: IMAGES.housing,
    categories: [
      { id: "apartment-rent", labelKey: "Оренда квартири", icon: Home, subcategories: [
        { id: "1-room", labelKey: "1-кімнатна" },
        { id: "2-room", labelKey: "2-кімнатна" },
        { id: "3-room", labelKey: "3+ кімнат" },
        { id: "studio", labelKey: "Студія" },
      ]},
      { id: "room-rent", labelKey: "Оренда кімнати", icon: Home },
      { id: "house-rent", labelKey: "Оренда будинку", icon: Home },
      { id: "shared", labelKey: "Спільне житло", icon: Users },
      { id: "looking", labelKey: "Шукаю житло", icon: MapPin },
      { id: "commercial", labelKey: "Комерційна нерухомість", icon: Building2 },
      { id: "sale", labelKey: "Продаж нерухомості", icon: Home },
      { id: "temporary", labelKey: "Тимчасове проживання", icon: Clock },
    ],
  },
  services: {
    id: "services",
    icon: Wrench,
    lightColor: "text-violet-600",
    darkColor: "text-violet-300",
    lightIconBg: "bg-violet-50",
    darkIconBg: "bg-violet-900/40",
    borderColor: "border-violet-400",
    categories: [
      { id: "household", labelKey: "Побутові послуги", icon: Wrench },
      { id: "beauty", labelKey: "Краса та здоров'я", icon: Scissors },
      { id: "kids-edu", labelKey: "Діти та освіта", icon: GraduationCap },
      { id: "legal", labelKey: "Юридичні послуги", icon: Scale },
      { id: "finance", labelKey: "Фінансові послуги", icon: Building2 },
      { id: "construction", labelKey: "Будівництво та ремонт", icon: Hammer },
      { id: "delivery", labelKey: "Доставка та транспорт", icon: Truck },
      { id: "digital", labelKey: "Digital / IT / Маркетинг", icon: Laptop },
      { id: "health", labelKey: "Здоров'я / Психологія", icon: Stethoscope },
      { id: "horeca", labelKey: "HoReCa", icon: UtensilsCrossed },
      { id: "auto", labelKey: "Авто-послуги", icon: Car },
      { id: "photo-video", labelKey: "Фото / Відео", icon: Camera },
      { id: "translation", labelKey: "Переклади / Документи", icon: BookOpen },
    ],
  },
  marketplace: {
    id: "marketplace",
    icon: ShoppingBag,
    lightColor: "text-orange-600",
    darkColor: "text-orange-300",
    lightIconBg: "bg-orange-50",
    darkIconBg: "bg-orange-900/40",
    borderColor: "border-orange-400",
    categories: [
      { id: "electronics", labelKey: "Електроніка", icon: Laptop },
      { id: "phones", labelKey: "Телефони", icon: Laptop },
      { id: "furniture", labelKey: "Меблі", icon: Home },
      { id: "clothing", labelKey: "Одяг", icon: Shirt },
      { id: "kids", labelKey: "Дитячі товари", icon: Baby },
      { id: "auto-parts", labelKey: "Авто / Запчастини", icon: Car },
      { id: "sports", labelKey: "Спорт", icon: Dumbbell },
      { id: "home-goods", labelKey: "Товари для дому", icon: Home },
      { id: "hobby", labelKey: "Хобі", icon: Paintbrush },
      { id: "tickets", labelKey: "Квитки", icon: Ticket },
      { id: "free", labelKey: "Безкоштовно / Віддам", icon: Gift },
      { id: "wanted", labelKey: "Шукаю", icon: MapPin },
    ],
  },
  events: {
    id: "events",
    icon: Calendar,
    lightColor: "text-amber-600",
    darkColor: "text-amber-300",
    lightIconBg: "bg-amber-50",
    darkIconBg: "bg-amber-900/40",
    borderColor: "border-amber-400",
    banner: IMAGES.events,
    categories: [
      { id: "cultural", labelKey: "Культурні події", icon: Music },
      { id: "educational", labelKey: "Освітні заходи", icon: GraduationCap },
      { id: "networking", labelKey: "Нетворкінг", icon: Handshake },
      { id: "charity", labelKey: "Благодійність", icon: Heart },
      { id: "kids-events", labelKey: "Дитячі події", icon: Baby },
      { id: "sports-events", labelKey: "Спорт", icon: Dumbbell },
      { id: "business-events", labelKey: "Бізнес-події", icon: Building2 },
      { id: "community-meetups", labelKey: "Зустрічі громади", icon: Users },
      { id: "online-events", labelKey: "Онлайн-події", icon: Globe },
    ],
  },
  community: {
    id: "community",
    icon: Users,
    lightColor: "text-rose-500",
    darkColor: "text-rose-300",
    lightIconBg: "bg-rose-50",
    darkIconBg: "bg-rose-900/40",
    borderColor: "border-rose-400",
    categories: [
      { id: "clubs", labelKey: "Клуби за інтересами", icon: Users },
      { id: "volunteering", labelKey: "Волонтерство", icon: Heart },
      { id: "social", labelKey: "Знайомства / Компанія", icon: Heart },
      { id: "parents", labelKey: "Батьківські спільноти", icon: Baby },
      { id: "it-professional", labelKey: "IT / Професійні клуби", icon: Laptop },
      { id: "sports-clubs", labelKey: "Спорт", icon: Dumbbell },
      { id: "arts", labelKey: "Мистецтво / Творчість", icon: Paintbrush },
      { id: "newcomers", labelKey: "Допомога новачкам", icon: Handshake },
      { id: "trips", labelKey: "Спільні подорожі", icon: MapPin },
      { id: "local", labelKey: "Місцеві ініціативи", icon: Globe },
    ],
  },
  organizations: {
    id: "organizations",
    icon: Building2,
    lightColor: "text-sky-600",
    darkColor: "text-sky-300",
    lightIconBg: "bg-sky-50",
    darkIconBg: "bg-sky-900/40",
    borderColor: "border-sky-400",
    categories: [
      { id: "associations", labelKey: "Асоціації", icon: Building2 },
      { id: "public-orgs", labelKey: "Громадські організації", icon: Users },
      { id: "edu-centers", labelKey: "Освітні центри", icon: GraduationCap },
      { id: "schools", labelKey: "Українські школи", icon: BookOpen },
      { id: "consular", labelKey: "Консульські / Юридичні ресурси", icon: Scale },
      { id: "humanitarian", labelKey: "Гуманітарні ініціативи", icon: Heart },
      { id: "churches", labelKey: "Церкви / Духовні центри", icon: Church },
      { id: "adaptation", labelKey: "Адаптація / Інтеграція", icon: Shield },
    ],
  },
  business: {
    id: "business",
    icon: Store,
    lightColor: "text-indigo-600",
    darkColor: "text-indigo-300",
    lightIconBg: "bg-indigo-50",
    darkIconBg: "bg-indigo-900/40",
    borderColor: "border-indigo-400",
    categories: [
      { id: "all-biz", labelKey: "Усі бізнеси", icon: Store },
      { id: "verified-biz", labelKey: "Перевірені бізнеси", icon: CheckCircle },
      { id: "premium-biz", labelKey: "Преміум бізнеси", icon: Star },
      { id: "new-biz", labelKey: "Нові бізнеси", icon: Zap },
    ],
  },
};

export const MODULE_ORDER = ["jobs", "housing", "services", "marketplace", "events", "community", "organizations", "business"];

// ─── Sample Listings ───
export const SAMPLE_LISTINGS: Listing[] = [
  // Jobs
  { id: "j1", module: "jobs", category: "vacancies", title: "Офіціант/ка в ресторан", shortDesc: "Шукаємо офіціанта зі знанням іспанської. Графік: Пн-Пт. Зарплата від 1400€.", price: "1400", currency: "€/міс", city: "Madrid", authorType: "business", authorName: "Restaurante Sol", badges: ["verified", "business"], meta: { type: "Повна зайнятість", format: "В офісі" }, createdAt: "2026-03-22" },
  { id: "j2", module: "jobs", category: "vacancies", title: "Frontend розробник (React)", shortDesc: "Віддалена робота для досвідченого React-розробника. Проєкт для FinTech стартапу.", price: "2500-3500", currency: "€/міс", city: "Barcelona", authorType: "business", authorName: "TechUA Solutions", badges: ["featured", "remote", "business"], meta: { type: "Повна зайнятість", format: "Віддалено" }, createdAt: "2026-03-23" },
  { id: "j3", module: "jobs", category: "job-seekers", title: "Шукаю роботу — перекладач UA/ES", shortDesc: "Досвід 5 років, сертифікований перекладач. Готовий до офісної та віддаленої роботи.", city: "Valencia", authorType: "private", authorName: "Олена К.", badges: ["new"], meta: { type: "Пошук роботи" }, createdAt: "2026-03-24" },
  { id: "j4", module: "jobs", category: "vacancies", title: "Прибиральниця в готель", shortDesc: "Робота в 4-зірковому готелі. Графік змінний. Оформлення за контрактом.", price: "1200", currency: "€/міс", city: "Alicante", authorType: "business", authorName: "Hotel Costa", badges: ["urgent", "business"], meta: { type: "Повна зайнятість", format: "В офісі" }, createdAt: "2026-03-21" },
  // Housing
  { id: "h1", module: "housing", category: "apartment-rent", title: "2-кімнатна квартира біля метро", shortDesc: "Світла квартира, 65м², повністю мебльована. Поруч метро, супермаркет, парк.", price: "850", currency: "€/міс", city: "Madrid", authorType: "private", authorName: "Ірина М.", badges: ["new"], meta: { rooms: "2", area: "65 м²", furnished: "Мебльована" }, createdAt: "2026-03-23" },
  { id: "h2", module: "housing", category: "room-rent", title: "Кімната в центрі Барселони", shortDesc: "Затишна кімната в спільній квартирі. Wi-Fi, пральна машина. Тільки для дівчат.", price: "450", currency: "€/міс", city: "Barcelona", authorType: "private", authorName: "Марія Д.", badges: ["featured"], meta: { rooms: "1", area: "15 м²", furnished: "Мебльована" }, createdAt: "2026-03-22" },
  { id: "h3", module: "housing", category: "looking", title: "Шукаю квартиру у Валенсії", shortDesc: "Сім'я з дитиною шукає 2-кімнатну квартиру. Бюджет до 700€. Бажано з меблями.", city: "Valencia", authorType: "private", authorName: "Андрій Т.", badges: ["urgent"], createdAt: "2026-03-24" },
  // Services
  { id: "s1", module: "services", category: "translation", title: "Переклади UA-ES-EN, апостиль", shortDesc: "Сертифікований перекладач. Переклади документів, апостиль, легалізація. Швидко та якісно.", price: "від 30", currency: "€", city: "Madrid", authorType: "business", authorName: "UA Translations", badges: ["verified", "premium", "business"], meta: { format: "Онлайн + Офлайн" }, createdAt: "2026-03-20" },
  { id: "s2", module: "services", category: "beauty", title: "Майстер манікюру / педикюру", shortDesc: "Досвід 8 років. Гель-лак, нарощування, дизайн. Працюю вдома та з виїздом.", price: "від 25", currency: "€", city: "Alicante", authorType: "private", authorName: "Катерина Л.", badges: ["new"], meta: { format: "Офлайн" }, createdAt: "2026-03-23" },
  { id: "s3", module: "services", category: "legal", title: "Юридична консультація з NIE/TIE", shortDesc: "Допомога з оформленням документів в Іспанії. NIE, TIE, резиденція, робочий дозвіл.", price: "від 50", currency: "€", city: "Barcelona", authorType: "business", authorName: "Legal UA Spain", badges: ["verified", "business"], meta: { format: "Онлайн + Офлайн" }, createdAt: "2026-03-21" },
  // Marketplace
  { id: "m1", module: "marketplace", category: "electronics", title: "MacBook Pro 14\" M3, як новий", shortDesc: "Куплений 3 місяці тому. Повний комплект, гарантія Apple до 2027.", price: "1800", currency: "€", city: "Madrid", authorType: "private", authorName: "Дмитро К.", badges: ["featured"], meta: { condition: "Як новий" }, createdAt: "2026-03-22" },
  { id: "m2", module: "marketplace", category: "furniture", title: "Диван IKEA, відмінний стан", shortDesc: "Розкладний диван, сірий колір. Самовивіз з Валенсії.", price: "200", currency: "€", city: "Valencia", authorType: "private", authorName: "Наталія В.", badges: [], meta: { condition: "Б/в, відмінний" }, createdAt: "2026-03-23" },
  { id: "m3", module: "marketplace", category: "free", title: "Віддам дитячий одяг 2-4 роки", shortDesc: "Пакет дитячого одягу в хорошому стані. Самовивіз Аліканте.", city: "Alicante", authorType: "private", authorName: "Оксана П.", badges: ["free"], createdAt: "2026-03-24" },
  // Events
  { id: "e1", module: "events", category: "cultural", title: "Великодній ярмарок", shortDesc: "Традиційний український ярмарок: писанки, вишиванки, українська кухня, музика.", city: "Madrid", authorType: "business", authorName: "Асоціація українців Мадриду", badges: ["featured", "free"], date: "2026-04-12", meta: { time: "11:00 - 18:00", place: "Plaza Mayor" }, createdAt: "2026-03-15" },
  { id: "e2", module: "events", category: "educational", title: "Воркшоп: Як знайти роботу в Іспанії", shortDesc: "Практичний семінар з пошуку роботи. CV, співбесіди, права працівників.", city: "Barcelona", authorType: "business", authorName: "UA Hub Barcelona", badges: ["new"], date: "2026-04-05", meta: { time: "18:00 - 20:00", place: "Coworking Central" }, createdAt: "2026-03-20" },
  { id: "e3", module: "events", category: "community-meetups", title: "Зустріч української громади", shortDesc: "Щомісячна зустріч громади. Знайомства, обмін досвідом, підтримка.", city: "Valencia", authorType: "private", authorName: "UA Valencia", badges: ["free"], date: "2026-04-08", meta: { time: "17:00 - 19:00", place: "Café Central" }, createdAt: "2026-03-22" },
  // Community
  { id: "c1", module: "community", category: "clubs", title: "Книжковий клуб українською", shortDesc: "Читаємо та обговорюємо книги українською. Зустрічі щотижня онлайн.", city: "Online", authorType: "private", authorName: "Літературний клуб UA", badges: ["online"], createdAt: "2026-03-18" },
  { id: "c2", module: "community", category: "volunteering", title: "Волонтери для гуманітарної допомоги", shortDesc: "Шукаємо волонтерів для сортування та відправки гуманітарної допомоги в Україну.", city: "Madrid", authorType: "business", authorName: "UA Help Madrid", badges: ["urgent", "verified"], createdAt: "2026-03-21" },
  { id: "c3", module: "community", category: "parents", title: "Мами Барселони — група підтримки", shortDesc: "Група для українських мам. Зустрічі, поради, дитячі заходи.", city: "Barcelona", authorType: "private", authorName: "Мами BCN", badges: ["new"], createdAt: "2026-03-23" },
  // Organizations
  { id: "o1", module: "organizations", category: "associations", title: "Асоціація українців Іспанії", shortDesc: "Офіційна асоціація. Юридична допомога, культурні заходи, інтеграція.", city: "Madrid", authorType: "business", authorName: "АУІ", badges: ["verified"], createdAt: "2026-01-01" },
  { id: "o2", module: "organizations", category: "schools", title: "Українська школа «Джерело»", shortDesc: "Суботня школа для дітей 4-16 років. Українська мова, історія, культура.", city: "Barcelona", authorType: "business", authorName: "Школа Джерело", badges: ["verified"], createdAt: "2026-02-01" },
  { id: "o3", module: "organizations", category: "humanitarian", title: "Центр допомоги біженцям", shortDesc: "Безкоштовна допомога з документами, житлом, працевлаштуванням для біженців.", city: "Valencia", authorType: "business", authorName: "UA Support Valencia", badges: ["verified", "free"], createdAt: "2026-01-15" },
];

// ─── Sample Businesses ───
export const SAMPLE_BUSINESSES: BusinessProfile[] = [
  { id: "b1", name: "UA Translations", category: "Переклади", shortDesc: "Сертифіковані переклади UA-ES-EN. Апостиль, легалізація документів.", city: "Madrid", verified: true, premium: true, tags: ["переклади", "документи", "апостиль"], rating: 4.9 },
  { id: "b2", name: "TechUA Solutions", category: "IT / Digital", shortDesc: "Розробка вебсайтів та додатків. Маркетинг для українського бізнесу.", city: "Barcelona", verified: true, premium: false, tags: ["IT", "веб-розробка", "маркетинг"], rating: 4.7 },
  { id: "b3", name: "Legal UA Spain", category: "Юридичні послуги", shortDesc: "Юридичні консультації. NIE, TIE, резиденція, робочий дозвіл.", city: "Barcelona", verified: true, premium: true, tags: ["юрист", "NIE", "резиденція"], rating: 4.8 },
  { id: "b4", name: "Restaurante Sol", category: "HoReCa", shortDesc: "Український ресторан з домашньою кухнею. Борщ, вареники, голубці.", city: "Madrid", verified: true, premium: false, tags: ["ресторан", "українська кухня"], rating: 4.6 },
  { id: "b5", name: "UA Beauty Studio", category: "Краса", shortDesc: "Салон краси. Манікюр, педикюр, перукарські послуги.", city: "Alicante", verified: false, premium: false, tags: ["салон краси", "манікюр"], rating: 4.5 },
  { id: "b6", name: "AutoService UA", category: "Авто", shortDesc: "СТО з українськомовним персоналом. Діагностика, ремонт, ТО.", city: "Valencia", verified: true, premium: false, tags: ["авто", "ремонт", "СТО"], rating: 4.4 },
];

// ─── Pricing Plans ───
export const PRICING_PLANS = [
  {
    id: "free",
    features: [
      "Пошук роботи",
      "Шукаю житло",
      "Спільнота",
      "Організації",
      "Базові оголошення",
      "До 3 фото",
    ],
    price: "0",
  },
  {
    id: "basic",
    features: [
      "Усе з безкоштовного",
      "Вакансії",
      "Оренда житла",
      "Послуги",
      "Маркетплейс",
      "До 10 фото",
      "30 днів активності",
    ],
    price: "4.99",
  },
  {
    id: "premium",
    features: [
      "Усе з базового",
      "Виділене оголошення",
      "Топ позиція в пошуку",
      "До 20 фото",
      "60 днів активності",
      "Значок «Рекомендоване»",
    ],
    price: "9.99",
  },
  {
    id: "business",
    features: [
      "Усе з преміум",
      "Бізнес-профіль",
      "Значок «Перевірено»",
      "Необмежені оголошення",
      "Аналітика переглядів",
      "Пріоритетна підтримка",
      "Логотип у каталозі",
    ],
    price: "19.99",
  },
];
