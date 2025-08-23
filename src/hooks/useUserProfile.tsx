
"use client";
import type { UserProfile } from "@/types";
// import { useState, useEffect } from 'react'; // No longer needed for local state
// import { doc, onSnapshot } from 'firebase/firestore'; // No longer needed here
// import { db } from '@/lib/firebase'; // No longer needed here
import { useAuthContext } from '@/providers/firebase-provider';

export function useUserProfile() {
  // Directly consume the comprehensive state from FirebaseProvider
  const { 
    user, 
    profile, 
    loadingProfile, 
    profileError, 
    loading: authLoading // authLoading is the 'loading' from FirebaseContext
  } = useAuthContext();

  return { 
    user, // The authenticated user object (or mock user)
    profile, // The user's profile data (or mock profile)
    loadingProfile, // Boolean indicating if the profile data is loading
    profileError, // Any error message related to fetching the profile
    authLoading // Boolean indicating if the initial auth state is loading (renamed for clarity if preferred)
  };
}
