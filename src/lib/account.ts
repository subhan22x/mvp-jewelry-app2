export const DEMO_ACCOUNT_ID = "demo-account";
export const DEMO_ACCOUNT_SLUG = "demo";
export const DEMO_USER_ID = "demo";

export function getDefaultAccountId() {
  const configuredAccountId = process.env.DEFAULT_ACCOUNT_ID?.trim();
  if (configuredAccountId) return configuredAccountId;
  if (process.env.NODE_ENV === "production") {
    throw new Error("DEFAULT_ACCOUNT_ID is required for the public design wizard in production.");
  }
  return DEMO_ACCOUNT_ID;
}

export function getDefaultUserId() {
  return process.env.DEFAULT_USER_ID?.trim() || DEMO_USER_ID;
}
