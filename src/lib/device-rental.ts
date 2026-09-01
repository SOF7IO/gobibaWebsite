import {
  DEVICES_DATA,
  DEVICE_DELIVERY_FEE,
  FREE_DELIVERY_MIN_TOTAL,
  calcDeviceDeposit,
  calcDevicePerDay,
  type DeviceData,
} from "@/lib/devices-data";
import { calcOutOfZoneDeliveryFee } from "@/lib/packages-data";
import {
  applyConfigToDevices,
  getUnavailableDatesForDevices,
  mergeSiteConfig,
  type SiteConfig,
} from "@/lib/site-config";
import type { BookingCustomer } from "@/lib/booking";

export type DeviceRentalDeliveryMethod = "pickup" | "delivery";

export type DeviceRentalRequestPayload = {
  items: { deviceId: string; qty: number }[];
  dates: string[];
  delivery: {
    method: DeviceRentalDeliveryMethod;
    outsideZone?: boolean;
    km?: number;
  };
  customer: BookingCustomer;
};

export type DeviceRentalItem = {
  device: DeviceData;
  qty: number;
  /** Cena łączna za dobę dla tej pozycji (z progami cenowymi) */
  perDay: number;
  /** Kaucja zwrotna za tę pozycję (jednorazowa) */
  deposit: number;
};

export type DeviceRentalPricing = {
  dayCount: number;
  perDayTotal: number;
  itemsTotal: number;
  /** Opłata za dowóz w strefie gratis (0 gdy zamówienie osiąga próg darmowej dostawy) */
  zoneDeliveryFee: number;
  /** Dopłata za kilometry poza strefą gratis */
  deliveryFee: number;
  /** Suma kaucji zwrotnych za wypożyczony sprzęt */
  deposit: number;
  /** Koszt wynajmu bez kaucji */
  total: number;
  /** Kwota do zapłaty przy odbiorze — wynajem + kaucja zwrotna */
  totalWithDeposit: number;
};

/** Opłata za dowóz w strefie: gratis od progu, poniżej — stała stawka. */
export function calcZoneDeliveryFee(itemsTotal: number, isDelivery: boolean): number {
  if (!isDelivery) return 0;
  return itemsTotal >= FREE_DELIVERY_MIN_TOTAL ? 0 : DEVICE_DELIVERY_FEE;
}

