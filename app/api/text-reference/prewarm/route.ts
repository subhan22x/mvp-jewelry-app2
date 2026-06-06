import path from "node:path";
import { NextResponse } from "next/server";
import { getStyle } from "@/src/lib/styles/registry";
import { prewarmTextReferenceRenderer, renderTextReferencePreview } from "@/src/lib/styles/text-reference";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { styleId?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const styleId = body.styleId?.trim();
  const text = body.text?.trim().slice(0, 32);
  if (!styleId || !text) {
    return NextResponse.json({ warmed: false }, { status: 200 });
  }

  try {
    const style = getStyle(styleId);
    if (!style.fontReference) {
      await prewarmTextReferenceRenderer();
      return NextResponse.json({ warmed: true, rendered: false });
    }

    await renderTextReferencePreview({
      styleId: style.id,
      family: style.fontReference.family,
      fontPath: path.join(process.cwd(), style.fontReference.file),
      text,
      transform: style.fontReference.transform
    });
    return NextResponse.json({ warmed: true, rendered: true });
  } catch (error) {
    console.warn("Unable to prewarm text reference renderer.", error);
    return NextResponse.json({ warmed: false }, { status: 200 });
  }
}
