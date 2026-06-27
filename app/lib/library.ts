import axios from "axios";

const LIBRARY_BASE_URL = "https://catalog.chappaqualibrary.org";
const API_ENDPOINT = `${LIBRARY_BASE_URL}/API`;

export interface CheckedOutBook {
  id: string;
  title: string;
  author?: string;
  dueDate: string;
  renewalsRemaining: number;
  barcode?: string;
}

async function loginAndGetCookie(username: string, password: string) {
  try {
    const response = await axios.post(
      `${API_ENDPOINT}/UserAPI?method=login`,
      {
        user_name: username,
        password: password,
      },
      {
        validateStatus: () => true,
      }
    );

    const setCookie = response.headers["set-cookie"];
    if (setCookie && Array.isArray(setCookie)) {
      return setCookie.find((c) => c.includes("PHPSESSID"));
    }
    return null;
  } catch (error) {
    console.error("Login failed:", error);
    return null;
  }
}

async function fetchCheckedOutBooks(
  username: string,
  password: string
): Promise<CheckedOutBook[]> {
  try {
    // Try Aspen API first
    const loginCookie = await loginAndGetCookie(username, password);

    if (!loginCookie) {
      throw new Error("Failed to authenticate");
    }

    const checkoutsResponse = await axios.get(
      `${API_ENDPOINT}/UserAPI?method=getCheckedOutTitles&user_name=${username}`,
      {
        headers: {
          Cookie: loginCookie,
        },
        validateStatus: () => true,
      }
    );

    // Parse API response
    const books = parseAspenResponse(checkoutsResponse.data);
    return books;
  } catch (error) {
    console.error("Failed to fetch checkouts:", error);
    throw error;
  }
}

function parseAspenResponse(data: unknown): CheckedOutBook[] {
  // Placeholder — will adapt based on actual API response format
  if (typeof data !== "object" || !data) return [];

  const result = data as Record<string, unknown>;
  const titles = result.titles as Record<string, unknown>[];

  if (!Array.isArray(titles)) return [];

  return titles.map((title: Record<string, unknown>) => ({
    id: String(title.id || ""),
    title: String(title.title || "Unknown"),
    author: String(title.author || ""),
    dueDate: String(title.dueDate || ""),
    renewalsRemaining: Number(title.renewalsRemaining || 0),
    barcode: String(title.barcode || ""),
  }));
}

export { fetchCheckedOutBooks };
