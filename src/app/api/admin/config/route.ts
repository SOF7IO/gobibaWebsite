import { NextResponse } from "next/server";
import { getTokenFromRequest, verifyAdminToken } from "@/lib/admin-auth";
import { validateSiteConfig } from "@/lib/site-config";
import { loadSiteConfig, saveSiteConfig } from "@/lib/site-config-store";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Brak autoryzacji admina." }, { status: 401 });
}

export async function GET(request: Request) {
  if (!verifyAdminToken(getTokenFromRequest(request))) return unauthorized();
  const config = await loadSiteConfig();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  if (!verifyAdminToken(getTokenFromRequest(request))) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy format danych." }, { status: 400 });
  }

  const config = validateSiteConfig(body);
  if (!config) {
    return NextResponse.json({ error: "Nieprawidłowa konfiguracja." }, { status: 400 });
  }

  const saved = await saveSiteConfig(config);
  return NextResponse.json({ ok: true, config: saved });
}
