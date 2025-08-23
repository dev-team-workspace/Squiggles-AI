
"use server";

import { adminAuth } from "@/lib/firebase-admin-utils";

export async function verifySession(sessionCookie: string) {
  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedClaims;
  } catch (error) {
    console.error("❌ Error verifying session cookie:", error);
    return null;
  }
}
