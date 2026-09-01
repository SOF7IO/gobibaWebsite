import {
  ADDON_RECIPES,
  PACKAGES_DATA,
  PACKAGE_EQUIPMENT,
  SERVICE_LEVELS,
  calcAddonDeposit,
  calcAddonPrice,
  calcPackagePrice,
  type PackageData,
  type ServiceLevelId,
} from "@/lib/packages-data";
import { DEVICES_DATA, type DeviceData } from "@/lib/devices-data";

export type PackagePricingOverride = {
  price: number;
  deposit: number;
  addons: Record<string, number>;
};

export type DevicePricingOverride = {
  price: number;
  deposit: number;
};

/**
 * Wersja 4: panel admina edytuje też ceny, kaucje i zajęte terminy pojedynczego
 * sprzętu, a dostępność sprzętu i pakietów jest wspólna. Zapisy w starszej wersji
 * pomijamy w części cenowej, żeby nie przywracały nieaktualnego cennika.
 */
export const CONFIG_VERSION = 4;

export type SiteConfig = {
  version: number;
  updatedAt: string;
  packages: Record<string, PackagePricingOverride>;
  /** Nadpisania cen i kaucji pojedynczego sprzętu */
  devices: Record<string, DevicePricingOverride>;
  serviceLevels: Record<ServiceLevelId, number>;
  /** Terminy zablokowane ręcznie dla pakietu */
  bookedDates: Record<string, string[]>;
  /** Terminy zablokowane ręcznie dla pojedynczego urządzenia */
  deviceBookedDates: Record<string, string[]>;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanDates(dates: string[] | undefined): string[] {
  return [...new Set((dates ?? []).filter((d) => DATE_RE.test(d)))].sort();
}

export function buildDefaultSiteConfig(): SiteConfig {
  const packages: SiteConfig["packages"] = {};
  for (const pkg of PACKAGES_DATA) {
    packages[pkg.id] = {
      price: pkg.price,
      deposit: pkg.deposit,
      addons: Object.fromEntries(pkg.addons.map((a) => [a.id, a.price])),
    };
  }

  const devices: SiteConfig["devices"] = {};
  for (const device of DEVICES_DATA) {
    devices[device.id] = { price: device.price, deposit: device.deposit };
  }

  const serviceLevels = Object.fromEntries(
    SERVICE_LEVELS.map((s) => [s.id, s.priceAdd]),
  ) as Record<ServiceLevelId, number>;

  return {
    version: CONFIG_VERSION,
    updatedAt: new Date().toISOString(),
    packages,
    devices,
    serviceLevels,
    bookedDates: {},
    deviceBookedDates: {},
  };
}

export function mergeSiteConfig(stored: Partial<SiteConfig> | null): SiteConfig {
  const defaults = buildDefaultSiteConfig();
  if (!stored) return defaults;

  const outdated = (stored.version ?? 1) < CONFIG_VERSION;

  // Ceny sprzętu wczytujemy najpierw — pakiety liczą się z nadpisanego katalogu.
  const devices = { ...defaults.devices };
  if (!outdated) {
    for (const [id, override] of Object.entries(stored.devices ?? {})) {
      if (!devices[id]) continue;
      devices[id] = {
        price: override.price ?? devices[id].price,
        deposit: override.deposit ?? devices[id].deposit,
      };
    }
  }

  const catalog = applyDeviceOverrides(DEVICES_DATA, devices);

  const packages: SiteConfig["packages"] = {};
  for (const pkg of PACKAGES_DATA) {
    const fromCatalog = {
      price: PACKAGE_EQUIPMENT[pkg.id] ? calcPackagePrice(pkg.id, catalog) : pkg.price,
      deposit: pkg.deposit,
      addons: Object.fromEntries(
        pkg.addons.map((a) => [a.id, calcAddonPrice(ADDON_RECIPES[a.id], catalog)]),
      ),
    };
    const override = outdated ? undefined : stored.packages?.[pkg.id];
    packages[pkg.id] = {
      price: override?.price ?? fromCatalog.price,
      deposit: override?.deposit ?? fromCatalog.deposit,
      addons: { ...fromCatalog.addons, ...override?.addons },
    };
  }

  const serviceLevels = {
    ...defaults.serviceLevels,
    ...(stored.serviceLevels ?? {}),
  } as Record<ServiceLevelId, number>;

  const bookedDates: Record<string, string[]> = {};
  for (const pkg of PACKAGES_DATA) {
    bookedDates[pkg.id] = cleanDates(stored.bookedDates?.[pkg.id]);
  }

  const deviceBookedDates: Record<string, string[]> = {};
  for (const device of DEVICES_DATA) {
    deviceBookedDates[device.id] = cleanDates(stored.deviceBookedDates?.[device.id]);
  }

  return {
    version: CONFIG_VERSION,
    updatedAt: stored.updatedAt ?? defaults.updatedAt,
    packages,
    devices,
    serviceLevels,
    bookedDates,
    deviceBookedDates,
  };
}

/** Katalog sprzętu z cenami i kaucjami nadpisanymi w panelu admina. */
export function applyDeviceOverrides(
  base: DeviceData[],
  overrides: Record<string, DevicePricingOverride>,
): DeviceData[] {
  return base.map((device) => {
    const o = overrides[device.id];
    if (!o) return device;
    const price = o.price ?? device.price;
    return {
      ...device,
      price,
      deposit: o.deposit ?? device.deposit,
      // progi ilościowe skalujemy razem z ceną bazową, żeby zachować rabat za komplet
      tierPrices: device.tierPrices
        ? Object.fromEntries(
            Object.entries(device.tierPrices).map(([qty, tier]) => [
              qty,
              Math.round((tier / device.price) * price),
            ]),
          )
        : undefined,
    };
  });
}

export function applyConfigToDevices(base: DeviceData[], config: SiteConfig): DeviceData[] {
  return applyDeviceOverrides(base, config.devices ?? {});
}

export function applyConfigToPackages(base: PackageData[], config: SiteConfig): PackageData[] {
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
        deposit: calcAddonDeposit(ADDON_RECIPES[addon.id], applyConfigToDevices(DEVICES_DATA, config)),
      })),
    };
  });
}

