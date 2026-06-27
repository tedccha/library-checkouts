import axios from "axios";

const LIBRARY_BASE_URL = "https://catalog.chappaqualibrary.org";
const CHECKOUT_PAGE_URL = `${LIBRARY_BASE_URL}/MyAccount/CheckedOut?source=all`;

export interface CheckedOutBook {
  id: string;
  title: string;
  author?: string;
  dueDate: string;
  renewalsRemaining: number;
  barcode?: string;
}

/**
 * Fetch checkouts using stored session cookies.
 *
 * To get cookies:
 * 1. Sign in at https://catalog.chappaqualibrary.org
 * 2. Open DevTools → Application → Cookies
 * 3. Export or copy cookie values (especially PHPSESSID, aspendiscovery)
 * 4. Add to LIBRARY_COOKIES env var as semicolon-separated string
 */
async function fetchCheckedOutBooks(sessionCookies: string): Promise<CheckedOutBook[]> {
  if (!sessionCookies) {
    throw new Error(
      "No library session cookies. Sign in to catalog.chappaqualibrary.org and export cookies to LIBRARY_COOKIES env var"
    );
  }

  try {
    // Fetch the checkout page with session cookies
    const response = await axios.get(CHECKOUT_PAGE_URL, {
      headers: {
        Cookie: sessionCookies,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      validateStatus: () => true,
      timeout: 10000,
    });

    console.log(`Checkout page status: ${response.status}`);

    if (response.status !== 200) {
      throw new Error(
        `Failed to fetch page: ${response.status}. Cookies may be expired.`
      );
    }

    // Parse HTML to extract checkout data
    const books = parseCheckoutPage(response.data);
    return books;
  } catch (error) {
    console.error("Failed to fetch checkouts:", error);
    throw error;
  }
}

/**
 * Parse the checkout page HTML to extract book data.
 * This is a basic implementation — will be refined based on actual page structure.
 */
function parseCheckoutPage(html: string): CheckedOutBook[] {
  // Extract book rows from the checkout table
  // Pattern: look for table rows with book information

  const books: CheckedOutBook[] = [];

  // Regex patterns to find checkout rows (will be refined after inspecting actual HTML)
  const rowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/g;
  const rows = html.match(rowPattern) || [];

  rows.forEach((row, index) => {
    // Skip header row
    if (row.includes("thead") || row.includes("Title")) return;

    // Extract fields from cells
    const titleMatch = row.match(/<td[^>]*>(.*?)<\/td>/);
    const dueDateMatch = row.match(
      /Due Date[:\s]*([^<]*)|<td[^>]*>\s*(\d+\/\d+\/\d+)/i
    );
    const renewalsMatch = row.match(
      /Renewals[:\s]*(\d+)|<td[^>]*>\s*(\d+)\s*<\/td>/i
    );

    if (titleMatch) {
      const title = titleMatch[1]
        .replace(/<[^>]*>/g, "")
        .trim();
      const dueDate = dueDateMatch
        ? (dueDateMatch[1] || dueDateMatch[2] || "").trim()
        : "N/A";
      const renewals = renewalsMatch
        ? parseInt(renewalsMatch[1] || renewalsMatch[2] || "0")
        : 0;

      if (title) {
        books.push({
          id: `book-${index}`,
          title,
          author: "",
          dueDate,
          renewalsRemaining: renewals,
          barcode: "",
        });
      }
    }
  });

  console.log(`Parsed ${books.length} checked-out books`);
  return books;
}

export { fetchCheckedOutBooks };
