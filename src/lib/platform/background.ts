import { waitUntil } from "@vercel/functions";

export function scheduleBackgroundTask(task: Promise<unknown>, label: string) {
  const observedTask = task.catch(error => {
    console.error(`[background:${label}] failed:`, error);
  });

  if (process.env.VERCEL) {
    waitUntil(observedTask);
    return;
  }

  void observedTask;
}
