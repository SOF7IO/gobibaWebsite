"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight, Check, ChevronDown, Minus, Plus, ShoppingCart, Speaker, Sparkles,
  Projector, BatteryCharging, PartyPopper, Trash2, Truck, type LucideIcon,
} from "lucide-react";
import { CalendarPicker } from "@/components/booking-widgets";
import { useSiteConfig } from "@/components/SiteConfigProvider";
import {
  DEVICE_CATEGORIES,
  DEVICES_DATA,
  DEVICE_DELIVERY_FEE,
  FREE_DELIVERY_MIN_TOTAL,
  calcDeviceDeposit,
  calcDevicePerDay,
  type DeviceCategoryId,
  type DeviceData,
} from "@/lib/devices-data";
import {
  DELIVERY_FREE_ZONE,
  DELIVERY_RATE_ONE_WAY,
  DELIVERY_TRIPS,
  calcOutOfZoneDeliveryFee,
} from "@/lib/packages-data";
import { calcZoneDeliveryFee, type DeviceRentalRequestPayload } from "@/lib/device-rental";

const CATEGORY_ICONS: Record<DeviceCategoryId, LucideIcon> = {
  naglosnienie: Speaker,
  obraz: Projector,
  swiatlo: Sparkles,
  zasilanie: BatteryCharging,
  atrakcje: PartyPopper,
};

const CATEGORY_TILE_STYLES: Record<DeviceCategoryId, { gradient: string; iconClass: string }> = {
  naglosnienie: { gradient: "from-[#ff3cac]/12 via-[#7b2fff]/8 to-[#fdf9ff]", iconClass: "text-[#7b2fff]/70" },
  obraz:        { gradient: "from-[#009688]/12 via-[#1565c0]/8 to-[#fdf9ff]", iconClass: "text-[#1565c0]/70" },
  swiatlo:      { gradient: "from-[#7b2fff]/14 via-[#ff3cac]/8 to-[#fdf9ff]", iconClass: "text-[#7b2fff]/75" },
  zasilanie:    { gradient: "from-[#f59e0b]/14 via-[#f97316]/8 to-[#fdf9ff]", iconClass: "text-[#b45309]/70" },
  atrakcje:     { gradient: "from-[#ff3cac]/18 via-[#130018]/8 to-[#f3eeff]", iconClass: "text-[#ff3cac]/80" },
};

const INPUT_CLASS = "w-full bg-black/3 border border-black/8 rounded-xl px-4 py-3 text-sm text-black/80 placeholder-black/25 focus:outline-none focus:border-black/25 focus:bg-white transition-all";

type Cart = Map<string, number>;

function dobaLabel(n: number): string {
  return n === 1 ? "doba" : n < 5 ? "doby" : "dób";
}

// ─── Device image with icon fallback ─────────────────────────────────────────

