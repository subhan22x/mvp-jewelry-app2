/** Validate named time zones with the same Intl runtime used to render emails. */
export function isValidTimeZone(value: string): boolean {
  if (value !== "UTC" && !/^[A-Za-z_]+\/[A-Za-z0-9_+\-/]+$/.test(value)) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }); return true; }
  catch { return false; }
}
