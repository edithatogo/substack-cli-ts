import { createLocalBrowserSession } from "./local-browser.js";

export interface PageDiagnostics {
  url: string;
  title: string;
  links: Array<{ text: string; href: string | null }>;
  buttons: string[];
  inputs: Array<{
    type: string | null;
    name: string | null;
    placeholder: string | null;
    valuePresent: boolean;
  }>;
  editableCount: number;
  textSample: string;
}

export async function captureLocalDiagnostics(
  url: string,
): Promise<PageDiagnostics> {
  const browser = await createLocalBrowserSession();

  try {
    const page = browser.page;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);

    return await page.evaluate(() => {
      const clean = (value: string | null | undefined) =>
        (value ?? "").replace(/\s+/g, " ").trim();

      return {
        url: location.href,
        title: document.title,
        links: Array.from(document.querySelectorAll<HTMLAnchorElement>("a"))
          .map((link) => ({
            text: clean(link.textContent),
            href: link.getAttribute("href"),
          }))
          .filter((link) => link.text || link.href)
          .slice(0, 80),
        buttons: Array.from(
          document.querySelectorAll<HTMLButtonElement>("button"),
        )
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
        editableCount: document.querySelectorAll("[contenteditable='true']")
          .length,
        textSample: clean(document.body.textContent).slice(0, 2000),
      };
    });
  } finally {
    await browser.close();
  }
}

export interface PublishScreenDiagnostics {
  url: string;
  buttons: Array<{ text: string; visible: boolean; role: string | null }>;
  headings: string[];
  forms: Array<{
    action: string | null;
    fields: Array<{ name: string | null; type: string | null; placeholder: string | null }>;
  }>;
  confirmationElements: Array<{ text: string; tag: string }>;
  dialogs: Array<{ text: string; role: string | null }>;
  textSample: string;
}

export async function capturePublishScreenDiagnostics(
  url: string,
): Promise<PublishScreenDiagnostics> {
  const browser = await createLocalBrowserSession();

  try {
    const page = browser.page;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);

    return await page.evaluate(() => {
      const clean = (value: string | null | undefined) =>
        (value ?? "").replace(/\s+/g, " ").trim();

      const allButtons = Array.from(document.querySelectorAll("button, [role='button'], a[class*='btn'], a[class*='button']"));

      return {
        url: location.href,
        buttons: allButtons.map((btn) => ({
          text: clean(btn.textContent),
          visible: btn.checkVisibility(),
          role: btn.getAttribute("role"),
        })).filter((b) => b.text),
        headings: Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']"))
          .map((h) => clean(h.textContent))
          .filter(Boolean),
        forms: Array.from(document.querySelectorAll("form")).map((form) => ({
          action: form.getAttribute("action"),
          fields: Array.from(form.querySelectorAll("input, select, textarea")).map((f) => ({
            name: f.getAttribute("name"),
            type: f.getAttribute("type") ?? f.tagName.toLowerCase(),
            placeholder: f.getAttribute("placeholder"),
          })),
        })),
        confirmationElements: Array.from(document.querySelectorAll("[class*='confirm'], [class*='publish'], [class*='review'], [class*='dialog'], [role='dialog']"))
          .map((el) => ({
            text: clean(el.textContent),
            tag: el.tagName.toLowerCase(),
          }))
          .filter((e) => e.text),
        dialogs: Array.from(document.querySelectorAll("[role='dialog'], [role='alertdialog'], [class*='modal'], [class*='overlay']"))
          .map((el) => ({
            text: clean(el.textContent),
            role: el.getAttribute("role"),
          }))
          .filter((d) => d.text),
        textSample: clean(document.body.textContent).slice(0, 3000),
      };
    });
  } finally {
    await browser.close();
  }
}

export interface ReviewOverlayDiagnostics {
  url: string;
  buttons: Array<{ text: string; visible: boolean; selector: string; tag: string }>;
  headings: string[];
  dialogs: Array<{ text: string; role: string | null; visible: boolean }>;
  links: Array<{ text: string; href: string | null }>;
  confirmationElements: Array<{ text: string; tag: string; visible: boolean }>;
  forms: Array<{ action: string | null; fields: string[] }>;
  textSample: string;
}

