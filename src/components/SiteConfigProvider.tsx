"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyConfigToDevices,
  applyConfigToPackages,
  getUnavailableDatesForDevice,
  getUnavailableDatesForDevices,
  getUnavailableDatesForPackage,
  type SiteConfig,
} from "@/lib/site-config";
import {
  PACKAGES_DATA,
  SERVICE_LEVELS,
  type PackageData,
  type ServiceLevelId,
} from "@/lib/packages-data";
import { DEVICES_DATA, type DeviceData } from "@/lib/devices-data";

const ADMIN_TOKEN_KEY = "gobiba-admin-token";

type ServiceLevelView = {
  id: ServiceLevelId;
  name: string;
  desc: string;
  priceAdd: number;
  badge?: string;
};

type SiteConfigContextValue = {
  loading: boolean;
  config: SiteConfig | null;
  packages: PackageData[];
  /** Katalog sprzętu z cenami i kaucjami z panelu admina */
  devices: DeviceData[];
  serviceLevels: ServiceLevelView[];
  /** Terminy niedostępne dla pakietu (własne blokady + zajęty sprzęt) */
  getBookedDates: (packageId: string) => Set<string>;
  /** Terminy niedostępne dla jednego urządzenia (blokady własne + pakiety z tym sprzętem) */
  getDeviceBookedDates: (deviceId: string) => Set<string>;
  /** Terminy niedostępne dla zestawu urządzeń wybranych w koszyku */
  getDevicesBookedDates: (deviceIds: string[]) => Set<string>;
  isAdmin: boolean;
  isEditMode: boolean;
  saving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  updatePackagePrice: (packageId: string, field: "price" | "deposit", value: number) => void;
  updateAddonPrice: (packageId: string, addonId: string, value: number) => void;
  updateServiceLevelPrice: (id: ServiceLevelId, value: number) => void;
  updateDevicePrice: (deviceId: string, field: "price" | "deposit", value: number) => void;
  toggleBookedDate: (packageId: string, date: string) => void;
  toggleDeviceBookedDate: (deviceId: string, date: string) => void;
  saveConfig: () => Promise<boolean>;
  exitEditMode: () => void;
  logoutAdmin: () => void;
};

const SiteConfigContext = createContext<SiteConfigContextValue | null>(null);

export function useSiteConfig(): SiteConfigContextValue {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) throw new Error("useSiteConfig must be used within SiteConfigProvider");
  return ctx;
}

