"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { LOGIN_CLOSED_ERROR, LOGIN_FAILED_ERROR } from "@/constants";

/**
 * Show the login error toast after the OAuth callback redirects back with `?error=`.
 * Renders nothing; it only shows the same toasts the popup sign-in flow showed before.
 */
const LoginErrorToast = () => {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (error === LOGIN_CLOSED_ERROR) {
      toast.error("Registration is closed!", { description: "Check back in the future for WildHacks 2027." });
    } else if (error === LOGIN_FAILED_ERROR) {
      toast.error("Login failed", { description: "An unknown error occurred" });
    }
  }, [error]);

  return null;
};

export default LoginErrorToast;
