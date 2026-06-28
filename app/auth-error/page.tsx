"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    console.error("[Auth Error]", { error });
  }, [error]);

  return (
    <div style={{ textAlign: "center", paddingTop: "40px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Sign-In Error</h1>
      <p style={{ color: "red", marginBottom: "20px", fontSize: "18px" }}>
        {error || "An error occurred during sign-in"}
      </p>
      {error === "AccessDenied" && (
        <p style={{ backgroundColor: "#ffe0e0", padding: "10px", borderRadius: "4px", marginBottom: "20px" }}>
          Your email is not in the allowed list. Contact the admin to add your email.
        </p>
      )}
      <p style={{ marginTop: "20px" }}>
        <a href="/" style={{ fontSize: "16px" }}>← Back to sign in</a>
      </p>
    </div>
  );
}
