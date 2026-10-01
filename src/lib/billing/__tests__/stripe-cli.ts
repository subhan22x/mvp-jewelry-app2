import { execFile } from "node:child_process";
import { promisify } from "node:util";
import Stripe from "stripe";
const exec = promisify(execFile);

export async function cli(args: string[]) {
  const env = { ...process.env };
  delete env.STRIPE_API_KEY;
  const result = await exec(process.env.STRIPE_CLI_PATH || "stripe", args, { env, timeout: 30_000, maxBuffer: 2_000_000 });
  return JSON.parse(result.stdout.slice(result.stdout.indexOf("{")));
}

// Use CLI OAuth without extracting or storing an API key. All SDK calls still
// reach Stripe, using the pinned API version and the SDK's real parameter encoding.
export class CliTransport extends Stripe.HttpClient {
  getClientName() { return "StripeSandboxCLI"; }
  async makeRequest(_host: string, _port: string, path: string, method: string, headers: Record<string, string | number | string[]>, data: string) {
    const url = new URL(path, "https://api.stripe.com");
    const args = [method.toLowerCase(), url.pathname, "--confirm", "--stripe-version", "2026-09-30.endive"];
    for (const params of [url.searchParams, new URLSearchParams(data)]) {
      for (const [name, value] of params) args.push("-d", `${name}=${value}`);
    }
    if (headers["Idempotency-Key"]) args.push("--idempotency", String(headers["Idempotency-Key"]));
    const body = await cli(args);
    return {
      getStatusCode: () => body.error ? 400 : 200,
      getHeaders: () => ({}), getRawResponse: () => body,
      toStream: () => { throw new Error("Streaming is not used by billing."); },
      toJSON: async () => body,
    };
  }
}
