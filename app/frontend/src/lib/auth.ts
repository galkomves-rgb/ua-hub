import axios, { AxiosInstance } from 'axios';
import { getAPIBaseURL } from './config';

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

class RPApi {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      withCredentials: true,
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
      throw new Error(
        error.response?.data?.detail || 'Failed to get user info'
      );
    }
  }

  async login() {
    redirectToAuthEntry();
  }

  async getAuthCapabilities() {
    const response = await this.client.get<AuthCapabilities>(`${this.getBaseURL()}/api/v1/auth/capabilities`);
    return response.data;
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

  async logout() {
    try {
      const token = localStorage.getItem('auth_token');
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
      throw new Error(error.response?.data?.detail || 'Failed to logout');
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
      throw new Error(error.response?.data?.detail || 'Failed to logout from all devices');
    }
  }
}

export const authApi = new RPApi();
