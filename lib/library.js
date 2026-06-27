import { launch } from 'cloakbrowser';

const LIBRARY_BASE_URL = "https://catalog.chappaqualibrary.org";
const LOGIN_URL = `${LIBRARY_BASE_URL}/MyAccount/Login`;
const CHECKOUT_PAGE_URL = `${LIBRARY_BASE_URL}/MyAccount/CheckedOut?source=all`;

let browser = null;

async function getBrowser() {
  if (!browser) {
    console.log("Launching cloakbrowser...");
    browser = await launch({ headless: true });
    console.log("✅ Cloakbrowser launched");
  }
  return browser;
}

export async function fetchCheckedOutBooks(username, password) {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  });

  try {
    console.log("Navigating to library login...");
    await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

    console.log("Filling credentials...");
    await page.fill('input#username', username);
    await page.fill('input#password', password);
    console.log("Credentials entered");

    console.log("Submitting login...");
    await page.click('input#loginFormSubmit');

    console.log("Waiting for page load after login...");
    try {
      // Wait for page to change from login page
      await page.waitForURL(url => !url.includes('/MyAccount/Login'), { timeout: 30000 });
      console.log("✓ Successfully logged in");
    } catch {
      console.log("⚠ Navigation check timed out, continuing anyway");
    }

    await page.waitForTimeout(3000);

    console.log("Navigating to checkouts page...");
    await page.goto(CHECKOUT_PAGE_URL, { waitUntil: "networkidle", timeout: 30000 });

    // Wait for table to load - look for either table or the "no items" message
    try {
      await page.waitForSelector('table.result-list-table, table.tablesorter, .no-results-message, .emptyListMessage', { timeout: 10000 });
      console.log("✓ Content loaded");
    } catch {
      console.log("⚠ Content load timeout, checking anyway");
    }

    await page.waitForTimeout(2000);

    const html = await page.content();

    // Save for debugging
    const fs = await import("fs/promises");
    await fs.writeFile("/tmp/library-checkout.html", html).catch(() => {});

    const books = parseCheckoutPage(html);
    console.log(`✅ Retrieved ${books.length} books`);
    return books;
  } finally {
    await page.close();
  }
}

function parseCheckoutPage(html) {
  const books = [];
  const rowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/g;
  const rows = html.match(rowPattern) || [];

  console.log(`Found ${rows.length} table rows`);

  rows.forEach((row, index) => {
    if (row.includes("thead") || row.toLowerCase().includes("title") || row.toLowerCase().includes("due date")) {
      return;
    }

    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
    if (cells.length < 1) return;

    const titleHtml = cells[0];
    if (!titleHtml) return;

    const titleText = titleHtml
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .trim();

    if (titleText && titleText.length > 2) {
      let dueDate = "N/A";
      let renewals = 0;

      for (let i = 1; i < cells.length; i++) {
        const cellText = cells[i]
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .trim();

        if (/\d+\/\d+\/\d+/.test(cellText)) {
          dueDate = cellText.match(/\d+\/\d+\/\d+/)?.[0] || cellText;
        } else if (/^\d+$/.test(cellText)) {
          renewals = parseInt(cellText);
        }
      }

      books.push({
        id: `book-${index}`,
        title: titleText,
        dueDate,
        renewalsRemaining: renewals,
      });
    }
  });

  return books;
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
