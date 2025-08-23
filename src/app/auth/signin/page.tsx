
"use client";
import AuthForm from "@/components/auth/auth-form";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";

export default function SignInPage() {
  useAuthRedirect({ requireAuth: false, redirectTo: '/' }); 
  
  return (
      <AuthForm />
  );
}
