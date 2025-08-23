// This file is intended to centralize the access of environment variables.
// This helps in managing them and makes it easier to tree-shake unused variables.

// Firebase Configuration
export const NEXT_PUBLIC_FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
export const NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN =
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
export const NEXT_PUBLIC_FIREBASE_PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
export const NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
export const NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID =
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
export const NEXT_PUBLIC_FIREBASE_APP_ID =
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
export const NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID; // Optional

// reCAPTCHA Configuration
export const NEXT_PUBLIC_RECAPTCHA_SITE_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

// Google AI / Genkit Configuration (Server-side, but can be accessed here for consistency if ever needed client-side, though not recommended for secrets)
// export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; // Should primarily be used server-side

// Stripe Configuration
export const NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
// export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY; // Server-side only
// export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET; // Server-side only

// Stripe Price IDs - Updated to reflect 60, 130, 350 credit packs
export const NEXT_PUBLIC_STRIPE_PRICE_ID_60_CREDITS =
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_60_CREDITS;
export const NEXT_PUBLIC_STRIPE_PRICE_ID_130_CREDITS =
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_130_CREDITS;
export const NEXT_PUBLIC_STRIPE_PRICE_ID_350_CREDITS =
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_350_CREDITS;

export const ADMIN_USER_UID = process.env.NEXT_PUBLIC_ADMIN_UID || "";

// Optional: Add validation
if (!ADMIN_USER_UID && process.env.NODE_ENV === "production") {
  console.error("Admin UID is not configured!");
}
// App Specific Configuration
export const NEXT_PUBLIC_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Development Specific Configuration
// export const NEXT_PUBLIC_DEV_MODE_SKIP_AUTH = process.env.NEXT_PUBLIC_DEV_MODE_SKIP_AUTH === 'true'; // No longer used for auto-bypass
export const DEV_GUEST_EMAIL =
  process.env.DEV_GUEST_EMAIL || "latentsmurf@gmail.com";
export const DEV_GUEST_PASSWORD =
  process.env.DEV_GUEST_PASSWORD || "password123";

// Helper function to log if critical Firebase client config is missing
export function checkFirebaseClientConfig(): {
  isValid: boolean;
  missingKeys: string[];
} {
  const missingKeys: string[] = [];
  if (
    !NEXT_PUBLIC_FIREBASE_API_KEY ||
    NEXT_PUBLIC_FIREBASE_API_KEY.includes("YOUR_") ||
    NEXT_PUBLIC_FIREBASE_API_KEY.includes("...")
  )
    missingKeys.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (
    !NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN.includes("YOUR_") ||
    !NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN.includes(".firebasestorage.app")
  )
    missingKeys.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (
    !NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    NEXT_PUBLIC_FIREBASE_PROJECT_ID.includes("YOUR_")
  )
    missingKeys.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (
    !NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.includes("YOUR_") ||
    !NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.includes(".appspot.com")
  )
    missingKeys.push("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  if (
    !NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID.includes("YOUR_")
  )
    missingKeys.push("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  if (
    !NEXT_PUBLIC_FIREBASE_APP_ID ||
    NEXT_PUBLIC_FIREBASE_APP_ID.includes("YOUR_") ||
    NEXT_PUBLIC_FIREBASE_APP_ID.includes("...")
  )
    missingKeys.push("NEXT_PUBLIC_FIREBASE_APP_ID");
  if (
    !NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY.includes("YOUR_")
  )
    missingKeys.push("NEXT_PUBLIC_RECAPTCHA_SITE_KEY");

  if (missingKeys.length > 0) {
    // Instead of console.error here, return the status and keys
    return { isValid: false, missingKeys };
  }
  return { isValid: true, missingKeys: [] };
}
