// import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
// import { getAuth } from "firebase-admin/auth";

// const firebaseAdminApp =
//   getApps().length === 0
//     ? initializeApp({
//         credential: applicationDefault(),
//         projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, 
//       })
    // : getApps()[0];

// export const adminAuth = getAuth(firebaseAdminApp);


import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
// Initialize Firebase Admin with environment variables
const firebaseAdminApp = getApps().length === 0
  ? initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
      }),
      databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
    })
  : getApps()[0];

export const adminAuth = getAuth(firebaseAdminApp);
export const adminDb = getFirestore(firebaseAdminApp);

export async function verifyIdToken(idToken: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken , true);
    
    // Optional: Add additional verification
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      throw new Error('User not found in database');
    }
    
    return decodedToken;
  } catch (error: unknown) {
    console.error("❌ ID token verification failed:", error);
    
    // Type-safe error handling
    if (error instanceof Error) {
      const firebaseError = error as { code?: string; message: string };
      
      if (firebaseError.code === 'auth/id-token-expired') {
        firebaseError.message = 'Token expired. Please refresh your session.';
      } else if (firebaseError.code === 'auth/id-token-revoked') {
        firebaseError.message = 'Token revoked. Please sign in again.';
      }
      
      throw firebaseError;
    }
    
    // For non-Error cases
    throw new Error('Unknown error during token verification');
  }
}