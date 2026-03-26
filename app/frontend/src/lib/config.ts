// Runtime configuration
let runtimeConfig: {
  API_BASE_URL: string;
  APP_ENV: 'local' | 'preview' | 'staging' | 'production';
  SITE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
} | null = null;

// Configuration loading state
let configLoading = true;

// Default fallback configuration
const defaultConfig = {
  API_BASE_URL: 'http://127.0.0.1:8000', // Only used if runtime config fails to load
  APP_ENV: 'local' as const,
  SITE_URL: 'http://localhost:3000',
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
};

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
  // If config is still loading, return default config to avoid using stale Vite env vars
  if (configLoading) {
    console.log('Config still loading, using default config');
    return defaultConfig;
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
      APP_ENV: (import.meta.env.VITE_PUBLIC_APP_ENV as 'local' | 'preview' | 'staging' | 'production' | undefined) || 'local',
      SITE_URL: (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || window.location.origin,
      SUPABASE_URL: (import.meta.env.VITE_PUBLIC_SUPABASE_URL as string | undefined) || '',
      SUPABASE_ANON_KEY: (import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string | undefined) || '',
    };
    console.log('Using Vite environment config');
    return viteConfig;
  }

  // Finally fall back to default
  console.log('Using default config');
  return defaultConfig;
}

// Dynamic API_BASE_URL getter - this will always return the current config
export function getAPIBaseURL(): string {
  return getConfig().API_BASE_URL;
}

export function getAppEnv(): 'local' | 'preview' | 'staging' | 'production' {
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
