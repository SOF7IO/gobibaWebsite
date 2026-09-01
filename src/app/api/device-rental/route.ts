import { NextResponse } from "next/server";
import { parseDeviceRentalRequest } from "@/lib/device-rental";
import { sendDeviceRentalEmails } from "@/lib/email/send-device-rental-email";
import { loadSiteConfig } from "@/lib/site-config-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy format żądania." }, { status: 400 });
  }

  const config = await loadSiteConfig();
  const parsed = parseDeviceRentalRequest(body, config);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const emailResult = await sendDeviceRentalEmails(parsed.summary);
  if (!emailResult.ok) {
    return NextResponse.json({ error: emailResult.error }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    mode: emailResult.mode,
    internalMessageId: emailResult.internalMessageId ?? null,
    customerMessageId: emailResult.customerMessageId ?? null,
  });
}
