import { NextResponse } from "next/server";
import { z } from "zod";
import { createOwnerSessionValue, getOwnerAccessCode, OWNER_SESSION_COOKIE } from "@/src/lib/owner-auth";

const Body = z.object({
  accessCode: z.string().min(1)
});

export async function POST(req: Request) {
  try {
    const expectedCode = getOwnerAccessCode();
    if (!expectedCode) {
      return NextResponse.json({ error: "OWNER_ACCESS_CODE is not configured." }, { status: 500 });
    }

    const body = Body.parse(await req.json());
    if (body.accessCode !== expectedCode) {
      return NextResponse.json({ error: "Invalid owner access code." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true }, { status: 200 });
    response.cookies.set({
      name: OWNER_SESSION_COOKIE,
      value: createOwnerSessionValue(expectedCode),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "bad_request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
