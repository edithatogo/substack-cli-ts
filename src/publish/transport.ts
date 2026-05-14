export type TransportPreference = "browser" | "api" | "auto";

export interface TransportResolution {
  requested: TransportPreference;
  selected: "browser" | "api";
  fallbackReason?: string | undefined;
}

export function resolveTransport(preference: TransportPreference): TransportResolution {
  if (preference === "api") {
    return {
      requested: preference,
      selected: "api",
    };
  }

  if (preference === "auto") {
    return {
      requested: preference,
      selected: "browser",
      fallbackReason:
        "Auto-transport preferred browser as the default. Use --transport api to switch to API transport (requires authenticated session).",
    };
  }

  return {
    requested: preference,
    selected: "browser",
  };
}
