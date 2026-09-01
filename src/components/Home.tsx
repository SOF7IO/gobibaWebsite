"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  X, Mic2, Tv2, Disc3, Presentation,
  ArrowRight, Check, Speaker,
  Calendar, Users, Zap, Menu, Phone, Mail, MapPin, Sparkles,
  ShieldCheck, FileText, MousePointerClick,
} from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { Sof7Logo } from "@/components/Sof7Logo";
import { CalendarPicker, Steps } from "@/components/booking-widgets";
import { DevicesSection } from "@/components/DevicesSection";
import { useSiteConfig } from "@/components/SiteConfigProvider";
import type { BookingRequestPayload } from "@/lib/booking";
import {
  calcOutOfZoneDeliveryFee,
  DELIVERY_FREE_ZONE,
  DELIVERY_RATE_ONE_WAY,
  DELIVERY_TRIPS,
  SERVICE_LEVELS,
  type PackageData,
  type ServiceLevelId,
} from "@/lib/packages-data";
import { SITE } from "@/lib/site";

const logoMark = "/images/brand/logo-mark.png";
const logoFull = "/images/brand/logo-full.png";
const heroImage = "/images/hero/plac-impreza.png";
const heroImage2 = "/images/hero/strefa-kibica-las.png";
const heroImage3 = "/images/hero/namiot-plaza.png";
const heroImage4 = "/images/hero/prezentacja-biznesowa.png";

const HERO_IMAGES = [heroImage, heroImage2, heroImage3, heroImage4];

const PACKAGE_TILE_STYLES: Record<string, { gradient: string; iconClass: string }> = {
  karaoke:      { gradient: "from-[#ff3cac]/12 via-[#7b2fff]/8 to-[#fdf9ff]", iconClass: "text-[#7b2fff]" },
  "fan-zone":   { gradient: "from-[#009688]/12 via-[#1565c0]/8 to-[#fdf9ff]", iconClass: "text-[#1565c0]" },
  "party-tent": { gradient: "from-[#ff3cac]/18 via-[#130018]/8 to-[#f3eeff]", iconClass: "text-[#ff3cac]" },
  presentation: { gradient: "from-black/6 via-black/3 to-[#fdf9ff]", iconClass: "text-[#130018]/70" },
};

const PACKAGE_IMAGES: Record<string, string> = {
  karaoke: "/images/packages/pkg-karaoke.jpg",
  "fan-zone": "/images/packages/pkg-fan-zone.jpg",
  "party-tent": "/images/packages/pkg-party-tent.jpg",
  presentation: "/images/packages/pkg-presentation.jpg",
};

const SITE_CONTAINER = "mx-auto w-full max-w-7xl 2xl:max-w-[max(80rem,60vw)]";
const SECTION_INNER = `${SITE_CONTAINER} px-4 sm:px-6 xl:px-8`;

const MOBILE_NAV = [
  { label: "Oferta", href: "#pakiety", Icon: Sparkles, desc: "Karaoke, kino, klub i więcej" },
  { label: "Sprzęt", href: "#sprzet", Icon: Speaker, desc: "Sam skompletuj swój zestaw" },
  { label: "Jak to działa", href: "#jak-to-dziala", Icon: Zap, desc: "Rezerwacja w 3 krokach" },
  { label: "Kontakt", href: "#kontakt", Icon: Mail, desc: "Odpowiadamy w 24 h" },
] as const;

const HERO_TRUST = [
  {
    label: "100% zgodne z BHP",
    visual: (
      <div className="flex items-center gap-1 lg:gap-1.5">
        <span className="text-xl sm:text-2xl lg:text-4xl xl:text-[2.5rem] font-black leading-none tracking-tight">100%</span>
        <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 lg:w-7 lg:h-7 text-emerald-600" strokeWidth={2.25} />
      </div>
    ),
  },
  {
    label: "Pełna faktura VAT",
    visual: (
      <FileText className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 xl:w-11 xl:h-11 text-amber-700/85" strokeWidth={1.35} />
    ),
  },
  {
    label: "Wsparcie live w trakcie eventu",
    visual: (
      <span className="text-xl sm:text-2xl lg:text-4xl xl:text-[2.5rem] font-black leading-none tracking-tight">360°</span>
    ),
  },
] as const;

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Wybierz gotowy pakiet, lub skompletuj go sam",
    desc: "Kliknij pakiet, żeby zobaczyć co wchodzi w skład i wybrać poziom obsługi. A jeśli wolisz po swojemu — w sekcji „Sam skompletuj swój zestaw” dorzucasz pojedynczy sprzęt do koszyka.",
    Icon: Sparkles,
  },
  {
    n: "02",
    title: "Wybierz termin i wyślij zapytanie",
    desc: "Zaznacz w kalendarzu jeden dzień lub kilka, zostaw namiary i wyślij. Potwierdzenie dostaniesz od razu mailem, a my oddzwonimy w ciągu 24 h.",
    Icon: Calendar,
  },
  {
    n: "03",
    title: "Impreza się rozkręca",
    desc: "Wybierasz dowóz? Przyjeżdżamy wcześniej, rozstawiamy sprzęt i sprawdzamy, czy wszystko gra. Wolisz odebrać sam? Wydajemy sprzęt gotowy do pracy i pokazujemy obsługę. Tak czy siak jesteśmy pod telefonem przez całą imprezę.",
    Icon: Users,
  },
] as const;

// ─── Data ─────────────────────────────────────────────────────────────────────

const PACKAGE_ICONS = {
  karaoke: Mic2,
  "fan-zone": Tv2,
  "party-tent": Disc3,
  presentation: Presentation,
} as const;

type Package = PackageData & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: any;
};

function withPackageIcons(data: PackageData[]): Package[] {
  return data.map((pkg) => ({
    ...pkg,
    Icon: PACKAGE_ICONS[pkg.id as keyof typeof PACKAGE_ICONS],
  }));
}

// ─── Booking flow ─────────────────────────────────────────────────────────────

