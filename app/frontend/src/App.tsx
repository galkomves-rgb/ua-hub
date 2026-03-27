import { useState, useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/lib/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nContext, t as translate } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Index from "./pages/Index";
import ModulePage from "./pages/ModulePage";
import AccountPage from "./pages/AccountPage";
import {
  ListingDetail,
  BusinessProfilePage,
  CreateListingPage,
  PricingPage,
  AboutPage,
  RulesPage,
  ContactsPage,
} from "./pages/DetailPage";
import MessagesPage from "./pages/MessagesPage";
import SearchPage from "./pages/SearchPage";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import AuthError from "./pages/AuthError";
import LogoutCallbackPage from "./pages/LogoutCallbackPage";
import OnboardingPage from "./pages/OnboardingPage";
import AdminModerationPage from "./pages/AdminModerationPage";

const queryClient = new QueryClient();

function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("uahab-locale");
      if (saved === "ua" || saved === "es" || saved === "en") return saved;
    }
    return "ua";
  });

  useEffect(() => {
    localStorage.setItem("uahab-locale", locale);
  }, [locale]);

  const tFn = (key: string) => translate(key, locale);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: tFn }}>
      {children}
    </I18nContext.Provider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                {/* Module pages */}
                <Route path="/jobs" element={<ModulePage />} />
                <Route path="/housing" element={<ModulePage />} />
                <Route path="/services" element={<ModulePage />} />
                <Route path="/marketplace" element={<ModulePage />} />
                <Route path="/events" element={<ModulePage />} />
                <Route path="/community" element={<ModulePage />} />
                <Route path="/organizations" element={<ModulePage />} />
                <Route path="/business" element={<ModulePage />} />
                {/* Listing detail */}
                <Route path="/jobs/:listingId" element={<ListingDetail />} />
                <Route path="/housing/:listingId" element={<ListingDetail />} />
                <Route path="/services/:listingId" element={<ListingDetail />} />
                <Route path="/marketplace/:listingId" element={<ListingDetail />} />
                <Route path="/events/:listingId" element={<ListingDetail />} />
                <Route path="/community/:listingId" element={<ListingDetail />} />
                <Route path="/organizations/:listingId" element={<ListingDetail />} />
                {/* Business profile */}
                <Route path="/business/:bizId" element={<BusinessProfilePage />} />
                {/* Account */}
                <Route path="/account" element={<AccountPage />} />
                {/* Create listing */}
                <Route path="/create" element={<CreateListingPage />} />
                {/* Messages & Search */}
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/admin/moderation" element={<AdminModerationPage />} />
                {/* Platform pages */}
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/rules" element={<RulesPage />} />
                <Route path="/contacts" element={<ContactsPage />} />
                {/* Auth */}
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/auth/error" element={<AuthError />} />
                <Route path="/logout-callback" element={<LogoutCallbackPage />} />
              </Routes>
            </BrowserRouter>
            <SpeedInsights />
          </TooltipProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