export async function captureReviewOverlayDiagnostics(
  url: string,
  clickContinue: boolean,
): Promise<ReviewOverlayDiagnostics> {
  const browser = await createLocalBrowserSession();

  try {
    const page = browser.page;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    if (clickContinue) {
      await page.waitForTimeout(3000);

      await page.evaluate(() => {
        const buttons = document.querySelectorAll<HTMLElement>("button, [role='button'], a[class*='btn'], a[class*='button']");
        for (const btn of buttons) {
          const text = (btn.textContent ?? "").replace(/\s+/g, " ").trim();
          if (/continue/i.test(text)) {
            btn.click();
            return;
          }
        }
      });

      await page.waitForTimeout(3000);
    } else {
      await page.waitForTimeout(5000);
    }

    return await page.evaluate(() => {
      const clean = (value: string | null | undefined) =>
        (value ?? "").replace(/\s+/g, " ").trim();

      const buildSelector = (el: Element): string => {
        const tag = el.tagName.toLowerCase();
        if (el.id) return `${tag}#${el.id}`;
        const classes = Array.from(el.classList).filter((c) => !c.startsWith("_")).join(".");
        const attrs: string[] = [];
        const candidates = ["data-testid", "data-test", "data-qa", "name", "type", "aria-label", "role"];
        for (const attr of candidates) {
          const val = el.getAttribute(attr);
          if (val) {
            attrs.push(`[${attr}='${val.replace(/'/g, "\\'")}']`);
            break;
          }
        }
        if (classes) return `${tag}.${classes}${attrs.join("")}`;
        if (attrs.length) return `${tag}${attrs.join("")}`;
        return tag;
      };

      const allButtons = Array.from(document.querySelectorAll("button, [role='button'], a[class*='btn'], a[class*='button']"));

      return {
        url: location.href,
        buttons: allButtons
          .map((btn) => ({
            text: clean(btn.textContent),
            visible: btn.checkVisibility(),
            selector: buildSelector(btn),
            tag: btn.tagName.toLowerCase(),
          }))
          .filter((b) => b.text),
        headings: Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']"))
          .map((h) => clean(h.textContent))
          .filter(Boolean),
        dialogs: Array.from(document.querySelectorAll("[role='dialog'], [role='alertdialog'], [class*='modal'], [class*='overlay']"))
          .map((el) => ({
            text: clean(el.textContent),
            role: el.getAttribute("role"),
            visible: el.checkVisibility(),
          }))
          .filter((d) => d.text),
        links: Array.from(document.querySelectorAll<HTMLAnchorElement>("a"))
          .map((link) => ({
            text: clean(link.textContent),
            href: link.getAttribute("href"),
          }))
          .filter((link) => link.text || link.href)
          .slice(0, 80),
        confirmationElements: Array.from(document.querySelectorAll("[class*='confirm'], [class*='publish'], [class*='review'], [class*='dialog'], [role='dialog']"))
          .map((el) => ({
            text: clean(el.textContent),
            tag: el.tagName.toLowerCase(),
            visible: el.checkVisibility(),
          }))
          .filter((e) => e.text),
        forms: Array.from(document.querySelectorAll("form")).map((form) => ({
          action: form.getAttribute("action"),
          fields: Array.from(form.querySelectorAll("input, select, textarea"))
            .map((f) => f.getAttribute("name") ?? f.getAttribute("type") ?? f.tagName.toLowerCase())
            .filter(Boolean) as string[],
        })),
        textSample: clean(document.body.textContent).slice(0, 3000),
      };
    });
  } finally {
    await browser.close();
  }
}

export interface ScheduleScreenDiagnostics {
  url: string;
  dateInputs: Array<{
    type: string | null;
    placeholder: string | null;
    name: string | null;
    value: string | null;
  }>;
  timeInputs: Array<{
    type: string | null;
    placeholder: string | null;
    name: string | null;
    value: string | null;
  }>;
  selectors: Array<{
    options: string[];
    currentValue: string | null;
    name: string | null;
  }>;
  buttons: Array<{ text: string; visible: boolean }>;
  timezoneElements: Array<{ text: string; tag: string }>;
  errorElements: Array<{ text: string; role: string | null }>;
  labels: Array<{ for: string | null; text: string }>;
  textSample: string;
}

export async function captureScheduleScreenDiagnostics(
  url: string,
): Promise<ScheduleScreenDiagnostics> {
  const browser = await createLocalBrowserSession();

  try {
    const page = browser.page;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);

    return await page.evaluate(() => {
      const clean = (value: string | null | undefined) =>
        (value ?? "").replace(/\s+/g, " ").trim();

      return {
        url: location.href,
        dateInputs: Array.from(document.querySelectorAll("input[type='date'], input[type='datetime-local'], input[placeholder*='date' i], input[aria-label*='date' i]"))
          .map((el) => ({
            type: el.getAttribute("type"),
            placeholder: el.getAttribute("placeholder"),
            name: el.getAttribute("name"),
            value: (el as HTMLInputElement).value ?? null,
          })),
        timeInputs: Array.from(document.querySelectorAll("input[type='time'], input[placeholder*='time' i], input[aria-label*='time' i]"))
          .map((el) => ({
            type: el.getAttribute("type"),
            placeholder: el.getAttribute("placeholder"),
            name: el.getAttribute("name"),
            value: (el as HTMLInputElement).value ?? null,
          })),
        selectors: Array.from(document.querySelectorAll("select, [role='listbox'], [role='combobox']"))
          .map((sel) => ({
            options: Array.from(sel.querySelectorAll("option, [role='option']")).map((o) => clean(o.textContent)).filter(Boolean),
            currentValue: sel.getAttribute("value") ?? (sel as HTMLSelectElement).value ?? null,
            name: sel.getAttribute("name"),
          })),
        buttons: Array.from(document.querySelectorAll("button, [role='button']"))
          .map((btn) => ({
            text: clean(btn.textContent),
            visible: btn.checkVisibility(),
          }))
          .filter((b) => b.text),
        timezoneElements: Array.from(document.querySelectorAll("[class*='timezone' i], [class*='time-zone' i], [data-timezone], [aria-label*='timezone' i]"))
          .map((el) => ({
            text: clean(el.textContent),
            tag: el.tagName.toLowerCase(),
          })),
        errorElements: Array.from(document.querySelectorAll("[class*='error' i], [class*='alert' i], [role='alert'], [aria-live='assertive']"))
          .map((el) => ({
            text: clean(el.textContent),
            role: el.getAttribute("role"),
          }))
          .filter((e) => e.text),
        labels: Array.from(document.querySelectorAll("label"))
          .map((label) => ({
            for: label.getAttribute("for"),
            text: clean(label.textContent),
          }))
          .filter((l) => l.text),
        textSample: clean(document.body.textContent).slice(0, 3000),
      };
    });
  } finally {
    await browser.close();
  }
}
