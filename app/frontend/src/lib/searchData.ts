import {
  Briefcase,
  Home,
  Heart,
  Calendar,
  Wrench,
  Scale,
  MapPin,
  Building2,
  Euro,
  Star,
  FileText,
  Shield,
  HelpCircle,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SearchItem {
  title: string;
  subtitle: string;
  category: string;
  categoryIcon: LucideIcon;
  categoryColor: string;
  path: string;
}

export const searchItems: SearchItem[] = [
  // Jobs
  {
    title: "Офіціант/ка",
    subtitle: "Restaurante Sol · Мадрид",
    category: "Робота",
    categoryIcon: Briefcase,
    categoryColor: "text-blue-600",
    path: "/jobs",
  },
  {
    title: "Прибиральник/ця",
    subtitle: "CleanPro Services · Барселона",
    category: "Робота",
    categoryIcon: Briefcase,
    categoryColor: "text-blue-600",
    path: "/jobs",
  },
  {
    title: "Водій доставки",
    subtitle: "Delivery Express · Валенсія",
    category: "Робота",
    categoryIcon: Briefcase,
    categoryColor: "text-blue-600",
    path: "/jobs",
  },
  {
    title: "Перекладач UA-ES",
    subtitle: "LinguaLink · Віддалено",
    category: "Робота",
    categoryIcon: Briefcase,
    categoryColor: "text-blue-600",
    path: "/jobs",
  },
  // Real Estate
  {
    title: "2-кімнатна квартира",
    subtitle: "Мадрид, Лавапієс · €750/міс",
    category: "Нерухомість",
    categoryIcon: Home,
    categoryColor: "text-emerald-600",
    path: "/real-estate",
  },
  {
    title: "Кімната в спільній квартирі",
    subtitle: "Барселона, Ейшампле · €420/міс",
    category: "Нерухомість",
    categoryIcon: Home,
    categoryColor: "text-emerald-600",
    path: "/real-estate",
  },
  {
    title: "Студія біля моря",
    subtitle: "Валенсія, Мальварроса · €580/міс",
    category: "Нерухомість",
    categoryIcon: Home,
    categoryColor: "text-emerald-600",
    path: "/real-estate",
  },
  {
    title: "3-кімнатна квартира",
    subtitle: "Аліканте, центр · €95,000",
    category: "Нерухомість",
    categoryIcon: Home,
    categoryColor: "text-emerald-600",
    path: "/real-estate",
  },
  // Events
  {
    title: "Великодній ярмарок",
    subtitle: "Мадрид, Parque del Retiro · 12 квітня",
    category: "Події",
    categoryIcon: Calendar,
    categoryColor: "text-amber-500",
    path: "/events",
  },
  {
    title: "Розмовний клуб іспанської",
    subtitle: "Барселона, Café Babel · 28 березня",
    category: "Події",
    categoryIcon: Calendar,
    categoryColor: "text-amber-500",
    path: "/events",
  },
  {
    title: "Концерт української музики",
    subtitle: "Валенсія, Sala Russafa · 5 квітня",
    category: "Події",
    categoryIcon: Calendar,
    categoryColor: "text-amber-500",
    path: "/events",
  },
  {
    title: "Зустріч для мам з дітьми",
    subtitle: "Аліканте, Parque Lo Morant · 30 березня",
    category: "Події",
    categoryIcon: Calendar,
    categoryColor: "text-amber-500",
    path: "/events",
  },
  // Services
  {
    title: "Переклад документів UA-ES",
    subtitle: "Оксана М. · Мадрид / Онлайн",
    category: "Послуги",
    categoryIcon: Wrench,
    categoryColor: "text-violet-600",
    path: "/services",
  },
  {
    title: "Сантехнік — терміновий виклик",
    subtitle: "Андрій К. · Барселона",
    category: "Послуги",
    categoryIcon: Wrench,
    categoryColor: "text-violet-600",
    path: "/services",
  },
  {
    title: "Репетитор іспанської мови",
    subtitle: "Марія Л. · Валенсія / Онлайн",
    category: "Послуги",
    categoryIcon: Wrench,
    categoryColor: "text-violet-600",
    path: "/services",
  },
  {
    title: "Перевезення та переїзди",
    subtitle: "Сергій В. · Мадрид",
    category: "Послуги",
    categoryIcon: Wrench,
    categoryColor: "text-violet-600",
    path: "/services",
  },
  // Legal Help
  {
    title: "NIE та резиденція",
    subtitle: "Дозвіл на проживання та роботу",
    category: "Юридична допомога",
    categoryIcon: Scale,
    categoryColor: "text-sky-600",
    path: "/legal-help",
  },
  {
    title: "Тимчасовий захист",
    subtitle: "Статус захисту для українців",
    category: "Юридична допомога",
    categoryIcon: Scale,
    categoryColor: "text-sky-600",
    path: "/legal-help",
  },
  {
    title: "Соціальна допомога",
    subtitle: "Медичне страхування, виплати",
    category: "Юридична допомога",
    categoryIcon: Scale,
    categoryColor: "text-sky-600",
    path: "/legal-help",
  },
  {
    title: "Визнання документів",
    subtitle: "Легалізація дипломів, прав",
    category: "Юридична допомога",
    categoryIcon: Scale,
    categoryColor: "text-sky-600",
    path: "/legal-help",
  },
  // Dating
  {
    title: "Знайомства",
    subtitle: "Нові знайомства та спілкування",
    category: "Знайомства",
    categoryIcon: Heart,
    categoryColor: "text-rose-500",
    path: "/dating",
  },
];