function DeviceImage({ device, className }: { device: DeviceData; className?: string }) {
  const [failed, setFailed] = useState(false);
  const style = CATEGORY_TILE_STYLES[device.category];
  const Icon = CATEGORY_ICONS[device.category];

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br ${style.gradient} ${className ?? ""}`}>
        <Icon className={`w-14 h-14 ${style.iconClass}`} strokeWidth={1.25} />
      </div>
    );
  }
  return (
    <div className={`bg-white p-3 ${className ?? ""}`}>
      <img
        src={device.image}
        alt={device.name}
        loading="lazy"
        className="w-full h-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

// ─── Device card ─────────────────────────────────────────────────────────────

function QtyStepper({
  qty, maxQty, onChange, compact = false,
}: {
  qty: number; maxQty: number; onChange: (next: number) => void; compact?: boolean;
}) {
  return (
    <div className={`flex items-center ${compact ? "gap-1" : "justify-between rounded-xl border border-[#130018]/30 bg-[#130018]/4 px-2 py-1.5"}`}>
      <button
        type="button"
        aria-label="Zmniejsz liczbę sztuk"
        onClick={() => onChange(qty - 1)}
        className={`${compact ? "w-7 h-7" : "w-8 h-8"} flex items-center justify-center rounded-lg text-black/50 hover:bg-black/6 transition-colors`}
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className={`${compact ? "text-xs w-10" : "text-sm"} font-bold text-black/75 tabular-nums text-center`}>{qty} szt.</span>
      <button
        type="button"
        aria-label="Zwiększ liczbę sztuk"
        onClick={() => onChange(qty + 1)}
        disabled={qty >= maxQty}
        className={`${compact ? "w-7 h-7" : "w-8 h-8"} flex items-center justify-center rounded-lg text-black/50 hover:bg-black/6 transition-colors disabled:opacity-25 disabled:cursor-not-allowed`}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

function DeviceCard({
  device, qty, onChangeQty,
}: {
  device: DeviceData; qty: number; onChangeQty: (next: number) => void;
}) {
  const perDay = qty > 0 ? calcDevicePerDay(device, qty) : device.price;
  const deposit = qty > 0 ? calcDeviceDeposit(device, qty) : device.deposit;
  return (
    <div className={`flex flex-col rounded-2xl border bg-white overflow-hidden transition-all ${qty > 0 ? "border-[#130018]/35 shadow-md" : "border-black/8 hover:border-black/18 hover:shadow-sm"}`}>
      <div className="relative aspect-[4/3] bg-white border-b border-black/5 overflow-hidden">
        <DeviceImage device={device} className="absolute inset-0 w-full h-full" />
        {device.badge && (
          <span className="absolute top-2.5 left-2.5 text-[9px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full text-black/50 bg-white/85 backdrop-blur-sm border border-black/8">
            {device.badge}
          </span>
        )}
        {device.deliveryOnly && (
          <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full text-white bg-[#130018]/80 backdrop-blur-sm">
            <Truck className="w-3 h-3" /> tylko z dowozem i montażem
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4">
        <h4 className="text-sm font-bold text-black/80 leading-snug mb-1" style={{ fontFamily: "'Oxanium', sans-serif" }}>
          {device.name}
        </h4>
        <p className="text-xs text-black/40 leading-relaxed mb-3 flex-1">{device.description}</p>

        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-black text-[#130018]">{perDay} zł</span>
          <span className="text-[11px] text-black/30">/ doba{qty > 1 ? ` (${qty} szt.)` : ""}</span>
        </div>
        <p className="text-[11px] text-black/30 mb-3 mt-0.5">
          {deposit > 0 ? `+ ${deposit} zł kaucji (zwrotna)` : "bez kaucji"}
        </p>

        {qty === 0 ? (
          <button
            type="button"
            onClick={() => onChangeQty(1)}
            className="w-full py-2.5 rounded-xl border border-black/12 text-xs font-semibold text-black/60 hover:border-[#130018]/40 hover:text-black/85 transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Dodaj do zapytania
          </button>
        ) : device.maxQty === 1 ? (
          <button
            type="button"
            onClick={() => onChangeQty(0)}
            className="group/rm w-full py-2.5 rounded-xl border border-[#130018]/30 bg-[#130018]/4 text-xs font-semibold text-black/70 transition-all flex items-center justify-center gap-1.5 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          >
            <Check className="w-3.5 h-3.5 group-hover/rm:hidden" />
            <Trash2 className="w-3.5 h-3.5 hidden group-hover/rm:block" />
            <span className="group-hover/rm:hidden">W zapytaniu</span>
            <span className="hidden group-hover/rm:inline">Usuń z zapytania</span>
          </button>
        ) : (
          <QtyStepper qty={qty} maxQty={device.maxQty} onChange={onChangeQty} />
        )}
      </div>
    </div>
  );
}

// ─── Cart widget (bottom-right, expandable) ──────────────────────────────────

function CartWidget({
  cart, setQty, clearCart, catalog, getDevicesBookedDates,
}: {
  cart: Cart;
  setQty: (device: DeviceData, qty: number) => void;
  clearCart: () => void;
  catalog: DeviceData[];
  getDevicesBookedDates: (deviceIds: string[]) => Set<string>;
}) {
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [method, setMethod] = useState<"pickup" | "delivery">("pickup");
  const [outsideZone, setOutsideZone] = useState(false);
  const [deliveryKm, setDeliveryKm] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ email: string; total: number; dayCount: number } | null>(null);

  useEffect(() => setMounted(true), []);

  const items = useMemo(
    () =>
      catalog.filter((d) => (cart.get(d.id) ?? 0) > 0).map((device) => ({
        device,
        qty: cart.get(device.id)!,
        perDay: calcDevicePerDay(device, cart.get(device.id)!),
        deposit: calcDeviceDeposit(device, cart.get(device.id)!),
      })),
    [cart, catalog],
  );

  // Sprzęt jedzie w jedno miejsce naraz — blokujemy terminy zajęte przez pakiety i inne wynajmy.
  const bookedDates = useMemo(
    () => getDevicesBookedDates(items.map((i) => i.device.id)),
    [items, getDevicesBookedDates],
  );
  const requiresDelivery = items.some((i) => i.device.deliveryOnly);
  const effectiveMethod = requiresDelivery ? "delivery" : method;

  const dayCount = selectedDates.size;
  const sortedDates = [...selectedDates].sort();
  const perDayTotal = items.reduce((s, i) => s + i.perDay, 0);
  const itemsTotal = perDayTotal * dayCount;
  const deliveryKmNum = effectiveMethod === "delivery" && outsideZone ? Math.max(0, Number(deliveryKm) || 0) : 0;
  const deliveryFee = calcOutOfZoneDeliveryFee(deliveryKmNum);
  const zoneFee = calcZoneDeliveryFee(itemsTotal, effectiveMethod === "delivery");
  const missingToFreeDelivery = Math.max(0, FREE_DELIVERY_MIN_TOTAL - itemsTotal);
  const total = itemsTotal + zoneFee + deliveryFee;
  const depositTotal = items.reduce((s, i) => s + i.deposit, 0);
  const deliveryValid = effectiveMethod === "pickup" || !outsideZone || deliveryKmNum > 0;
  const canSubmit = items.length > 0 && dayCount > 0 && deliveryValid && !submitting;

  useEffect(() => {
    setSelectedDates((prev) => {
      const next = new Set([...prev].filter((d) => !bookedDates.has(d)));
      return next.size === prev.size ? prev : next;
    });
  }, [bookedDates]);

  const toggleDate = (d: string) =>
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (dayCount === 0) {
      setSubmitError("Wybierz co najmniej jeden termin w kalendarzu.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    const payload: DeviceRentalRequestPayload = {
      items: items.map(({ device, qty }) => ({ deviceId: device.id, qty })),
      dates: sortedDates,
      delivery: {
        method: effectiveMethod,
        ...(effectiveMethod === "delivery" ? { outsideZone, ...(outsideZone ? { km: deliveryKmNum } : {}) } : {}),
      },
      customer: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      },
    };

    try {
      const res = await fetch("/api/device-rental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Nie udało się wysłać zapytania.");
      }
      setSuccess({ email: form.email.trim(), total, dayCount });
      clearCart();
      setSelectedDates(new Set());
      setForm({ name: "", phone: "", email: "", notes: "" });
      setDeliveryKm("");
      setOutsideZone(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Nie udało się wysłać zapytania.");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0 && !success) return null;
  // Renderowanie do <body>: sekcje strony mają własny stacking context (relative z-10),
  // przez co przypięty koszyk chowałby się pod kolejnymi sekcjami przy przewijaniu.
  if (!mounted) return null;

  // ── Zwinięty pasek ──
  if (!expanded) {
    return createPortal(
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 right-4 z-[60] flex items-center gap-3 rounded-full bg-[#130018] text-white shadow-2xl shadow-[#130018]/30 pl-4 pr-5 py-3 hover:bg-black transition-colors"
      >
        <div className="relative">
          <ShoppingCart className="w-5 h-5" strokeWidth={1.75} />
          {items.length > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#ff3cac] text-[10px] font-bold flex items-center justify-center">
              {items.length}
            </span>
          )}
        </div>
        <div className="text-left">
          <p className="text-xs font-bold leading-tight">
            {success && items.length === 0 ? "Zapytanie wysłane ✓" : "Zapytaj o termin"}
          </p>
          {items.length > 0 && <p className="text-[10px] text-white/55">{perDayTotal} zł / doba</p>}
        </div>
        <ChevronDown className="w-4 h-4 rotate-180 text-white/60" />
      </button>,
      document.body,
    );
  }

  // ── Rozwinięty panel ──
  return createPortal(
    <div className="fixed bottom-0 right-0 sm:bottom-4 sm:right-4 z-[60] w-full sm:w-[24rem] sm:max-w-[calc(100vw-2rem)]">
      <div className="bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl border border-black/10 flex flex-col max-h-[88dvh] sm:max-h-[85dvh] overflow-hidden">
        <div className="h-0.5 bg-[#130018] flex-shrink-0" />
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/6 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <ShoppingCart className="w-4.5 h-4.5 text-[#130018]" strokeWidth={1.75} />
              {items.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#ff3cac] text-[9px] font-bold text-white flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-black/80">Twoje zapytanie</p>
          </div>
          <button
            type="button"
            aria-label="Zwiń koszyk"
            onClick={() => setExpanded(false)}
            className="w-8 h-8 flex items-center justify-center text-black/30 hover:text-black/60 rounded-lg hover:bg-black/5 transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {success && items.length === 0 ? (
          <div className="px-5 py-8 text-center overflow-y-auto">
            <div className="w-14 h-14 rounded-full bg-black/5 border border-black/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-[#130018]" />
            </div>
            <h3 className="text-xl font-black text-black/80 mb-2 tracking-tight">Gotowe!</h3>
            <p className="text-black/40 text-sm mb-1">Zapytanie dotarło. Oddzwonimy w ciągu 24 h.</p>
            <p className="text-black/35 text-xs mb-6">Potwierdzenie wysłaliśmy też na {success.email}</p>
            <button
              type="button"
              onClick={() => { setSuccess(null); setExpanded(false); }}
              className="px-8 py-3 border border-black/12 text-black/40 text-sm rounded-xl hover:bg-black/4 transition-colors"
            >
              Zamknij
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
            <div className="overflow-y-auto px-4 py-4 space-y-5 min-h-0">
              {/* Pozycje */}
              <div className="space-y-2">
                {items.map(({ device, qty, perDay, deposit }) => (
                  <div key={device.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-black/8 bg-black/2">
                    <div className="w-12 h-12 rounded-lg bg-white border border-black/6 overflow-hidden flex-shrink-0">
                      <DeviceImage device={device} className="w-full h-full !p-1" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-black/75 leading-snug truncate">{device.name}</p>
                      <p className="text-[11px] text-black/40">
                        {perDay} zł / doba{deposit > 0 && <span className="text-black/30"> · kaucja {deposit} zł</span>}
                      </p>
                    </div>
                    {device.maxQty > 1 && (
                      <QtyStepper compact qty={qty} maxQty={device.maxQty} onChange={(n) => setQty(device, n)} />
                    )}
                    <button
                      type="button"
                      aria-label={`Usuń ${device.name}`}
                      onClick={() => setQty(device, 0)}
                      className="w-7 h-7 flex items-center justify-center text-black/25 hover:text-red-500 rounded-lg hover:bg-black/5 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Terminy */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-black/30 mb-3">Terminy</p>
                <CalendarPicker selectedDates={selectedDates} onToggle={toggleDate} bookedDates={bookedDates} />
              </div>

              {/* Dostawa */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-black/30 mb-3">Odbiór czy dowóz?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={requiresDelivery}
                    onClick={() => { setMethod("pickup"); setOutsideZone(false); setDeliveryKm(""); }}
                    className={[
                      "p-3 rounded-xl border text-left transition-all",
                      effectiveMethod === "pickup" ? "border-[#130018]/40 bg-[#130018]/3" : "border-black/8 bg-black/2 hover:border-black/20",
                      requiresDelivery ? "opacity-40 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    <span className="text-xs font-semibold text-black/75 block">Odbiór osobisty</span>
                    <span className="text-[10px] text-black/40">0 zł · Trójmiasto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("delivery")}
                    className={[
                      "p-3 rounded-xl border text-left transition-all",
                      effectiveMethod === "delivery" ? "border-[#130018]/40 bg-[#130018]/3" : "border-black/8 bg-black/2 hover:border-black/20",
                    ].join(" ")}
                  >
                    <span className="text-xs font-semibold text-black/75 block">Dowóz{requiresDelivery ? " i montaż" : ""}</span>
                    <span className="text-[10px] text-black/40">
                      {zoneFee > 0 ? `+${zoneFee} zł` : "gratis w strefie"}
                    </span>
                  </button>
                </div>
                {effectiveMethod === "delivery" && (
                  zoneFee > 0 ? (
                    <p className="text-[11px] text-amber-700/85 mt-2 leading-relaxed">
                      Dowóz w strefie {DELIVERY_FREE_ZONE}: <strong>+{DEVICE_DELIVERY_FEE} zł</strong>.
                      Gratis od {FREE_DELIVERY_MIN_TOTAL} zł — brakuje {missingToFreeDelivery} zł
                      {dayCount === 0 && " (dolicz terminy, żeby zobaczyć finalną kwotę)"}.
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-700/85 mt-2 leading-relaxed">
                      Dostawa i montaż gratis — {DELIVERY_FREE_ZONE} (zamówienie od {FREE_DELIVERY_MIN_TOTAL} zł).
                    </p>
                  )
                )}
                {requiresDelivery && (
                  <p className="text-[11px] text-black/35 mt-2 leading-relaxed">
                    Część wybranego sprzętu wynajmujemy tylko z dowozem i montażem.
                  </p>
                )}
                {effectiveMethod === "delivery" && (
                  <div className="mt-2 p-3 rounded-xl border border-black/8 bg-black/2 space-y-2.5">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={outsideZone}
                        onChange={e => {
                          setOutsideZone(e.target.checked);
                          if (!e.target.checked) setDeliveryKm("");
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-black/20 accent-[#130018]"
                      />
                      <span className="text-xs text-black/65 leading-snug">
                        Dowóz poza strefą gratis (powyżej {DELIVERY_FREE_ZONE})
                      </span>
                    </label>
                    {outsideZone && (
                      <div>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          className={INPUT_CLASS}
                          placeholder="Ile km poza strefą? (w jedną stronę)"
                          value={deliveryKm}
                          onChange={e => setDeliveryKm(e.target.value)}
                        />
                        <p className="text-[10px] text-black/35 mt-1.5">
                          {DELIVERY_RATE_ONE_WAY} zł/km × {DELIVERY_TRIPS} dojazdy
                          {deliveryKmNum > 0 && <> = <span className="font-semibold">+{deliveryFee} zł</span></>}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dane kontaktowe */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-black/30 mb-3">Twoje dane</p>
                <div className="space-y-2">
                  {[
                    { key: "name", type: "text", placeholder: "Imię i nazwisko" },
                    { key: "phone", type: "tel", placeholder: "Numer telefonu" },
                    { key: "email", type: "email", placeholder: "E-mail" },
                  ].map(({ key, type, placeholder }) => (
                    <input
                      key={key}
                      required
                      type={type}
                      className={INPUT_CLASS}
                      placeholder={placeholder}
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    />
                  ))}
                  <textarea
                    rows={2}
                    className={`${INPUT_CLASS} resize-none`}
                    placeholder="Uwagi (opcjonalnie) — np. adres dowozu"
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>

              {submitError && (
                <p className="text-sm text-red-600/80 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {submitError}
                </p>
              )}
            </div>

            {/* Podsumowanie + wyślij */}
            <div className="flex-shrink-0 px-4 py-3.5 border-t border-black/8 bg-white space-y-2.5">
              <div className="flex items-baseline justify-between text-xs text-black/45">
                <span>
                  {perDayTotal} zł/doba
                  {dayCount > 0 && <> × {dayCount} {dobaLabel(dayCount)}</>}
                  {zoneFee > 0 && <> + dowóz {zoneFee} zł</>}
                  {deliveryFee > 0 && <> + poza strefą {deliveryFee} zł</>}
                </span>
                <span className="font-semibold text-black/70">
                  {dayCount > 0 ? `${total} zł` : "— zł"}
                </span>
              </div>
              {depositTotal > 0 && (
                <div className="flex items-baseline justify-between text-xs text-black/40">
                  <span>Kaucja (zwrotna po zdaniu sprzętu)</span>
                  <span>{depositTotal} zł</span>
                </div>
              )}
              <div className="flex items-baseline justify-between pt-1.5 border-t border-black/8">
                <span className="text-xs font-semibold text-black/60">Razem przy odbiorze</span>
                <span className="text-base font-black text-[#130018]">
                  {dayCount > 0 ? `${total + depositTotal} zł` : "— zł"}
                </span>
              </div>
              {dayCount === 0 && (
                <p className="text-[11px] text-amber-700/80">Wybierz termin w kalendarzu powyżej.</p>
              )}
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all bg-[#130018] hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {submitting ? "Wysyłanie…" : <>Wyślij zapytanie o termin <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

export function DevicesSection() {
  const { devices: catalog, getDevicesBookedDates } = useSiteConfig();
  const [cart, setCart] = useState<Cart>(new Map());

  const setQty = (device: DeviceData, qty: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      const clamped = Math.min(device.maxQty, Math.max(0, qty));
      if (clamped === 0) next.delete(device.id);
      else next.set(device.id, clamped);
      return next;
    });
  };

  const clearCart = () => setCart(new Map());

  return (
    <section id="sprzet" className="border-t border-black/6 bg-[#fafaf9] sm:bg-white relative z-10 py-8 sm:py-16">
      <div className="mx-auto w-full max-w-7xl 2xl:max-w-[max(80rem,60vw)] px-4 sm:px-6 xl:px-8">
        <div className="mb-6 sm:mb-10 text-center sm:text-left">
          <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-2 sm:mb-3 font-semibold">Wynajem sprzętu</p>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[#130018] sm:text-black/80 mb-2 sm:mb-3" style={{ fontFamily: "'Oxanium', sans-serif" }}>
            Sam skompletuj swój zestaw
          </h2>
          <p className="text-base text-black/45 max-w-2xl leading-relaxed mx-auto sm:mx-0">
            Nie potrzebujesz całego pakietu? Wybierz dokładnie to, czego Ci brakuje — głośnik, projektor,
            mikrofon czy zasilanie. Dodaj sprzęt do zapytania i wyślij — oddzwonimy w 24 h.
          </p>
          <p className="text-sm text-black/40 mt-2.5 inline-flex items-center gap-2 rounded-full border border-black/8 bg-black/2 px-3.5 py-1.5">
            <Truck className="w-3.5 h-3.5 flex-shrink-0 text-emerald-700/70" strokeWidth={1.75} />
            Dowóz gratis od {FREE_DELIVERY_MIN_TOTAL} zł ({DELIVERY_FREE_ZONE}) — poniżej +{DEVICE_DELIVERY_FEE} zł
          </p>
        </div>

        <div className="space-y-8 sm:space-y-12">
          {DEVICE_CATEGORIES.map((category) => {
            const devices = catalog.filter((d) => d.category === category.id);
            if (devices.length === 0) return null;
            const Icon = CATEGORY_ICONS[category.id];
            return (
              <div key={category.id}>
                <div className="flex items-center gap-3 mb-4 sm:mb-5">
                  <div className="w-9 h-9 rounded-xl bg-[#130018]/5 border border-black/8 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4.5 h-4.5 text-[#130018]/70" strokeWidth={1.6} />
                  </div>
                  <div className="min-w-0 text-left">
                    <h3 className="text-base sm:text-lg font-bold text-black/75 leading-tight" style={{ fontFamily: "'Oxanium', sans-serif" }}>
                      {category.name}
                    </h3>
                    <p className="text-xs text-black/35">{category.tagline}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-5">
                  {devices.map((device) => (
                    <DeviceCard
                      key={device.id}
                      device={device}
                      qty={cart.get(device.id) ?? 0}
                      onChangeQty={(next) => setQty(device, next)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CartWidget
        cart={cart}
        setQty={setQty}
        clearCart={clearCart}
        catalog={catalog}
        getDevicesBookedDates={getDevicesBookedDates}
      />
    </section>
  );
}
