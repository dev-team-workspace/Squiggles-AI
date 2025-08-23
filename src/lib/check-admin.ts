
"use server";

import { checkIfUserIsAdmin } from "@/lib/firebase-admin-utils";

export async function verifyAdmin(uid: string) {
  try {
    const isAdmin = await checkIfUserIsAdmin(uid);
    return isAdmin;
  } catch (error) {
    console.error("Admin check failed:", error);
    return false;
  }
}
