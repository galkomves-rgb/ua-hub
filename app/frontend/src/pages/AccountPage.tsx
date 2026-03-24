import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Settings, LogOut, Save, X, Plus, AlertCircle } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  user_id: string;
  name: string;
  avatar_url: string | null;
  city: string;
  bio: string;
  preferred_language: "ua" | "es" | "en";
  created_at: string;
  updated_at: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export default function AccountPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const [activeTab, setActiveTab] = useState<"profile" | "listings" | "saved" | "settings">("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<{
    name: string;
    city: string;
    bio: string;
  }>({
    name: "",
    city: "",
    bio: "",
  });

  // Fetch user profile
  const { data: profile, isLoading, error } = useQuery<UserProfile>({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/profiles/user`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      return response.json();
    },
    enabled: !!user,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; city: string; bio: string }) => {
      const response = await fetch(`${API_BASE}/profiles/user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to update profile");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setIsEditing(false);
      // Query will auto-refetch
    },
  });

  if (!user) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className={`text-lg mb-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            {t("msg.loginRequired")}
          </p>
          <Link
            to="/"
            className={`inline-block h-10 px-6 rounded-lg text-sm font-semibold ${
              isDark
                ? "bg-gradient-to-r from-[#FFD700] to-[#e6c200] text-[#0d1a2e]"
                : "bg-gradient-to-r from-[#0057B8] to-[#0070E0] text-white"
            }`}
          >
            Повернутися на головну
          </Link>
        </div>
      </Layout>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleSaveProfile = async () => {
    updateProfileMutation.mutate(editData);
  };

  const handleEditClick = () => {
    if (profile) {
      setEditData({
        name: profile.name,
        city: profile.city,
        bio: profile.bio,
      });
      setIsEditing(true);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className={`rounded-xl border p-6 mb-6 ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                  isDark ? "bg-gradient-to-br from-[#FFD700] to-[#e6c200] text-[#0d1a2e]" : "bg-gradient-to-br from-[#0057B8] to-[#003d80] text-white"
                }`}
              >
                {(user?.name || "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>{user?.name || "User"}</h1>
                <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark ? "text-red-400 hover:bg-red-900/20" : "text-red-600 hover:bg-red-50"
              }`}
            >
              <LogOut className="w-4 h-4" />
              {t("nav.logout")}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex gap-2 mb-6 rounded-lg p-1 ${isDark ? "bg-[#111d32]" : "bg-gray-100"}`}>
          {[
            { id: "profile", label: "Профіль", icon: User },
            { id: "listings", label: "Мої оголошення", icon: Plus },
            { id: "saved", label: "Збережені", icon: Plus },
            { id: "settings", label: "Налаштування", icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? isDark
                    ? "text-[#FFD700] bg-[#1a2a40]"
                    : "text-[#0057B8] bg-white"
                  : isDark
                  ? "text-gray-400 hover:text-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "profile" && (
          <div className={`rounded-xl border p-6 ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
            {isLoading ? (
              <div className={`text-center py-8 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                Загрузка профілю...
              </div>
            ) : error ? (
              <div className={`flex items-center gap-3 p-4 rounded-lg ${isDark ? "bg-red-900/20 border border-red-900/30" : "bg-red-50 border border-red-200"}`}>
                <AlertCircle className={`w-5 h-5 ${isDark ? "text-red-400" : "text-red-600"}`} />
                <p className={`text-sm ${isDark ? "text-red-400" : "text-red-600"}`}>
                  {error instanceof Error ? error.message : "Помилка завантаження профілю"}
                </p>
              </div>
            ) : profile ? (
              isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Ім'я</label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark ? "bg-[#0d1a2e] border-[#253d5c] text-gray-100" : "bg-white border-gray-300 text-gray-900"
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Місто</label>
                    <input
                      type="text"
                      value={editData.city}
                      onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark ? "bg-[#0d1a2e] border-[#253d5c] text-gray-100" : "bg-white border-gray-300 text-gray-900"
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Про себе</label>
                    <textarea
                      value={editData.bio}
                      onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                      rows={3}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark ? "bg-[#0d1a2e] border-[#253d5c] text-gray-100" : "bg-white border-gray-300 text-gray-900"
                      }`}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveProfile}
                      disabled={updateProfileMutation.isPending}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
                        updateProfileMutation.isPending
                          ? isDark ? "opacity-50 cursor-not-allowed bg-[#999999]" : "opacity-50 cursor-not-allowed bg-[#999999]"
                          : isDark
                          ? "bg-gradient-to-r from-[#FFD700] to-[#e6c200] text-[#0d1a2e]"
                          : "bg-gradient-to-r from-[#0057B8] to-[#0070E0] text-white"
                      }`}
                    >
                      <Save className="w-4 h-4" />
                      {updateProfileMutation.isPending ? "Збереження..." : "Зберегти"}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={updateProfileMutation.isPending}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                        isDark ? "text-gray-400 hover:bg-[#1a2a40]" : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <X className="w-4 h-4" />
                      Скасувати
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="space-y-4 mb-6">
                    <div>
                      <p className={`text-xs font-bold uppercase ${isDark ? "text-gray-500" : "text-gray-400"}`}>Ім'я</p>
                      <p className={`text-lg ${isDark ? "text-gray-100" : "text-gray-900"}`}>{profile.name}</p>
                    </div>
                    <div>
                      <p className={`text-xs font-bold uppercase ${isDark ? "text-gray-500" : "text-gray-400"}`}>Місто</p>
                      <p className={`text-lg ${isDark ? "text-gray-100" : "text-gray-900"}`}>{profile.city}</p>
                    </div>
                    <div>
                      <p className={`text-xs font-bold uppercase ${isDark ? "text-gray-500" : "text-gray-400"}`}>Про себе</p>
                      <p className={`text-lg ${isDark ? "text-gray-100" : "text-gray-900"}`}>{profile.bio}</p>
                    </div>
                    <div>
                      <p className={`text-xs font-bold uppercase ${isDark ? "text-gray-500" : "text-gray-400"}`}>Мова</p>
                      <p className={`text-lg ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                        {profile.preferred_language === "ua" ? "Українська" : profile.preferred_language === "es" ? "Іспанська" : "Англійська"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleEditClick}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                      isDark ? "bg-[#1a2a40] text-[#FFD700] hover:bg-[#253d5c]" : "bg-blue-50 text-[#0057B8] hover:bg-blue-100"
                    }`}
                  >
                    Редагувати профіль
                  </button>
                </div>
              )
            ) : (
              <div className={`text-center py-8 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                Профіль відсутній
              </div>
            )}
          </div>
        )}

        {activeTab === "listings" && (
          <div className={`rounded-xl border p-6 ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
            <p className={`text-center py-8 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Немає активних оголошень</p>
          </div>
        )}

        {activeTab === "saved" && (
          <div className={`rounded-xl border p-6 ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
            <p className={`text-center py-8 ${isDark ? "text-gray-500" : "text-gray-400"}`}>没有已保存的项目</p>
          </div>
        )}

        {activeTab === "settings" && (
          <div className={`rounded-xl border p-6 ${isDark ? "bg-[#111d32] border-[#1a3050]" : "bg-white border-gray-200/80"}`}>
            <p className={`text-center py-8 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Налаштування</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
