"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await createClient().auth.updateUser({
      password,
    });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <img src="/ibtechar-main-logo.png" alt="Ibtechar" />
        <p className="eyebrow">Secure access</p>
        <h1>Create your password</h1>
        <p>Choose a private password for your approved SmartCare account.</p>
        <form onSubmit={save}>
          <label>
            New password
            <input
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="button primary full" disabled={saving}>
            {saving ? "Saving…" : "Set password and continue"}
          </button>
        </form>
      </section>
    </main>
  );
}
