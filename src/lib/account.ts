export const DEMO_ACCOUNT_ID = "demo-account";
export const DEMO_ACCOUNT_SLUG = "demo";
export const DEMO_USER_ID = "demo";

export function getDefaultAccountId() {
  return process.env.DEFAULT_ACCOUNT_ID?.trim() || DEMO_ACCOUNT_ID;
}

export function getDefaultUserId() {
  return process.env.DEFAULT_USER_ID?.trim() || DEMO_USER_ID;
}
