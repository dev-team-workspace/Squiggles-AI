import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  const { uid, isAdmin } = await req.json();

  try {
    // Update the user document
    await adminDb.doc(`users/${uid}`).update({
      isAdmin: isAdmin,
      updatedAt: new Date().toISOString() // Add timestamp for debugging
    });
    
    return NextResponse.json({ 
      success: true,
      isAdmin: isAdmin // Return the new state
    });
  } catch (error) {
    console.error("Error updating admin status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update admin status" },
      { status: 500 }
    );
  }
}