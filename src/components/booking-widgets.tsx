"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

// ─── Calendar ─────────────────────────────────────────────────────────────────

const MONTHS_PL = ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"];
const DAYS_PL = ["Pn","Wt","Śr","Cz","Pt","Sb","Nd"];

export function CalendarPicker({
  selectedDates,
  onToggle,
  bookedDates,
}: {
  selectedDates: Set<string>;
  onToggle: (d: string) => void;
  bookedDates: Set<string>;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const startOffset = (() => { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1; })();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const fmt = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const isPast = (d: number) => new Date(year, month, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const selectedCount = selectedDates.size;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={prev} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors">
          <ChevronLeft className="w-4 h-4 text-black/30" />
        </button>
        <div className="text-center">
          <span className="text-sm font-semibold text-black/60 tracking-wide block">{MONTHS_PL[month]} {year}</span>
          {selectedCount > 0 && (
            <span className="text-[10px] text-black/35">{selectedCount} {selectedCount === 1 ? "dzień wybrany" : selectedCount < 5 ? "dni wybrane" : "dni wybranych"}</span>
          )}
        </div>
        <button type="button" onClick={next} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors">
          <ChevronRight className="w-4 h-4 text-black/30" />
        </button>
      </div>
      <p className="text-[11px] text-black/35 -mt-1">Kliknij wiele dni — możesz zarezerwować na kilka dni z rzędu lub wybrane terminy.</p>
      <div className="grid grid-cols-7 gap-1">
        {DAYS_PL.map(d => <div key={d} className="text-center text-[10px] text-black/25 py-1 font-semibold">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1; const str = fmt(day);
          const booked = bookedDates.has(str); const past = isPast(day); const sel = selectedDates.has(str);
          return (
            <button key={day} type="button" disabled={booked || past} onClick={() => onToggle(str)}
              className={[
                "h-9 w-full flex items-center justify-center text-xs rounded-lg transition-all font-medium",
                past || booked ? "text-black/15 cursor-not-allowed" : "text-black/50 hover:bg-black/6 hover:text-black cursor-pointer",
                booked ? "line-through" : "",
                sel ? "!bg-[#130018] !text-white" : "",
              ].filter(Boolean).join(" ")}>
              {day}
            </button>
          );
        })}
      </div>
      <div className="flex gap-4 text-[10px] text-black/30 pt-3 border-t border-black/6">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#130018]" />Wybrany</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-black/15" />Zajęty</span>
      </div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

export function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Wybierz daty", "Twoje dane", "Gotowe!"];
  return (
    <div className="flex items-center mb-7">
      {steps.map((label, i) => {
        const n = i + 1; const done = n < current; const active = n === current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={[
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                done || active ? "bg-[#130018] text-white" : "bg-black/8 text-black/25",
              ].join(" ")}>
                {done ? <Check className="w-3 h-3" /> : n}
              </div>
              <span className={`text-xs hidden sm:block ${active ? "text-black/80 font-semibold" : done ? "text-black/35" : "text-black/20"}`}>{label}</span>
            </div>
            {i < steps.length - 1 && <div className={`h-px flex-1 mx-3 ${done ? "bg-[#130018]/30" : "bg-black/10"}`} />}
          </div>
        );
      })}
    </div>
  );
}
