import axios, { AxiosInstance } from 'axios';
import { getAPIBaseURL } from './config';
import { getSupabaseClient } from './supabase';

type AuthMethod = 'google' | 'apple' | 'email' | 'phone';
type AuthMode = 'login' | 'register';

export interface AuthCapabilities {
  google: boolean;
  apple: boolean;
  email_login: boolean;
  email_signup: boolean;
  phone: boolean;
  turnstile_enabled: boolean;
  email_confirmation_required: boolean;
  dev_auth_enabled: boolean;
  oidc_configured: boolean;
  missing_settings: string[];
  supabase_configured: boolean;
  missing_supabase_settings: string[];
}

interface EmailAuthResult {
  requiresEmailConfirmation: boolean;
}

export interface DevLoginOptions {
  role?: 'user' | 'admin';
  email?: string;
  name?: string;
  user_id?: string;
}

export interface LogoutResponse {
  redirect_url: string;
  revoked_sessions: number;
}

export interface StartOidcLoginOptions {
  captchaToken?: string;
  method?: AuthMethod;
  mode?: AuthMode;
}

export function redirectToAuthEntry() {
  window.location.href = '/auth';
}

function getErrorDetail(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const detail = 'detail' in data ? data.detail : null;
  if (typeof detail === 'string' && detail.trim()) {
    return detail.trim();
  }

  const message = 'message' in data ? data.message : null;
  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }

  return null;
}

function normalizeAuthError(error: unknown, fallbackMessage: string): Error {
  if (axios.isAxiosError(error)) {
    const detail = getErrorDetail(error.response?.data);
    if (detail) {
      return new Error(detail);
    }

    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      return new Error('Unable to reach the authentication service. Please try again in a moment.');
    }
  }

  if (error instanceof Error) {
    if (/network/i.test(error.message)) {
      return new Error('Unable to reach the authentication service. Please try again in a moment.');
    }
    return error;
  }

  return new Error(fallbackMessage);
}

class RPApi {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private getBaseURL() {
    return getAPIBaseURL();
  }

  async getCurrentUser() {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await this.client.get(
        `${this.getBaseURL()}/api/v1/auth/me`,
        token
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          : undefined
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        return null;
      }
      throw normalizeAuthError(error, 'Failed to get user info');
    }
  }

  async login() {
    redirectToAuthEntry();
  }

  async getAuthCapabilities() {
    const response = await this.client.get<AuthCapabilities>(`${this.getBaseURL()}/api/v1/auth/capabilities`);
    return response.data;
  }

  private async exchangeSupabaseAccessToken(accessToken: string) {
    try {
      const response = await this.client.post<TokenExchangeResponse>(
        `${this.getBaseURL()}/api/v1/auth/supabase/exchange`,
        { access_token: accessToken }
      );
      localStorage.setItem('auth_token', response.data.token);
      return response.data.token;
    } catch (error) {
      throw normalizeAuthError(error, 'Failed to complete sign in');
    }
  }

  async restoreSession() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) {
      return null;
    }

    return this.exchangeSupabaseAccessToken(data.session.access_token);
  }

  async signInWithEmail(email: string, password: string) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase auth is not configured in the frontend environment');
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
      if (!data.session?.access_token) {
        throw new Error('Supabase did not return an authenticated session');
      }

      await this.exchangeSupabaseAccessToken(data.session.access_token);
    } catch (error) {
      throw normalizeAuthError(error, 'Failed to sign in with email');
    }
  }

  async signUpWithEmail(email: string, password: string): Promise<EmailAuthResult> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase auth is not configured in the frontend environment');
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        throw error;
      }

      if (!data.session?.access_token) {
        return { requiresEmailConfirmation: true };
      }

      await this.exchangeSupabaseAccessToken(data.session.access_token);
      return { requiresEmailConfirmation: false };
    } catch (error) {
      throw normalizeAuthError(error, 'Failed to sign up with email');
    }
  }

  async startOidcLogin(options?: StartOidcLoginOptions) {
    const url = new URL(`${this.getBaseURL()}/api/v1/auth/login`);
    if (options?.captchaToken) {
      url.searchParams.set('captcha_token', options.captchaToken);
    }
    if (options?.method) {
      url.searchParams.set('method', options.method);
    }
    if (options?.mode) {
      url.searchParams.set('mode', options.mode);
    }
    window.location.href = url.toString();
  }

  async devLogin(options?: DevLoginOptions) {
    const response = await this.client.post<TokenExchangeResponse>(
      `${this.getBaseURL()}/api/v1/auth/dev-login`,
      options ?? {}
    );
    localStorage.setItem('auth_token', response.data.token);
    return response.data;
  }

  async logout() {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut().catch(() => undefined);
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        window.location.href = '/logout-callback';
        return;
      }
      const response = await this.client.get<LogoutResponse>(
        `${this.getBaseURL()}/api/v1/auth/logout`,
        token
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          : undefined
      );
      localStorage.removeItem('auth_token');
      // The backend will redirect to OIDC provider logout
      window.location.href = response.data.redirect_url;
    } catch (error) {
      localStorage.removeItem('auth_token');
      window.location.href = '/logout-callback';
    }
  }

  async logoutAllDevices() {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await this.client.post<LogoutResponse>(
        `${this.getBaseURL()}/api/v1/auth/logout/all`,
        {},
        token
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          : undefined
      );
      localStorage.removeItem('auth_token');
      window.location.href = response.data.redirect_url;
    } catch (error) {
      throw normalizeAuthError(error, 'Failed to logout from all devices');
    }
  }
}

export const authApi = new RPApi();