async function fetchPublicConfig(): Promise<SiteConfig> {
  const res = await fetch("/api/config", { cache: "no-store" });
  if (!res.ok) throw new Error("Nie udało się pobrać konfiguracji.");
  return res.json();
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error("Serwer zwrócił pustą odpowiedź. Odśwież stronę i zaloguj się ponownie (Ctrl+Shift+E).");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Serwer zwrócił nieprawidłową odpowiedź. Odśwież stronę i zaloguj się ponownie.");
  }
}

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<SiteConfig | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const reloadConfig = useCallback(async () => {
    const config = await fetchPublicConfig();
    setDraft(config);
    return config;
  }, []);

  useEffect(() => {
    reloadConfig()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [reloadConfig]);

  useEffect(() => {
    const stored = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (stored) setAdminToken(stored);
  }, []);

  const authenticateAdmin = useCallback(async () => {
    const password = window.prompt("Hasło administratora:");
    if (password === null) return;

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await parseJsonResponse<{ token?: string; error?: string }>(res);
    if (!res.ok) {
      window.alert(data.error ?? "Nieprawidłowe hasło.");
      return;
    }
    if (!data.token) return;

    sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token);
    setAdminToken(data.token);
    setIsEditMode(true);
    setSaveError(null);
    await reloadConfig();
  }, [reloadConfig]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "e")) return;
      e.preventDefault();
      if (adminToken) {
        setIsEditMode((v) => !v);
        return;
      }
      void authenticateAdmin();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [adminToken, authenticateAdmin]);

  const packages = useMemo(
    () => (draft ? applyConfigToPackages(PACKAGES_DATA, draft) : PACKAGES_DATA),
    [draft],
  );

  const serviceLevels = useMemo<ServiceLevelView[]>(() => {
    if (!draft) return SERVICE_LEVELS.map((level) => ({ ...level }));
    return SERVICE_LEVELS.map((level) => ({
      ...level,
      priceAdd: draft.serviceLevels[level.id] ?? level.priceAdd,
    }));
  }, [draft]);

  const devices = useMemo(
    () => (draft ? applyConfigToDevices(DEVICES_DATA, draft) : DEVICES_DATA),
    [draft],
  );

  const getBookedDates = useCallback(
    (packageId: string) =>
      draft ? getUnavailableDatesForPackage(draft, packageId) : new Set<string>(),
    [draft],
  );

  const getDeviceBookedDates = useCallback(
    (deviceId: string) =>
      draft ? getUnavailableDatesForDevice(draft, deviceId) : new Set<string>(),
    [draft],
  );

  const getDevicesBookedDates = useCallback(
    (deviceIds: string[]) =>
      draft ? getUnavailableDatesForDevices(draft, deviceIds) : new Set<string>(),
    [draft],
  );

  const updatePackagePrice = useCallback(
    (packageId: string, field: "price" | "deposit", value: number) => {
      if (!draft || !Number.isFinite(value) || value < 0) return;
      setDraft({
        ...draft,
        packages: {
          ...draft.packages,
          [packageId]: {
            ...draft.packages[packageId],
            [field]: Math.round(value),
          },
        },
      });
      setSaveSuccess(false);
    },
    [draft],
  );

  const updateAddonPrice = useCallback(
    (packageId: string, addonId: string, value: number) => {
      if (!draft || !Number.isFinite(value) || value < 0) return;
      setDraft({
        ...draft,
        packages: {
          ...draft.packages,
          [packageId]: {
            ...draft.packages[packageId],
            addons: {
              ...draft.packages[packageId].addons,
              [addonId]: Math.round(value),
            },
          },
        },
      });
      setSaveSuccess(false);
    },
    [draft],
  );

  const updateServiceLevelPrice = useCallback(
    (id: ServiceLevelId, value: number) => {
      if (!draft || !Number.isFinite(value) || value < 0) return;
      setDraft({
        ...draft,
        serviceLevels: {
          ...draft.serviceLevels,
          [id]: Math.round(value),
        },
      });
      setSaveSuccess(false);
    },
    [draft],
  );

  const updateDevicePrice = useCallback(
    (deviceId: string, field: "price" | "deposit", value: number) => {
      if (!draft || !Number.isFinite(value) || value < 0) return;
      setDraft({
        ...draft,
        devices: {
          ...draft.devices,
          [deviceId]: {
            ...draft.devices[deviceId],
            [field]: Math.round(value),
          },
        },
      });
      setSaveSuccess(false);
    },
    [draft],
  );

  const toggleDeviceBookedDate = useCallback(
    (deviceId: string, date: string) => {
      if (!draft) return;
      const current = new Set(draft.deviceBookedDates?.[deviceId] ?? []);
      if (current.has(date)) current.delete(date);
      else current.add(date);
      setDraft({
        ...draft,
        deviceBookedDates: {
          ...draft.deviceBookedDates,
          [deviceId]: [...current].sort(),
        },
      });
      setSaveSuccess(false);
    },
    [draft],
  );

  const toggleBookedDate = useCallback(
    (packageId: string, date: string) => {
      if (!draft) return;
      const current = new Set(draft.bookedDates[packageId] ?? []);
      if (current.has(date)) current.delete(date);
      else current.add(date);
      setDraft({
        ...draft,
        bookedDates: {
          ...draft.bookedDates,
          [packageId]: [...current].sort(),
        },
      });
      setSaveSuccess(false);
    },
    [draft],
  );

  const saveConfig = useCallback(async () => {
    if (!draft || !adminToken) return false;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(draft),
      });
      const data = await parseJsonResponse<{ config?: SiteConfig; error?: string }>(res);
      if (!res.ok) {
        if (res.status === 401) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          setAdminToken(null);
          setIsEditMode(false);
          throw new Error("Sesja wygasła. Zaloguj się ponownie (Ctrl+Shift+E).");
        }
        throw new Error(data.error ?? "Nie udało się zapisać.");
      }
      if (data.config) setDraft(data.config);
      setSaveSuccess(true);
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Nie udało się zapisać.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [adminToken, draft]);

  const exitEditMode = useCallback(() => setIsEditMode(false), []);
  const logoutAdmin = useCallback(() => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminToken(null);
    setIsEditMode(false);
    void reloadConfig();
  }, [reloadConfig]);

  const value: SiteConfigContextValue = {
    loading,
    config: draft,
    packages,
    devices,
    serviceLevels,
    getBookedDates,
    getDeviceBookedDates,
    getDevicesBookedDates,
    isAdmin: Boolean(adminToken),
    isEditMode,
    saving,
    saveError,
    saveSuccess,
    updatePackagePrice,
    updateAddonPrice,
    updateServiceLevelPrice,
    updateDevicePrice,
    toggleBookedDate,
    toggleDeviceBookedDate,
    saveConfig,
    exitEditMode,
    logoutAdmin,
  };

  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>;
}
