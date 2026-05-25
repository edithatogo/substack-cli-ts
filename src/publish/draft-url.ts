export function resolveDraftEditorUrl(draftUrl: string, draftId: string | undefined): string {
  if (!draftId || !draftUrl) return draftUrl || "";

  try {
    const url = new URL(draftUrl);
    const path = url.pathname.replace(/\/+$/, "");
    if (path.endsWith(`/${draftId}`)) return draftUrl;
    const normalizedPath = path.replace(/\/\d+$/, "");

    url.pathname = `${normalizedPath}/${draftId}`;
    return url.toString();
  } catch {
    const [path = "", ...suffix] = draftUrl.split(/([?#])/);
    const base = path.replace(/\/+$/, "");
    if (base.endsWith(`/${draftId}`)) return draftUrl;
    const normalizedBase = base.replace(/\/\d+$/, "");
    return `${normalizedBase}/${draftId}${suffix.join("")}`;
  }
}
