import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token } = await req.json();

  if (!token) {
    return NextResponse.json({ success: false, error: "Missing token" }, { status: 400 });
  }

  const formData = new FormData();
  formData.append("secret", process.env.CF_TURNSTILE_SECRET_KEY!);
  formData.append("response", token);

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: formData }
  );
  const data = await res.json();

  return NextResponse.json({ success: data.success });
}
