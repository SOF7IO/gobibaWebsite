import { NextResponse } from "next/server";
import { loadSiteConfig } from "@/lib/site-config-store";

export const runtime = "nodejs";

export async function GET() {
  const config = await loadSiteConfig();
  return NextResponse.json(config);
}
