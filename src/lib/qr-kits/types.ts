export const QR_KIT_STATUSES = ["available", "assigned", "suspended", "lost", "retired"] as const;
export type QrKitStatus = (typeof QR_KIT_STATUSES)[number];

export const QR_KIT_EVENT_TYPES = [
  "created",
  "assigned",
  "deployed",
  "suspended",
  "reactivated",
  "marked_lost",
  "retired",
  "reset"
] as const;
export type QrKitEventType = (typeof QR_KIT_EVENT_TYPES)[number];

export class QrKitAttributionError extends Error {
  constructor(
    message: string,
    public readonly status: 403 | 404 | 410
  ) {
    super(message);
  }
}
