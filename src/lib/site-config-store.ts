import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  buildDefaultSiteConfig,
  mergeSiteConfig,
  validateSiteConfig,
  type SiteConfig,
} from "@/lib/site-config";

const BLOB_PATH = "gobiba/site-config.json";
const LOCAL_PATH = path.join(process.cwd(), ".data", "site-config.json");

function hasBlobEnv(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

async function readBlobConfig(): Promise<SiteConfig | null> {
  const { get } = await import("@vercel/blob");
  const result = await get(BLOB_PATH, {
    access: "public",
    useCache: false,
  });
  if (!result?.stream) return null;

  const text = await new Response(result.stream).text();
  return validateSiteConfig(JSON.parse(text));
}

async function writeBlobConfig(config: SiteConfig): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATH, JSON.stringify(config, null, 2), {
    access: "public",
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
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
  if (hasBlobEnv()) {
    try {
      const stored = await readBlobConfig();
      if (stored) return mergeSiteConfig(stored);
    } catch (error) {
      console.error("[site-config] Blob read failed, falling back to local file:", error);
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

  if (hasBlobEnv()) {
    try {
      await writeBlobConfig(next);
      return next;
    } catch (error) {
      console.error("[site-config] Blob write failed, falling back to local file:", error);
    }
  }

  await writeLocalConfig(next);
  if (process.env.NODE_ENV === "production" && !hasBlobEnv()) {
    console.warn(
      "[site-config] Blob not configured — saved locally only. Add Vercel Blob storage for production persistence.",
    );
  }

  return next;
}

export async function ensureSiteConfig(): Promise<SiteConfig> {
  const current = await loadSiteConfig();

  if (hasBlobEnv()) {
    try {
      const stored = await readBlobConfig();
      if (!stored) {
        const defaults = buildDefaultSiteConfig();
        await writeBlobConfig(defaults);
        return defaults;
      }
      return mergeSiteConfig(stored);
    } catch (error) {
      console.error("[site-config] Blob ensure failed, falling back to local file:", error);
    }
  }

  const local = await readLocalConfig();
  if (!local) {
    const defaults = buildDefaultSiteConfig();
    await writeLocalConfig(defaults);
    return defaults;
  }

  return current;
}
