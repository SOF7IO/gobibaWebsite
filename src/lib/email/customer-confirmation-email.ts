import type { BookingSummary } from "@/lib/booking";
import { DELIVERY_FREE_ZONE } from "@/lib/packages-data";
import { SITE } from "@/lib/site";
import { emailFooterText, escapeHtml, wrapEmailHtml } from "@/lib/email/email-layout";

function formatPln(value: number): string {
  return `${value} zł`;
}

function formatDates(dates: string[]): string {
  return dates.join(", ");
}

function dayLabel(count: number): string {
  return count === 1 ? "dzień" : "dni";
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function buildCustomerConfirmationSubject(summary: BookingSummary): string {
  return `Potwierdzenie zapytania: ${summary.package.name} – gobiba.pl`;
}

export function buildCustomerConfirmationText(summary: BookingSummary): string {
  const { package: pkg, dates, serviceLevel, addons, delivery, pricing, customer } = summary;

  return [
    `Cześć ${firstName(customer.name)},`,
    "",
    "Dziękujemy za zapytanie rezerwacyjne na gobiba.pl.",
    "Otrzymaliśmy Twoje zgłoszenie i skontaktujemy się z Tobą w ciągu 24 godzin, aby potwierdzić termin i szczegóły.",
    "",
    "PODSUMOWANIE",
    `- Pakiet: ${pkg.name}`,
    `- Terminy (${pricing.dayCount} ${dayLabel(pricing.dayCount)}): ${formatDates(dates)}`,
    `- Obsługa: ${serviceLevel.name}`,
    `- Dowóz: ${
      delivery.outsideZone
        ? `poza strefą gratis (+${delivery.km} km, +${formatPln(delivery.fee)})`
        : `gratis — ${DELIVERY_FREE_ZONE}`
    }`,
    ...(addons.length > 0
      ? ["- Opcje dodatkowe:", ...addons.map((addon) => `  • ${addon.label}`)]
      : []),
    `- Szacunkowa suma: ${formatPln(pricing.totalWithDeposit)} (w tym kaucja ${formatPln(pricing.deposit)})`,
    "",
    "To zapytanie — ostateczne potwierdzenie rezerwacji otrzymasz od nas telefonicznie lub mailowo.",
    "",
    "Masz pytania? Napisz na " + SITE.email + " lub zadzwoń: " + SITE.phoneDisplay,
    "",
    emailFooterText(),
  ].join("\n");
}

export function buildCustomerConfirmationHtml(summary: BookingSummary): string {
  const { package: pkg, dates, serviceLevel, addons, delivery, pricing, customer } = summary;
  const greeting = firstName(customer.name);

  const addonList =
    addons.length > 0
      ? `<ul style="margin:8px 0 0;padding-left:18px;line-height:1.7">${addons
          .map((addon) => `<li>${escapeHtml(addon.label)}</li>`)
          .join("")}</ul>`
      : `<p style="margin:8px 0 0;color:#666">Brak dodatkowych opcji</p>`;

  const bodyHtml = `
    <p style="margin:0 0 16px;line-height:1.7">Cześć ${escapeHtml(greeting)},</p>
    <p style="margin:0 0 16px;line-height:1.7">
      Dziękujemy za zapytanie rezerwacyjne. Otrzymaliśmy Twoje zgłoszenie i skontaktujemy się z Tobą
      <strong>w ciągu 24 godzin</strong>, aby potwierdzić termin i szczegóły.
    </p>

    <div style="margin:24px 0;padding:16px 18px;background:#fafafa;border:1px solid #eee;border-radius:12px">
      <p style="margin:0 0 10px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888">Podsumowanie</p>
      <p style="margin:0 0 6px;line-height:1.6"><strong>Pakiet:</strong> ${escapeHtml(pkg.name)}</p>
      <p style="margin:0 0 6px;line-height:1.6"><strong>Terminy:</strong> ${escapeHtml(formatDates(dates))} (${pricing.dayCount} ${dayLabel(pricing.dayCount)})</p>
      <p style="margin:0 0 6px;line-height:1.6"><strong>Obsługa:</strong> ${escapeHtml(serviceLevel.name)}</p>
      <p style="margin:0 0 6px;line-height:1.6"><strong>Dowóz:</strong> ${
        delivery.outsideZone
          ? `poza strefą gratis (+${delivery.km} km, +${formatPln(delivery.fee)})`
          : `gratis — ${escapeHtml(DELIVERY_FREE_ZONE)}`
      }</p>
      <p style="margin:0 0 6px;line-height:1.6"><strong>Opcje dodatkowe</strong></p>
      ${addonList}
      <p style="margin:16px 0 0;line-height:1.6"><strong>Szacunkowa suma:</strong> ${formatPln(pricing.totalWithDeposit)} <span style="color:#666">(w tym kaucja ${formatPln(pricing.deposit)})</span></p>
    </div>

    <p style="margin:0;line-height:1.7;color:#555">
      To zapytanie — ostateczne potwierdzenie rezerwacji otrzymasz od nas telefonicznie lub mailowo.
      W razie pytań odpisz na tę wiadomość lub zadzwoń: ${escapeHtml(SITE.phoneDisplay)}.
    </p>`;

  return wrapEmailHtml({
    preheader: `Otrzymaliśmy Twoje zapytanie o ${pkg.name}. Skontaktujemy się w ciągu 24 h.`,
    title: "Potwierdzenie zapytania rezerwacyjnego",
    eyebrow: "gobiba.pl",
    bodyHtml,
  });
}
