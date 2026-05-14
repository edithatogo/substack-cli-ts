import type { ProseMirrorNode } from "../types.js";

export interface MinimalPage {
  evaluate<R = unknown, Arg = unknown>(
    pageFunctionOrExpression: string | ((arg: Arg) => R | Promise<R>),
    arg?: Arg,
  ): Promise<R>;
}

export interface InsertResult {
  ok: boolean;
  target: string | null;
  reason?: string | undefined;
}

export async function insertTextIntoActiveElement(
  page: MinimalPage,
  text: string,
): Promise<InsertResult> {
  return page.evaluate((value) => {
    const active = document.activeElement;
    const target = getEditableTarget(active);

    if (!target) {
      return { ok: false, target: null, reason: "no editable active element" };
    }

    target.focus();
    selectExistingContent(target);
    insertText(value);
    dispatchInput(target);

    return { ok: true, target: describeElement(target) };
  }, text);
}

export async function pasteHtmlIntoEditor(
  page: MinimalPage,
  payload: { html: string; markdown: string; document: ProseMirrorNode },
): Promise<InsertResult> {
  return page.evaluate(({ html, markdown, document }) => {
    const target = findMainEditor();

    if (!target) {
      return {
        ok: false,
        target: null,
        reason: "editor contenteditable not found",
      };
    }

    target.focus();

    const clipboard = tryCreateClipboardData(html, markdown);
    if (clipboard) {
      const event = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: clipboard,
      });
      target.dispatchEvent(event);
    }

    const inserted = insertHtml(html);
    target.setAttribute("data-substack-cli-last-payload", JSON.stringify(document));
    dispatchInput(target);

    return inserted
      ? { ok: true, target: describeElement(target) }
      : {
          ok: false,
          target: describeElement(target),
          reason: "browser refused html insertion",
        };
  }, payload);
}

export async function getEditorText(page: MinimalPage): Promise<string> {
  return page.evaluate(() => {
    const target = findMainEditor();
    return target?.textContent.trim() ?? "";
  });
}

function getEditableTarget(active: Element | null): HTMLElement | null {
  if (!active) {
    return null;
  }

  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    (active instanceof HTMLElement && active.isContentEditable)
  ) {
    return active;
  }

  return active.closest('[contenteditable="true"]');
}

function findMainEditor(): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>('[contenteditable="true"]'),
  ).filter((element) => isVisible(element));

  if (candidates.length === 0) {
    return null;
  }

  return (
    candidates
      .map((element) => ({
        element,
        score: element.textContent.length + element.getBoundingClientRect().height,
      }))
      .sort((a, b) => b.score - a.score)[0]?.element ?? null
  );
}

function selectExistingContent(target: HTMLElement): void {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    target.select();
    return;
  }

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(target);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function insertText(text: string): boolean {
  return document.execCommand("insertText", false, text);
}

function insertHtml(html: string): boolean {
  return document.execCommand("insertHTML", false, html);
}

function tryCreateClipboardData(html: string, markdown: string): DataTransfer | null {
  try {
    const data = new DataTransfer();
    data.setData("text/html", html);
    data.setData("text/plain", markdown);
    return data;
  } catch {
    return null;
  }
}

function dispatchInput(target: HTMLElement): void {
  target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste" }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
}

function describeElement(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const role = element.getAttribute("role");
  const rolePart = role ? `[role="${role}"]` : "";
  return `${tag}${id}${rolePart}`;
}

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return (
    style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0
  );
}
