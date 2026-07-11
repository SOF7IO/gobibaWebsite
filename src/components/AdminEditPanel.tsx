"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Save, X } from "lucide-react";
import { useSiteConfig } from "@/components/SiteConfigProvider";

const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];
const DAYS_PL = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];

export function AdminEditPanel() {
  const {
    isEditMode,
    packages,
    serviceLevels,
    config,
    saving,
    saveError,
    saveSuccess,
    updatePackagePrice,
    updateAddonPrice,
    updateServiceLevelPrice,
    toggleBookedDate,
    saveConfig,
    exitEditMode,
    logoutAdmin,
  } = useSiteConfig();

  const [activePackageId, setActivePackageId] = useState(packages[0]?.id ?? "karaoke");
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tab, setTab] = useState<"calendar" | "prices">("calendar");

  const bookedSet = useMemo(() => {
    return new Set(config?.bookedDates[activePackageId] ?? []);
  }, [activePackageId, config?.bookedDates]);

  if (!isEditMode || !config) return null;

  const startOffset = (() => {
    const d = new Date(year, month, 1).getDay();
    return d === 0 ? 6 : d - 1;
  })();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const fmt = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-4xl px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="rounded-2xl border border-[#130018]/15 bg-white shadow-2xl overflow-hidden max-h-[min(78dvh,680px)] flex flex-col">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-black/8 bg-[#130018] text-white">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/55">Panel admina</p>
              <p className="text-sm font-semibold">Tryb edycji · Ctrl+Shift+E</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void saveConfig()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-[#130018] text-xs font-semibold disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Zapisuję…" : "Zapisz"}
              </button>
              <button
                type="button"
                onClick={exitEditMode}
                className="px-3 py-2 rounded-lg border border-white/20 text-xs text-white/85"
              >
                Ukryj
              </button>
              <button
                type="button"
                onClick={logoutAdmin}
                aria-label="Wyloguj"
                className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {(saveError || saveSuccess) && (
            <div className={`px-4 py-2 text-xs ${saveError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {saveError ?? "Zapisano zmiany."}
            </div>
          )}

          <div className="flex border-b border-black/8">
            {(["calendar", "prices"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider ${
                  tab === key ? "text-[#130018] border-b-2 border-[#130018]" : "text-black/40"
                }`}
              >
                {key === "calendar" ? "Kalendarz" : "Ceny"}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto p-4 space-y-4">
            {tab === "calendar" && (
              <>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-black/40 block mb-1.5">Pakiet</label>
                  <select
                    value={activePackageId}
                    onChange={(e) => setActivePackageId(e.target.value)}
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                  >
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                    ))}
                  </select>
                </div>

                <p className="text-xs text-black/45">Kliknij dzień, żeby oznaczyć go jako zajęty lub wolny.</p>

                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => {
                    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
                  }} className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-semibold text-black/65">{MONTHS_PL[month]} {year}</span>
                  <button type="button" onClick={() => {
                    if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
                  }} className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {DAYS_PL.map((d) => (
                    <div key={d} className="text-center text-[10px] text-black/30 py-1 font-semibold">{d}</div>
                  ))}
                  {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const str = fmt(day);
                    const booked = bookedSet.has(str);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleBookedDate(activePackageId, str)}
                        className={[
                          "h-9 rounded-lg text-xs font-medium transition-colors",
                          booked
                            ? "bg-red-100 text-red-700 line-through border border-red-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100",
                        ].join(" ")}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {tab === "prices" && (
              <div className="space-y-4">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="rounded-xl border border-black/8 p-3 space-y-3">
                    <p className="text-sm font-bold text-black/75">{pkg.name}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs text-black/45">
                        Cena / dzień
                        <input
                          type="number"
                          min={0}
                          value={config.packages[pkg.id]?.price ?? pkg.price}
                          onChange={(e) => updatePackagePrice(pkg.id, "price", Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="text-xs text-black/45">
                        Kaucja
                        <input
                          type="number"
                          min={0}
                          value={config.packages[pkg.id]?.deposit ?? pkg.deposit}
                          onChange={(e) => updatePackagePrice(pkg.id, "deposit", Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm"
                        />
                      </label>
                    </div>
                    {pkg.addons.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-wider text-black/35">Opcje dodatkowe</p>
                        {pkg.addons.map((addon) => (
                          <label key={addon.id} className="flex items-center justify-between gap-3 text-xs text-black/50">
                            <span className="flex-1 leading-snug">{addon.label}</span>
                            <input
                              type="number"
                              min={0}
                              value={config.packages[pkg.id]?.addons[addon.id] ?? addon.price}
                              onChange={(e) => updateAddonPrice(pkg.id, addon.id, Number(e.target.value))}
                              className="w-20 rounded-lg border border-black/10 px-2 py-1 text-sm text-right"
                            />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <div className="rounded-xl border border-black/8 p-3 space-y-2">
                  <p className="text-sm font-bold text-black/75">Poziomy obsługi</p>
                  {serviceLevels.map((level) => (
                    <label key={level.id} className="flex items-center justify-between gap-3 text-xs text-black/50">
                      <span>{level.name}</span>
                      <input
                        type="number"
                        min={0}
                        value={config.serviceLevels[level.id] ?? level.priceAdd}
                        onChange={(e) => updateServiceLevelPrice(level.id, Number(e.target.value))}
                        className="w-20 rounded-lg border border-black/10 px-2 py-1 text-sm text-right"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
