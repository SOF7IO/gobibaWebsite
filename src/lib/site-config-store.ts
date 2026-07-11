import { kv } from "@vercel/kv";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  buildDefaultSiteConfig,
  mergeSiteConfig,
  validateSiteConfig,
  type SiteConfig,
} from "@/lib/site-config";

const KV_KEY = "gobiba:site-config";
const LOCAL_PATH = path.join(process.cwd(), ".data", "site-config.json");

function hasKvEnv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function readLocalConfig(): Promise<SiteConfig | null> {
  try {
    const raw = await readFile(LOCAL_PATH, "utf8");
    return validateSiteConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function writeLocalConfig(config: SiteConfig): Promise<void> {
  await mkdir(path.dirname(LOCAL_PATH), { recursive: true });
  await writeFile(LOCAL_PATH, JSON.stringify(config, null, 2), "utf8");
}

export async function loadSiteConfig(): Promise<SiteConfig> {
  if (hasKvEnv()) {
    try {
      const stored = await kv.get<Partial<SiteConfig>>(KV_KEY);
      return mergeSiteConfig(stored);
    } catch (error) {
      console.error("[site-config] KV read failed:", error);
    }
  }

  const local = await readLocalConfig();
  return mergeSiteConfig(local);
}

export async function saveSiteConfig(config: SiteConfig): Promise<SiteConfig> {
  const next: SiteConfig = {
    ...mergeSiteConfig(config),
    updatedAt: new Date().toISOString(),
  };

  if (hasKvEnv()) {
    await kv.set(KV_KEY, next);
  } else {
    await writeLocalConfig(next);
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[site-config] KV not configured — saved locally only. Add Upstash Redis on Vercel for production persistence.",
      );
    }
  }

  return next;
}

export async function ensureSiteConfig(): Promise<SiteConfig> {
  const current = await loadSiteConfig();
  if (hasKvEnv()) {
    const stored = await kv.get(KV_KEY);
    if (!stored) {
      const defaults = buildDefaultSiteConfig();
      await kv.set(KV_KEY, defaults);
      return defaults;
    }
  } else {
    const local = await readLocalConfig();
    if (!local) {
      const defaults = buildDefaultSiteConfig();
      await writeLocalConfig(defaults);
      return defaults;
    }
  }
  return current;
}
