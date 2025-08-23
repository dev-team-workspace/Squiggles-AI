
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/providers/firebase-provider';

interface UseAuthRedirectOptions {
  redirectTo?: string;
  requireAuth?: boolean; // if true, redirect if not authenticated. if false, redirect if authenticated (e.g., from login page)
}

export function useAuthRedirect({ redirectTo = '/auth/signin', requireAuth = true }: UseAuthRedirectOptions = {}) {
  const {
    user,
    loading,
    addSimulatedCost,
    isDevModeActive,
    refreshProfile } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        router.push(redirectTo);
      }
      if (!requireAuth && user) {
        router.push(redirectTo);
      }
    }
  }, [user, loading, router, redirectTo, requireAuth]);

  return {
    user,
    loading,
    addSimulatedCost,
    isDevModeActive,
    refreshProfile,
  };
}
