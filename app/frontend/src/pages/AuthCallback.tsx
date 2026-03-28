import { useEffect } from 'react';
import { consumePostAuthRedirect } from '@/lib/auth';

export default function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const expiresAt = params.get('expires_at');

    if (token) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_provider', 'oidc');
      if (expiresAt) {
        localStorage.setItem('auth_expires_at', expiresAt);
      } else {
        localStorage.removeItem('auth_expires_at');
      }
      window.location.replace(consumePostAuthRedirect('/onboarding'));
      return;
    }

    const msg = params.get('msg') || 'Authentication callback is missing token';
    window.location.replace(`/auth/error?msg=${encodeURIComponent(msg)}`);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
}
