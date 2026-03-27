type AdminPaginationProps = {
  total: number;
  limit: number;
  offset: number;
  isDark: boolean;
  locale: "ua" | "es" | "en";
  onPageChange: (nextOffset: number) => void;
};

function getCopy(locale: "ua" | "es" | "en") {
  if (locale === "ua") {
    return {
      previous: "Назад",
      next: "Далі",
      empty: "0 з 0",
      summary: (start: number, end: number, total: number) => `${start}-${end} з ${total}`,
    };
  }
  if (locale === "es") {
    return {
      previous: "Anterior",
      next: "Siguiente",
      empty: "0 de 0",
      summary: (start: number, end: number, total: number) => `${start}-${end} de ${total}`,
    };
  }
  return {
    previous: "Previous",
    next: "Next",
    empty: "0 of 0",
    summary: (start: number, end: number, total: number) => `${start}-${end} of ${total}`,
  };
}

export default function AdminPagination({
  total,
  limit,
  offset,
  isDark,
  locale,
  onPageChange,
}: AdminPaginationProps) {
  const copy = getCopy(locale);
  const start = total === 0 ? 0 : offset + 1;
  const end = total === 0 ? 0 : Math.min(offset + limit, total);
  const canGoBack = offset > 0;
  const canGoForward = offset + limit < total;

  return (
    <div className="flex flex-col gap-3 border-t border-inherit pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
        {total === 0 ? copy.empty : copy.summary(start, end, total)}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, offset - limit))}
          disabled={!canGoBack}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${isDark ? "bg-[#1a2d4c] text-slate-100" : "bg-slate-100 text-slate-700"} ${!canGoBack ? "cursor-not-allowed opacity-50" : ""}`}
        >
          {copy.previous}
        </button>
        <button
          type="button"
          onClick={() => onPageChange(offset + limit)}
          disabled={!canGoForward}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${isDark ? "bg-[#FFD700] text-slate-900" : "bg-blue-50 text-[#0057B8]"} ${!canGoForward ? "cursor-not-allowed opacity-50" : ""}`}
        >
          {copy.next}
        </button>
      </div>
    </div>
  );
}