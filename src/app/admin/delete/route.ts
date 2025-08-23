import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
  });
}

const adminAuth = getAuth();
const db = getFirestore();

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const token = authHeader?.split("Bearer ")[1];


    if (!token) {
      return NextResponse.json(
        { error: "Authorization required", code: "MISSING_TOKEN" },
        { status: 401 }
      );
    }

    // Verify token with checkRevoked
    const decodedToken = await adminAuth.verifyIdToken(token);
    console.log("Verified token for UID:", decodedToken.uid);

    // Check admin status from Firestore
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    if (!userData?.isAdmin) {
      return NextResponse.json(
        { error: "Admin privileges required", code: "ADMIN_REQUIRED" },
        { status: 403 }
      );
    }

    const { postId } = await req.json();
    if (!postId) {
      return NextResponse.json(
        { error: "Post ID required", code: "MISSING_POST_ID" },
        { status: 400 }
      );
    }

    // Verify post exists
    const postRef = db.collection("blogs").doc(postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return NextResponse.json(
        { error: "Post not found", code: "POST_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Perform deletion
    await postRef.delete();
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("API Error:", error);

    if (error.code === "auth/id-token-expired") {
      return NextResponse.json(
        {
          error: "Token expired. Please refresh and try again.",
          code: "TOKEN_EXPIRED"
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: error.message || "Server error",
        code: error.code || "SERVER_ERROR"
      },
      { status: 500 }
    );
  }
}