export async function GET() {
  return Response.json({
    allowed_emails: process.env.ALLOWED_EMAILS || "NOT SET",
    google_client_id: process.env.GOOGLE_CLIENT_ID ? "SET" : "NOT SET",
    google_client_secret: process.env.GOOGLE_CLIENT_SECRET ? "SET" : "NOT SET",
    nextauth_secret: process.env.NEXTAUTH_SECRET ? "SET" : "NOT SET",
    nextauth_url: process.env.NEXTAUTH_URL || "NOT SET",
  });
}
