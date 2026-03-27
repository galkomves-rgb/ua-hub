import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { toast } from "sonner";
import AdminPagination from "@/components/admin/AdminPagination";
import { fetchAdminUsers, updateAdminUserRole } from "@/lib/account-api";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

const ROLE_OPTIONS = ["all", "user", "admin"] as const;
const PAGE_SIZE = 12;

function formatDate(value: string | null, locale: "ua" | "es" | "en") {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale === "ua" ? "uk-UA" : locale === "es" ? "es-ES" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminUsersPage() {
  const { theme } = useTheme();
  const { locale } = useI18n();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>("all");
  const [searchText, setSearchText] = useState("");
  const [offset, setOffset] = useState(0);
  const [roles, setRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    setOffset(0);
  }, [role, searchText]);

  const usersQuery = useQuery({
    queryKey: ["admin-users", role, searchText, offset],
    queryFn: () => fetchAdminUsers({ role, q: searchText.trim() || undefined, limit: PAGE_SIZE, offset }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, nextRole }: { userId: string; nextRole: string }) => updateAdminUserRole(userId, { role: nextRole }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success(locale === "ua" ? "Роль користувача оновлено" : locale === "es" ? "Rol de usuario actualizado" : "User role updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : (locale === "ua" ? "Не вдалося оновити роль користувача" : locale === "es" ? "No se pudo actualizar el rol del usuario" : "Unable to update the user role"));
    },
  });

  const page = usersQuery.data;
  const items = page?.items ?? [];

  return (
    <div className="space-y-6">
      <section className={`rounded-3xl border p-6 md:p-8 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
          <Users className="h-6 w-6" />
        </div>
        <h2 className={`text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          {locale === "ua" ? "Користувачі" : locale === "es" ? "Usuarios" : "Users"}
        </h2>
        <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          {locale === "ua"
            ? "Адмін-реєстр акаунтів з ролями, профільними метаданими і швидким перемиканням user/admin."
            : locale === "es"
              ? "Registro administrativo de cuentas con roles, metadatos de perfil y cambio rápido user/admin."
              : "Administrative account registry with roles, profile metadata, and quick user/admin switching."}
        </p>
      </section>

      <section className={`rounded-3xl border p-5 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className={`flex items-center gap-3 rounded-2xl border px-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-300" : "border-slate-300 bg-white text-slate-700"}`}>
            <Search className="h-4 w-4" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={locale === "ua" ? "Пошук за email, name або id" : locale === "es" ? "Buscar por email, nombre o id" : "Search by email, name, or id"}
              className="h-12 w-full bg-transparent text-sm outline-none"
            />
          </label>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as (typeof ROLE_OPTIONS)[number])}
            className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
          >
            {ROLE_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? (locale === "ua" ? "Усі ролі" : locale === "es" ? "Todos los roles" : "All roles") : item}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 space-y-4">
          {usersQuery.isLoading ? <StateBox isDark={isDark} tone="neutral" text={locale === "ua" ? "Завантаження користувачів..." : locale === "es" ? "Cargando usuarios..." : "Loading users..."} /> : null}
          {usersQuery.isError ? <StateBox isDark={isDark} tone="danger" text={usersQuery.error instanceof Error ? usersQuery.error.message : "Failed to load users"} /> : null}
          {!usersQuery.isLoading && !usersQuery.isError && items.length === 0 ? <StateBox isDark={isDark} tone="neutral" text={locale === "ua" ? "Користувачів за поточними фільтрами не знайдено." : locale === "es" ? "No hay usuarios con los filtros actuales." : "No users found for the current filters."} /> : null}

          {items.map((item) => {
            const nextRole = roles[item.id] ?? item.role;
            const isPending = roleMutation.isPending && roleMutation.variables?.userId === item.id;
            return (
              <article key={item.id} className={`rounded-3xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={`rounded-full px-3 py-1 font-semibold ${isDark ? "bg-[#173052] text-slate-100" : "bg-white text-slate-700"}`}>{item.role}</span>
                      {item.account_type ? <span className={`rounded-full px-3 py-1 font-semibold ${isDark ? "bg-[#173052] text-slate-300" : "bg-white text-slate-600"}`}>{item.account_type}</span> : null}
                    </div>
                    <h3 className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.profile_name ?? item.name ?? item.email}</h3>
                    <div className={`grid gap-2 text-sm sm:grid-cols-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      <p>Email: {item.email}</p>
                      <p>ID: {item.id}</p>
                      <p>{locale === "ua" ? "Місто" : locale === "es" ? "Ciudad" : "City"}: {item.city ?? "-"}</p>
                      <p>{locale === "ua" ? "Оголошення" : locale === "es" ? "Anuncios" : "Listings"}: {item.listings_count}</p>
                      <p>{locale === "ua" ? "Бізнес профілі" : locale === "es" ? "Perfiles de negocio" : "Business profiles"}: {item.business_profiles_count}</p>
                      <p>{locale === "ua" ? "Останній вхід" : locale === "es" ? "Último acceso" : "Last login"}: {formatDate(item.last_login, locale)}</p>
                    </div>
                  </div>

                  <div className="w-full max-w-sm space-y-3 xl:w-[260px]">
                    <select
                      value={nextRole}
                      onChange={(event) => setRoles((current) => ({ ...current, [item.id]: event.target.value }))}
                      className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-[#22416b] bg-[#11203a] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
                    >
                      {ROLE_OPTIONS.filter((entry) => entry !== "all").map((entry) => (
                        <option key={entry} value={entry}>{entry}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => roleMutation.mutate({ userId: item.id, nextRole })}
                      disabled={isPending}
                      className={`inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-[#FFD700] text-slate-900" : "bg-blue-50 text-[#0057B8]"} ${isPending ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      {locale === "ua" ? "Оновити роль" : locale === "es" ? "Actualizar rol" : "Update role"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6">
          <AdminPagination
            total={page?.total ?? 0}
            limit={page?.limit ?? PAGE_SIZE}
            offset={page?.offset ?? offset}
            isDark={isDark}
            locale={locale}
            onPageChange={setOffset}
          />
        </div>
      </section>
    </div>
  );
}

function StateBox({ isDark, tone, text }: { isDark: boolean; tone: "neutral" | "danger"; text: string }) {
  return (
    <div className={`rounded-2xl border p-4 text-sm ${tone === "danger"
      ? isDark ? "border-red-900/40 bg-red-950/20 text-red-300" : "border-red-200 bg-red-50 text-red-700"
      : isDark ? "border-[#22416b] bg-[#0d1a2e] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}
    >
      {text}
    </div>
  );
}