import { NextRequest, NextResponse } from "next/server";
import { checkIfUserIsAdmin, verifyIdToken } from "@/lib/firebase-admin-utils";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) throw new Error("Missing token");

    const decoded = await verifyIdToken(token); 
    const uid = decoded.uid;

    const isAdmin = await checkIfUserIsAdmin(uid);
    return NextResponse.json({ isAdmin });
  } catch (err) {
    console.error("Admin check failed:", err);
    return NextResponse.json({ isAdmin: false, error: "Check failed" }, { status: 500 });
  }
}
