import { Activity, ClipboardList, CreditCard, LayoutDashboard, MessageSquareWarning, Settings2, ShieldCheck, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import ProtectedAdminRoute from "@/components/ProtectedAdminRoute";
import UahubLayout from "@/components/UahubLayout";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

type AdminNavItem = {
  to: string;
  label: { ua: string; es: string; en: string };
  description: { ua: string; es: string; en: string };
  icon: typeof LayoutDashboard;
};

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    to: "/admin/overview",
    label: { ua: "Огляд", es: "Resumen", en: "Overview" },
    description: { ua: "Стан платформи", es: "Estado de la plataforma", en: "Platform health" },
    icon: LayoutDashboard,
  },
  {
    to: "/admin/listings/moderation",
    label: { ua: "Модерація", es: "Moderación", en: "Moderation" },
    description: { ua: "Черга перевірки", es: "Cola de revisión", en: "Review queue" },
    icon: ShieldCheck,
  },
  {
    to: "/admin/listings",
    label: { ua: "Оголошення", es: "Anuncios", en: "Listings" },
    description: { ua: "Повний каталог", es: "Catálogo completo", en: "Full catalog" },
    icon: ClipboardList,
  },
  {
    to: "/admin/reports",
    label: { ua: "Скарги", es: "Reportes", en: "Reports" },
    description: { ua: "Кейси та review", es: "Casos y revisión", en: "Cases and review" },
    icon: MessageSquareWarning,
  },
  {
    to: "/admin/billing",
    label: { ua: "Billing", es: "Billing", en: "Billing" },
    description: { ua: "Платежі та override", es: "Pagos y overrides", en: "Payments and overrides" },
    icon: CreditCard,
  },
  {
    to: "/admin/users",
    label: { ua: "Користувачі", es: "Usuarios", en: "Users" },
    description: { ua: "Ролі та профілі", es: "Roles y perfiles", en: "Roles and profiles" },
    icon: Users,
  },
  {
    to: "/admin/operations",
    label: { ua: "Операції", es: "Operaciones", en: "Operations" },
    description: { ua: "Expiration jobs", es: "Expiration jobs", en: "Expiration jobs" },
    icon: Settings2,
  },
];

export default function AdminCenterLayout() {
  const { theme } = useTheme();
  const { locale } = useI18n();
  const isDark = theme === "dark";

  return (
    <ProtectedAdminRoute>
      <UahubLayout hideModuleNav>
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
          <div className="mb-6 flex items-start gap-4 rounded-3xl border px-6 py-6 shadow-sm backdrop-blur-sm lg:px-8">
            <div className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
              isDark ? "bg-[#1a2d4c] text-[#FFD700]" : "bg-blue-50 text-[#0057B8]",
            )}>
              <Activity className="h-7 w-7" />
            </div>
            <div>
              <h1 className={cn("text-2xl font-bold", isDark ? "text-slate-100" : "text-slate-900")}> 
                {locale === "ua" ? "Адмін центр" : locale === "es" ? "Centro administrativo" : "Admin center"}
              </h1>
              <p className={cn("mt-2 max-w-3xl text-sm", isDark ? "text-slate-400" : "text-slate-600")}>
                {locale === "ua"
                  ? "Єдина зона керування контентом, модерацією та операційними процесами платформи."
                  : locale === "es"
                    ? "Zona unificada para gestionar contenido, moderación y operaciones de la plataforma."
                    : "Unified area for content control, moderation, and platform operations."}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className={cn(
              "h-fit rounded-3xl border p-3",
              isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white",
            )}>
              <nav className="space-y-2">
                {ADMIN_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => cn(
                        "flex items-start gap-3 rounded-2xl px-4 py-3 transition-colors",
                        isActive
                          ? (isDark ? "bg-[#1a2d4c] text-slate-100" : "bg-blue-50 text-slate-900")
                          : (isDark ? "text-slate-300 hover:bg-[#162844]" : "text-slate-700 hover:bg-slate-50"),
                      )}
                    >
                      <span className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        isDark ? "bg-[#0d1a2e]" : "bg-white",
                      )}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{item.label[locale]}</span>
                        <span className={cn("mt-1 block text-xs", isDark ? "text-slate-500" : "text-slate-500")}>{item.description[locale]}</span>
                      </span>
                    </NavLink>
                  );
                })}
              </nav>
            </aside>

            <main className="min-w-0">
              <Outlet />
            </main>
          </div>
        </div>
      </UahubLayout>
    </ProtectedAdminRoute>
  );
}
