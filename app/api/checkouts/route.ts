import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { fetchCheckedOutBooks } from "@/app/lib/library";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const libraryUsername = process.env.LIBRARY_USERNAME;
  const libraryPassword = process.env.LIBRARY_PASSWORD;

  if (!libraryUsername || !libraryPassword) {
    return Response.json(
      {
        error:
          "Library credentials not configured. Add LIBRARY_USERNAME and LIBRARY_PASSWORD to env vars.",
      },
      { status: 500 }
    );
  }

  try {
    const checkouts = await fetchCheckedOutBooks(
      libraryUsername,
      libraryPassword
    );
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
