import { chromium } from "playwright";

const LIBRARY_BASE_URL = "https://catalog.chappaqualibrary.org";
const LOGIN_URL = `${LIBRARY_BASE_URL}/MyAccount/Login`;
const CHECKOUT_PAGE_URL = `${LIBRARY_BASE_URL}/MyAccount/CheckedOut?source=all`;

export interface CheckedOutBook {
  id: string;
  title: string;
  author?: string;
  dueDate: string;
  renewalsRemaining: number;
  barcode?: string;
}

let browser: any = null;

async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
      ],
    });
  }
  return browser;
}

async function fetchCheckedOutBooks(
  username: string,
  password: string
): Promise<CheckedOutBook[]> {
  const browser = await getBrowser();

  // Create context with stealth headers
  const context = await browser.createBrowserContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  // Spoof navigator properties
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => false,
    });
  });

  try {
    // Navigate to login page
    console.log("Navigating to library login...");
    await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Fill in credentials
    console.log("Entering credentials...");
    const usernameField = await page.$('input[name*="username"], input[name*="user"], input[type="text"]');
    const passwordField = await page.$('input[name*="password"], input[type="password"]');

    if (!usernameField || !passwordField) {
      throw new Error("Could not find username or password fields on login page");
    }

    await usernameField.fill(username);
    await passwordField.fill(password);

    // Submit login
    console.log("Submitting login...");
    const submitButton = await page.$('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      await submitButton.click();
    } else {
      await page.keyboard.press("Enter");
    }

    // Wait for navigation to complete
    console.log("Waiting for login to complete...");
    try {
      await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 });
    } catch {
      // Navigation might not trigger in all cases
    }

    // Give it a moment to load
    await page.waitForTimeout(2000);

    // Navigate to checkouts page
    console.log("Navigating to checkouts page...");
    await page.goto(CHECKOUT_PAGE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Extract books from page
    const html = await page.content();
    const books = parseCheckoutPage(html);

    console.log(`Successfully fetched ${books.length} checked-out books`);
    return books;
  } catch (error) {
    console.error("Error fetching checkouts:", error);
    throw error;
  } finally {
    await context.close();
  }
}

function parseCheckoutPage(html: string): CheckedOutBook[] {
  const books: CheckedOutBook[] = [];

  // Look for table rows in the checkout table
  const rowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/g;
  const rows = html.match(rowPattern) || [];

  rows.forEach((row, index) => {
    // Skip header rows
    if (
      row.includes("thead") ||
      row.includes("Title") ||
      row.includes("Due Date")
    )
      return;

    // Extract all cells
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];

    if (cells.length < 2) return;

    // Extract text from first cell (title)
    const titleHtml = cells[0];
    const titleText = titleHtml
      .replace(/<[^>]*>/g, "")
      .trim();

    if (titleText) {
      // Look for due date and renewal count in remaining cells
      let dueDate = "N/A";
      let renewals = 0;

      for (let i = 1; i < cells.length; i++) {
        const cellText = cells[i].replace(/<[^>]*>/g, "").trim();

        // Check if looks like a date (MM/DD/YYYY or similar)
        if (/\d+\/\d+\/\d+/.test(cellText)) {
          dueDate = cellText;
        }
        // Check if looks like a number
        else if (/^\d+$/.test(cellText)) {
          renewals = parseInt(cellText);
        }
      }

      books.push({
        id: `book-${index}`,
        title: titleText,
        author: "",
        dueDate,
        renewalsRemaining: renewals,
        barcode: "",
      });
    }
  });

  return books;
}

export { fetchCheckedOutBooks };
