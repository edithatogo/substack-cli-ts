export function redact(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  if (value.length <= 8) {
    return "********";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function redactUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname
      .split("/")
      .map((part) => redactUuidLike(part) ?? part)
      .join("/")}`;
  } catch {
    return redact(value);
  }
}

function redactUuidLike(value: string): string | null {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return null;
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
