import { NextRequest, NextResponse } from "next/server";
import { deleteBlogPost } from "@/lib/actions";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function DELETE(req: NextRequest) {
  console.log("🟡 DELETE endpoint hit");

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split("Bearer ")[1];

  if (!token) {
    console.log("🔴 No token provided");
    return NextResponse.json({ error: "No token provided" }, { status: 401 });
  }

  try {
    console.log("🟡 Verifying token...");
    const decodedToken = await adminAuth.verifyIdToken(token); 
    console.log("🟢 Token verified:", decodedToken.uid);

    // Check admin status from Firestore
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      console.log("🔴 User not found in database");
      return NextResponse.json({ error: "User not found" }, { status: 403 });
    }

    const userData = userDoc.data();
    if (!userData?.isAdmin) {
      console.log("🔴 User is not admin");
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
    }

    const body = await req.json();
    console.log("🟡 Parsed body:", body);

    const { postId } = body;
    if (!postId) {
      console.log("🔴 postId missing in body");
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    console.log(`🟡 Attempting to delete postId: ${postId}`);
    const result = await deleteBlogPost(postId);
    console.log("🟢 deleteBlogPost result:", result);

    if (!result.success) {
      console.log("🔴 Delete action failed:", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log("✅ Post deleted successfully");
    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("🔥 Catch error block hit:", err);
    
    // Handle specific Firebase errors
    if (err.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { 
          error: "Session expired. Please refresh your token and try again.",
          code: "TOKEN_EXPIRED" 
        },
        { status: 401 }
      );
    }
    
    if (err.code === 'auth/id-token-revoked') {
      return NextResponse.json(
        { 
          error: "Session revoked. Please log in again.",
          code: "TOKEN_REVOKED" 
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        error: err.message || "Server error",
        code: err.code || "UNKNOWN_ERROR" 
      }, 
      { status: 500 }
    );
  }
}