type ServiceLevelOption = {
  id: ServiceLevelId;
  name: string;
  desc: string;
  priceAdd: number;
  badge?: string;
};

function BookingFlow({
  pkg,
  addonIds,
  onClose,
  serviceLevels,
  bookedDates,
}: {
  pkg: Package;
  addonIds: Set<string>;
  onClose: () => void;
  serviceLevels: ServiceLevelOption[];
  bookedDates: Set<string>;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [serviceLevel, setServiceLevel] = useState<ServiceLevelId>("delivery");
  const [outsideDelivery, setOutsideDelivery] = useState(false);
  const [deliveryKm, setDeliveryKm] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", company: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const svc = serviceLevels.find(s => s.id === serviceLevel)!;
  const chosenAddons = pkg.addons.filter(a => addonIds.has(a.id));
  const addonsPerDay = chosenAddons.reduce((s, a) => s + a.price, 0);
  const addonsDeposit = chosenAddons.reduce((s, a) => s + (a.deposit ?? 0), 0);
  const deposit = pkg.deposit + addonsDeposit;
  const dayCount = selectedDates.size;
  const deliveryKmNum = outsideDelivery ? Math.max(0, Number(deliveryKm) || 0) : 0;
  const deliveryFee = calcOutOfZoneDeliveryFee(deliveryKmNum);
  const packageTotal = pkg.price * dayCount;
  const addonsTotal = addonsPerDay * dayCount;
  const serviceTotal = svc.priceAdd * dayCount;
  const subtotal = packageTotal + addonsTotal + serviceTotal + deliveryFee;
  const deliveryValid = !outsideDelivery || deliveryKmNum > 0;
  const canContinueStep1 = dayCount > 0 && deliveryValid;
  const sortedDates = [...selectedDates].sort();
  const inputClass = "w-full bg-black/3 border border-black/8 rounded-xl px-4 py-3 text-sm text-black/80 placeholder-black/25 focus:outline-none focus:border-black/25 focus:bg-white transition-all";

  const toggleDate = (d: string) =>
    setSelectedDates(prev => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    const payload: BookingRequestPayload = {
      packageId: pkg.id,
      dates: sortedDates,
      serviceLevelId: serviceLevel,
      addonIds: [...addonIds],
      delivery: {
        outsideZone: outsideDelivery,
        ...(outsideDelivery ? { km: deliveryKmNum } : {}),
      },
      customer: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        ...(form.company.trim() ? { company: form.company.trim() } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      },
    };

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Nie udało się wysłać zapytania.");
      }
      setStep(3);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Nie udało się wysłać zapytania.");
    } finally {
      setSubmitting(false);
    }
  };

  const deliveryBlock = (
    <div className="p-4 rounded-xl border border-black/8 bg-black/2 space-y-3">
      <p className="text-[10px] uppercase tracking-[0.3em] text-black/30">Dowóz</p>
      <p className="text-xs text-black/45 leading-relaxed">
        Gratis: dostawa i montaż na terenie {DELIVERY_FREE_ZONE}.
      </p>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={outsideDelivery}
          onChange={e => {
            setOutsideDelivery(e.target.checked);
            if (!e.target.checked) setDeliveryKm("");
          }}
          className="mt-1 h-4 w-4 rounded border-black/20 accent-[#130018]"
        />
        <span className="text-sm text-black/65 leading-snug">
          Dowóz poza strefą gratis (powyżej {DELIVERY_FREE_ZONE})
        </span>
      </label>
      {outsideDelivery && (
        <div>
          <label className="text-[10px] text-black/35 uppercase tracking-wider block mb-1.5">
            Ile km powyżej strefy gratis? (w jedną stronę)
          </label>
          <input
            type="number"
            min={1}
            step={1}
            className={inputClass}
            placeholder="np. 5"
            value={deliveryKm}
            onChange={e => setDeliveryKm(e.target.value)}
          />
          <p className="text-[11px] text-black/35 mt-2 leading-relaxed">
            {DELIVERY_RATE_ONE_WAY} zł/km × {DELIVERY_TRIPS} dojazdy (montaż + odbiór)
            {deliveryKmNum > 0 && (
              <> = <span className="font-semibold text-black/55">+{deliveryFee} zł</span> do całej rezerwacji</>
            )}
          </p>
        </div>
      )}
    </div>
  );

  const priceSummary = dayCount > 0 && (
    <div className="p-4 rounded-xl bg-black/3 border border-black/6 space-y-2 text-xs text-black/40">
      <div className="flex justify-between"><span>Pakiet ({dayCount} {dayCount === 1 ? "dzień" : "dni"} × {pkg.price} zł)</span><span>{packageTotal} zł</span></div>
      {addonsTotal > 0 && <div className="flex justify-between"><span>Opcje ({dayCount} dni)</span><span>+{addonsTotal} zł</span></div>}
      {serviceTotal > 0 && <div className="flex justify-between"><span>{svc.name} ({dayCount} dni × {svc.priceAdd} zł)</span><span>+{serviceTotal} zł</span></div>}
      {deliveryFee > 0 && <div className="flex justify-between"><span>Dowóz poza strefą ({deliveryKmNum} km)</span><span>+{deliveryFee} zł</span></div>}
      <div className="flex justify-between text-black/30">
        <span>Kaucja (zwrotna){addonsDeposit > 0 && <> — pakiet {pkg.deposit} zł + opcje {addonsDeposit} zł</>}</span>
        <span>{deposit} zł</span>
      </div>
      <div className="flex justify-between text-sm font-bold text-black/80 pt-2 border-t border-black/6"><span>Razem</span><span>{subtotal + deposit} zł</span></div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center md:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-lg overflow-hidden max-h-[96dvh] md:max-h-[92dvh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="h-0.5 w-full bg-[#130018] flex-shrink-0" />
        <div className="flex items-center justify-between px-5 sm:px-7 pt-5 pb-4 border-b border-black/6 flex-shrink-0">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-black/30 mb-0.5">Rezerwacja</p>
            <h3 className="text-base font-bold text-black/80">{pkg.name}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-black/25 hover:text-black/60 transition-colors rounded-lg hover:bg-black/5">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 sm:px-7 pt-5 pb-6 sm:pb-7 overflow-y-auto">
          {step !== 3 && <Steps current={step} />}

          {step === 1 && (
            <div className="space-y-6">
              <CalendarPicker selectedDates={selectedDates} onToggle={toggleDate} bookedDates={bookedDates} />
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-black/30 mb-3">Jaka obsługa?</p>
                <div className="space-y-2">
                  {serviceLevels.map(s => (
                    <button key={s.id} type="button" onClick={() => setServiceLevel(s.id as ServiceLevelId)}
                      className={[
                        "w-full text-left p-4 rounded-xl border transition-all",
                        serviceLevel === s.id ? "border-[#130018]/40 bg-[#130018]/3" : "border-black/8 bg-black/2 hover:border-black/20",
                      ].join(" ")}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-black/75">{s.name}</span>
                            {"badge" in s && <span className="text-[9px] px-2 py-0.5 rounded-full bg-black/6 text-black/40 uppercase tracking-wider border border-black/8">{s.badge}</span>}
                          </div>
                          <p className="text-xs text-black/40 leading-relaxed">{s.desc}</p>
                          {dayCount > 1 && s.priceAdd > 0 && (
                            <p className="text-[10px] text-black/35 mt-1">{dayCount} dni × {s.priceAdd} zł = +{s.priceAdd * dayCount} zł</p>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-black/35 flex-shrink-0 text-right">
                          {s.priceAdd === 0 ? "w cenie" : dayCount > 1 ? `+${s.priceAdd} zł/dzień` : `+${s.priceAdd} zł`}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {deliveryBlock}
              {priceSummary}

              <button disabled={!canContinueStep1} onClick={() => setStep(2)}
                className="w-full py-4 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-25 disabled:cursor-not-allowed bg-[#130018] hover:bg-black">
                Dalej — wpisz dane <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-2 mb-5 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/4 border border-black/8 text-xs text-black/60">
                  <Calendar className="w-3.5 h-3.5 text-black/40 shrink-0" />
                  <span>{dayCount} {dayCount === 1 ? "dzień" : "dni"}: {sortedDates.join(", ")}</span>
                  <button type="button" onClick={() => setStep(1)} className="text-black/25 hover:text-black/50 ml-1 transition-colors">✎</button>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/4 border border-black/8 text-xs text-black/50">{svc.name}</div>
                {deliveryFee > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/4 border border-black/8 text-xs text-black/50">
                    Dowóz +{deliveryKmNum} km: +{deliveryFee} zł
                  </div>
                )}
              </div>
              {serviceLevel === "corporate" && (
                <div><label className="text-[10px] text-black/35 uppercase tracking-wider block mb-1.5">Firma</label><input className={inputClass} placeholder="Nazwa firmy Sp. z o.o." value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
              )}
              {[{ label: "Imię i nazwisko", key: "name", type: "text", placeholder: "Olek Nowak" }, { label: "Numer telefonu", key: "phone", type: "tel", placeholder: "+48 600 123 456" }, { label: "E-mail", key: "email", type: "email", placeholder: "olek@impreza.pl" }].map(({ label, key, type, placeholder }) => (
                <div key={key}><label className="text-[10px] text-black/35 uppercase tracking-wider block mb-1.5">{label}</label><input required type={type} className={inputClass} placeholder={placeholder} value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} /></div>
              ))}

              <div><label className="text-[10px] text-black/35 uppercase tracking-wider block mb-1.5">{serviceLevel === "corporate" ? "Szczegóły eventu" : "Cokolwiek jeszcze (opcjonalnie)"}</label><textarea rows={2} className={`${inputClass} resize-none`} placeholder={serviceLevel === "corporate" ? "Ilu gości, o której, specjalne wymagania..." : "np. brama od tyłu, jest pies..."} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              {priceSummary}
              {submitError && (
                <p className="text-sm text-red-600/80 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {submitError}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-xl font-semibold text-sm text-white transition-all bg-[#130018] hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Wysyłanie zapytania…" : "Potwierdzam rezerwację"}
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-black/5 border border-black/10 flex items-center justify-center mx-auto mb-5">
                <Check className="w-7 h-7 text-[#130018]" />
              </div>
              <h3 className="text-2xl font-black text-black/80 mb-2 tracking-tight">Gotowe!</h3>
              <p className="text-black/40 text-sm mb-1">Zapytanie dotarło. Oddzwonimy w ciągu 24 h.</p>
              <p className="text-black/35 text-xs mb-2">Potwierdzenie wysłaliśmy też na {form.email}</p>
              <p className="text-black/25 text-xs mb-2">{dayCount} {dayCount === 1 ? "dzień" : "dni"} ({sortedDates.join(", ")}) · {pkg.name}</p>
              <p className="text-black/20 text-xs mb-1">{svc.name}{serviceTotal > 0 ? ` — ${dayCount} × ${svc.priceAdd} zł = ${serviceTotal} zł` : ""}</p>
              {deliveryFee > 0 && (
                <p className="text-black/20 text-xs mb-1">Dowóz poza strefą: +{deliveryKmNum} km (+{deliveryFee} zł)</p>
              )}
              <p className="text-black/20 text-xs mb-8">Suma: {subtotal + deposit} zł (w tym kaucja {deposit} zł)</p>
              <button onClick={onClose} className="px-8 py-3 border border-black/12 text-black/40 text-sm rounded-xl hover:bg-black/4 transition-colors">Zamknij</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Package detail ───────────────────────────────────────────────────────────

function PackageDetail({ pkg, onClose, onBook }: {
  pkg: Package;
  onClose: () => void;
  onBook: (addons: Set<string>) => void;
}) {
  const Icon = pkg.Icon;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const chosen = pkg.addons.filter(a => selected.has(a.id));
  const addonsTotal = chosen.reduce((s, a) => s + a.price, 0);
  const depositTotal = pkg.deposit + chosen.reduce((s, a) => s + (a.deposit ?? 0), 0);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end md:flex-row md:justify-end md:items-stretch" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full md:max-w-md lg:max-w-lg xl:max-w-xl flex flex-col h-[92dvh] md:h-dvh max-h-dvh rounded-t-3xl md:rounded-none border-t border-black/8 md:border-t-0 md:border-l border-black/8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-0.5 bg-[#130018] w-full flex-shrink-0" />
        <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center text-black/25 hover:text-black/60 transition-colors rounded-lg hover:bg-black/5 z-10">
          <X className="w-4 h-4" />
        </button>

        <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex items-center justify-center bg-white border-b border-black/6">
          {PACKAGE_IMAGES[pkg.id] ? (
            <img
              src={PACKAGE_IMAGES[pkg.id]}
              alt={pkg.name}
              className="h-52 sm:h-64 w-auto object-contain py-4"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-white border border-black/10 flex items-center justify-center shadow-sm my-10 sm:my-14">
              <Icon className="w-9 h-9 text-black/50" />
            </div>
          )}
        </div>

        <div className="px-5 sm:px-8 py-5 border-b border-black/6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-black/30 mb-1">{pkg.category}</p>
          <h2 className="text-2xl font-black tracking-tight text-black/85 mb-1" style={{ fontFamily: "'Oxanium', sans-serif" }}>{pkg.name}</h2>
          <p className="text-sm text-black/40 italic mb-3">{pkg.tagline}</p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-black/30">
            <span>★ {pkg.rating} ({pkg.reviews})</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{pkg.capacity}</span>
            <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" />Montaż {pkg.setup}</span>
          </div>
        </div>

        <div className="px-5 sm:px-8 py-5 border-b border-black/6">
          <p className="text-black/50 text-sm leading-relaxed">{pkg.description}</p>
        </div>

        <div className="px-5 sm:px-8 py-5 border-b border-black/6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-black/25 mb-3">Co wchodzi w skład</p>
          <div className="space-y-2.5">
            {pkg.features.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-4 h-4 rounded-full bg-black/5 border border-black/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-2.5 h-2.5 text-black/40" />
                </div>
                <span className="text-sm text-black/55">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {pkg.addons.length > 0 && (
          <div className="px-5 sm:px-8 py-5 border-b border-black/6">
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-[10px] uppercase tracking-[0.3em] text-black/25">Podkręć imprezę</p>
              {selected.size > 0 && (
                <span className="text-[10px] text-black/35 font-semibold">+{addonsTotal} zł wybrano</span>
              )}
            </div>
            <p className="text-xs text-black/30 mb-3">Zaznacz opcje dopłat</p>
            <div className="space-y-2">
              {pkg.addons.map(addon => {
                const on = selected.has(addon.id);
                return (
                  <button key={addon.id} type="button" onClick={() => toggle(addon.id)}
                    className={[
                      "w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-all",
                      on ? "border-[#130018]/30 bg-[#130018]/4" : "border-black/8 hover:border-black/18",
                    ].join(" ")}>
                    <div className={[
                      "w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-all border",
                      on ? "bg-[#130018] border-[#130018]" : "bg-white border-black/15",
                    ].join(" ")}>
                      {on && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="flex-1 text-sm text-black/65 leading-snug">{addon.label}</span>
                    <span className="text-xs font-semibold text-black/40 flex-shrink-0 mt-0.5">+{addon.price} zł</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="px-5 sm:px-8 py-5 border-b border-black/6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-black/25 mb-3">Zawsze w cenie</p>
          <div className="flex flex-wrap gap-2">
            {[`Dostawa i montaż — ${DELIVERY_FREE_ZONE} 🚐`, "Demontaż i odbiór 🔧", "Ubezpieczenie 🛡️"].map(t => (
              <span key={t} className="text-[11px] px-3 py-1.5 rounded-full border border-black/10 text-black/40 bg-black/2">{t}</span>
            ))}
          </div>
        </div>
        </div>

        <div className="flex-shrink-0 px-5 sm:px-8 py-5 border-t border-black/8 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
          <div className="flex items-end justify-between mb-4 gap-4">
            <div>
              <p className="text-[10px] text-black/25 uppercase tracking-wider mb-1">Cena za dzień</p>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl font-black text-[#130018]">{pkg.price + addonsTotal} zł</span>
                {addonsTotal > 0
                  ? <span className="text-xs text-black/30 line-through">{pkg.price} zł</span>
                  : <span className="text-xs text-black/25">+ {depositTotal} zł kaucja</span>
                }
              </div>
              {addonsTotal > 0 && (
                <p className="text-[11px] text-black/35 mt-0.5">
                  baza {pkg.price} zł + opcje {addonsTotal} zł · kaucja {depositTotal} zł
                </p>
              )}
            </div>
            <span className="flex items-center gap-1.5 text-xs text-black/30 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Dostępne terminy
            </span>
          </div>
          <button onClick={() => onBook(selected)}
            className="w-full py-4 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all bg-[#130018] hover:bg-black">
            <Calendar className="w-4 h-4" />Zarezerwuj ten pakiet
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Large tile ───────────────────────────────────────────────────────────────

function LargeTile({ pkg, onClick }: { pkg: Package; onClick: () => void }) {
  const Icon = pkg.Icon;
  const tileStyle = PACKAGE_TILE_STYLES[pkg.id] ?? PACKAGE_TILE_STYLES.presentation;
  const image = PACKAGE_IMAGES[pkg.id];
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left cursor-pointer active:scale-[0.98] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[#130018]/25 rounded-xl"
    >
      <div
        className={`rounded-xl overflow-hidden relative mb-2.5 sm:mb-3 aspect-square ${image && !imgFailed ? "bg-white" : `bg-gradient-to-br ${tileStyle.gradient}`} border border-black/6 transition-transform duration-300 group-hover:scale-[1.02]`}
      >
        {image && !imgFailed ? (
          <img
            src={image}
            alt={pkg.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon
              className={`w-[5.25rem] h-[5.25rem] sm:w-24 sm:h-24 xl:w-[6.75rem] xl:h-[6.75rem] ${tileStyle.iconClass} transition-transform duration-500 group-hover:scale-110`}
              strokeWidth={1.25}
            />
          </div>
        )}
        <div className="absolute bottom-3 left-3 lg:bottom-4 lg:left-4">
          <span className="text-[9px] lg:text-[10px] xl:text-[11px] font-semibold uppercase tracking-widest px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full text-black/45 bg-white/85 backdrop-blur-sm border border-black/8">
            {pkg.category}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center text-center gap-1.5 px-0.5 sm:flex-row sm:items-start sm:justify-between sm:text-left sm:gap-3 lg:gap-4">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold text-black/80 mb-0.5 lg:mb-1 leading-snug" style={{ fontFamily: "'Oxanium', sans-serif" }}>
            {pkg.name}
          </h3>
          <p className="text-xs sm:text-sm lg:text-[15px] xl:text-base text-black/40 lg:text-black/45 leading-snug">{pkg.tagline}</p>
        </div>
        <div className="flex-shrink-0 sm:text-right">
          <p className="text-[9px] lg:text-[11px] text-black/30 mb-0.5">od</p>
          <p className="text-base sm:text-lg lg:text-xl xl:text-2xl font-black text-[#130018]">{pkg.price} zł</p>
          <p className="text-[10px] lg:text-xs text-black/30">/dzień</p>
        </div>
      </div>
    </button>
  );
}

// ─── Individual inquiry CTA ───────────────────────────────────────────────────

function IndividualInquiryCTA({ mobileSticky = false }: { mobileSticky?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-black/8 bg-white flex flex-col items-center text-center gap-4 ${
        mobileSticky
          ? "mx-4 mt-4 p-5"
          : "w-full p-6 sm:p-8 sm:flex-row sm:items-center sm:justify-between sm:text-left gap-5"
      }`}
    >
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-black/25 mb-2">Zapytanie indywidualne</p>
        <h3 className="text-lg sm:text-2xl font-black text-black/80 mb-1.5" style={{ fontFamily: "'Oxanium', sans-serif" }}>
          Napisz nam czego potrzebujesz
        </h3>
        <p className="text-base text-black/40 max-w-md leading-relaxed mx-auto sm:mx-0">
          Nie wiesz co wybrać? albo masz coś niestandardowego na głowie? Zobaczymy co da się zrobić.
        </p>
      </div>
      <a
        href="mailto:kontakt@gobiba.pl"
        className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border border-black/12 text-sm font-semibold text-black/60 hover:border-black/30 hover:text-black/80 transition-all whitespace-nowrap w-full sm:w-auto"
      >
        Napisz do nas <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}

// ─── Packages hint ────────────────────────────────────────────────────────────

function DesktopPackagesHint() {
  return (
    <div className="hidden sm:flex flex-col items-center text-center gap-2 mb-5 lg:mb-6">
      <p className="text-[11px] lg:text-xs uppercase tracking-[0.28em] text-black/35 font-medium">
        Kliknij pakiet — szczegóły, opcje i rezerwacja
      </p>
      <p className="flex items-center justify-center gap-1.5 text-xs lg:text-sm text-black/40">
        <MousePointerClick className="w-3.5 h-3.5 flex-shrink-0 opacity-70" strokeWidth={1.75} />
        Pakiety są klikalne
      </p>
    </div>
  );
}

// ─── Mobile packages carousel (native scroll-snap) ──────────────────────────

function MobilePackagesCarousel({
  packages,
  onSelect,
}: {
  packages: Package[];
  onSelect: (pkg: Package) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const progress = el.scrollLeft / (el.scrollWidth - el.clientWidth);
    setActiveIdx(Math.min(packages.length - 1, Math.round(progress * (packages.length - 1))));
  };

  return (
    <div className="sm:hidden mb-5">
      <p className="flex items-center justify-center gap-1.5 text-[10px] text-black/35 mb-3 px-4">
        <MousePointerClick className="w-3 h-3 flex-shrink-0 opacity-70" strokeWidth={1.75} />
        Przesuń palcem i dotknij pakiet — szczegóły i rezerwacja
      </p>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex gap-3 overflow-x-auto -mx-4 px-[max(1rem,calc((100vw-82vw)/2))] pb-2 snap-x snap-mandatory scroll-px-[max(1rem,calc((100vw-82vw)/2))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {packages.map((pkg) => (
          <div key={pkg.id} className="w-[82vw] max-w-[19rem] flex-shrink-0 snap-center">
            <LargeTile pkg={pkg} onClick={() => onSelect(pkg)} />
          </div>
        ))}
      </div>

      <div className="flex justify-center items-center gap-2 mt-3 px-4">
        {packages.map((pkg, i) => (
          <div
            key={pkg.id}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeIdx ? "w-6 bg-[#130018]" : "w-1.5 bg-black/15"
            }`}
          />
        ))}
      </div>
      <p className="text-center text-[10px] text-black/25 mt-1.5 px-4 tabular-nums">
        {activeIdx + 1} / {packages.length}
      </p>

      <IndividualInquiryCTA mobileSticky />
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const { packages: configPackages, serviceLevels, getBookedDates, isEditMode } = useSiteConfig();
  const packages = useMemo(() => withPackageIcons(configPackages), [configPackages]);
  const [detailPkg, setDetailPkg]   = useState<Package | null>(null);
  const [bookingPkg, setBookingPkg] = useState<Package | null>(null);
  const [addonIds, setAddonIds]     = useState<Set<string>>(new Set());
  const [mobileMenu, setMobileMenu] = useState(false);

  const panoramaImages = [...HERO_IMAGES, ...HERO_IMAGES];

  useEffect(() => {
    document.body.style.overflow = mobileMenu ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenu]);

  const scrollToPakietyTiles = useCallback(() => {
    document.getElementById("pakiety-tiles")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  useEffect(() => {
    const onPakietyLinkClick = (e: Event) => {
      const link = (e.target as HTMLElement).closest('a[href="#pakiety"]');
      if (!link) return;
      e.preventDefault();
      scrollToPakietyTiles();
      window.history.pushState(null, "", "#pakiety");
    };

    document.addEventListener("click", onPakietyLinkClick, true);

    if (window.location.hash === "#pakiety") {
      requestAnimationFrame(scrollToPakietyTiles);
    }

    return () => document.removeEventListener("click", onPakietyLinkClick, true);
  }, [scrollToPakietyTiles]);

  return (
    <main className={`min-h-screen max-lg:bg-transparent bg-[#fafaf9] text-[#130018] ${isEditMode ? "pb-[min(78dvh,680px)]" : ""}`} style={{ fontFamily: "'Manrope', sans-serif" }}>
      {isEditMode && (
        <div className="fixed top-14 sm:top-16 inset-x-0 z-[55] pointer-events-none">
          <div className="pointer-events-auto mx-auto max-w-7xl px-4 sm:px-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 text-center shadow-sm">
              Tryb edycji aktywny — zmiany widzą odwiedzający po zapisaniu (Ctrl+Shift+E, aby ukryć panel)
            </div>
          </div>
        </div>
      )}
      <h1 className="sr-only">
        gobiba.pl — wynajem sprzętu eventowego w Trójmieście: karaoke, strefa kibica, namiot klubowy i prezentacje
      </h1>

      <div aria-hidden className="lg:hidden fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="flex h-dvh w-max"
          style={{ animation: "heroPan 200s linear infinite", willChange: "transform" }}
        >
          {panoramaImages.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="h-dvh w-auto flex-shrink-0 block opacity-[0.36] saturate-[0.55] contrast-[0.9]"
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#fafaf9]/56 via-[#fafaf9]/72 to-[#fafaf9]/82" />
      </div>

      <header className="sticky top-0 z-30 border-b border-black/6 bg-white/80 max-lg:bg-white/70 lg:bg-white/55 backdrop-blur-xl">
        <nav aria-label="Główne menu" className={`${SECTION_INNER} h-14 sm:h-16 flex items-center justify-between`}>
          <a href="#" className="flex-shrink-0">
            <ImageWithFallback src={logoMark} alt="gobiba" className="h-9 sm:h-[3.75rem] w-auto object-contain" />
          </a>
          <div className="hidden md:flex items-center gap-6 lg:gap-7 text-sm lg:text-[15px] xl:text-base text-black/45 ml-auto mr-6 lg:mr-8">
            {[["Oferta", "#pakiety"], ["Sprzęt", "#sprzet"], ["Jak to działa", "#jak-to-dziala"], ["Kontakt", "#kontakt"]].map(([l, h]) => (
              <a key={l} href={h} className="hover:text-black/80 transition-colors font-medium">{l}</a>
            ))}
          </div>
          <a href={`tel:${SITE.phone}`}
            className="hidden md:inline-flex text-sm lg:text-[15px] xl:text-base font-semibold px-5 py-2 lg:px-6 lg:py-2.5 rounded-full border border-black/12 text-black/60 hover:border-black/30 hover:text-black/80 transition-all tabular-nums tracking-wide">
            {SITE.phoneDisplay}
          </a>
          <button
            type="button"
            aria-label="Otwórz menu"
            className="md:hidden relative w-10 h-10 rounded-full border border-black/10 bg-gradient-to-br from-[#ff3cac]/8 to-[#7b2fff]/8 flex items-center justify-center text-[#130018]/70 hover:border-[#7b2fff]/30 transition-all"
            onClick={() => setMobileMenu(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
        </nav>
      </header>

      {mobileMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Zamknij menu"
            className="absolute inset-0 bg-black/25 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setMobileMenu(false)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm flex flex-col bg-[#fafaf9] text-[#130018] shadow-2xl animate-in slide-in-from-right duration-300 overflow-hidden border-l border-black/8">

            <div className="relative flex items-center justify-between px-5 pt-5 pb-4 border-b border-black/8 bg-white">
              <ImageWithFallback src={logoMark} alt="gobiba" className="h-9 w-auto object-contain" />
              <button
                type="button"
                aria-label="Zamknij menu"
                className="w-10 h-10 rounded-full border border-black/10 bg-white flex items-center justify-center text-black/50 hover:bg-black/4 hover:text-black/70 transition-colors"
                onClick={() => setMobileMenu(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative flex-1 px-5 py-6 flex flex-col gap-3">
              <p className="text-[10px] uppercase tracking-[0.35em] text-black/35 font-semibold mb-1 px-1">Menu</p>
              {MOBILE_NAV.map(({ label, href, Icon, desc }, i) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMobileMenu(false)}
                  style={{ animationDelay: `${i * 60 + 80}ms` }}
                  className="group flex items-center gap-4 p-4 rounded-2xl border border-black/8 bg-white shadow-sm hover:border-black/15 hover:shadow-md transition-all animate-in slide-in-from-right fade-in fill-mode-both duration-300"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#130018]/5 border border-black/8 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5 text-[#130018]/75" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold text-[#130018] leading-tight" style={{ fontFamily: "'Oxanium', sans-serif" }}>{label}</p>
                    <p className="text-xs text-black/45 mt-0.5">{desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-black/25 group-hover:text-black/55 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </a>
              ))}
            </div>

            <div className="relative px-5 pb-8 pt-2 space-y-3 border-t border-black/8 bg-white">
              <a
                href={`tel:${SITE.phone}`}
                className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-semibold text-sm text-white bg-[#130018] hover:bg-black transition-all"
              >
                <Phone className="w-4 h-4" />
                Zadzwoń teraz
              </a>
              <a
                href="mailto:kontakt@gobiba.pl"
                onClick={() => setMobileMenu(false)}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-medium text-black/60 border border-black/12 hover:border-black/25 hover:text-black/80 transition-all"
              >
                <Mail className="w-4 h-4" />
                kontakt@gobiba.pl
              </a>
            </div>
          </div>
        </div>
      )}

      <section className="relative z-10 overflow-hidden min-h-[calc(100dvh-3.5rem)] sm:min-h-[calc(100dvh-4rem)] lg:-mt-16 lg:pt-16 lg:h-dvh lg:min-h-0">
        <div aria-hidden className="hidden lg:block absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div
            className="flex h-dvh w-max"
            style={{ animation: "heroPan 200s linear infinite", willChange: "transform" }}
          >
            {panoramaImages.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                className="h-dvh w-auto flex-shrink-0 block opacity-[0.55] saturate-[0.85]"
              />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#fafaf9]/95 from-0% via-[#fafaf9]/60 via-[42%] to-transparent to-100%" />
        </div>

        <div className="hidden lg:block absolute bottom-10 xl:bottom-12 right-6 xl:right-10 2xl:right-14 z-20 w-[min(20rem,26vw)] pointer-events-none">
          <ImageWithFallback
            src={logoFull}
            alt="gobiba.pl — eventy plenerowe"
            className="w-full h-auto object-contain drop-shadow-sm"
          />
        </div>

        <div className={`relative z-10 h-full ${SECTION_INNER}`}>
          <div className="flex flex-col h-full min-h-[calc(100dvh-3.5rem)] sm:min-h-[calc(100dvh-4rem)] lg:min-h-[calc(100dvh-4rem)] lg:max-w-none">

            <div className="flex flex-col flex-1 justify-center items-center lg:items-start lg:max-w-3xl xl:max-w-4xl pt-10 pb-6 sm:pt-12 sm:pb-8 lg:py-0">
            <div className="mb-6 sm:mb-7 flex justify-center lg:hidden w-full">
              <ImageWithFallback
                src={logoFull}
                alt="gobiba.pl — eventy plenerowe"
                className="w-full max-w-[13rem] sm:max-w-xs md:max-w-sm h-auto object-contain mx-auto"
              />
            </div>

            <p className="text-[15px] sm:text-base lg:text-2xl xl:text-[1.65rem] text-black/55 lg:text-[#130018]/75 mb-6 lg:mb-10 leading-relaxed lg:leading-snug max-w-sm lg:max-w-2xl mx-auto lg:mx-0 text-center lg:text-left lg:font-medium">
              Przywozimy sprzęt, składamy i zostajemy jeśli chcesz.
              Tobie pozostaje dobra zabawa.
            </p>

            <div className="flex flex-col w-full max-w-xs mx-auto lg:mx-0 sm:max-w-none lg:max-w-none sm:flex-row sm:flex-wrap gap-3 lg:gap-4 items-center sm:items-center justify-center lg:justify-start">
              <a href="#pakiety" className="inline-flex items-center justify-center gap-2 w-full sm:w-auto font-semibold text-sm lg:text-base text-white px-6 py-3.5 lg:px-8 lg:py-4 rounded-full bg-[#130018] hover:bg-black transition-colors lg:shadow-xl lg:shadow-[#130018]/20">
                Sprawdź ofertę <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5" />
              </a>
              <a href="#jak-to-dziala" className="inline-flex items-center justify-center gap-2 w-full sm:w-auto font-medium text-sm lg:text-base text-black/55 lg:text-[#130018]/70 px-5 py-3.5 lg:px-7 lg:py-4 rounded-full border border-black/12 bg-white/60 hover:bg-white/80 lg:bg-white/45 lg:backdrop-blur-sm lg:hover:bg-white/65 transition-colors">
                Jak to działa
              </a>
            </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-8 xl:gap-10 w-full max-w-md sm:max-w-lg lg:max-w-2xl pt-6 lg:pt-0 pb-6 lg:pb-8 border-t border-black/10 lg:border-white/25 mx-auto lg:mx-0 lg:max-w-3xl items-stretch flex-shrink-0">
              {HERO_TRUST.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center lg:items-start text-center lg:text-left min-w-0 h-[5.25rem] sm:h-[5.75rem] lg:h-auto"
                >
                  <div className="h-9 sm:h-10 lg:h-14 w-full flex items-center justify-center lg:justify-start flex-shrink-0 mb-2 lg:mb-3 text-[#130018]">
                    {item.visual}
                  </div>
                  <p
                    className="min-h-[2.25rem] sm:min-h-[2.5rem] lg:min-h-0 text-[9px] sm:text-[10px] lg:text-xs xl:text-sm font-bold text-[#130018] uppercase tracking-[0.08em] leading-snug"
                    style={{ fontFamily: "'Oxanium', sans-serif" }}
                  >
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <style>{`
          @keyframes heroPan {
            from { transform: translateX(0%); }
            to   { transform: translateX(-50%); }
          }
        `}</style>
      </section>

      <section id="pakiety" className="relative z-10 pb-10 sm:pb-16 max-lg:bg-[#fafaf9]/55 max-lg:backdrop-blur-[2px]">
        <div className={SECTION_INNER}>
        <div className="flex items-center gap-4 mb-6 sm:mb-8">
          <div className="h-px flex-1 bg-black/6" />
          <p className="text-[10px] uppercase tracking-[0.4em] text-black/25 font-semibold">Oferta</p>
          <div className="h-px flex-1 bg-black/6" />
        </div>

        <div id="pakiety-tiles">
        <MobilePackagesCarousel packages={packages} onSelect={setDetailPkg} />

        <DesktopPackagesHint />

        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-12 gap-5 xl:gap-6 mb-6 sm:mb-8">
          {packages.map(pkg => (
            <div key={pkg.id} className="lg:col-span-3">
              <LargeTile pkg={pkg} onClick={() => setDetailPkg(pkg)} />
            </div>
          ))}
        </div>
        </div>

        <div className="hidden sm:block w-full">
          <IndividualInquiryCTA />
        </div>
        </div>
      </section>

      <DevicesSection />

      <section
        id="jak-to-dziala"
        className="border-t border-black/6 bg-[#fafaf9] sm:bg-white relative z-10 py-8 sm:py-16"
      >
        <div className={`${SECTION_INNER} text-center sm:text-left`}>
          <div className="mb-5 sm:mb-8">
            <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-2 sm:mb-3 font-semibold">Prosty proces</p>
            <h2
              className="text-2xl sm:text-4xl font-black tracking-tight text-[#130018] sm:text-black/80"
              style={{ fontFamily: "'Oxanium', sans-serif" }}
            >
              Jak to działa?
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-12 sm:gap-5 xl:gap-6">
            {HOW_IT_WORKS.map(({ n, title, desc, Icon }) => (
              <div
                key={n}
                className="flex items-start gap-3.5 text-left rounded-2xl border border-black/8 bg-white p-4 shadow-sm sm:col-span-4 sm:block sm:p-0 sm:border-0 sm:bg-transparent sm:shadow-none sm:rounded-none"
              >
                <div
                  className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#130018] text-white flex items-center justify-center sm:hidden"
                  aria-hidden
                >
                  <Icon className="w-5 h-5" strokeWidth={1.6} />
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className="hidden sm:block text-4xl font-black text-black/6 mb-4 tabular-nums"
                    style={{ fontFamily: "'Oxanium', sans-serif" }}
                  >
                    {n}
                  </p>
                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                    <span
                      className="sm:hidden text-[10px] font-bold text-[#130018]/45 tabular-nums"
                      style={{ fontFamily: "'Oxanium', sans-serif" }}
                    >
                      {n}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-[#130018] sm:text-black/70 leading-snug">{title}</h3>
                  </div>
                  <p className="text-sm sm:text-base text-black/55 sm:text-black/35 leading-snug sm:leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="kontakt" className="border-t border-black/6 bg-[#fafaf9] sm:bg-white relative z-10 py-8 sm:py-16">
        <div className={`${SECTION_INNER} grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-12 xl:gap-16`}>
          <div className="flex flex-col items-center md:items-start text-center md:text-left rounded-2xl border border-black/8 bg-white p-5 shadow-sm sm:p-0 sm:border-0 sm:bg-transparent sm:shadow-none sm:rounded-none">
            <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-2 sm:mb-3 font-semibold">Kontakt</p>
            <h2
              className="text-2xl sm:text-4xl font-black tracking-tight text-[#130018] sm:text-black/80 mb-3 sm:mb-4 leading-tight"
              style={{ fontFamily: "'Oxanium', sans-serif" }}
            >
              Masz pytania?<br />Śmiało pisz.
            </h2>
            <p className="text-base text-black/55 sm:text-black/40 leading-snug sm:leading-relaxed max-w-xs mx-auto md:mx-0">
              Pomożemy dobrać sprzęt i odpowiemy na wszystko — od cen po szczegóły logistyczne.
            </p>
          </div>
          <div className="space-y-2.5 w-full max-w-md mx-auto md:max-w-none md:mx-0">
            {[
              { Icon: Phone, label: "Telefon", value: SITE.phoneDisplay, href: `tel:${SITE.phone}` },
              { Icon: Mail, label: "E-mail", value: SITE.email, href: `mailto:${SITE.email}` },
              { Icon: MapPin, label: "Jeździmy do", value: "Całe Trójmiasto i okolice", href: "#" },
            ].map(({ Icon: I, label, value, href }) => (
              <a
                key={label}
                href={href}
                className="flex items-center gap-4 p-4 rounded-xl bg-white border border-black/10 shadow-sm hover:border-black/20 transition-colors sm:border-black/6 sm:shadow-none"
              >
                <div className="w-10 h-10 rounded-xl bg-[#130018]/6 border border-black/8 flex items-center justify-center flex-shrink-0">
                  <I className="w-4 h-4 text-[#130018]/70" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-xs text-black/40 uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-base text-[#130018] font-semibold truncate">{value}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-black/8 bg-white relative z-10">
        <div className={`${SECTION_INNER} flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6 py-8 sm:py-10`}>
          <ImageWithFallback src={logoMark} alt="gobiba" className="h-[4.5rem] sm:h-[5.25rem] w-auto object-contain" />
          <p className="text-sm sm:text-base text-black/55 text-center leading-relaxed max-w-md">
            © 2025 gobiba.pl — Wynajem sprzętu eventowego — Trójmiasto
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {["Regulamin", "Polityka prywatności"].map(t => (
              <a key={t} href="#" className="text-sm sm:text-base font-medium text-black/55 hover:text-[#130018] transition-colors">{t}</a>
            ))}
          </div>
        </div>
        <div className="border-t border-black/8 py-4">
          <div className={`${SECTION_INNER} flex justify-center`}>
            <a
              href="https://sof7.io"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Designed and Built by SOF7.IO"
              className="group inline-flex items-center gap-2 sm:gap-2.5 text-[11px] sm:text-xs text-black/45 hover:text-black/60 transition-colors"
            >
              <span>Designed &amp; Built by</span>
              <Sof7Logo className="h-4 sm:h-[18px] w-auto text-emerald-600 transition-colors group-hover:text-emerald-500" />
            </a>
          </div>
        </div>
      </footer>

      {detailPkg && (
        <PackageDetail
          pkg={detailPkg}
          onClose={() => setDetailPkg(null)}
          onBook={(addons) => { setAddonIds(addons); setDetailPkg(null); setBookingPkg(detailPkg); }}
        />
      )}
      {bookingPkg && (
        <BookingFlow
          pkg={bookingPkg}
          addonIds={addonIds}
          onClose={() => setBookingPkg(null)}
          serviceLevels={serviceLevels}
          bookedDates={getBookedDates(bookingPkg.id)}
        />
      )}
    </main>
  );
}
