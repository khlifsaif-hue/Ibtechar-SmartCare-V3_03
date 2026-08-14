import { Suspense } from "react";
import ResetPasswordForm from "./reset-password-form";

function ResetPasswordFallback() {
  return (
    <main className="auth-screen">
      <section className="auth-card">
        <img src="/ibtechar-main-logo.png" alt="Ibtechar" />
        <p>Loading secure password recovery…</p>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
