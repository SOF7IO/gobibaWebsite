import {
  calcOutOfZoneDeliveryFee,
  getPackageById,
  SERVICE_LEVELS,
  type PackageAddon,
  type PackageData,
  type ServiceLevelId,
} from "@/lib/packages-data";

export type BookingCustomer = {
  name: string;
  phone: string;
  email: string;
  company?: string;
  notes?: string;
};

export type BookingDelivery = {
  outsideZone: boolean;
  km?: number;
};

export type BookingRequestPayload = {
  packageId: string;
  dates: string[];
  serviceLevelId: ServiceLevelId;
  addonIds: string[];
  delivery: BookingDelivery;
  customer: BookingCustomer;
};

export type BookingPricing = {
  dayCount: number;
  packageTotal: number;
  addonsTotal: number;
  serviceTotal: number;
  deliveryFee: number;
  deposit: number;
  subtotal: number;
  totalWithDeposit: number;
};

export type BookingSummary = {
  package: PackageData;
  dates: string[];
  serviceLevel: (typeof SERVICE_LEVELS)[number];
  addons: PackageAddon[];
  delivery: {
    outsideZone: boolean;
    km: number;
    fee: number;
  };
  pricing: BookingPricing;
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

export function calculateBookingPricing(input: {
  pkg: PackageData;
  dates: string[];
  serviceLevelId: ServiceLevelId;
  addons: PackageAddon[];
  deliveryKm: number;
}): BookingPricing {
  const dayCount = input.dates.length;
  const serviceLevel = SERVICE_LEVELS.find((s) => s.id === input.serviceLevelId)!;
  const addonsPerDay = input.addons.reduce((sum, addon) => sum + addon.price, 0);
  const deliveryFee = calcOutOfZoneDeliveryFee(input.deliveryKm);
  const packageTotal = input.pkg.price * dayCount;
  const addonsTotal = addonsPerDay * dayCount;
  const serviceTotal = serviceLevel.priceAdd * dayCount;
  const subtotal = packageTotal + addonsTotal + serviceTotal + deliveryFee;

  return {
    dayCount,
    packageTotal,
    addonsTotal,
    serviceTotal,
    deliveryFee,
    deposit: input.pkg.deposit,
    subtotal,
    totalWithDeposit: subtotal + input.pkg.deposit,
  };
}

export function parseBookingRequest(body: unknown):
  | { ok: true; summary: BookingSummary }
  | { ok: false; error: string; status: number } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Nieprawidłowe dane formularza.", status: 400 };
  }

  const payload = body as Partial<BookingRequestPayload>;
  const pkg = typeof payload.packageId === "string" ? getPackageById(payload.packageId) : undefined;
  if (!pkg) {
    return { ok: false, error: "Nie znaleziono wybranego pakietu.", status: 400 };
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

  const serviceLevelId = payload.serviceLevelId;
  const serviceLevel = SERVICE_LEVELS.find((s) => s.id === serviceLevelId);
  if (!serviceLevel) {
    return { ok: false, error: "Wybierz poziom obsługi.", status: 400 };
  }

  const addonIds = Array.isArray(payload.addonIds)
    ? payload.addonIds.filter((id): id is string => typeof id === "string")
    : [];
  const addons = addonIds
    .map((id) => pkg.addons.find((addon) => addon.id === id))
    .filter((addon): addon is PackageAddon => Boolean(addon));

  const delivery = payload.delivery;
  const outsideZone = Boolean(delivery && typeof delivery === "object" && delivery.outsideZone);
  const deliveryKm =
    outsideZone && delivery && typeof delivery === "object" && typeof delivery.km === "number"
      ? Math.max(0, Math.round(delivery.km))
      : 0;
  if (outsideZone && deliveryKm <= 0) {
    return { ok: false, error: "Podaj liczbę kilometrów poza strefą gratis.", status: 400 };
  }

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

  const pricing = calculateBookingPricing({
    pkg,
    dates,
    serviceLevelId: serviceLevel.id,
    addons,
    deliveryKm,
  });

  return {
    ok: true,
    summary: {
      package: pkg,
      dates,
      serviceLevel,
      addons,
      delivery: {
        outsideZone,
        km: deliveryKm,
        fee: pricing.deliveryFee,
      },
      pricing,
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
