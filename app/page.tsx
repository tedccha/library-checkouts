"use client";

import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

interface CheckedOutBook {
  id: string;
  title: string;
  author?: string;
  dueDate: string;
  renewalsRemaining: number;
  barcode?: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [books, setBooks] = useState<CheckedOutBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchCheckouts();
    }
  }, [status]);

  async function fetchCheckouts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkouts");
      if (!res.ok) throw new Error("Failed to fetch checkouts");
      const data = await res.json();
      setBooks(data.checkouts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return (
      <div style={{ textAlign: "center", paddingTop: "40px" }}>
        <h1>Library Checkouts</h1>
        <p>Sign in with Google to see your checked out books.</p>
        <button
          onClick={() => signIn("google")}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1>Library Checkouts</h1>
        <div>
          <span>{session.user?.email}</span>
          <button
            onClick={() => signOut()}
            style={{
              marginLeft: "10px",
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <button
        onClick={fetchCheckouts}
        disabled={loading}
        style={{
          marginBottom: "20px",
          padding: "8px 16px",
          cursor: "pointer",
        }}
      >
        {loading ? "Loading..." : "Refresh"}
      </button>

      {error && <div style={{ color: "red", marginBottom: "20px" }}>{error}</div>}

      {books.length === 0 && !loading ? (
        <p>No books checked out.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "20px",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid #ccc" }}>
              <th style={{ textAlign: "left", padding: "10px" }}>Title</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Author</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Due Date</th>
              <th style={{ textAlign: "center", padding: "10px" }}>
                Renewals Left
              </th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px" }}>{book.title}</td>
                <td style={{ padding: "10px" }}>{book.author || "—"}</td>
                <td style={{ padding: "10px" }}>{book.dueDate}</td>
                <td style={{ padding: "10px", textAlign: "center" }}>
                  {book.renewalsRemaining}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
