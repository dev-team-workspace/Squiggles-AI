
"use client";

import type { User, UserInfo, UserMetadata } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, db, firebaseConfig } from '@/lib/firebase-client';
import { Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import type { UserProfile, NotificationItem, NotificationType, DailyStyle } from '@/types';
import { doc, getDoc, setDoc, serverTimestamp as firestoreServerTimestamp, updateDoc, Timestamp } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getDailyStyle } from '@/lib/daily-styles';

interface FirebaseContextProps {
  user: User | null;
  loading: boolean; // Auth loading
  profile: UserProfile | null;
  loadingProfile: boolean; // Profile specific loading
  profileError: string | null;
  isDevModeActive: boolean;
  simulatedSessionCost: number;
  addSimulatedCost: (amount: number) => void;
  activateMockSession: () => void;
  deactivateMockSession: () => void;
  notifications: NotificationItem[];
  addNotification: (title: React.ReactNode, description?: React.ReactNode, type?: NotificationType) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  hasUnreadNotifications: boolean;
  refreshProfile: () => Promise<void>;
  dailyStyle: DailyStyle | null;
}

const FirebaseContext = createContext<FirebaseContextProps | undefined>(undefined);

const MAX_NOTIFICATIONS_IN_LIST = 10;
const MAX_AVATAR_REGENS_PER_DAY = 3;

const MOCK_USER_UID = 'dev-bypass-uid';

const mockUser: User = {
  uid: MOCK_USER_UID,
  email: 'dev-bypass@squiggles.app',
  displayName: 'Dev Bypass User',
  photoURL: `https://placehold.co/40x40.png?text=Dev`,
  emailVerified: true,
  isAnonymous: false,
  getIdToken: async (_forceRefresh?: boolean) => 'mock-id-token-bypass',
  getIdTokenResult: async (_forceRefresh?: boolean) => ({
    token: 'mock-id-token-bypass',
    claims: {
      auth_time: String(Math.floor(Date.now() / 1000)),
      iat: String(Math.floor(Date.now() / 1000)),
      exp: String(Math.floor(Date.now() / 1000) + 3600),
      sub: MOCK_USER_UID,
      user_id: MOCK_USER_UID,
      firebase: {
        identities: {},
        sign_in_provider: 'custom',
      },
    },
    authTime: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 3600 * 1000).toISOString(),
    issuedAtTime: new Date().toISOString(),
    signInProvider: null,
    signInSecondFactor: null,
    source: 'client' as any,
  }),
  reload: async () => { },
  toJSON: () => ({
    uid: MOCK_USER_UID,
    email: 'dev-bypass@squiggles.app',
    displayName: 'Dev Bypass User',
    photoURL: `https://placehold.co/40x40.png?text=Dev`,
    emailVerified: true,
    isAnonymous: false,
    providerData: [{ providerId: 'custom', uid: MOCK_USER_UID, displayName: 'Dev Bypass User', email: 'dev-bypass@squiggles.app', photoURL: null, phoneNumber: null }],
    stsTokenManager: { refreshToken: 'mock-refresh-token-bypass', accessToken: 'mock-id-token-bypass', expirationTime: Date.now() + 3600000 },
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    apiKey: 'mock-api-key-bypass',
    appName: '[DEFAULT]',
  }),
  delete: async () => { },
  providerId: 'firebase',
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  } as UserMetadata,
  providerData: [{
    providerId: 'custom',
    uid: MOCK_USER_UID,
    displayName: 'Dev Bypass User',
    email: 'dev-bypass@squiggles.app',
    photoURL: null,
    phoneNumber: null,
  }] as UserInfo[],
  refreshToken: 'mock-refresh-token-bypass',
  tenantId: null,
  phoneNumber: null
};

const mockProfile: UserProfile = {
  uid: MOCK_USER_UID,
  email: 'dev-bypass@squiggles.app',
  displayName: 'Dev Bypass User',
  photoURL: `https://placehold.co/40x40.png?text=Dev`,
  funnyUsername: 'Captain Dev Doodles',
  // credits: 999, // Credits system currently disabled
  createdAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
  avatarUrl: `https://placehold.co/128x128.png?text=MockAva`,
  avatarLastRegenAt: new Date().toISOString(),
  avatarRegenCountToday: 0,
  welcomeCreditsMessageShown: true, // Assume dev bypass user has seen it
};

