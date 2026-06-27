'use server';

import type { Browser } from "playwright";

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

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    console.log("Launching Chromium browser with cloakbrowser (stealth mode)...");
    // Dynamically import cloakbrowser to avoid bundling server-only dependencies
    let cloakbrowserModule: any;
    try {
      cloakbrowserModule = await import("cloakbrowser");
      console.log("Cloakbrowser imported successfully, launch function:", typeof cloakbrowserModule.launch);
    } catch (e) {
      // Fallback to regular playwright if cloakbrowser fails
      console.log("Cloakbrowser import failed:", e instanceof Error ? e.message : String(e));
      console.log("Falling back to playwright");
      const { chromium } = await import("playwright");
      browser = await chromium.launch({
        headless: true,
        args: ["--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
      });
      console.log("Browser launched successfully (playwright fallback)");
      return browser!;
    }

    // cloakbrowser exports a launch function directly
    browser = await cloakbrowserModule.launch({
      headless: true,
      args: ["--disable-dev-shm-usage"],
    });
    console.log("Browser launched successfully with cloakbrowser");
  }
  return browser!;
}

async function fetchCheckedOutBooks(
  username: string,
  password: string
): Promise<CheckedOutBook[]> {
  const browserInstance = await getBrowser() as any;

  // Create a new page for this request
  const page = await browserInstance.newPage({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  try {
    // Navigate to login page
    console.log("Navigating to library login...");
    await page.goto(LOGIN_URL, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Fill in credentials
    console.log("Entering credentials...");
    const usernameField = await page.$(
      'input[name*="username"], input[name*="user"], input[type="text"]'
    );
    const passwordField = await page.$('input[name*="password"], input[type="password"]');

    if (!usernameField || !passwordField) {
      throw new Error("Could not find username or password fields on login page");
    }

    await usernameField.fill(username);
    await passwordField.fill(password);

    // Submit login
    console.log("Submitting login...");
    const submitButton = await page.$(
      'button[type="submit"], input[type="submit"]'
    );
    if (submitButton) {
      await submitButton.click();
    } else {
      await page.keyboard.press("Enter");
    }

    // Wait for navigation to complete
    console.log("Waiting for login to complete...");
    try {
      await page.waitForNavigation({
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
    } catch {
      // Navigation might not trigger in all cases, that's ok
    }

    // Give it a moment to load
    await page.waitForTimeout(2000);

    // Navigate to checkouts page
    console.log("Navigating to checkouts page...");
    await page.goto(CHECKOUT_PAGE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Extract books from page
    const html = await page.content();

    // Save HTML for debugging
    const fs = await import("fs/promises");
    try {
      await fs.writeFile("/tmp/library-checkout.html", html);
      console.log("HTML saved to /tmp/library-checkout.html for inspection");
    } catch (e) {
      console.log("Could not save HTML file");
    }

    const books = parseCheckoutPage(html);

    console.log(`Successfully fetched ${books.length} checked-out books`);
    return books;
  } catch (error) {
    console.error("Error during checkout fetch:", error);
    throw error;
  } finally {
    await page.close();
  }
}

function parseCheckoutPage(html: string): CheckedOutBook[] {
  const books: CheckedOutBook[] = [];

  // Debug: log a snippet of the HTML to understand structure
  const snippet = html.substring(0, 5000);
  console.log("HTML snippet (first 5000 chars):", snippet.substring(0, 2000));

  // Look for various table patterns
  // Try to find rows with book data
  const rowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/g;
  const rows = html.match(rowPattern) || [];

  console.log(`Found ${rows.length} table rows`);

  if (rows.length === 0) {
    console.log("No table rows found, trying alternative patterns...");
    // Try to find any divs or containers that might contain book info
    const titlePattern = /title[^<]*(?:checked out|due)/gi;
    if (html.match(titlePattern)) {
      console.log("Found potential book entries with regex");
    }
  }

  rows.forEach((row, index) => {
    // Skip header rows
    if (
      row.includes("thead") ||
      row.includes("thead") ||
      row.toLowerCase().includes("title") ||
      row.toLowerCase().includes("due date")
    )
      return;

    // Extract all cells
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];

    if (cells.length < 1) return;

    // Extract text from first cell (title)
    const titleHtml = cells[0];
    if (!titleHtml) return;

    const titleText = titleHtml
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .trim();

    if (titleText && titleText.length > 2) {
      // Look for due date and renewal count in remaining cells
      let dueDate = "N/A";
      let renewals = 0;

      for (let i = 1; i < cells.length; i++) {
        const cellText = cells[i]
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .trim();

        // Check if looks like a date (MM/DD/YYYY or similar)
        if (/\d+\/\d+\/\d+/.test(cellText)) {
          dueDate = cellText.match(/\d+\/\d+\/\d+/)?.[0] || cellText;
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

      console.log(`Parsed book: ${titleText} | Due: ${dueDate} | Renewals: ${renewals}`);
    }
  });

  console.log(`Total books parsed: ${books.length}`);
  return books;
}

export { fetchCheckedOutBooks };
