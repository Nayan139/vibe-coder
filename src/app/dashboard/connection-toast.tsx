"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

export function ConnectionToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected === "github") {
      toast.success("GitHub connected successfully! Your repositories are now loading.");
    } else if (connected === "gitlab") {
      toast.success("GitLab connected successfully! Your repositories are now loading.");
    } else if (error) {
      const messages: Record<string, string> = {
        missing_params: "OAuth callback was missing required parameters.",
        invalid_state: "Invalid OAuth state. Please try connecting again.",
        token_exchange_failed: "Failed to get access token from GitHub/GitLab.",
        no_access_token: "No access token was returned. Please try again.",
        db_save_failed: "Connected to GitHub but failed to save. Please try again.",
        gitlab_not_configured: "GitLab integration is not configured yet.",
        auth_callback_failed: "Authentication failed. Please try logging in again.",
      };
      toast.error(messages[error] ?? `Connection error: ${error}`);
    }

    // Strip query params from URL without triggering re-render
    if (connected || error) {
      router.replace(pathname);
    }
  }, [searchParams, router, pathname]);

  return null;
}
