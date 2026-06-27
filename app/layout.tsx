import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Library Checkouts",
  description: "Track your library book checkouts and due dates",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
