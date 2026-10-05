// @vitest-environment node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildLogoPendantAttachments } from "../attachments";
import { buildLogoPendantPrompt } from "../prompt";
import { GoogleProvider } from "../../providers/google";
import type { LogoShape } from "../config";

const mocks = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: mocks.generateContent };
  }
}));

describe("logo image attachments in the Google request", () => {
  let directory: string;
  let logoPath: string;
  beforeEach(async () => {
    vi.clearAllMocks();
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "logo-attachment-test-"));
    logoPath = path.join(directory, "logo.png");
    const logo = await sharp({ create: { width: 4, height: 4, channels: 4, background: "red" } }).png().toBuffer();
    await fs.writeFile(logoPath, logo);
    mocks.generateContent.mockResolvedValue({ candidates: [{ content: { parts: [{ inlineData: { data: logo.toString("base64"), mimeType: "image/png" } }] } }] });
  });
  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  it.each<[LogoShape, string | null]>([
    ["custom", null],
    ["circle", "circle_rose_gold.png"],
    ["shield", "shield_yellow_gold.png"],
    ["hexa", "hexagon_rose_gold.png"],
    ["diamond", "diamond_yellow_gold.png"]
  ])("includes the exact image bytes for %s", async (shape, filename) => {
    const attachments = buildLogoPendantAttachments(logoPath, shape);
    const prompt = buildLogoPendantPrompt({ shape, colorCombo: "WHITE" });
    await new GoogleProvider("test-key").generate({ prompt, attachments, modelId: "test-model" });
    const payload = mocks.generateContent.mock.calls[0][0];
    const parts = payload.contents[0].parts;
    expect(payload.contents[0].role).toBe("user");
    expect(parts[0]).toEqual({ text: prompt });
    expect(parts).toHaveLength(filename ? 3 : 2);
    const expectedPaths = [logoPath, ...(filename ? [path.join(process.cwd(), "public/logo-pendants/references", filename)] : [])];
    for (const [index, filePath] of expectedPaths.entries()) {
      expect(parts[index + 1].inlineData.mimeType).toBe("image/png");
      const decoded = Buffer.from(parts[index + 1].inlineData.data, "base64");
      expect(decoded.equals(await fs.readFile(filePath))).toBe(true);
      expect((await sharp(decoded).metadata()).format).toBe("png");
    }
  });
});
