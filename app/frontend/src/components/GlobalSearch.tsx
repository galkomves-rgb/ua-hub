import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Clock, Trash2 } from "lucide-react";
import { searchItems } from "@/lib/searchData";
import type { SearchItem } from "@/lib/searchData";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteSearchHistory,
  fetchSearchHistory,
  saveSearchHistory,
} from "@/lib/account-api";
import { useTheme } from "@/lib/ThemeContext";

const RECENT_SEARCHES_KEY = "uahab_recent_searches";
const MAX_RECENT = 5;

interface RecentSearch {
  id?: number;
  query: string;
  created_at: string;
}

function getLocalRecent(): RecentSearch[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalRecent(searches: RecentSearch[]) {
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches.slice(0, MAX_RECENT)));
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const isLoggedIn = Boolean(user);

  // Load recent searches
  const loadRecentSearches = useCallback(async () => {
    setLoadingRecent(true);
    try {
      if (isLoggedIn) {
        const items = await fetchSearchHistory(MAX_RECENT);
        setRecentSearches(
          items.map((item) => ({
            id: item.id,
            query: item.query,
            created_at: item.created_at,
          }))
        );
      } else {
        setRecentSearches(getLocalRecent());
      }
    } catch {
      setRecentSearches(getLocalRecent());
    } finally {
      setLoadingRecent(false);
    }
  }, [isLoggedIn]);

  // Save a search query
  const saveSearch = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) return;

      try {
        if (isLoggedIn) {
          await saveSearchHistory(trimmed);
          await loadRecentSearches();
        } else {
          const current = getLocalRecent();
          const filtered = current.filter(
            (s) => s.query.toLowerCase() !== trimmed.toLowerCase()
          );
          const updated = [
            { query: trimmed, created_at: new Date().toISOString() },
            ...filtered,
          ].slice(0, MAX_RECENT);
          saveLocalRecent(updated);
          setRecentSearches(updated);
        }
      } catch {
        const current = getLocalRecent();
        const filtered = current.filter(
          (s) => s.query.toLowerCase() !== trimmed.toLowerCase()
        );
        const updated = [
          { query: trimmed, created_at: new Date().toISOString() },
          ...filtered,
        ].slice(0, MAX_RECENT);
        saveLocalRecent(updated);
        setRecentSearches(updated);
      }
    },
    [isLoggedIn, recentSearches, loadRecentSearches]
  );

  // Delete a recent search
  const deleteRecentSearch = useCallback(
    async (search: RecentSearch, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        if (isLoggedIn && search.id) {
          await deleteSearchHistory(search.id);
          await loadRecentSearches();
        } else {
          const current = getLocalRecent();
          const updated = current.filter(
            (s) => s.query.toLowerCase() !== search.query.toLowerCase()
          );
          saveLocalRecent(updated);
          setRecentSearches(updated);
        }
      } catch {
        const current = getLocalRecent();
        const updated = current.filter(
          (s) => s.query.toLowerCase() !== search.query.toLowerCase()
        );
        saveLocalRecent(updated);
        setRecentSearches(updated);
      }
    },
    [isLoggedIn, loadRecentSearches]
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return searchItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [query]);

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchItem[]> = {};
    for (const item of results) {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    }
    return groups;
  }, [results]);

  const flatResults = results;

  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: SearchItem) => {
    saveSearch(query);
    navigate(item.path);
    setQuery("");
    setIsOpen(false);
  };

  const handleRecentClick = (search: RecentSearch) => {
    setQuery(search.query);
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < flatResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : flatResults.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && flatResults[selectedIndex]) {
        handleSelect(flatResults[selectedIndex]);
      } else if (query.trim()) {
        saveSearch(query);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
    loadRecentSearches();
  };

  const showSearchResults = isOpen && query.trim().length > 0;
  const showRecentSearches =
    isOpen && query.trim().length === 0 && recentSearches.length > 0;

  // Suppress unused var warning
  void loadingRecent;

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search
          className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${
            isDark ? "text-gray-500" : "text-gray-300"
          }`}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Пошук..."
          className={`w-full sm:w-52 h-8 pl-8 pr-8 text-sm rounded-lg transition-all focus:outline-none ${
            isDark
              ? "bg-[#1a2a40] border border-[#253d5c] text-gray-200 placeholder:text-gray-500 focus:border-[#FFD700]/50 focus:bg-[#1e3048]"
              : "bg-gray-50 border border-gray-200 text-gray-700 placeholder:text-gray-300 focus:border-blue-400 focus:bg-white"
          }`}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className={`absolute right-2 top-1/2 -translate-y-1/2 transition-colors ${
              isDark
                ? "text-gray-500 hover:text-gray-300"
                : "text-gray-300 hover:text-gray-500"
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Recent Searches Dropdown */}
      {showRecentSearches && (
        <div
          ref={dropdownRef}
          className={`absolute top-full mt-1.5 right-0 w-80 border rounded-xl shadow-lg z-50 ${
            isDark
              ? "bg-[#162236] border-[#1a3050] shadow-black/40"
              : "bg-white border-gray-200 shadow-gray-200/50"
          }`}
        >
          <div
            className={`px-3 py-2.5 border-b flex items-center justify-between ${
              isDark ? "border-[#1a3050]" : "border-gray-100"
            }`}
          >
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                isDark ? "text-gray-500" : "text-gray-400"
              }`}
            >
              <Clock className="w-3 h-3" />
              Останні пошуки
            </span>
          </div>
          <div className="py-1">
            {recentSearches.map((search, idx) => (
              <button
                key={`${search.query}-${idx}`}
                onClick={() => handleRecentClick(search)}
                className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors group/item ${
                  isDark ? "hover:bg-[#1a2a40]" : "hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    isDark ? "bg-[#1a2a40]" : "bg-gray-50"
                  }`}
                >
                  <Clock
                    className={`w-3.5 h-3.5 ${isDark ? "text-gray-500" : "text-gray-300"}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm truncate ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {search.query}
                  </p>
                </div>
                <button
                  onClick={(e) => deleteRecentSearch(search, e)}
                  className={`opacity-0 group-hover/item:opacity-100 p-1 rounded transition-all ${
                    isDark ? "hover:bg-[#253d5c]" : "hover:bg-gray-100"
                  }`}
                  title="Видалити"
                >
                  <Trash2
                    className={`w-3 h-3 ${
                      isDark
                        ? "text-gray-500 hover:text-red-400"
                        : "text-gray-300 hover:text-red-400"
                    }`}
                  />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results Dropdown */}
      {showSearchResults && (
        <div
          ref={dropdownRef}
          className={`absolute top-full mt-1.5 right-0 w-80 max-h-80 overflow-y-auto border rounded-xl shadow-lg z-50 ${
            isDark
              ? "bg-[#162236] border-[#1a3050] shadow-black/40"
              : "bg-white border-gray-200 shadow-gray-200/50"
          }`}
        >
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p
                className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}
              >
                Нічого не знайдено за «{query}»
              </p>
            </div>
          ) : (
            <div className="py-1.5">
              {Object.entries(groupedResults).map(
                ([category, items]) => (
                  <div key={category}>
                    {/* Category header */}
                    <div className="px-3 py-1.5 mt-1 first:mt-0">
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wider ${
                          isDark ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        {category}
                      </span>
                    </div>
                    {/* Items */}
                    {items.map((item) => {
                      const globalIdx = flatResults.indexOf(item);
                      const Icon = item.categoryIcon;
                      return (
                        <button
                          key={`${item.category}-${item.title}`}
                          onClick={() => handleSelect(item)}
                          className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${
                            globalIdx === selectedIndex
                              ? isDark
                                ? "bg-[#0057B8]/20"
                                : "bg-blue-50"
                              : isDark
                                ? "hover:bg-[#1a2a40]"
                                : "hover:bg-gray-50"
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                              isDark ? "bg-[#1a2a40]" : "bg-gray-50"
                            }`}
                          >
                            <Icon
                              className={`w-3.5 h-3.5 ${item.categoryColor}`}
                              strokeWidth={2}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-medium truncate ${
                                isDark ? "text-gray-200" : "text-gray-800"
                              }`}
                            >
                              {item.title}
                            </p>
                            <p
                              className={`text-xs truncate ${
                                isDark ? "text-gray-500" : "text-gray-400"
                              }`}
                            >
                              {item.subtitle}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              )}
              {/* Result count */}
              <div
                className={`px-3 py-2 border-t mt-1 ${
                  isDark ? "border-[#1a3050]" : "border-gray-100"
                }`}
              >
                <p
                  className={`text-[11px] ${isDark ? "text-gray-600" : "text-gray-300"}`}
                >
                  {results.length} результат{results.length === 1 ? "" : results.length < 5 ? "и" : "ів"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
