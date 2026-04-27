import { createLocalBrowserSession } from "./local-browser.js";

export interface PageDiagnostics {
  url: string;
  title: string;
  links: Array<{ text: string; href: string | null }>;
  buttons: string[];
  inputs: Array<{ type: string | null; name: string | null; placeholder: string | null; valuePresent: boolean }>;
  editableCount: number;
  textSample: string;
}

export async function captureLocalDiagnostics(url: string): Promise<PageDiagnostics> {
  const browser = await createLocalBrowserSession();

  try {
    const page = browser.page;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);

    return await page.evaluate(() => {
      const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();

      return {
        url: location.href,
        title: document.title,
        links: Array.from(document.querySelectorAll<HTMLAnchorElement>("a"))
          .map((link) => ({ text: clean(link.textContent), href: link.getAttribute("href") }))
          .filter((link) => link.text || link.href)
          .slice(0, 80),
        buttons: Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
          .map((button) => clean(button.textContent))
          .filter(Boolean)
          .slice(0, 80),
        inputs: Array.from(document.querySelectorAll<HTMLInputElement>("input"))
          .map((input) => ({
            type: input.getAttribute("type"),
            name: input.getAttribute("name"),
            placeholder: input.getAttribute("placeholder"),
            valuePresent: Boolean(input.value),
          }))
          .slice(0, 40),
        editableCount: document.querySelectorAll("[contenteditable='true']").length,
        textSample: clean(document.body.textContent).slice(0, 2000),
      };
    });
  } finally {
    await browser.close();
  }
}
