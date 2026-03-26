type AppEnv = 'local' | 'preview' | 'staging' | 'production';

type RuntimeConfig = {
  API_BASE_URL: string;
  APP_ENV: AppEnv;
  SITE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
};

// Runtime configuration
let runtimeConfig: RuntimeConfig | null = null;

// Configuration loading state
let configLoading = true;

function getWindowLocation(): Location | null {
  return typeof window !== 'undefined' ? window.location : null;
}

function getSafeFallbackConfig(): RuntimeConfig {
  const location = getWindowLocation();
  const host = location?.hostname ?? '';
  const origin = location?.origin ?? 'http://localhost:3000';

  if (host === 'ua-hub.vercel.app') {
    return {
      API_BASE_URL: 'https://ua-hub-api-production.up.railway.app',
      APP_ENV: 'staging',
      SITE_URL: 'https://ua-hub.vercel.app',
      SUPABASE_URL: '',
      SUPABASE_ANON_KEY: '',
    };
  }

  if (host === 'localhost' || host === '127.0.0.1') {
    return {
      API_BASE_URL: 'http://127.0.0.1:8000',
      APP_ENV: 'local',
      SITE_URL: origin,
      SUPABASE_URL: '',
      SUPABASE_ANON_KEY: '',
    };
  }

  return {
    API_BASE_URL: origin,
    APP_ENV: 'production',
    SITE_URL: origin,
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
  };
}

// Function to load runtime configuration
export async function loadRuntimeConfig(): Promise<void> {
  try {
    console.log('🔧 DEBUG: Starting to load runtime config...');
    // Try to load configuration from a config endpoint
    const response = await fetch('/api/config');
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      // Only parse as JSON if the response is actually JSON
      if (contentType && contentType.includes('application/json')) {
        runtimeConfig = await response.json();
        console.log('Runtime config loaded successfully');
      } else {
        console.log(
          'Config endpoint returned non-JSON response, skipping runtime config'
        );
      }
    } else {
      console.log(
        '🔧 DEBUG: Config fetch failed with status:',
        response.status
      );
    }
  } catch (error) {
    console.log('Failed to load runtime config, using defaults:', error);
  } finally {
    configLoading = false;
    console.log(
      '🔧 DEBUG: Config loading finished, configLoading set to false'
    );
  }
}

// Get current configuration
export function getConfig() {
  const fallbackConfig = getSafeFallbackConfig();

  // If config is still loading, return environment-aware fallback config
  if (configLoading) {
    console.log('Config still loading, using default config');
    return fallbackConfig;
  }

  // First try runtime config (for Lambda)
  if (runtimeConfig) {
    console.log('Using runtime config');
    return runtimeConfig;
  }

  // Then try Vite environment variables (for local development)
  if (import.meta.env.VITE_API_BASE_URL) {
    const viteConfig = {
      API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      APP_ENV: (import.meta.env.VITE_PUBLIC_APP_ENV as AppEnv | undefined) || fallbackConfig.APP_ENV,
      SITE_URL: (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || window.location.origin,
      SUPABASE_URL: (import.meta.env.VITE_PUBLIC_SUPABASE_URL as string | undefined) || '',
      SUPABASE_ANON_KEY: (import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string | undefined) || '',
    };
    console.log('Using Vite environment config');
    return viteConfig;
  }

  // Finally fall back to environment-aware defaults
  console.warn('Using fallback config because runtime and Vite config are unavailable');
  return fallbackConfig;
}

// Dynamic API_BASE_URL getter - this will always return the current config
export function getAPIBaseURL(): string {
  return getConfig().API_BASE_URL;
}

export function getAppEnv(): AppEnv {
  return getConfig().APP_ENV;
}

// For backward compatibility, but this should be avoided
// Removed static export to prevent using stale config values
// export const API_BASE_URL = getAPIBaseURL();

export const config = {
  get API_BASE_URL() {
    return getAPIBaseURL();
  },
  get APP_ENV() {
    return getAppEnv();
  },
  get SITE_URL() {
    return getConfig().SITE_URL;
  },
  get SUPABASE_URL() {
    return getConfig().SUPABASE_URL;
  },
  get SUPABASE_ANON_KEY() {
    return getConfig().SUPABASE_ANON_KEY;
  },
};
