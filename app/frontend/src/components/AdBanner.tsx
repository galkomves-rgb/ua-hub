import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X, Megaphone } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { client } from "@/lib/api";

interface Ad {
  id: number;
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  position: string;
  target_module: string | null;
  is_active: boolean;
  priority: number;
}

interface AdBannerProps {
  position: "banner" | "sidebar" | "inline";
  module?: string;
}

export default function AdBanner({ position, module }: AdBannerProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [ads, setAds] = useState<Ad[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadAds();
  }, [module]);

  const loadAds = async () => {
    try {
      let url = "/api/v1/entities/advertisements/all?limit=10&sort=-priority";
      if (module) {
        url += `&query=${encodeURIComponent(JSON.stringify({ target_module: module }))}`;
      }
      const res = await client.callApi(url, { method: "GET" });
      if (res?.data?.items) {
        setAds(res.data.items.filter((a: Ad) => a.is_active));
      }
    } catch {
      // Use fallback ads if API fails
      setAds([]);
    }
  };

  const visibleAds = ads.filter((a) => !dismissed.has(a.id) && a.position === position);
  if (visibleAds.length === 0) return null;

  const ad = visibleAds[0];

  if (position === "banner") {
    return (
      <div className={`relative rounded-xl overflow-hidden border mb-4 ${isDark ? "border-[#1a3050]" : "border-gray-200/80"}`}>
        <Link to={ad.link_url} className="block">
          <div className="relative h-24 sm:h-32 overflow-hidden">
            <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
            <div className={`absolute inset-0 ${isDark ? "bg-gradient-to-r from-[#0d1a2e]/80 to-transparent" : "bg-gradient-to-r from-white/80 to-transparent"}`} />
            <div className="absolute inset-0 flex items-center px-5">
              <div className="max-w-md">
                <div className="flex items-center gap-1.5 mb-1">
                  <Megaphone className={`w-3 h-3 ${isDark ? "text-[#FFD700]" : "text-amber-500"}`} />
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-[#FFD700]" : "text-amber-600"}`}>
                    Реклама
                  </span>
                </div>
                <h3 className={`text-sm font-bold mb-0.5 ${isDark ? "text-gray-100" : "text-gray-900"}`}>{ad.title}</h3>
                <p className={`text-xs line-clamp-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{ad.description}</p>
              </div>
            </div>
          </div>
        </Link>
        <button
          onClick={(e) => { e.preventDefault(); setDismissed((prev) => new Set(prev).add(ad.id)); }}
          className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isDark ? "bg-black/40 text-gray-400 hover:text-gray-200" : "bg-white/60 text-gray-400 hover:text-gray-600"}`}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  if (position === "sidebar") {
    return (
      <div className={`rounded-xl border overflow-hidden ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
        <Link to={ad.link_url} className="block">
          <div className="p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Megaphone className={`w-3 h-3 ${isDark ? "text-[#FFD700]" : "text-amber-500"}`} />
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-[#FFD700]" : "text-amber-600"}`}>
                Реклама
              </span>
            </div>
            <h3 className={`text-xs font-bold mb-1 ${isDark ? "text-gray-200" : "text-gray-800"}`}>{ad.title}</h3>
            <p className={`text-[11px] line-clamp-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{ad.description}</p>
          </div>
        </Link>
      </div>
    );
  }

  // inline
  return (
    <div className={`rounded-xl border overflow-hidden ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
      <Link to={ad.link_url} className="flex items-center gap-3 p-3">
        <img src={ad.image_url} alt={ad.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <Megaphone className={`w-2.5 h-2.5 ${isDark ? "text-[#FFD700]" : "text-amber-500"}`} />
            <span className={`text-[9px] font-semibold uppercase tracking-wider ${isDark ? "text-[#FFD700]" : "text-amber-600"}`}>
              Реклама
            </span>
          </div>
          <h3 className={`text-xs font-bold mb-0.5 truncate ${isDark ? "text-gray-200" : "text-gray-800"}`}>{ad.title}</h3>
          <p className={`text-[11px] line-clamp-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{ad.description}</p>
        </div>
      </Link>
    </div>
  );
}