export const FirebaseProvider = ({ children }: { children: ReactNode }) => {

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  const [isDevModeActive, setIsDevModeActive] = useState(false);
  const [simulatedSessionCost, setSimulatedSessionCost] = useState(0);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [dailyStyle, setDailyStyle] = useState<DailyStyle | null>(null);

  const addNotification = useCallback((title: React.ReactNode, description?: React.ReactNode, type: NotificationType = 'default') => {
    const newNotification: NotificationItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title,
      description,
      type,
      createdAt: Date.now(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev.slice(0, MAX_NOTIFICATIONS_IN_LIST - 1)]);
  }, []);
  useEffect(() => {
    const unsubscribe = auth.onIdTokenChanged(async (user) => {
      if (user) {
        // Refresh token every 30 minutes (before 1hr expiration)
        const refreshInterval = setInterval(async () => {
          try {
            await user.getIdToken(true);
            console.log("Token automatically refreshed");
          } catch (error) {
            console.error("Token refresh failed:", error);
            clearInterval(refreshInterval);
          }
        }, 30 * 60 * 1000); // 30 minutes

        return () => clearInterval(refreshInterval);
      }
    });

    return () => unsubscribe();
  }, []);
  useEffect(() => {
    const today = new Date();
    const currentDailyStyle = getDailyStyle(today);
    setDailyStyle(currentDailyStyle);
    console.log('[FirebaseProvider] Daily style for today:', currentDailyStyle?.name || 'None');

    if (currentDailyStyle) {
      const notificationKey = `dailyStyleNotified_${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
      try {
        if (sessionStorage.getItem(notificationKey) !== 'true') {
          addNotification(
            <>
              <Sparkles className="inline-block mr-2 h-5 w-5 text-yellow-500" />
              Today's Special Style!
            </>,
            <>
              Try out the "<strong>{currentDailyStyle.name}</strong>" style today!
              <br />
              <em>{currentDailyStyle.description}</em>
              <br />
              Select "Surprise Me!" on the canvas to use it.
            </>,
            'daily-style'
          );
          sessionStorage.setItem(notificationKey, 'true');
        }
      } catch (e) {
        console.warn("[FirebaseProvider] Session storage is not available or disabled. Daily style notification may re-appear.", e);
        addNotification(
          <>
            <Sparkles className="inline-block mr-2 h-5 w-5 text-yellow-500" />
            Today's Special Style!
          </>,
          <>
            Try out "<strong>{currentDailyStyle.name}</strong>" style today!
            <br />
            <em>{currentDailyStyle.description}</em>
            <br />
            Select "Surprise Me!" on the canvas to use it.
          </>,
          'daily-style'
        );
      }
    }
  }, [addNotification]);


  useEffect(() => {
    setHasUnreadNotifications(notifications.some(n => !n.read));
  }, [notifications]);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const addSimulatedCost = useCallback((amount: number) => {
    if (isDevModeActive) {
      setSimulatedSessionCost(prev => prev + amount);
    }
  }, [isDevModeActive]);

  const fetchUserProfile = useCallback(async (currentUser: User) => {
    if (!db) {
      console.error("[FirebaseProvider] Firestore (db) is not initialized. Cannot fetch profile.");
      setProfileError("Database connection error. Profile cannot be loaded.");
      setLoadingProfile(false);
      return;
    }
    console.log('[FirebaseProvider] Fetching/updating profile for UID:', currentUser.uid);
    setLoadingProfile(true);
    setProfileError(null);
    const userDocRef = doc(db, "users", currentUser.uid);

    try {
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const profileData: UserProfile = {
          uid: currentUser.uid,
          credits: data.credits,
          email: data.email || currentUser.email,
          displayName: data.displayName || currentUser.displayName,
          photoURL: data.photoURL || currentUser.photoURL,
          funnyUsername: data.funnyUsername || undefined,
          // credits: data.credits !== undefined ? data.credits : 0, // Credits system disabled
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          lastLoginAt: data.lastLoginAt?.toDate ? data.lastLoginAt.toDate().toISOString() : new Date().toISOString(),
          avatarUrl: data.avatarUrl || undefined,
          avatarLastRegenAt: data.avatarLastRegenAt || undefined,
          avatarRegenCountToday: data.avatarRegenCountToday !== undefined ? data.avatarRegenCountToday : 0,
          welcomeCreditsMessageShown: data.welcomeCreditsMessageShown === true,
        };
        setProfile(profileData);
        console.log('[FirebaseProvider] Profile fetched:', profileData);

        // Logic for welcome dialog
        if (profileData.welcomeCreditsMessageShown === false) {
          // console.log('[FirebaseProvider] Welcome message not shown, setting displayWelcomeDialog to true.');
          // setDisplayWelcomeDialog(true); // This state is now managed by WelcomeCreditsDialog itself via context.
        }


        const updates: Partial<UserProfile> = { lastLoginAt: firestoreServerTimestamp() as any };
        if (currentUser.displayName && currentUser.displayName !== data.displayName) {
          updates.displayName = currentUser.displayName;
        }
        if (currentUser.photoURL && currentUser.photoURL !== data.photoURL) {
          updates.photoURL = currentUser.photoURL;
        }
        // Only update if there's more than just lastLoginAt or if critical info changed
        if (Object.keys(updates).length > 1 || !data.displayName || !data.photoURL) {
          await updateDoc(userDocRef, updates);
          console.log('[FirebaseProvider] Profile updated with latest from auth provider.');
        } else {
          await updateDoc(userDocRef, { lastLoginAt: firestoreServerTimestamp() as any });
        }

      } else {
        console.warn(`[FirebaseProvider] Profile document not found for UID: ${currentUser.uid}. Attempting to create one.`);
        const newProfileData: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          funnyUsername: undefined,
          // credits: 3, // Initial credits for new user (Credits system disabled)
          createdAt: firestoreServerTimestamp() as any,
          lastLoginAt: firestoreServerTimestamp() as any,
          avatarUrl: undefined,
          avatarLastRegenAt: undefined,
          avatarRegenCountToday: 0,
          welcomeCreditsMessageShown: false, // New users haven't seen it
        };
        await setDoc(userDocRef, newProfileData);
        setProfile(newProfileData);
        console.log(`[FirebaseProvider] Created profile for new user: ${currentUser.uid}`);
        // setDisplayWelcomeDialog(true); // New users should see the welcome dialog
      }
    } catch (error: any) {
      console.error("[FirebaseProvider] Error fetching user profile:", error);
      setProfileError("Failed to load user profile.");
      addNotification("Profile Error", "Failed to load your profile.", "error");
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [addNotification]);

  const activateMockSession = useCallback(() => {
    console.log('[FirebaseProvider] Activating Mock Session.');
    setUser(mockUser);
    const today = new Date();
    const currentDailyStyle = getDailyStyle(today);
    setDailyStyle(currentDailyStyle);

    const newMockProfile = { ...mockProfile };
    const todayISO = new Date().toISOString().split('T')[0];
    if (newMockProfile.avatarLastRegenAt?.split('T')[0] !== todayISO) {
      newMockProfile.avatarRegenCountToday = 0;
      newMockProfile.avatarLastRegenAt = new Date().toISOString();
    }
    setProfile(newMockProfile);

    setLoading(false);
    setLoadingProfile(false);
    setProfileError(null);
    setIsDevModeActive(true);
    setSimulatedSessionCost(0);

    const mockNotifications: NotificationItem[] = [
      { id: 'welcome-mock', title: 'Welcome to Dev Mode!', description: 'Mock session active. Unlimited (simulated) credits for testing AI features.', type: 'info', createdAt: Date.now(), read: false }
    ];
    if (currentDailyStyle) {
      mockNotifications.unshift({
        id: 'daily-style-mock',
        title: <> <Sparkles className="inline-block mr-2 h-5 w-5 text-yellow-500" /> Today's Special Style!</>,
        description: <>Try out "<strong>{currentDailyStyle.name}</strong>"! <em>{currentDailyStyle.description}</em> Use 'Surprise Me!' on the canvas.</>,
        type: 'daily-style',
        createdAt: Date.now() - 1000, // Ensure it's slightly older for sorting if needed
        read: false
      });
    }
    setNotifications(mockNotifications);
    console.log('[FirebaseProvider] Mock session state:', { user: mockUser, profile: newMockProfile, loading: false, loadingProfile: false, isDevModeActive: true, simulatedSessionCost: 0 });
  }, [addNotification]);

  const deactivateMockSession = useCallback(() => {
    console.log('[FirebaseProvider] Deactivating Mock Session.');
    setIsDevModeActive(false);
    setSimulatedSessionCost(0);
    setUser(null);
    setProfile(null);
    setLoading(true);
    setLoadingProfile(true);
    setNotifications([]);
    setDailyStyle(null); // Reset daily style when deactivating
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentAuthUser = auth ? auth.currentUser : null;
    if (currentAuthUser && !isDevModeActive) {
      await fetchUserProfile(currentAuthUser);
    } else if (isDevModeActive) {
      const today = new Date();
      const currentDailyStyle = getDailyStyle(today);
      setDailyStyle(currentDailyStyle);

      const newMockProfile = { ...mockProfile };
      const todayISO = new Date().toISOString().split('T')[0];
      if (newMockProfile.avatarLastRegenAt?.split('T')[0] !== todayISO) {
        newMockProfile.avatarRegenCountToday = 0;
        newMockProfile.avatarLastRegenAt = new Date().toISOString();
      }
      setProfile(newMockProfile);
      setLoadingProfile(false);
      console.log('[FirebaseProvider] Refreshed mock profile.');
    }
  }, [isDevModeActive, fetchUserProfile]);


  useEffect(() => {
    const devModeSkipAuth = process.env.NEXT_PUBLIC_DEV_MODE_SKIP_AUTH === 'true';
    console.log('[FirebaseProvider] useEffect for auth state triggered. NEXT_PUBLIC_DEV_MODE_SKIP_AUTH:', process.env.NEXT_PUBLIC_DEV_MODE_SKIP_AUTH, 'Parsed as:', devModeSkipAuth);

    if (devModeSkipAuth) {
      console.log('[FirebaseProvider] Dev Mode via env var is active. Activating mock session.');
      activateMockSession();
      return () => {
        console.log('[FirebaseProvider] Cleanup from dev mode path (no-op for subscription).');
      };
    }

    console.log('[FirebaseProvider] Initializing real Firebase authentication listeners.');
    if (!auth || !db) {
      let errorMsg = "[FirebaseProvider] Critical Firebase services (Auth or Firestore) are not initialized. This usually means `firebaseConfig` in `src/lib/firebase.ts` is missing or incorrect. ";
      if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("YOUR_") || firebaseConfig.apiKey.includes("...")) {
        errorMsg += "Specifically, NEXT_PUBLIC_FIREBASE_API_KEY seems to be a placeholder or missing. ";
      }
      errorMsg += "Please check your .env.local file and ensure all NEXT_PUBLIC_FIREBASE_... variables are correctly set. App cannot initialize Firebase.";
      console.warn(errorMsg); // Changed to warn
      setInitializationError(errorMsg);
      setLoading(false);
      setLoadingProfile(false);
      return;
    }

    const {
      apiKey: envApiKey,
      authDomain: envAuthDomain,
      projectId: envProjectId,
    } = firebaseConfig;

    const essentialConfigMissing =
      !envApiKey || envApiKey.startsWith("YOUR_") || envApiKey.includes("_PLACEHOLDER") || envApiKey.includes("...") ||
      !envAuthDomain || !envAuthDomain.includes('.firebaseapp.com') ||
      !envProjectId || envProjectId.startsWith("YOUR_") || envProjectId.includes("_PLACEHOLDER") || envProjectId.includes("...");

    if (essentialConfigMissing) {
      const errorMsg = `Critical Firebase configuration is missing or uses placeholder values. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID are correctly set (e.g., in your .env.local file or directly in src/lib/firebase.ts if intended) and restart your server/build. App cannot initialize Firebase.`;
      console.warn(`[FirebaseProvider] ${errorMsg}`); // Changed to warn
      setInitializationError(errorMsg);
      setLoading(false);
      setLoadingProfile(false);
      return;
    }
    setInitializationError(null);
    setLoading(true);
    setLoadingProfile(true);
    deactivateMockSession(); // Ensure any mock session is cleared if we're using real auth

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      console.log('[FirebaseProvider] Real Auth state changed. currentUser:', !!currentUser);

      if (process.env.NEXT_PUBLIC_DEV_MODE_SKIP_AUTH === 'true') { // Re-check in case it was set later
        console.warn('[FirebaseProvider] Auth state changed, but NEXT_PUBLIC_DEV_MODE_SKIP_AUTH is true. Activating mock session.');
        activateMockSession();
        return;
      }

      setUser(currentUser);
      setLoading(false);
      // setSimulatedSessionCost(0); // Reset cost for new real user session
      // setNotifications([]); // Keep notifications for now, could be session based

      if (currentUser) {
        fetchUserProfile(currentUser);
      } else {
        setProfile(null);
        setLoadingProfile(false);
        setProfileError(null);
        const today = new Date(); // Still set daily style for logged-out users if needed for UI
        setDailyStyle(getDailyStyle(today));
      }
    }, (error) => {
      console.error("[FirebaseProvider] Error in onAuthStateChanged listener:", error);
      setInitializationError(`Firebase authentication listener error: ${error.message}. Check your network and Firebase project status.`);
      setLoading(false);
      setLoadingProfile(false);
    });

    return () => {
      console.log('[FirebaseProvider] Cleanup real auth subscription.');
      unsubscribeAuth();
    };
  }, [activateMockSession, deactivateMockSession, fetchUserProfile]);

  if (initializationError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8">
        <Alert variant="destructive" className="max-w-2xl">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Application Initialization Error</AlertTitle>
          <AlertDescription>
            <p className="font-semibold mb-2">The application could not start due to a configuration issue:</p>
            <p className="mb-4 whitespace-pre-wrap break-words">{initializationError}</p>
            <p className="mb-1"><strong>Please take the following steps:</strong></p>
            <ul className="list-disc list-inside mb-4 text-sm">
              <li>Ensure your Firebase configuration in <strong><code>src/lib/firebase.ts</code></strong> is correct and does not use placeholder values if you are hardcoding, OR</li>
              <li>Ensure your <strong><code>.env.local</code></strong> file contains correct <strong><code>NEXT_PUBLIC_FIREBASE_...</code></strong> variables if you are using environment variables.</li>
              <li><strong>Restart your Next.js development server</strong> after creating or modifying environment variables or the Firebase config file.</li>
            </ul>
            <Button onClick={() => window.location.reload()}>Reload Page</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isGloballyLoading = loading || (!isDevModeActive && !auth); // Consider globally loading if real auth is not yet determined AND not in dev mode

  if (isGloballyLoading && process.env.NEXT_PUBLIC_DEV_MODE_SKIP_AUTH !== 'true') {
    console.log('[FirebaseProvider] Render: Real auth is loading (full page spinner). Loading:', loading, 'isDevModeActive:', isDevModeActive, 'auth obj exists:', !!auth);
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  console.log('[FirebaseProvider] Render: Context values - user:', !!user, 'profile exists:', !!profile, 'loading(auth):', loading, 'loadingProfile:', loadingProfile, 'isDevModeActive:', isDevModeActive, 'simulatedCost:', simulatedSessionCost, 'dailyStyle:', dailyStyle?.name);

  return (
    <FirebaseContext.Provider value={{
      user,
      loading,
      profile,
      loadingProfile,
      profileError,
      isDevModeActive,
      simulatedSessionCost,
      addSimulatedCost,
      activateMockSession,
      deactivateMockSession,
      notifications,
      addNotification,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      hasUnreadNotifications,
      refreshProfile,
      dailyStyle
    }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within a FirebaseProvider');
  }
  return context;
};