// ─── Wspólna dostępność sprzętu i pakietów ───────────────────────────────────
// Sprzęt jedzie tylko w jedno miejsce naraz, więc blokada pakietu zajmuje sprzęt
// z jego składu, a blokada sprzętu unieważnia każdy pakiet, w którym on jest.

/** Terminy, w których dane urządzenie jest niedostępne (własne blokady + pakiety). */
export function getUnavailableDatesForDevice(config: SiteConfig, deviceId: string): Set<string> {
  const dates = new Set(config.deviceBookedDates?.[deviceId] ?? []);
  for (const [packageId, equipment] of Object.entries(PACKAGE_EQUIPMENT)) {
    if (!equipment.some(([id]) => id === deviceId)) continue;
    for (const date of config.bookedDates[packageId] ?? []) dates.add(date);
  }
  return dates;
}

/** Terminy, w których pakiet jest niedostępny (własne blokady + zajęty sprzęt). */
export function getUnavailableDatesForPackage(config: SiteConfig, packageId: string): Set<string> {
  const dates = new Set(config.bookedDates[packageId] ?? []);
  for (const [deviceId] of PACKAGE_EQUIPMENT[packageId] ?? []) {
    for (const date of getUnavailableDatesForDevice(config, deviceId)) dates.add(date);
  }
  return dates;
}

/** @deprecated Użyj getUnavailableDatesForPackage — uwzględnia też zajęty sprzęt. */
export function getBookedDatesForPackage(config: SiteConfig, packageId: string): Set<string> {
  return getUnavailableDatesForPackage(config, packageId);
}

/** Terminy niedostępne dla zestawu urządzeń wybranych w koszyku. */
export function getUnavailableDatesForDevices(
  config: SiteConfig,
  deviceIds: string[],
): Set<string> {
  const dates = new Set<string>();
  for (const id of deviceIds) {
    for (const date of getUnavailableDatesForDevice(config, id)) dates.add(date);
  }
  return dates;
}

export function validateSiteConfig(input: unknown): SiteConfig | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<SiteConfig>;
  const merged = mergeSiteConfig(raw);
  return merged;
}
