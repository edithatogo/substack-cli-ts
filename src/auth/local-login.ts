import { mkdir } from "node:fs/promises";
import { getChromePath } from "chrome-launcher";
import { chromium, type Locator, type Page } from "playwright-core";
import { localBrowserProfileDir } from "../config/paths.js";

export interface LocalLoginOptions {
  publicationUrl: string;
  credentials?: { email: string; password: string } | undefined;
  waitSeconds: number;
  pauseBeforePassword?: boolean | undefined;
}

export interface LocalLoginResult {
  status: "local-session-started";
  publicationUrl: string;
  profileDir: string;
  finalUrl: string;
  signInStillVisible: boolean;
  autoLogin: null | {
    emailInserted: boolean;
    passwordInserted: boolean;
    submitted: boolean;
    pausedBeforePassword?: boolean | undefined;
    note?: string | undefined;
  };
}

export async function runLocalLogin(
  options: LocalLoginOptions,
): Promise<LocalLoginResult> {
  await mkdir(localBrowserProfileDir(), { recursive: true });

  const context = await chromium.launchPersistentContext(
    localBrowserProfileDir(),
    {
      executablePath: getChromePath(),
      headless: false,
      args: ["--no-first-run", "--no-default-browser-check"],
    },
  );

  try {
    const page = await context.newPage();
    await page.goto(options.publicationUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    const autoLogin = options.credentials
      ? await attemptPasswordLogin(page, options.credentials, {
          pauseBeforePassword: options.pauseBeforePassword ?? false,
        })
      : null;

    if (options.waitSeconds > 0) {
      await page.waitForTimeout(options.waitSeconds * 1000);
    }

    return {
      status: "local-session-started",
      publicationUrl: options.publicationUrl,
      profileDir: localBrowserProfileDir(),
      finalUrl: page.url(),
      signInStillVisible: await isSignInVisible(page),
      autoLogin,
    };
  } finally {
    await context.close();
  }
}

async function attemptPasswordLogin(
  page: Page,
  credentials: { email: string; password: string },
  options: { pauseBeforePassword: boolean },
): Promise<NonNullable<LocalLoginResult["autoLogin"]>> {
  await clickFirst(
    page,
    [
      page.getByRole("button", { name: /sign in/i }),
      page.getByRole("link", { name: /sign in/i }),
      page.locator("text=/sign in/i"),
    ],
    10000,
  );

  await choosePasswordLogin(page);

  const email = await firstVisible(
    page,
    [
      page.locator("input[type='email']"),
      page.locator("input[name='email']"),
      page.locator("input[autocomplete='email']"),
      page.locator("input").filter({ hasText: /@/i }),
    ],
    15000,
  );

  if (!email) {
    return {
      emailInserted: false,
      passwordInserted: false,
      submitted: false,
      note: "No email field was found. Complete login manually in the opened browser.",
    };
  }

  await email.fill(credentials.email);
  await choosePasswordLogin(page);

  let password = await firstVisible(
    page,
    [
      page.locator("input[type='password']"),
      page.locator("input[name='password']"),
      page.locator("input[autocomplete='current-password']"),
    ],
    5000,
  );

  if (!password) {
    await clickFirst(
      page,
      [
        page.getByRole("button", { name: /continue|next|sign in|log in/i }),
        page.locator("button[type='submit']"),
      ],
      10000,
    );
    await choosePasswordLogin(page);
    password = await firstVisible(
      page,
      [
        page.locator("input[type='password']"),
        page.locator("input[name='password']"),
        page.locator("input[autocomplete='current-password']"),
      ],
      15000,
    );
  }

  if (!password) {
    return {
      emailInserted: true,
      passwordInserted: false,
      submitted: false,
      note: "Email was submitted, but no password field appeared. Complete magic-link or verification login manually.",
    };
  }

  if (options.pauseBeforePassword) {
    await password.click();
    return {
      emailInserted: true,
      passwordInserted: false,
      submitted: false,
      pausedBeforePassword: true,
      note: "Paused before password entry. Type the password manually in the visible browser.",
    };
  }

  await password.fill(credentials.password);
  await clickFirst(
    page,
    [
      page.getByRole("button", { name: /sign in|log in|continue|submit/i }),
      page.locator("button[type='submit']"),
    ],
    10000,
  );
  await Promise.race([
    page
      .waitForLoadState("domcontentloaded", { timeout: 15000 })
      .catch(() => undefined),
    page.waitForTimeout(5000),
  ]);

  return {
    emailInserted: true,
    passwordInserted: true,
    submitted: true,
  };
}

async function choosePasswordLogin(page: Page): Promise<boolean> {
  return clickFirst(
    page,
    [
      page.getByRole("button", { name: /password/i }),
      page.getByRole("link", { name: /password/i }),
      page.getByText(/use .*password/i),
      page.getByText(/sign in .*password/i),
      page.getByText(/log in .*password/i),
      page.getByText(/enter .*password/i),
    ],
    15000,
  );
}

async function firstVisible(
  page: Page,
  locators: Locator[],
  timeout: number,
): Promise<Locator | null> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    for (const locator of locators) {
      const first = locator.first();

      try {
        if (await first.isVisible({ timeout: 500 })) {
          return first;
        }
      } catch {
        // Keep trying other candidate locators until the deadline.
      }
    }

    await page.waitForTimeout(250);
  }

  return null;
}

async function clickFirst(
  page: Page,
  locators: Locator[],
  timeout: number,
): Promise<boolean> {
  const target = await firstVisible(page, locators, timeout);

  if (!target) {
    return false;
  }

  await target.click();
  return true;
}

async function isSignInVisible(page: Page): Promise<boolean> {
  try {
    return (
      (await page
        .getByRole("button", { name: /sign in/i })
        .first()
        .isVisible({ timeout: 1000 })) ||
      (await page
        .getByRole("link", { name: /sign in/i })
        .first()
        .isVisible({ timeout: 1000 }))
    );
  } catch {
    return false;
  }
}
