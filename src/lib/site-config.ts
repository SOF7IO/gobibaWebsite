import {
  PACKAGES_DATA,
  SERVICE_LEVELS,
  type PackageData,
  type ServiceLevelId,
} from "@/lib/packages-data";

export type PackagePricingOverride = {
  price: number;
  deposit: number;
  addons: Record<string, number>;
};

export type SiteConfig = {
  version: 1;
  updatedAt: string;
  packages: Record<string, PackagePricingOverride>;
  serviceLevels: Record<ServiceLevelId, number>;
  bookedDates: Record<string, string[]>;
};

export function buildDefaultSiteConfig(): SiteConfig {
  const packages: SiteConfig["packages"] = {};
  for (const pkg of PACKAGES_DATA) {
    packages[pkg.id] = {
      price: pkg.price,
      deposit: pkg.deposit,
      addons: Object.fromEntries(pkg.addons.map((a) => [a.id, a.price])),
    };
  }

  const serviceLevels = Object.fromEntries(
    SERVICE_LEVELS.map((s) => [s.id, s.priceAdd]),
  ) as Record<ServiceLevelId, number>;

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    packages,
    serviceLevels,
    bookedDates: {},
  };
}

export function mergeSiteConfig(stored: Partial<SiteConfig> | null): SiteConfig {
  const defaults = buildDefaultSiteConfig();
  if (!stored) return defaults;

  const packages = { ...defaults.packages };
  for (const [id, override] of Object.entries(stored.packages ?? {})) {
    if (!packages[id]) continue;
    packages[id] = {
      price: override.price ?? packages[id].price,
      deposit: override.deposit ?? packages[id].deposit,
      addons: { ...packages[id].addons, ...override.addons },
    };
  }

  const serviceLevels = {
    ...defaults.serviceLevels,
    ...(stored.serviceLevels ?? {}),
  } as Record<ServiceLevelId, number>;

  const bookedDates: Record<string, string[]> = {};
  for (const pkg of PACKAGES_DATA) {
    const dates = stored.bookedDates?.[pkg.id] ?? [];
    bookedDates[pkg.id] = [...new Set(dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
  }

  return {
    version: 1,
    updatedAt: stored.updatedAt ?? defaults.updatedAt,
    packages,
    serviceLevels,
    bookedDates,
  };
}

export function applyConfigToPackages(
  base: PackageData[],
  config: SiteConfig,
): PackageData[] {
  return base.map((pkg) => {
    const pricing = config.packages[pkg.id];
    if (!pricing) return pkg;
    return {
      ...pkg,
      price: pricing.price,
      deposit: pricing.deposit,
      addons: pkg.addons.map((addon) => ({
        ...addon,
        price: pricing.addons[addon.id] ?? addon.price,
      })),
    };
  });
}

export function getBookedDatesForPackage(config: SiteConfig, packageId: string): Set<string> {
  return new Set(config.bookedDates[packageId] ?? []);
}

export function validateSiteConfig(input: unknown): SiteConfig | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<SiteConfig>;
  const merged = mergeSiteConfig(raw);
  return merged;
}
