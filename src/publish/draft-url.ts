export function resolveDraftEditorUrl(draftUrl: string, draftId: string | undefined): string {
  if (!draftId || !draftUrl) return draftUrl || "";

  try {
    const url = new URL(draftUrl);
    const path = url.pathname.replace(/\/+$/, "");
    if (path.endsWith(`/${draftId}`) || /\/\d+$/.test(path)) return draftUrl;

    url.pathname = `${path}/${draftId}`;
    return url.toString();
  } catch {
    const base = draftUrl.replace(/\/+$/, "");
    if (base.endsWith(`/${draftId}`) || /\/\d+$/.test(base)) return draftUrl;
    return `${base}/${draftId}`;
  }
}
