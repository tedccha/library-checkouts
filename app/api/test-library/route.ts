import { fetchCheckedOutBooks } from "@/app/lib/library";

export async function GET() {
  try {
    const books = await fetchCheckedOutBooks(
      process.env.LIBRARY_USERNAME || "",
      process.env.LIBRARY_PASSWORD || ""
    );
    return Response.json({ success: true, count: books.length, books });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
