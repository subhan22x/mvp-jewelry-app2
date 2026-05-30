import { NextResponse } from "next/server";
import { z } from "zod";
import { isOwnerRequestAuthenticated } from "@/src/lib/owner-auth";
import { parsePromptMode, setNamePromptMode } from "@/src/lib/prompt-mode";

const Body = z.object({
  promptMode: z.enum(["json", "natural_language"])
});

export async function PATCH(req: Request) {
  if (!isOwnerRequestAuthenticated(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = Body.parse(await req.json());
    const setting = await setNamePromptMode(body.promptMode);
    return NextResponse.json({ promptMode: parsePromptMode(setting.value) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "bad_request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
