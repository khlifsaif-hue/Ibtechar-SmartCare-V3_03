"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./app-shell";
import { AuthGate, SmartCareAuthProvider } from "./auth-provider";

/**
 * Password recovery begins before the user has an active SmartCare profile.
 * Keep this route outside AuthGate so a recovery session can display its two
 * password fields instead of being redirected back to the sign-in screen.
 */
export function SmartCareRouteBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/auth/reset-password") {
    return <>{children}</>;
  }

  return (
    <SmartCareAuthProvider>
      <AuthGate>
        <AppShell>{children}</AppShell>
      </AuthGate>
    </SmartCareAuthProvider>
  );
}
