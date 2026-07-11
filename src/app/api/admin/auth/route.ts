import { NextResponse } from "next/server";
import { createAdminToken, verifyAdminPassword } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe żądanie." }, { status: 400 });
  }

  const password =
    body && typeof body === "object" && typeof (body as { password?: string }).password === "string"
      ? (body as { password: string }).password
      : "";

  if (!process.env.ADMIN_PASSWORD?.trim()) {
    return NextResponse.json(
      { error: "Panel admina nie jest skonfigurowany (brak ADMIN_PASSWORD)." },
      { status: 503 },
    );
  }

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: "Nieprawidłowe hasło." }, { status: 401 });
  }

  const token = createAdminToken();
  return NextResponse.json({ ok: true, token });
}
