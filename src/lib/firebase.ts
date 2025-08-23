import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, initializeFirestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Type-safe empty initialization for server-side
const createEmptyFirebase = () => ({
  app: {} as FirebaseApp,
  db: {} as Firestore,
  storage: {} as FirebaseStorage,
  auth: {} as Auth
});

let firebase: ReturnType<typeof createEmptyFirebase>;

if (typeof window === 'undefined') {
  // Server-side initialization
  if (!getApps().length) {
    try {
      const app = initializeApp(firebaseConfig);
      const db = initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true

      });
      const storage = getStorage(app);
      const auth = getAuth(app);
      
      firebase = { app, db, storage, auth };
    } catch (error) {
      console.error('Server-side Firebase initialization failed:', error);
      firebase = createEmptyFirebase();
    }
  } else {
    const app = getApps()[0];
    firebase = {
      app,
      db: getFirestore(app),
      storage: getStorage(app),
      auth: getAuth(app)
    };
  }
} else {
  // Client-side initialization
  if (!getApps().length) {
    firebase = {
      app: initializeApp(firebaseConfig),
      db: getFirestore(),
      storage: getStorage(),
      auth: getAuth()
    };
  } else {
    const app = getApps()[0];
    firebase = {
      app,
      db: getFirestore(app),
      storage: getStorage(app),
      auth: getAuth(app)
    };
  }
}

// Safe getters with initialization checks
export const getFirebaseApp = () => {
  if (!firebase.app) throw new Error('Firebase app not initialized');
  return firebase.app;
};

export const getDb = () => {
  if (!firebase.db) throw new Error('Firestore not initialized');
  return firebase.db;
};

export const getStorageInstance = () => {
  if (!firebase.storage) throw new Error('Storage not initialized');
  return firebase.storage;
};

export const getAuthInstance = () => {
  if (!firebase.auth) throw new Error('Auth not initialized');
  return firebase.auth;
};

// Export all as default for backward compatibility
export default firebase;