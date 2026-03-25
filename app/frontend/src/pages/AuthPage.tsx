import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Mail, ShieldCheck } from "lucide-react";
import UahubLayout from "@/components/UahubLayout";
import { authApi, type AuthCapabilities } from "@/lib/auth";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        "expired-callback"?: () => void;
        "error-callback"?: () => void;
        theme?: "light" | "dark";
      }) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";

export default function AuthPage() {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const isDark = theme === "dark";
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReady, setCaptchaReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [capabilities, setCapabilities] = useState<AuthCapabilities | null>(null);
  const [capabilitiesError, setCapabilitiesError] = useState<string | null>(null);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  const turnstileSiteKey = useMemo(
    () => (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() || "",
    [],
  );

  useEffect(() => {
    const loadCapabilities = async () => {
      try {
        const nextCapabilities = await authApi.getAuthCapabilities();
        setCapabilities(nextCapabilities);
        setCapabilitiesError(null);
      } catch (error) {
        setCapabilities(null);
        setCapabilitiesError(error instanceof Error ? error.message : "Failed to load auth capabilities");
      } finally {
        setCapabilitiesLoading(false);
      }
    };

    void loadCapabilities();
  }, []);

  useEffect(() => {
    if (!turnstileSiteKey) {
      return;
    }

    const renderWidget = () => {
      if (!widgetRef.current || !window.turnstile || widgetIdRef.current) {
        return;
      }

      widgetIdRef.current = window.turnstile.render(widgetRef.current, {
        sitekey: turnstileSiteKey,
        callback: (token) => {
          setCaptchaToken(token);
          setCaptchaReady(true);
        },
        "expired-callback": () => {
          setCaptchaToken("");
          setCaptchaReady(false);
        },
        "error-callback": () => {
          setCaptchaToken("");
          setCaptchaReady(false);
        },
        theme: isDark ? "dark" : "light",
      });
    };

    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      renderWidget();
      return;
    }

    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => renderWidget();
    document.head.appendChild(script);

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [isDark, turnstileSiteKey]);

  const requiresCaptcha = Boolean(capabilities?.turnstile_enabled);
  const turnstileMisconfigured = requiresCaptcha && !turnstileSiteKey;

  const authActions = [
    {
      key: "google-login",
      label: t("auth.action.google"),
      description: t("auth.action.googleDescription"),
      enabled: Boolean(capabilities?.google),
      method: "google" as const,
      mode: "login" as const,
    },
    {
      key: "apple-login",
      label: t("auth.action.apple"),
      description: t("auth.action.appleDescription"),
      enabled: Boolean(capabilities?.apple),
      method: "apple" as const,
      mode: "login" as const,
    },
    {
      key: "email-login",
      label: t("auth.action.emailLogin"),
      description: t("auth.action.emailLoginDescription"),
      enabled: Boolean(capabilities?.email_login),
      method: "email" as const,
      mode: "login" as const,
    },
    {
      key: "email-register",
      label: t("auth.action.emailRegister"),
      description: capabilities?.email_confirmation_required
        ? t("auth.action.emailRegisterConfirmed")
        : t("auth.action.emailRegisterDescription"),
      enabled: Boolean(capabilities?.email_signup),
      method: "email" as const,
      mode: "register" as const,
    },
    {
      key: "phone-login",
      label: t("auth.action.phone"),
      description: t("auth.action.phoneDescription"),
      enabled: Boolean(capabilities?.phone),
      method: "phone" as const,
      mode: "login" as const,
      optional: true,
    },
  ].filter((action) => !action.optional || capabilities?.phone);

  const fallbackActions = [
    {
      key: "hosted-login",
      label: t("auth.action.hostedLogin"),
      description: t("auth.action.hostedLoginDescription"),
      mode: "login" as const,
    },
    {
      key: "hosted-register",
      label: t("auth.action.hostedRegister"),
      description: t("auth.action.hostedRegisterDescription"),
      mode: "register" as const,
    },
  ];

  const handleStart = async (
    mode: "login" | "register",
    actionKey: string,
    method?: "google" | "apple" | "email" | "phone",
  ) => {
    if (requiresCaptcha && !captchaToken) {
      return;
    }
    setSubmitting(true);
    setSelectedAction(actionKey);
    try {
      await authApi.startOidcLogin({
        captchaToken: captchaToken || undefined,
        mode,
        method,
      });
    } finally {
      setSubmitting(false);
      setSelectedAction(null);
    }
  };

  const showProviderSpecificActions = Boolean(capabilities) && !capabilitiesError;
  const showFallbackActions = Boolean(capabilitiesError);

  return (
    <UahubLayout hideModuleNav>
      <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
        <section className={`rounded-[32px] border p-6 md:p-8 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
          <div className="mb-6 flex items-start gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${isDark ? "bg-[#1a2d4c] text-[#FFD700]" : "bg-blue-50 text-[#0057B8]"}`}>
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t("auth.title")}</h1>
              <p className={`mt-2 text-sm leading-7 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("auth.subtitle")}</p>
            </div>
          </div>

          <div className={`mb-6 rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
            <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {t("auth.methods")}
            </p>
            {capabilitiesLoading ? (
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("auth.loadingCapabilities")}</p>
            ) : null}
            {showProviderSpecificActions ? (
              <div className="grid gap-3 md:grid-cols-2">
                {authActions.map((action) => {
                  const disabled =
                    !action.enabled || submitting || turnstileMisconfigured || (requiresCaptcha && !captchaToken);
                  return (
                    <button
                      key={action.key}
                      type="button"
                      onClick={() => void handleStart(action.mode, action.key, action.method)}
                      disabled={disabled}
                      className={`rounded-2xl border p-4 text-left transition ${disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5"} ${isDark ? "border-[#22416b] bg-[#1a2d4c] text-slate-100" : "border-slate-200 bg-white text-slate-800"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{action.label}</p>
                          <p className={`mt-1 text-xs leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{action.description}</p>
                        </div>
                        {!action.enabled ? (
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${isDark ? "bg-[#11203a] text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                            {t("auth.status.setupRequired")}
                          </span>
                        ) : null}
                      </div>
                      {submitting && selectedAction === action.key ? (
                        <p className={`mt-3 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("auth.redirecting")}</p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {showFallbackActions ? (
              <div className="grid gap-3 md:grid-cols-2">
                {fallbackActions.map((action) => {
                  const disabled = submitting || turnstileMisconfigured || (requiresCaptcha && !captchaToken);
                  return (
                    <button
                      key={action.key}
                      type="button"
                      onClick={() => void handleStart(action.mode, action.key)}
                      disabled={disabled}
                      className={`rounded-2xl border p-4 text-left transition ${disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5"} ${isDark ? "border-[#22416b] bg-[#1a2d4c] text-slate-100" : "border-slate-200 bg-white text-slate-800"}`}
                    >
                      <p className="text-sm font-semibold">{action.label}</p>
                      <p className={`mt-1 text-xs leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{action.description}</p>
                      {submitting && selectedAction === action.key ? (
                        <p className={`mt-3 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("auth.redirecting")}</p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <p className={`mt-3 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {locale === "ua"
                ? "Фактичний вибір провайдера виконується на захищеній hosted-сторінці автентифікації."
                : locale === "es"
                  ? "La selección real del proveedor se realiza en la página segura alojada de autenticación."
                  : "The actual provider selection happens on the secure hosted authentication page."}
            </p>
            {capabilities?.email_confirmation_required ? (
              <div className={`mt-4 flex items-start gap-3 rounded-2xl border p-3 ${isDark ? "border-[#22416b] bg-[#11203a]" : "border-slate-200 bg-white"}`}>
                <Mail className={`mt-0.5 h-4 w-4 shrink-0 ${isDark ? "text-[#FFD700]" : "text-[#0057B8]"}`} />
                <p className={`text-xs leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("auth.emailConfirmationRequired")}</p>
              </div>
            ) : null}
          </div>

          {capabilitiesError ? (
            <div className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 ${isDark ? "border-red-900/40 bg-red-950/20" : "border-red-200 bg-red-50"}`}>
              <AlertCircle className={`mt-0.5 h-5 w-5 shrink-0 ${isDark ? "text-red-300" : "text-red-600"}`} />
              <div>
                <p className={`text-sm ${isDark ? "text-red-300" : "text-red-600"}`}>{capabilitiesError}</p>
                <p className={`mt-2 text-xs ${isDark ? "text-red-200" : "text-red-700"}`}>{t("auth.capabilitiesFallback")}</p>
              </div>
            </div>
          ) : null}

          {turnstileMisconfigured ? (
            <div className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 ${isDark ? "border-red-900/40 bg-red-950/20" : "border-red-200 bg-red-50"}`}>
              <AlertCircle className={`mt-0.5 h-5 w-5 shrink-0 ${isDark ? "text-red-300" : "text-red-600"}`} />
              <p className={`text-sm ${isDark ? "text-red-300" : "text-red-600"}`}>{t("auth.turnstileConfigError")}</p>
            </div>
          ) : null}

          {requiresCaptcha ? (
            <div className={`mb-6 rounded-2xl border p-4 ${isDark ? "border-[#22416b] bg-[#0d1a2e]" : "border-slate-200 bg-slate-50"}`}>
              <p className={`mb-3 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>{t("auth.captchaRequired")}</p>
              <div ref={widgetRef} />
              {!captchaReady ? (
                <p className={`mt-3 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>{t("auth.captchaLoading")}</p>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </UahubLayout>
  );
}