export type DeviceRentalSummary = {
  items: DeviceRentalItem[];
  dates: string[];
  delivery: {
    method: DeviceRentalDeliveryMethod;
    outsideZone: boolean;
    km: number;
    /** Dopłata za kilometry poza strefą gratis */
    fee: number;
    /** Opłata za dowóz w strefie (0 przy zamówieniu od progu) */
    zoneFee: number;
  };
  pricing: DeviceRentalPricing;
  customer: BookingCustomer;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseDate(value: string): Date | null {
  if (!DATE_RE.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function isPastDate(value: string): boolean {
  const date = parseDate(value);
  if (!date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export function parseDeviceRentalRequest(
  body: unknown,
  siteConfig?: SiteConfig,
):
  | { ok: true; summary: DeviceRentalSummary }
  | { ok: false; error: string; status: number } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Nieprawidłowe dane formularza.", status: 400 };
  }

  const config = siteConfig ? mergeSiteConfig(siteConfig) : null;
  const catalog = config ? applyConfigToDevices(DEVICES_DATA, config) : DEVICES_DATA;
  const findDevice = (id: string) => catalog.find((d) => d.id === id);

  const payload = body as Partial<DeviceRentalRequestPayload>;

  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const seen = new Set<string>();
  const items: DeviceRentalItem[] = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue;
    const deviceId = typeof raw.deviceId === "string" ? raw.deviceId : "";
    if (seen.has(deviceId)) continue;
    const device = findDevice(deviceId);
    if (!device) continue;
    const qty =
      typeof raw.qty === "number" && Number.isFinite(raw.qty)
        ? Math.min(device.maxQty, Math.max(1, Math.round(raw.qty)))
        : 1;
    seen.add(deviceId);
    items.push({
      device,
      qty,
      perDay: calcDevicePerDay(device, qty),
      deposit: calcDeviceDeposit(device, qty),
    });
  }
  if (items.length === 0) {
    return { ok: false, error: "Wybierz co najmniej jedno urządzenie.", status: 400 };
  }

  const dates = Array.isArray(payload.dates)
    ? [...new Set(payload.dates.filter((d): d is string => typeof d === "string"))].sort()
    : [];
  if (dates.length === 0) {
    return { ok: false, error: "Wybierz co najmniej jeden termin.", status: 400 };
  }
  if (dates.some((d) => !parseDate(d))) {
    return { ok: false, error: "Nieprawidłowy format daty.", status: 400 };
  }
  if (dates.some(isPastDate)) {
    return { ok: false, error: "Wybrany termin jest już niedostępny.", status: 400 };
  }
  if (config) {
    const unavailable = getUnavailableDatesForDevices(
      config,
      items.map((item) => item.device.id),
    );
    if (dates.some((d) => unavailable.has(d))) {
      return {
        ok: false,
        error: "Wybrany sprzęt jest już zajęty w tym terminie.",
        status: 409,
      };
    }
  }

  const delivery = payload.delivery;
  const method: DeviceRentalDeliveryMethod =
    delivery && typeof delivery === "object" && delivery.method === "delivery"
      ? "delivery"
      : "pickup";
  const requiresDelivery = items.some((item) => item.device.deliveryOnly);
  if (requiresDelivery && method !== "delivery") {
    return {
      ok: false,
      error: "Część wybranego sprzętu wynajmujemy tylko z dowozem i montażem.",
      status: 400,
    };
  }

  const outsideZone =
    method === "delivery" && Boolean(delivery && typeof delivery === "object" && delivery.outsideZone);
  const deliveryKm =
    outsideZone && delivery && typeof delivery === "object" && typeof delivery.km === "number"
      ? Math.max(0, Math.round(delivery.km))
      : 0;
  if (outsideZone && deliveryKm <= 0) {
    return { ok: false, error: "Podaj liczbę kilometrów poza strefą gratis.", status: 400 };
  }
  const deliveryFee = calcOutOfZoneDeliveryFee(deliveryKm);

  const customer = payload.customer;
  if (!customer || typeof customer !== "object") {
    return { ok: false, error: "Uzupełnij dane kontaktowe.", status: 400 };
  }

  const name = typeof customer.name === "string" ? customer.name.trim() : "";
  const phone = typeof customer.phone === "string" ? customer.phone.trim() : "";
  const email = typeof customer.email === "string" ? customer.email.trim() : "";
  const company = typeof customer.company === "string" ? customer.company.trim() : "";
  const notes = typeof customer.notes === "string" ? customer.notes.trim() : "";

  if (name.length < 2) {
    return { ok: false, error: "Podaj imię i nazwisko.", status: 400 };
  }
  if (phone.length < 7) {
    return { ok: false, error: "Podaj poprawny numer telefonu.", status: 400 };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Podaj poprawny adres e-mail.", status: 400 };
  }

  const dayCount = dates.length;
  const perDayTotal = items.reduce((sum, item) => sum + item.perDay, 0);
  const itemsTotal = perDayTotal * dayCount;
  const zoneDeliveryFee = calcZoneDeliveryFee(itemsTotal, method === "delivery");
  const depositTotal = items.reduce((sum, item) => sum + item.deposit, 0);
  const rentalTotal = itemsTotal + zoneDeliveryFee + deliveryFee;

  return {
    ok: true,
    summary: {
      items,
      dates,
      delivery: {
        method,
        outsideZone,
        km: deliveryKm,
        fee: deliveryFee,
        zoneFee: zoneDeliveryFee,
      },
      pricing: {
        dayCount,
        perDayTotal,
        itemsTotal,
        zoneDeliveryFee,
        deliveryFee,
        deposit: depositTotal,
        total: rentalTotal,
        totalWithDeposit: rentalTotal + depositTotal,
      },
      customer: {
        name,
        phone,
        email,
        ...(company ? { company } : {}),
        ...(notes ? { notes } : {}),
      },
    },
  };
}
