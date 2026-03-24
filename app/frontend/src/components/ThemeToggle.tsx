import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
        theme === "dark"
          ? "bg-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700]/30 shadow-inner"
          : "bg-blue-50 text-[#0057B8] hover:bg-blue-100 shadow-sm"
      }`}
      aria-label={theme === "dark" ? "Світла тема" : "Темна тема"}
      title={theme === "dark" ? "Світла тема" : "Темна тема"}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </button>
  );
}