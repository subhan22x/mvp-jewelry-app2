export function safeInternalPath(value: string | null | undefined, fallback = "/owner") {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
