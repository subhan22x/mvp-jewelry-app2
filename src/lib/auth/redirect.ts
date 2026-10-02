export function safeInternalPath(value: string | null | undefined, fallback = "/owner") {
  // Browsers normalize backslashes and strip control characters when resolving URLs.
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return fallback;
  }
  return value;
}
