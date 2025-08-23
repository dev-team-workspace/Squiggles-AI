"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase-client";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuthContext } from "@/providers/firebase-provider";

// Inline SVG for Google Icon
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
    <path d="M1 1h22v22H1z" fill="none" />
  </svg>
);

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
});

type FormValues = z.infer<typeof formSchema>;

export default function AuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const router = useRouter();
  const { toast } = useToast();
  const { activateMockSession } = useAuthContext();
  const [isDevelopment, setIsDevelopment] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    setIsDevelopment(process.env.NODE_ENV === "development");
  }, []);

  const handleBypassLogin = () => {
    if (isDevelopment) {
      console.log("[AuthForm] Bypassing login for development.");
      activateMockSession();
      toast({
        title: "Dev Bypass Active",
        description: "Using mock user session.",
      });
      router.push("/");
    } else {
      toast({
        title: "Error",
        description: "Bypass login is only available in development.",
        variant: "destructive",
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          await setDoc(userDocRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            credits: 3, // Credits system disabled
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            avatarLastRegenAt: null,
            avatarRegenCountToday: 0,
          });
          toast({
            title: "Welcome!",
            description: "Account created with Google.",
          });
        } else {
          await updateDoc(userDocRef, {
            displayName: firebaseUser.displayName, // Update if changed
            photoURL: firebaseUser.photoURL, // Update if changed
            lastLoginAt: serverTimestamp(),
          });
          toast({ title: "Signed in with Google!" });
        }
        router.push("/");
      }
    } catch (error: any) {
      console.error("Google Sign-In error:", error);
      let errorMessage = "An unexpected error occurred with Google Sign-In.";
      if (error.code) {
        switch (error.code) {
          case "auth/popup-closed-by-user":
            errorMessage =
              "Google Sign-In popup was closed before completion. Please try again.";
            break;
          case "auth/account-exists-with-different-credential":
            errorMessage =
              "An account already exists with this email address but signed up with a different method (e.g., email/password). Please sign in using that method.";
            break;
          case "auth/cancelled-popup-request":
            errorMessage =
              "Google Sign-In was cancelled. If you have multiple pop-ups, please complete or close them and try again.";
            break;
          case "auth/popup-blocked":
            errorMessage =
              "Google Sign-In popup was blocked by your browser. Please allow popups for this site and try again.";
            break;
          case "auth/operation-not-allowed":
            errorMessage =
              "Google Sign-In is not enabled for this app. Please contact support.";
            break;
          case "auth/unauthorized-domain":
            errorMessage =
              "This domain is not authorized for Google Sign-In. Please contact support if this is a deployed app.";
            break;
          default:
            errorMessage = error.message || "Failed to sign in with Google.";
        }
      }
      toast({
        title: "Google Sign-In Error",
        description: errorMessage,
        variant: "destructive",
        duration: 10000,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    let errorMessage = "An unexpected error occurred. Please try again.";
    const isDev = process.env.NODE_ENV === "development";
    const currentApiKey = auth.app.options.apiKey;
    const isApiKeyPlaceholder =
      !currentApiKey ||
      currentApiKey.includes("YOUR_ACTUAL_FIREBASE_API_KEY_FROM_CONSOLE") ||
      currentApiKey.includes("YOUR_FB_API_KEY_HERE_FROM_CONSOLE");

    console.log(
      `[AuthForm] onSubmit - Email: ${
        values.email
      }, Action: ${activeTab}, Dev Mode: ${isDev}, API Key OK: ${!isApiKeyPlaceholder}`
    );

    try {
      if (activeTab === "signin") {
        await signInWithEmailAndPassword(auth, values.email, values.password);
        toast({ title: "Signed in successfully!" });
        router.push("/");
      } else {
        // signup
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          values.email,
          values.password
        );
        const firebaseUser = userCredential.user;
        if (firebaseUser) {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          await setDoc(userDocRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: null,
            photoURL: null,
            // credits: 3, // Credits system disabled
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            avatarLastRegenAt: null,
            avatarRegenCountToday: 0,
            credits:3
          });
          toast({
            title: "Account created successfully!",
            description: "Please sign in.",
          });
        } else {
          toast({
            title: "Account created, but user data issue.",
            description: "Please try signing in.",
            variant: "destructive",
          });
        }
        setActiveTab("signin");
        form.reset();
      }
    } catch (error: any) {
      const originalErrorMessage = error.message || "";
       console.log("Failed login attempt:", {
      email: values.email,
      errorCode: error.code,
      firebaseConfig: auth.app.options
    });
      if (error.code) {
        switch (error.code) {
          case "auth/user-not-found":
          case "auth/wrong-password":
          case "auth/invalid-credential":
            errorMessage = "Invalid email or password.";
            break;
          case "auth/email-already-in-use":
            errorMessage =
              "This email address is already in use. Try signing in or use Google Sign-In.";
            break;
          case "auth/weak-password":
            errorMessage =
              "Password is too weak. It should be at least 6 characters.";
            break;
          case "auth/invalid-api-key":
          case "auth/api-key-not-valid":
          case "auth/api-key-not-valid.-please-pass-a-valid-api-key.": 
            if (isDev) {
              errorMessage = `DEVELOPMENT: Firebase API key issue. The API Key used (e.g., in src/lib/firebase.ts via NEXT_PUBLIC_FIREBASE_API_KEY or hardcoded) appears invalid or missing. Original Error: ${originalErrorMessage}. Please verify your .env.local file or firebase.ts and RESTART your Next.js dev server. Ensure it matches your Firebase project settings.`;
            } else {
              errorMessage =
                "Firebase configuration error (API Key). Please contact support.";
            }
            break;
          case "auth/configuration-not-found":
            if (isDev) {
              errorMessage = `DEVELOPMENT: Firebase project config not found or mismatch. Original Error: ${originalErrorMessage}.
              1. Verify firebaseConfig in src/lib/firebase.ts (using NEXT_PUBLIC_... vars from .env.local or hardcoded) EXACTLY matches your Firebase project settings.
              2. Ensure Firebase Authentication is enabled for Email/Password & Google.
              3. Check 'Authorized domains' in Firebase Auth settings includes your current domain (e.g., localhost).`;
            } else {
              errorMessage =
                "Firebase configuration error (Project Setup). Please contact support.";
            }
            break;
          default:
            errorMessage = `Error: ${originalErrorMessage} (Code: ${
              error.code || "N/A"
            })`;
        }
      } else if (originalErrorMessage) {
        errorMessage = originalErrorMessage;
      }
      console.error(
        `Auth error (${activeTab}) for ${values.email}:`,
        error,
        "\nGenerated error message:",
        errorMessage
      );
      toast({
        title: `Error ${activeTab === "signin" ? "signing in" : "signing up"}`,
        description: errorMessage,
        variant: "destructive",
        duration: 15000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    const guestEmail =
      process.env.NEXT_PUBLIC_DEV_GUEST_EMAIL || "latentsmurf@gmail.com";
    const guestPassword =
      process.env.NEXT_PUBLIC_DEV_GUEST_PASSWORD || "password123";
    let errorMessage =
      "An unexpected error occurred during guest login. Please try again.";
    const isDev = process.env.NODE_ENV === "development";
    const currentApiKey = auth.app.options.apiKey;
    const isApiKeyPlaceholder =
      !currentApiKey ||
      currentApiKey.includes("YOUR_ACTUAL_FIREBASE_API_KEY_FROM_CONSOLE") ||
      currentApiKey.includes("YOUR_FB_API_KEY_HERE_FROM_CONSOLE");

    console.log(
      `[AuthForm] handleGuestLogin - Email: ${guestEmail}, Dev Mode: ${isDev}, API Key OK: ${!isApiKeyPlaceholder}`
    );

    if (isDev && isApiKeyPlaceholder) {
      const missingKeyError = `DEVELOPMENT: Firebase API key is missing or is a placeholder in src/lib/firebase.ts (loaded from NEXT_PUBLIC_FIREBASE_API_KEY in .env.local or hardcoded). Guest Login requires a valid API key. Please add your actual Firebase API key and RESTART your dev server. Current API Key: ${
        auth.app.options.apiKey || "Not found"
      }`;
      console.error("Guest login setup issue:", missingKeyError);
      toast({
        title: "Guest Login Setup Issue (DEV)",
        description: missingKeyError,
        variant: "destructive",
        duration: 15000,
      });
      setIsLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, guestEmail, guestPassword);
      toast({ title: "Signed in as Guest!" });
      router.push("/");
    } catch (error: any) {
      const originalErrorMessage = error.message || "";
      if (error.code) {
        switch (error.code) {
          case "auth/user-not-found":
          case "auth/invalid-credential":
            errorMessage = `Guest account '${guestEmail}' credentials are not valid or the account doesn't exist. Ensure it's set up in your Firebase project console. Original Error: ${originalErrorMessage}`;
            console.error(
              `Guest login error: Invalid credentials for ${guestEmail}. Check Firebase console. Original error:`,
              originalErrorMessage
            );
            break;
          case "auth/wrong-password":
            errorMessage = `Incorrect password for guest account '${guestEmail}'. Please verify in Firebase console. Original Error: ${originalErrorMessage}`;
            console.error(
              `Guest login error: Incorrect password for ${guestEmail}. Original error:`,
              originalErrorMessage
            );
            break;
          case "auth/invalid-api-key":
          case "auth/api-key-not-valid":
          case "auth/api-key-not-valid.-please-pass-a-valid-api-key.": // Adjusted to catch variations
            if (isDev) {
              errorMessage = `DEVELOPMENT: Firebase API key issue for Guest Login. The API Key used (via NEXT_PUBLIC_FIREBASE_API_KEY in .env.local or hardcoded) appears invalid or is a placeholder. Original Error: ${originalErrorMessage}. Please verify it and RESTART your Next.js dev server. Current API Key: ${
                auth.app.options.apiKey || "Not found"
              }`;
            } else {
              errorMessage = `Firebase configuration error (API Key) preventing Guest Login. Original error: ${originalErrorMessage}. Please contact support.`;
            }
            console.error(
              "Guest login error: Invalid API Key. Original error:",
              originalErrorMessage
            );
            break;
          case "auth/configuration-not-found":
            if (isDev) {
              errorMessage = `DEVELOPMENT: Firebase project config not found or mismatch for Guest Login. Original Error: ${originalErrorMessage}.
              1. Verify firebaseConfig in src/lib/firebase.ts (using NEXT_PUBLIC_... vars from .env.local or hardcoded) EXACTLY matches your Firebase project settings.
              2. Ensure Firebase Authentication is enabled in your Firebase project (including Email/Password).
              3. Check 'Authorized domains' in Firebase Auth settings includes your current domain.
              4. Ensure the '${guestEmail}' user exists in Firebase Auth.`;
            } else {
              errorMessage =
                "Firebase configuration error (Project Setup) preventing Guest Login. Please contact support.";
            }
            console.error(
              "Guest login error: Firebase project configuration not found or mismatch. Original error:",
              originalErrorMessage
            );
            break;
          default:
            errorMessage = `Error: ${originalErrorMessage} (Code: ${
              error.code || "N/A"
            })`;
        }
      } else if (originalErrorMessage) {
        errorMessage = originalErrorMessage;
      }
      console.error(
        "Guest login error (final):",
        error,
        "\nGenerated error message:",
        errorMessage
      );
      toast({
        title: "Guest login failed",
        description: errorMessage,
        variant: "destructive",
        duration: 15000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-3xl font-bold text-center text-primary">
            Welcome to Squiggles!
          </CardTitle>
          <CardDescription className="text-center pt-1">
            Sign in or create an account to bring your drawings to life.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isDevelopment && (
            <Button
              onClick={handleBypassLogin}
              className="w-full mb-3 bg-yellow-500 hover:bg-yellow-600 text-yellow-foreground"
              variant="default"
              disabled={isLoading || isGoogleLoading}
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Bypass Login (Dev Only)
            </Button>
          )}
          <Button
            onClick={handleGoogleSignIn}
            className="w-full mb-6"
            variant="outline"
            disabled={isGoogleLoading || isLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="mr-2" />
            )}
            Sign in with Google
          </Button>
<div className="mb-4">
  <div className="flex items-center">
    <Separator className="h-px flex-1 bg-border" />
    <span className="text-xs text-muted-foreground px-2 whitespace-nowrap">OR</span>
    <Separator className="h-px flex-1 bg-border" />
  </div>
</div>






          <Tabs
            defaultValue="signin"
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "signin" | "signup")
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In with Email</TabsTrigger>
              <TabsTrigger value="signup">Sign Up with Email</TabsTrigger>
            </TabsList>
            <TabsContent value="signin"></TabsContent>
            <TabsContent value="signup"></TabsContent>
          </Tabs>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="you@example.com"
                        {...field}
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        autoComplete={
                          activeTab === "signin"
                            ? "current-password"
                            : "new-password"
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isGoogleLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {activeTab === "signin" ? "Sign In" : "Sign Up"}
              </Button>
            </form>
            {isDevelopment && (
              <Button
                variant="secondary"
                className="w-full mt-4"
                onClick={handleGuestLogin}
                disabled={isLoading || isGoogleLoading}
              >
                {isLoading && !isGoogleLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Login as Guest (Dev - Real Auth)
              </Button>
            )}
          </Form>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground pt-4">
          <p>
            {activeTab === "signin"
              ? "Don't have an email account? "
              : "Already have an email account? "}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => {
                setActiveTab(activeTab === "signin" ? "signup" : "signin");
                form.reset();
              }}
            >
              {activeTab === "signin" ? "Sign up here" : "Sign in here"}
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
