import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function POST() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl) {
    return NextResponse.json(
      { error: "LiveKit environment variables are not configured." },
      { status: 500 }
    );
  }

  const identity = `visitor-${Date.now()}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    ttl: "1h",
  });

  at.addGrant({
    room: "demo-room",
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return NextResponse.json({ token, url: livekitUrl });
}
