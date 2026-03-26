import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, MapPin, Clock, User, Briefcase, Share2, Flag, Heart,
  CheckCircle, Star, Calendar, Phone, Mail, Globe, ChevronRight,
  Plus, Upload, Eye, Check, Shield, Users, TrendingUp, BadgeCheck, X,
} from "lucide-react";
import Layout from "@/components/Layout";
import { ListingCard, SectionHeader } from "@/components/Cards";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";
import { useGlobalCity } from "@/lib/global-preferences";
import { getModuleLabelSystem } from "@/lib/label-taxonomy";
import { useAuth } from "@/contexts/AuthContext";
import {
  MODULES, MODULE_ORDER, SAMPLE_LISTINGS, SAMPLE_BUSINESSES,
  PRICING_PLANS, IMAGES,
} from "@/lib/platform";

function normalizeCityFilter(value: string): string {
  return value === "All Spain" ? "all" : value;
}

// ─── Listing Detail ───
function ListingDetail() {
  const params = useParams();
  const location = useLocation();
  const moduleId = location.pathname.split("/")[1] || "";
  const listingId = params.listingId || params.bizId || "";
  const { theme } = useTheme();
  const { t } = useI18n();
  const { city: globalCity } = useGlobalCity();
  const isDark = theme === "dark";
  const selectedCity = normalizeCityFilter(globalCity);

  const listing = SAMPLE_LISTINGS.find((l) => l.id === listingId);
  if (!listing) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>Оголошення не знайдено</p>
          <Link to={`/${moduleId}`} className={`text-sm font-medium mt-4 inline-block ${isDark ? "text-[#4a9eff]" : "text-[#0057B8]"}`}>
            ← {t("detail.back")}
          </Link>
        </div>
      </Layout>
    );
  }

  const relatedListings = SAMPLE_LISTINGS.filter(
    (l) =>
      l.module === listing.module &&
      l.id !== listing.id &&
      (selectedCity === "all" || l.city === selectedCity)
  ).slice(0, 3);

  const mod = MODULES[listing.module];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Breadcrumbs */}
        <div className={`flex items-center gap-1.5 text-xs mb-5 flex-wrap ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          <Link to="/" className="hover:underline">{t("nav.home")}</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to={`/${listing.module}`} className="hover:underline">{t(`mod.${listing.module}`)}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className={isDark ? "text-gray-300" : "text-gray-600"}>{listing.title}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Title card */}
            <div className={`rounded-xl border p-5 mb-4 ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
              {/* Badges */}
              {listing.badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {listing.badges.map((b) => {
                    const badgeConfig: Record<string, { label: string; cls: string }> = {
                      verified: { label: t("card.verified"), cls: isDark ? "text-emerald-400 bg-emerald-900/30" : "text-emerald-600 bg-emerald-50" },
                      premium: { label: t("card.premium"), cls: isDark ? "text-amber-400 bg-amber-900/30" : "text-amber-600 bg-amber-50" },
                      featured: { label: t("card.featured"), cls: isDark ? "text-blue-400 bg-blue-900/30" : "text-blue-600 bg-blue-50" },
                      business: { label: t("card.business"), cls: isDark ? "text-indigo-400 bg-indigo-900/30" : "text-indigo-600 bg-indigo-50" },
                      free: { label: t("card.free"), cls: isDark ? "text-green-400 bg-green-900/30" : "text-green-600 bg-green-50" },
                      urgent: { label: t("card.urgent"), cls: isDark ? "text-red-400 bg-red-900/30" : "text-red-600 bg-red-50" },
                      remote: { label: t("card.remote"), cls: isDark ? "text-purple-400 bg-purple-900/30" : "text-purple-600 bg-purple-50" },
                      new: { label: t("card.new"), cls: isDark ? "text-cyan-400 bg-cyan-900/30" : "text-cyan-600 bg-cyan-50" },
                      online: { label: t("card.online"), cls: isDark ? "text-teal-400 bg-teal-900/30" : "text-teal-600 bg-teal-50" },
                    };
                    const bc = badgeConfig[b];
                    if (!bc) return null;
                    return (
                      <span key={b} className={`px-2 py-0.5 text-[11px] font-semibold rounded-md ${bc.cls}`}>
                        {bc.label}
                      </span>
                    );
                  })}
                </div>
              )}

              <h1 className={`text-xl font-bold mb-2 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                {listing.title}
              </h1>

              {/* Price */}
              {listing.price && (
                <p className={`text-2xl font-extrabold mb-3 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`}>
                  {listing.price} {listing.currency}
                </p>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap gap-3 mb-4">
                <span className={`flex items-center gap-1.5 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  <MapPin className="w-4 h-4" /> {listing.city}
                </span>
                {listing.date && (
                  <span className={`flex items-center gap-1.5 text-sm ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                    <Calendar className="w-4 h-4" /> {listing.date}
                  </span>
                )}
                <span className={`flex items-center gap-1.5 text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  <Clock className="w-4 h-4" /> {listing.createdAt}
                </span>
              </div>

              {/* Module-specific meta */}
              {listing.meta && Object.keys(listing.meta).length > 0 && (
                <div className={`flex flex-wrap gap-2 p-3 rounded-lg mb-4 ${isDark ? "bg-[#0d1a2e]" : "bg-gray-50"}`}>
                  {Object.entries(listing.meta).map(([key, val]) => (
                    <div key={key} className="text-xs">
                      <span className={isDark ? "text-gray-500" : "text-gray-400"}>{key}: </span>
                      <span className={`font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>{val}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Description */}
              <div className={`border-t pt-4 ${isDark ? "border-[#1a3050]" : "border-gray-100"}`}>
                <h2 className={`text-sm font-bold mb-2 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                  {t("detail.description")}
                </h2>
                <p className={`text-sm leading-relaxed ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {listing.description}
                </p>
              </div>

              {/* Actions */}
              <div className={`flex items-center gap-3 mt-5 pt-4 border-t ${isDark ? "border-[#1a3050]" : "border-gray-100"}`}>
                <button className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  isDark ? "text-gray-400 hover:bg-[#1a2a40]" : "text-gray-500 hover:bg-gray-50"
                }`}>
                  <Heart className="w-3.5 h-3.5" /> {t("card.save")}
                </button>
                <button className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  isDark ? "text-gray-400 hover:bg-[#1a2a40]" : "text-gray-500 hover:bg-gray-50"
                }`}>
                  <Share2 className="w-3.5 h-3.5" /> {t("card.share")}
                </button>
                <button className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  isDark ? "text-gray-400 hover:bg-[#1a2a40]" : "text-gray-500 hover:bg-gray-50"
                }`}>
                  <Flag className="w-3.5 h-3.5" /> {t("card.report")}
                </button>
              </div>
            </div>

            {/* Related */}
            {relatedListings.length > 0 && (
              <div className="mt-6">
                <SectionHeader title={t("detail.related")} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {relatedListings.map((l) => (
                    <ListingCard key={l.id} listing={l} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Author + Contact */}
          <aside className="lg:w-72 shrink-0 space-y-4">
            {/* Author card */}
            <div className={`rounded-xl border p-4 ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {t("detail.author")}
              </h3>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  listing.ownerType === "business_profile"
                    ? isDark ? "bg-indigo-900/40" : "bg-indigo-50"
                    : isDark ? "bg-[#1a2a40]" : "bg-gray-100"
                }`}>
                  {listing.ownerType === "business_profile"
                    ? <Briefcase className={`w-5 h-5 ${isDark ? "text-indigo-400" : "text-indigo-500"}`} />
                    : <User className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                  }
                </div>
                <div>
                  <p className={`text-sm font-bold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{listing.ownerId}</p>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {listing.ownerType === "business_profile" ? t("card.business") : t("card.private")}
                  </p>
                </div>
              </div>
              <Link
                to={`/messages?to=${encodeURIComponent(listing.ownerId)}&listing=${listing.id}&title=${encodeURIComponent(listing.title)}`}
                className={`w-full h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  isDark
                    ? "bg-gradient-to-r from-[#FFD700] to-[#e6c200] text-[#0d1a2e] hover:shadow-md hover:shadow-yellow-500/20"
                    : "bg-gradient-to-r from-[#0057B8] to-[#0070E0] text-white hover:shadow-md hover:shadow-blue-200"
                }`}
              >
                {t("msg.writeToAuthor")}
              </Link>
            </div>

            {/* Location card */}
            <div className={`rounded-xl border p-4 ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {t("detail.location")}
              </h3>
              <div className={`flex items-center gap-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{listing.city}, Іспанія</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}

// ─── Business Profile ───
function BusinessProfilePage() {
  const { bizId } = useParams();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { city: globalCity } = useGlobalCity();
  const isDark = theme === "dark";
  const selectedCity = normalizeCityFilter(globalCity);

  const biz = SAMPLE_BUSINESSES.find((b) => b.id === bizId);
  if (!biz) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>Бізнес не знайдено</p>
        </div>
      </Layout>
    );
  }

  const bizListings = SAMPLE_LISTINGS.filter(
    (l) =>
      l.ownerId === biz.slug &&
      l.ownerType === "business_profile" &&
      (selectedCity === "all" || l.city === selectedCity)
  );

  return (
    <Layout>
      {/* Cover */}
      <div className={`w-full h-32 ${isDark ? "bg-gradient-to-r from-[#0057B8]/30 to-[#FFD700]/10" : "bg-gradient-to-r from-blue-100 to-yellow-50"}`} />

      <div className="max-w-6xl mx-auto px-4 -mt-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main */}
          <div className="flex-1 min-w-0">
            {/* Profile header */}
            <div className={`rounded-xl border p-5 mb-4 ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0 ${
                  isDark ? "bg-[#1a2a40] text-[#4a9eff]" : "bg-blue-50 text-[#0057B8]"
                }`}>
                  {biz.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className={`text-xl font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>{biz.name}</h1>
                    {biz.isVerified && <BadgeCheck className={`w-5 h-5 ${isDark ? "text-emerald-400" : "text-emerald-500"}`} />}
                    {biz.isPremium && <Star className={`w-5 h-5 ${isDark ? "text-[#FFD700]" : "text-amber-500"}`} />}
                  </div>
                  <p className={`text-sm mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{biz.category}</p>
                  <p className={`text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>{biz.description}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-4">
                {biz.tags.map((tag) => (
                  <span key={tag} className={`px-2.5 py-1 text-xs rounded-lg ${isDark ? "bg-[#1a2a40] text-gray-400" : "bg-gray-50 text-gray-500"}`}>
                    {tag}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <div className="flex gap-3 mt-5">
                <button className={`h-10 px-6 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] ${
                  isDark
                    ? "bg-gradient-to-r from-[#FFD700] to-[#e6c200] text-[#0d1a2e]"
                    : "bg-gradient-to-r from-[#0057B8] to-[#0070E0] text-white"
                }`}>
                  {t("card.contact")}
                </button>
              </div>
            </div>

            {/* Business listings */}
            {bizListings.length > 0 && (
              <div>
                <SectionHeader title={t("biz.listings")} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {bizListings.map((l) => (
                    <ListingCard key={l.id} listing={l} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:w-72 shrink-0 space-y-4 mt-8 lg:mt-0">
            <div className={`rounded-xl border p-4 ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {t("detail.contact")}
              </h3>
              <div className="space-y-2.5">
                <div className={`flex items-center gap-2 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  <MapPin className="w-4 h-4 shrink-0" /> {biz.city}, Іспанія
                </div>
                <div className={`flex items-center gap-2 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  <Phone className="w-4 h-4 shrink-0" /> +34 XXX XXX XXX
                </div>
                <div className={`flex items-center gap-2 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  <Mail className="w-4 h-4 shrink-0" /> info@{biz.name.toLowerCase().replace(/\s/g, "")}.es
                </div>
                <div className={`flex items-center gap-2 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  <Globe className="w-4 h-4 shrink-0" /> www.{biz.name.toLowerCase().replace(/\s/g, "")}.es
                </div>
              </div>
            </div>

            {biz.rating && (
              <div className={`rounded-xl border p-4 ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
                <div className="flex items-center gap-2">
                  <Star className={`w-5 h-5 fill-current ${isDark ? "text-[#FFD700]" : "text-amber-500"}`} />
                  <span className={`text-lg font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>{biz.rating}</span>
                  <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>/ 5.0</span>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </Layout>
  );
}

// ─── Create Listing ───
function CreateListingPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get("edit");
  const [step, setStep] = useState(0);
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [loadedListingStatus, setLoadedListingStatus] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    city: "",
    contact: "",
    images: [] as string[],
    ownerType: "private_user",
    currency: "EUR",
  });

  const steps = [
    t("create.step1"), t("create.step2"), t("create.step3"),
    t("create.step4"), t("create.step5"), t("create.step6"),
  ];

  const mod = selectedModule ? MODULES[selectedModule] : null;
  const moduleLabelSystem = getModuleLabelSystem();
  const allowedLabels = useMemo(() => moduleLabelSystem[selectedModule] ?? [], [moduleLabelSystem, selectedModule]);

  useEffect(() => {
    if (!selectedModule) {
      setSelectedLabels([]);
      return;
    }

    setSelectedLabels((current) => current.filter((label) => allowedLabels.includes(label as never)));
  }, [allowedLabels, selectedModule]);

  useEffect(() => {
    if (!editingId) {
      setLoadedListingStatus(null);
      return;
    }

    let cancelled = false;

    const loadListing = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/listings/${editingId}?record_view=false`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to load listing");
        }

        const listing = await response.json();
        if (cancelled) {
          return;
        }

        let parsedImages: string[] = [];
        try {
          const rawImages = JSON.parse(listing.images_json || "[]");
          parsedImages = Array.isArray(rawImages) ? rawImages : [];
        } catch {
          parsedImages = [];
        }

        let parsedBadges: string[] = [];
        try {
          const rawBadges = JSON.parse(listing.badges || "[]");
          parsedBadges = Array.isArray(rawBadges) ? rawBadges : [];
        } catch {
          parsedBadges = [];
        }

        if (listing.is_featured && !parsedBadges.includes("featured")) {
          parsedBadges.push("featured");
        }
        if (listing.is_promoted && !parsedBadges.includes("premium")) {
          parsedBadges.push("premium");
        }
        if (listing.is_verified && !parsedBadges.includes("verified")) {
          parsedBadges.push("verified");
        }

        let contact = "";
        try {
          const meta = JSON.parse(listing.meta_json || "{}");
          contact = typeof meta?.contact === "string" ? meta.contact : "";
        } catch {
          contact = "";
        }

        setSelectedModule(listing.module || "");
        setSelectedCategory(listing.category || "");
        setSelectedLabels(parsedBadges);
        setLoadedListingStatus(listing.status || null);
        setFormData({
          title: listing.title || "",
          description: listing.description || "",
          price: listing.price || "",
          city: listing.city || "",
          contact,
          images: parsedImages,
          ownerType: listing.owner_type || "private_user",
          currency: listing.currency || "EUR",
        });
        setStep(2);
      } catch (error) {
        console.error("Error loading listing for editing:", error);
      }
    };

    void loadListing();

    return () => {
      cancelled = true;
    };
  }, [editingId]);

  const getLabelDisplayName = (label: string) => {
    if (label === "verified") return t("card.verified");
    if (label === "premium") return t("card.premium");
    if (label === "featured") return t("card.featured");
    if (label === "urgent") return t("card.urgent");
    if (label === "new") return t("card.new");
    if (label === "remote") return t("card.remote");
    if (label === "online") return t("card.online");
    if (label === "business") return t("card.business");
    if (label === "private") return t("card.private");
    if (label === "free") return t("card.free");
    return label;
  };

  const handlePublish = async () => {
    if (!user || !selectedModule || !selectedCategory) {
      alert("Будь ласка, заповніть всі необхідні поля");
      return;
    }

    const hasInvalidLabels = selectedLabels.some((label) => !allowedLabels.includes(label as never));
    if (hasInvalidLabels) {
      alert("Обрані лейбли не відповідають правилам цього розділу");
      return;
    }

    try {
      const listingPayload = {
        module: selectedModule,
        category: selectedCategory,
        title: formData.title,
        description: formData.description,
        price: formData.price || null,
        currency: formData.currency,
        city: formData.city,
        owner_type: formData.ownerType,
        owner_id: user.id,
        badges: JSON.stringify(selectedLabels),
        images_json: JSON.stringify(formData.images),
        meta_json: JSON.stringify({ contact: formData.contact }),
      };

      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const token = localStorage.getItem("auth_token");

      if (editingId) {
        const updateResponse = await fetch(`${apiBase}/api/v1/listings/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(listingPayload),
        });

        if (!updateResponse.ok) {
          throw new Error("Failed to update listing");
        }

        if (loadedListingStatus === "draft" || loadedListingStatus === "rejected") {
          const submitResponse = await fetch(`${apiBase}/api/v1/listings/${editingId}/submit`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!submitResponse.ok) {
            throw new Error("Failed to submit listing for moderation");
          }
        }

        navigate("/account?tab=listings");
        return;
      }

      const response = await fetch(`${apiBase}/api/v1/listings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(listingPayload),
      });

      if (!response.ok) {
        throw new Error("Failed to create listing");
      }

      const createdListing = await response.json();
      const submitResponse = await fetch(`${apiBase}/api/v1/listings/${createdListing.id}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!submitResponse.ok) {
        throw new Error("Failed to submit listing for moderation");
      }

      navigate("/account?tab=listings");
    } catch (error) {
      console.error("Error publishing listing:", error);
      alert("Помилка при створенні оголошення");
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className={`text-xl font-bold mb-6 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
          {editingId ? t("account.listings.edit") : t("create.title")}
        </h1>

        {/* Steps indicator */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                i === step
                  ? isDark ? "bg-[#FFD700] text-[#0d1a2e]" : "bg-[#0057B8] text-white"
                  : i < step
                    ? isDark ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                    : isDark ? "bg-[#1a2a40] text-gray-500" : "bg-gray-100 text-gray-400"
              }`}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-[11px] font-medium whitespace-nowrap hidden sm:block ${
                i === step ? (isDark ? "text-gray-200" : "text-gray-700") : (isDark ? "text-gray-600" : "text-gray-400")
              }`}>
                {s}
              </span>
              {i < steps.length - 1 && (
                <div className={`w-6 h-px mx-1 ${isDark ? "bg-[#1a3050]" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className={`rounded-xl border p-6 ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
          {/* Step 0: Select Module */}
          {step === 0 && (
            <div>
              <h2 className={`text-sm font-bold mb-4 ${isDark ? "text-gray-200" : "text-gray-800"}`}>{t("create.step1")}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {MODULE_ORDER.filter((m) => m !== "business").map((modId) => {
                  const m = MODULES[modId];
                  const Icon = m.icon;
                  return (
                    <button
                      key={modId}
                      onClick={() => { setSelectedModule(modId); setStep(1); }}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        selectedModule === modId
                          ? isDark ? "border-[#FFD700] bg-[#FFD700]/10" : "border-[#0057B8] bg-blue-50"
                          : isDark ? "border-[#1a3050] hover:border-[#253d5c]" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isDark ? m.darkColor : m.lightColor}`} />
                      <span className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                        {t(`mod.${modId}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 1: Select Category */}
          {step === 1 && mod && (
            <div>
              <h2 className={`text-sm font-bold mb-4 ${isDark ? "text-gray-200" : "text-gray-800"}`}>{t("create.step2")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mod.categories.map((cat) => {
                  const CatIcon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat.id); setStep(2); }}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        selectedCategory === cat.id
                          ? isDark ? "border-[#FFD700] bg-[#FFD700]/10" : "border-[#0057B8] bg-blue-50"
                          : isDark ? "border-[#1a3050] hover:border-[#253d5c]" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <CatIcon className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                      <span className={`text-sm ${isDark ? "text-gray-200" : "text-gray-700"}`}>{cat.labelKey}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Details form */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className={`text-sm font-bold mb-2 ${isDark ? "text-gray-200" : "text-gray-800"}`}>{t("create.step3")}</h2>
              <div>
                <label className={`text-xs font-medium mb-1 block ${isDark ? "text-gray-400" : "text-gray-500"}`}>Заголовок *</label>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full h-10 px-3 text-sm rounded-lg border focus:outline-none ${
                    isDark ? "bg-[#0d1a2e] border-[#1a3050] text-gray-200 focus:border-[#4a9eff]" : "bg-gray-50 border-gray-200 text-gray-700 focus:border-blue-400"
                  }`}
                  placeholder="Введіть заголовок оголошення"
                />
              </div>
              <div>
                <label className={`text-xs font-medium mb-1 block ${isDark ? "text-gray-400" : "text-gray-500"}`}>Опис *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none resize-none ${
                    isDark ? "bg-[#0d1a2e] border-[#1a3050] text-gray-200 focus:border-[#4a9eff]" : "bg-gray-50 border-gray-200 text-gray-700 focus:border-blue-400"
                  }`}
                  placeholder="Детальний опис"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs font-medium mb-1 block ${isDark ? "text-gray-400" : "text-gray-500"}`}>Ціна</label>
                  <input
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className={`w-full h-10 px-3 text-sm rounded-lg border focus:outline-none ${
                      isDark ? "bg-[#0d1a2e] border-[#1a3050] text-gray-200 focus:border-[#4a9eff]" : "bg-gray-50 border-gray-200 text-gray-700 focus:border-blue-400"
                    }`}
                    placeholder="€"
                  />
                </div>
                <div>
                  <label className={`text-xs font-medium mb-1 block ${isDark ? "text-gray-400" : "text-gray-500"}`}>Місто *</label>
                  <input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={`w-full h-10 px-3 text-sm rounded-lg border focus:outline-none ${
                      isDark ? "bg-[#0d1a2e] border-[#1a3050] text-gray-200 focus:border-[#4a9eff]" : "bg-gray-50 border-gray-200 text-gray-700 focus:border-blue-400"
                    }`}
                    placeholder="Місто"
                  />
                </div>
              </div>

              {allowedLabels.length > 0 && (
                <div>
                  <label className={`text-xs font-medium mb-1 block ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    Лейбли оголошення
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allowedLabels.map((label) => {
                      const active = selectedLabels.includes(label);
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            setSelectedLabels((current) =>
                              current.includes(label)
                                ? current.filter((item) => item !== label)
                                : [...current, label],
                            );
                          }}
                          className={`h-8 rounded-lg border px-3 text-xs font-medium transition-colors ${
                            active
                              ? isDark
                                ? "border-[#FFD700] bg-[#FFD700]/10 text-[#FFD700]"
                                : "border-[#0057B8] bg-blue-50 text-[#0057B8]"
                              : isDark
                                ? "border-[#1a3050] text-gray-300 hover:bg-[#1a2a40]"
                                : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {getLabelDisplayName(label)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Photos */}
          {step === 3 && (
            <div>
              <h2 className={`text-sm font-bold mb-4 ${isDark ? "text-gray-200" : "text-gray-800"}`}>{t("create.step4")}</h2>
              <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDark ? "border-[#1a3050] hover:border-[#4a9eff]" : "border-gray-200 hover:border-blue-400"
              }`}>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const urls = files.map((f) => URL.createObjectURL(f));
                    setFormData({ ...formData, images: [...formData.images, ...urls] });
                  }}
                  className="hidden"
                  id="imageInput"
                />
                <label htmlFor="imageInput" className="block cursor-pointer">
                  <Upload className={`w-8 h-8 mx-auto mb-2 ${isDark ? "text-gray-500" : "text-gray-300"}`} />
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Перетягніть фото сюди або натисніть для завантаження</p>
                  <p className={`text-xs mt-1 ${isDark ? "text-gray-600" : "text-gray-400"}`}>JPG, PNG до 5 МБ</p>
                </label>
              </div>
              {formData.images.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {formData.images.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} alt={`preview-${i}`} className="w-full h-20 object-cover rounded-lg" />
                      <button
                        onClick={() => setFormData({ ...formData, images: formData.images.filter((_, idx) => idx !== i) })}
                        className={`absolute top-1 right-1 p-1 rounded-full ${isDark ? "bg-red-900/70" : "bg-red-600/70"}`}
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Contacts */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className={`text-sm font-bold mb-2 ${isDark ? "text-gray-200" : "text-gray-800"}`}>{t("create.step5")}</h2>
              <div>
                <label className={`text-xs font-medium mb-1 block ${isDark ? "text-gray-400" : "text-gray-500"}`}>Контактна інформація *</label>
                <input
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className={`w-full h-10 px-3 text-sm rounded-lg border focus:outline-none ${
                    isDark ? "bg-[#0d1a2e] border-[#1a3050] text-gray-200 focus:border-[#4a9eff]" : "bg-gray-50 border-gray-200 text-gray-700 focus:border-blue-400"
                  }`}
                  placeholder="Телефон, email або месенджер"
                />
              </div>
            </div>
          )}

          {/* Step 5: Preview */}
          {step === 5 && (
            <div>
              <h2 className={`text-sm font-bold mb-4 ${isDark ? "text-gray-200" : "text-gray-800"}`}>{t("create.step6")}</h2>
              <div className={`rounded-lg p-4 ${isDark ? "bg-[#0d1a2e]" : "bg-gray-50"}`}>
                <p className={`text-sm font-bold mb-1 ${isDark ? "text-gray-200" : "text-gray-800"}`}>{formData.title || "Без заголовку"}</p>
                <p className={`text-xs mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{formData.description || "Без опису"}</p>
                {formData.price && <p className={`text-sm font-bold ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`}>{formData.price} €</p>}
                <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{formData.city}</p>
                {selectedLabels.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedLabels.map((label) => (
                      <span key={label} className={`rounded-md px-2 py-0.5 text-[11px] ${isDark ? "bg-[#1a2a40] text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                        {getLabelDisplayName(label)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t" style={{ borderColor: isDark ? "#1a3050" : "#e5e7eb" }}>
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className={`h-9 px-4 text-sm font-medium rounded-lg transition-colors ${
                  isDark ? "text-gray-400 hover:bg-[#1a2a40]" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                ← {t("create.back")}
              </button>
            ) : <div />}
            {step < 5 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 0 && !selectedModule}
                className={`h-9 px-5 text-sm font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-40 ${
                  isDark
                    ? "bg-gradient-to-r from-[#FFD700] to-[#e6c200] text-[#0d1a2e]"
                    : "bg-gradient-to-r from-[#0057B8] to-[#0070E0] text-white"
                }`}
              >
                {t("create.next")} →
              </button>
            ) : (
              <button
                onClick={handlePublish}
                className={`h-9 px-5 text-sm font-semibold rounded-lg transition-all active:scale-[0.98] ${
                  isDark
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                    : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                }`}
              >
                {t("create.publish")} ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ─── Pricing Page ───
function PricingPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  const planNames = [t("pricing.free"), t("pricing.basic"), t("pricing.premium"), t("pricing.business")];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className={`text-2xl font-bold text-center mb-2 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
          {t("pricing.title")}
        </h1>
        <p className={`text-sm text-center mb-8 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          Оберіть план, який підходить саме вам
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRICING_PLANS.map((plan, i) => (
            <div
              key={plan.id}
              className={`rounded-xl border p-5 transition-all ${
                i === 2
                  ? isDark ? "border-[#FFD700]/40 bg-[#111d32] ring-1 ring-[#FFD700]/20" : "border-[#0057B8] bg-white ring-1 ring-blue-100"
                  : isDark ? "border-[#1a3050] bg-[#111d32]" : "border-gray-200/80 bg-white"
              }`}
            >
              <h3 className={`text-sm font-bold mb-1 ${isDark ? "text-gray-200" : "text-gray-800"}`}>{planNames[i]}</h3>
              <p className={`text-2xl font-extrabold mb-4 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`}>
                {plan.price === "0" ? t("pricing.free") : `€${plan.price}`}
                {plan.price !== "0" && <span className={`text-xs font-normal ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("pricing.perMonth")}</span>}
              </p>
              <ul className="space-y-2">
                {plan.features.map((f, fi) => (
                  <li key={fi} className={`flex items-start gap-2 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isDark ? "text-emerald-400" : "text-emerald-500"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <button className={`w-full h-9 mt-5 rounded-lg text-xs font-semibold transition-all ${
                i === 2
                  ? isDark
                    ? "bg-gradient-to-r from-[#FFD700] to-[#e6c200] text-[#0d1a2e]"
                    : "bg-gradient-to-r from-[#0057B8] to-[#0070E0] text-white"
                  : isDark
                    ? "border border-[#1a3050] text-gray-300 hover:bg-[#1a2a40]"
                    : "border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}>
                {plan.price === "0" ? "Почати" : "Обрати план"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

// ─── About Page ───
function AboutPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className={`text-2xl font-bold mb-4 ${isDark ? "text-gray-100" : "text-gray-900"}`}>{t("about.title")}</h1>
        <div className={`rounded-xl border p-6 space-y-4 ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
          <p className={`text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            UAHAB — це модульна платформа для української громади в Іспанії. Ми створили єдиний простір, де можна знайти роботу, житло, послуги, події та зв'язки з іншими українцями.
          </p>
          <p className={`text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            Наша місія — допомогти кожному українцю в Іспанії адаптуватися, знайти можливості та відчути підтримку громади. Платформа об'єднує приватних користувачів, бізнеси, організації та волонтерські ініціативи.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            {[
              { icon: Shield, title: "Безпека", desc: "Модерація контенту та перевірені бізнеси" },
              { icon: Users, title: "Громада", desc: "Тисячі українців по всій Іспанії" },
              { icon: TrendingUp, title: "Розвиток", desc: "Нові можливості та функції щодня" },
            ].map((item, i) => (
              <div key={i} className={`rounded-lg p-4 ${isDark ? "bg-[#0d1a2e]" : "bg-gray-50"}`}>
                <item.icon className={`w-6 h-6 mb-2 ${isDark ? "text-[#4a9eff]" : "text-[#0057B8]"}`} />
                <h3 className={`text-sm font-bold mb-1 ${isDark ? "text-gray-200" : "text-gray-800"}`}>{item.title}</h3>
                <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ─── Rules Page ───
function RulesPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  const rules = [
    { title: "Достовірність інформації", desc: "Усі оголошення повинні містити правдиву інформацію. Забороняється публікація неправдивих даних." },
    { title: "Заборонений контент", desc: "Забороняється публікація: зброї, наркотиків, контрафакту, порнографії, дискримінаційного контенту." },
    { title: "Повага до інших", desc: "Забороняються образи, погрози, спам та будь-які форми дискримінації." },
    { title: "Модерація", desc: "Усі оголошення проходять модерацію. Платформа залишає за собою право видалити будь-який контент." },
    { title: "Бізнес-акаунти", desc: "Бізнеси повинні надати достовірну інформацію для верифікації." },
    { title: "Безпека угод", desc: "Платформа не несе відповідальності за угоди між користувачами. Будьте обережні." },
  ];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className={`text-2xl font-bold mb-4 ${isDark ? "text-gray-100" : "text-gray-900"}`}>{t("rules.title")}</h1>
        <div className="space-y-3">
          {rules.map((rule, i) => (
            <div key={i} className={`rounded-xl border p-4 ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
              <h3 className={`text-sm font-bold mb-1 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                {i + 1}. {rule.title}
              </h3>
              <p className={`text-xs leading-relaxed ${isDark ? "text-gray-400" : "text-gray-500"}`}>{rule.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

// ─── Contacts Page ───
function ContactsPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className={`text-2xl font-bold mb-4 ${isDark ? "text-gray-100" : "text-gray-900"}`}>{t("nav.contacts")}</h1>
        <div className={`rounded-xl border p-6 ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
          <div className="space-y-4">
            <div className={`flex items-center gap-3 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              <Mail className="w-5 h-5" />
              <span className="text-sm">support@uahab.com</span>
            </div>
            <div className={`flex items-center gap-3 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              <Globe className="w-5 h-5" />
              <span className="text-sm">www.uahab.com</span>
            </div>
            <div className={`flex items-center gap-3 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              <MapPin className="w-5 h-5" />
              <span className="text-sm">Іспанія</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export {
  ListingDetail,
  BusinessProfilePage,
  CreateListingPage,
  PricingPage,
  AboutPage,
  RulesPage,
  ContactsPage,
};