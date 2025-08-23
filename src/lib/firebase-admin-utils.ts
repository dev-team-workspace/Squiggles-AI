// import { doc, getDoc } from "firebase/firestore";
// import { db } from "@/lib/firebase";

// export async function checkIfUserIsAdmin(uid: string): Promise<boolean> {
//   try {
//     const adminDoc = await getDoc(doc(db, "admins", uid));
//     return adminDoc.exists();
//   } catch (error) {
//     console.error("Error checking admin status:", error);
//     return false;
//   }
// }
// import { getFirestore } from "firebase-admin/firestore";
// import { adminAuth } from "./firebase-admin"; 

// const adminDb = getFirestore();

// export async function checkIfUserIsAdmin(uid: string): Promise<boolean> {
//   try {
//     const adminDoc = await adminDb.doc(`admins/${uid}`).get();
//     return adminDoc.exists;
//   } catch (error) {
//     console.error("❌ Admin check failed:", error);
//     return false;
//   }
// }
// export { adminAuth };

import { getFirestore } from "firebase-admin/firestore";
import { adminAuth } from "./firebase-admin";
import { AdminCreationView, AdminUserView } from "@/types";

const adminDb = getFirestore();

export async function verifyIdToken(token: string) {
  try {
    if (!token) throw new Error('No token provided');
    return await adminAuth.verifyIdToken(token);
  } catch (error) {
    console.error("❌ Token verification failed:", error);
    throw error; 
  }
}
export async function checkIfUserIsAdmin(uid: string): Promise<boolean> {
  try {
    if (!uid) return false;
    const adminDoc = await adminDb.doc(`users/${uid}`).get();
    return adminDoc.exists && adminDoc.data()?.isAdmin === true;
  } catch (error) {
    console.error("❌ Admin check failed:", error);
    return false;
  }
}

export async function getAdminData() {
  try {
    // Get only admin users
    const usersSnapshot = await adminDb.collection('users')
      .where('isAdmin', '==', true)
      .orderBy('createdAt', 'desc')
      .get();

    const creationsSnapshot = await adminDb.collection('creations')
      .orderBy('createdAt', 'desc')
      .get();

    return {
      users: usersSnapshot.docs.map(mapUserDoc),
      creations: creationsSnapshot.docs.map(mapCreationDoc)
    };
  } catch (error) {
    console.error("Error fetching admin data:", error);
    throw error;
  }
}
function mapUserDoc(doc: any): AdminUserView {
  const data = doc.data();
  return {
    uid: doc.id,
    email: data.email || "N/A",
    displayName: data.displayName || "N/A",
    // Make optional fields truly optional
    funnyUsername: data.funnyUsername || null,
    photoURL: data.photoURL || null,
    avatarUrl: data.avatarUrl || null,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date(0).toISOString(),
    lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString() || null,
    // Provide defaults for potentially missing fields
    welcomeCreditsMessageShown: data.welcomeCreditsMessageShown ?? null,
    avatarLastRegenAt: data.avatarLastRegenAt ?? null,
    avatarRegenCountToday: data.avatarRegenCountToday ?? null,
    // Add isAdmin flag
    isAdmin: Boolean(data.isAdmin)
  };
}

function mapCreationDoc(doc: any): AdminCreationView {
  const data = doc.data();
  return {
  id: doc.id,
  userId: data.userId,
  title: data.title || 'Untitled',
  style: data.style || 'unknown',
  originalDrawingUrl: data.originalDrawingUrl,
  transformedImageUrl: data.transformedImageUrl,
  upscaledImageUrl: data.upscaledImageUrl,
  isPublic: data.isPublic === true,
  createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  userEmail: "",
  storagePath: null,
  downloadUrl: null,
  updatedAt: "",
  publicUrl: "",
  likes: 0,
  views: 0,
  tags: [],
};
}

export { adminAuth };