export interface SchedulerEnv {
  NOTIFICATION_PROCESS_URL: string;
  NOTIFICATION_PROCESS_ORIGIN: string;
  NOTIFICATION_WORKER_SECRET: string;
}

export const BATCH_LIMIT = 5;
export const REQUEST_TIMEOUT_MS = 180_000;

class SchedulerError extends Error {}
function fail(code: string): never { throw new SchedulerError(code); }

function destination(env: SchedulerEnv) {
  if (!env.NOTIFICATION_WORKER_SECRET?.trim()) fail("scheduler_secret_missing");
  let url: URL;
  let origin: URL;
  try {
    url = new URL(env.NOTIFICATION_PROCESS_URL);
    origin = new URL(env.NOTIFICATION_PROCESS_ORIGIN);
  } catch { return fail("scheduler_url_invalid"); }
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash ||
      url.protocol !== "https:" || url.origin !== origin.origin || url.username || url.password ||
      url.pathname !== "/api/internal/notifications/process" || url.search || url.hash) fail("scheduler_url_invalid");
  return url.href;
}

export async function runNotificationSchedule(env: SchedulerEnv, scheduledTime: number) {
  const started = Date.now();
  let status: number | undefined;
  try {
    const url = destination(env);
    const response = await fetch(url, {
      method: "POST", redirect: "manual",
      headers: { Authorization: `Bearer ${env.NOTIFICATION_WORKER_SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({ limit: BATCH_LIMIT }), signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    status = response.status;
    if (!response.ok) fail(`processor_http_${status}`);
    // Bound parsing so an unexpected destination response cannot exhaust memory.
    const reader = response.body?.getReader();
    if (!reader) fail("processor_response_invalid");
    let text = "";
    let bytes = 0;
    const decoder = new TextDecoder();
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > 4096) fail("processor_response_invalid");
        text += decoder.decode(part.value, { stream: true });
      }
      text += decoder.decode();
    } finally { await reader.cancel(); }
    let result: { configured?: unknown; processed?: unknown } | null;
    try { result = JSON.parse(text); } catch { return fail("processor_response_invalid"); }
    if (result?.configured === false) fail("processor_not_configured");
    if (result?.configured !== true || !Number.isInteger(result.processed) ||
        (result.processed as number) < 0 || (result.processed as number) > BATCH_LIMIT) fail("processor_response_invalid");
    console.log(JSON.stringify({ event: "notification_scheduler", scheduledTime, durationMs: Date.now() - started, status, processed: result.processed }));
  } catch (error) {
    const code = error instanceof SchedulerError ? error.message : "processor_network_or_timeout";
    console.error(JSON.stringify({ event: "notification_scheduler_failed", scheduledTime, durationMs: Date.now() - started, status, code }));
    throw new Error(code);
  }
}

export default {
  async scheduled(controller, env) {
    await runNotificationSchedule(env, controller.scheduledTime);
  }
} satisfies ExportedHandler<SchedulerEnv>;
