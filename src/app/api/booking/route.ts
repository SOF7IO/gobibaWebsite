import { NextResponse } from "next/server";
import { parseBookingRequest } from "@/lib/booking";
import { sendBookingEmails } from "@/lib/email/send-booking-email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy format żądania." }, { status: 400 });
  }

  const parsed = parseBookingRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const emailResult = await sendBookingEmails(parsed.summary);
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
