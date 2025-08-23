import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAuth, Auth } from "firebase/auth";
import { getAnalytics, Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let firebaseApp: FirebaseApp;
let firestore: Firestore;
let storage: FirebaseStorage;
let auth: Auth;
let analytics: Analytics | undefined;

if (typeof window !== 'undefined') {
  // Initialize only once on client side
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
    
    // Initialize analytics only in client side and if measurementId exists
    if (firebaseConfig.measurementId) {
      analytics = getAnalytics(firebaseApp);
    }
  } else {
    firebaseApp = getApps()[0];
  }

  // Get services
  firestore = getFirestore(firebaseApp);
  storage = getStorage(firebaseApp);
  auth = getAuth(firebaseApp);
} else {
  // Server-side - these won't be used but we need to define them
  firebaseApp = {} as FirebaseApp;
  firestore = {} as Firestore;
  storage = {} as FirebaseStorage;
  auth = {} as Auth;
}

export { firebaseApp, firestore as db, storage, auth, analytics, firebaseConfig };