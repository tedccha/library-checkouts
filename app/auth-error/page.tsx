"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const email = searchParams.get("email");

  useEffect(() => {
    console.error("[Auth Error]", { error, email });
  }, [error, email]);

  return (
    <div style={{ textAlign: "center", paddingTop: "40px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Sign-In Error</h1>
      <p style={{ color: "red", marginBottom: "20px" }}>
        {error === "AccessDenied"
          ? `Your email (${email}) is not in the allowed list.`
          : error || "An error occurred during sign-in"}
      </p>
      <details style={{ textAlign: "left", backgroundColor: "#f5f5f5", padding: "10px", borderRadius: "4px" }}>
        <summary>Debug Info</summary>
        <pre>{JSON.stringify({ error, email }, null, 2)}</pre>
      </details>
      <p style={{ marginTop: "20px" }}>
        <a href="/">← Back to sign in</a>
      </p>
    </div>
  );
}
