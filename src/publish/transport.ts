export type TransportPreference = "browser" | "api" | "auto";

export interface TransportResolution {
  requested: TransportPreference;
  selected: "browser";
  fallbackReason?: string | undefined;
}

export function resolveTransport(
  preference: TransportPreference,
): TransportResolution {
  if (preference === "api") {
    throw new Error(
      "API transport is not enabled for live draft, publish, or schedule operations yet. Use `api draft create` for planning or `--transport browser` to run the current workflow.",
    );
  }

  return {
    requested: preference,
    selected: "browser",
    fallbackReason:
      preference === "auto"
        ? "API transport is unavailable, so the browser workflow was selected."
        : undefined,
  };
}
