import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { fetchCheckedOutBooks } from "@/app/lib/library";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const libraryCookies = process.env.LIBRARY_COOKIES;

  if (!libraryCookies) {
    return Response.json(
      {
        error:
          "Library cookies not configured. Sign in to catalog.chappaqualibrary.org and export session cookies to LIBRARY_COOKIES env var. See CLAUDE.md for instructions.",
      },
      { status: 500 }
    );
  }

  try {
    const checkouts = await fetchCheckedOutBooks(libraryCookies);
    return Response.json({ checkouts });
  } catch (error) {
    console.error("Error fetching checkouts:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch library checkouts",
      },
      { status: 500 }
    );
  }
}
