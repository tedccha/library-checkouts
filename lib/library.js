import { launch } from 'cloakbrowser';

const LIBRARY_BASE_URL = "https://catalog.chappaqualibrary.org";
const LOGIN_URL = `${LIBRARY_BASE_URL}/MyAccount/Login`;
const CHECKOUT_PAGE_URL = `${LIBRARY_BASE_URL}/MyAccount/CheckedOut?source=all`;
const HOLDS_PAGE_URL = `${LIBRARY_BASE_URL}/MyAccount/Holds?source=all`;

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
  let browserInstance;
  let page;

  try {
    browserInstance = await getBrowser();
    page = await browserInstance.newPage({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    });
  } catch (error) {
    console.log("🔄 Browser closed, relaunching...");
    browser = null;
    browserInstance = await getBrowser();
    page = await browserInstance.newPage({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    });
  }

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
    await page.goto(CHECKOUT_PAGE_URL, { waitUntil: "load", timeout: 30000 });

    // Wait longer for JavaScript to render books
    console.log("Waiting for books to load via JavaScript...");
    await page.waitForTimeout(5000);

    // Try to wait for table content
    try {
      await page.waitForFunction(
        () => document.querySelectorAll('table tr').length > 1,
        { timeout: 10000 }
      );
      console.log("✓ Table found");
    } catch {
      console.log("⚠ Table not found, may be loading");
    }

    await page.waitForTimeout(3000);
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

  // Look for div.result elements which contain books
  const divPattern = /<div[^>]*id="recordils_[^"]*"[^>]*class="result[^"]*"[\s\S]*?(?=<div id="recordils_|$)/g;
  const divMatches = html.match(divPattern) || [];

  console.log(`Found ${divMatches.length} result divs`);

  divMatches.forEach((div, index) => {
    // Extract title from <a class="result-title">
    let title = "";
    const titleMatch = div.match(/<a[^>]*class="result-title[^"]*"[^>]*>([^<]+)<\/a>/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    if (title && title.length > 0) {
      // Extract author
      let author = "Unknown";
      const authorMatch = div.match(/Author<\/div>\s*<div[^>]*>(?:<a[^>]*>)?([^<]+)(?:<\/a>)?/);
      if (authorMatch) {
        author = authorMatch[1].trim();
      }

      // Extract due date - look for date like "Jun 29, 2026"
      let dueDate = "N/A";
      const dateMatch = div.match(/Due<\/div>\s*<div[^>]*>([^&\n<]+)/);
      if (dateMatch) {
        dueDate = dateMatch[1].trim().replace(/\s*\(.*\)/, ""); // Remove "(Due in X days)"
      }

      // Extract renewals remaining
      let renewalsRemaining = 0;
      const renewalsMatch = div.match(/Renewals Remaining<\/div>\s*<div[^>]*>(\d+)<\/div>/);
      if (renewalsMatch) {
        renewalsRemaining = parseInt(renewalsMatch[1]);
      }

      books.push({
        id: `book-${index}`,
        title,
        author,
        dueDate,
        renewalsRemaining,
      });

      console.log(`✓ Parsed: ${title} by ${author} (Due: ${dueDate}, Renewals: ${renewalsRemaining})`);
    }
  });

  return books;
}

export async function fetchHolds(username, password) {
  let browserInstance;
  let page;

  try {
    browserInstance = await getBrowser();
    page = await browserInstance.newPage({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    });
  } catch (error) {
    console.log("🔄 Browser closed, relaunching...");
    browser = null;
    browserInstance = await getBrowser();
    page = await browserInstance.newPage({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    });
  }

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
      await page.waitForURL(url => !url.includes('/MyAccount/Login'), { timeout: 30000 });
      console.log("✓ Successfully logged in");
    } catch {
      console.log("⚠ Navigation check timed out, continuing anyway");
    }

    await page.waitForTimeout(3000);

    console.log("Navigating to holds page...");
    await page.goto(HOLDS_PAGE_URL, { waitUntil: "load", timeout: 30000 });

    console.log("Waiting for holds to load via JavaScript...");
    await page.waitForTimeout(5000);

    try {
      await page.waitForFunction(
        () => document.querySelectorAll('table tr').length > 1,
        { timeout: 10000 }
      );
      console.log("✓ Table found");
    } catch {
      console.log("⚠ Table not found, may be loading");
    }

    await page.waitForTimeout(3000);
    const html = await page.content();

    const fs = await import("fs/promises");
    await fs.writeFile("/tmp/library-holds.html", html).catch(() => {});

    const holds = parseHoldsPage(html);
    console.log(`✅ Retrieved ${holds.length} holds`);
    return holds;
  } finally {
    await page.close();
  }
}

function parseHoldsPage(html) {
  const holds = [];

  // Look for holds: <div class="result row ilsHold_...
  const divPattern = /<div[^>]*class="result row ilsHold[^"]*"[\s\S]*?(?=<div class="result row|$)/g;
  const divMatches = html.match(divPattern) || [];

  console.log(`Found ${divMatches.length} hold result divs`);

  divMatches.forEach((div, index) => {
    let title = "";
    const titleMatch = div.match(/<a[^>]*class="result-title[^"]*"[^>]*>([^<]+)<\/a>/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    if (title && title.length > 0) {
      let status = "On Hold";
      let pickupBy = "N/A";

      // Check if available now
      const availMatch = div.match(/Available<\/div>\s*<div[^>]*>([^<]+)</);
      if (availMatch && availMatch[1].trim().toLowerCase() === "now") {
        status = "Ready for Pickup";
      }

      // Extract pickup by date
      const pickupMatch = div.match(/Pickup By<\/div>\s*<div[^>]*><strong>([^<]+)<\/strong>/);
      if (pickupMatch) {
        pickupBy = pickupMatch[1].trim();
      }

      holds.push({
        id: `hold-${index}`,
        title,
        status,
        pickupBy,
      });

      console.log(`✓ Parsed: ${title} (Status: ${status}, Pickup by: ${pickupBy})`);
    }
  });

  return holds;
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
