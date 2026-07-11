import { DELIVERY_FREE_ZONE } from "@/lib/packages-data";
import type { BookingSummary } from "@/lib/booking";
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

export function buildBookingEmailSubject(summary: BookingSummary): string {
  return `Nowe zapytanie rezerwacyjne: ${summary.package.name} – gobiba.pl`;
}

export function buildBookingEmailText(summary: BookingSummary): string {
  const { package: pkg, dates, serviceLevel, addons, delivery, pricing, customer } = summary;
  const lines = [
    "Nowe zapytanie rezerwacyjne — gobiba.pl",
    "",
    "PAKIET",
    `- ${pkg.name} (${formatPln(pkg.price)}/dzień)`,
    `- Terminy (${pricing.dayCount} ${dayLabel(pricing.dayCount)}): ${formatDates(dates)}`,
    "",
    "OBSŁUGA",
    `- ${serviceLevel.name}${serviceLevel.priceAdd > 0 ? ` (+${formatPln(serviceLevel.priceAdd)}/dzień)` : " (w cenie)"}`,
    "",
    "DOWÓZ",
    delivery.outsideZone
      ? `- Poza strefą gratis (${DELIVERY_FREE_ZONE}): +${delivery.km} km w jedną stronę (+${formatPln(delivery.fee)})`
      : `- Gratis w strefie: ${DELIVERY_FREE_ZONE}`,
    "",
    "OPCJE DODATKOWE",
    ...(addons.length > 0
      ? addons.map((addon) => `- ${addon.label} (+${formatPln(addon.price)}/dzień)`)
      : ["- Brak"]),
    "",
    "WYCENA",
    `- Pakiet: ${formatPln(pricing.packageTotal)}`,
    ...(pricing.addonsTotal > 0 ? [`- Opcje: +${formatPln(pricing.addonsTotal)}`] : []),
    ...(pricing.serviceTotal > 0 ? [`- Obsługa: +${formatPln(pricing.serviceTotal)}`] : []),
    ...(pricing.deliveryFee > 0 ? [`- Dowóz poza strefą: +${formatPln(pricing.deliveryFee)}`] : []),
    `- Kaucja (zwrotna): ${formatPln(pricing.deposit)}`,
    `- RAZEM: ${formatPln(pricing.totalWithDeposit)} (w tym kaucja)`,
    "",
    "DANE KONTAKTOWE",
    `- Imię i nazwisko: ${customer.name}`,
    `- Telefon: ${customer.phone}`,
    `- E-mail: ${customer.email}`,
    ...(customer.company ? [`- Firma: ${customer.company}`] : []),
    ...(customer.notes ? ["", "UWAGI", customer.notes] : []),
    "",
    emailFooterText(),
  ];

  return lines.join("\n");
}

export function buildBookingEmailHtml(summary: BookingSummary): string {
  const { package: pkg, dates, serviceLevel, addons, delivery, pricing, customer } = summary;

  const addonRows =
    addons.length > 0
      ? addons
          .map(
            (addon) =>
              `<li>${escapeHtml(addon.label)} <span style="color:#666">(+${formatPln(addon.price)}/dzień)</span></li>`,
          )
          .join("")
      : "<li>Brak</li>";

  const pricingRows = [
    `<tr><td style="padding:4px 0;color:#555">Pakiet (${pricing.dayCount} ${dayLabel(pricing.dayCount)})</td><td style="padding:4px 0;text-align:right">${formatPln(pricing.packageTotal)}</td></tr>`,
    pricing.addonsTotal > 0
      ? `<tr><td style="padding:4px 0;color:#555">Opcje dodatkowe</td><td style="padding:4px 0;text-align:right">+${formatPln(pricing.addonsTotal)}</td></tr>`
      : "",
    pricing.serviceTotal > 0
      ? `<tr><td style="padding:4px 0;color:#555">${escapeHtml(serviceLevel.name)}</td><td style="padding:4px 0;text-align:right">+${formatPln(pricing.serviceTotal)}</td></tr>`
      : "",
    pricing.deliveryFee > 0
      ? `<tr><td style="padding:4px 0;color:#555">Dowóz poza strefą (+${delivery.km} km)</td><td style="padding:4px 0;text-align:right">+${formatPln(pricing.deliveryFee)}</td></tr>`
      : "",
    `<tr><td style="padding:4px 0;color:#555">Kaucja (zwrotna)</td><td style="padding:4px 0;text-align:right">${formatPln(pricing.deposit)}</td></tr>`,
    `<tr><td style="padding:8px 0 4px;font-weight:700;border-top:1px solid #eee">Razem</td><td style="padding:8px 0 4px;text-align:right;font-weight:700;border-top:1px solid #eee">${formatPln(pricing.totalWithDeposit)}</td></tr>`,
  ]
    .filter(Boolean)
    .join("");

  const bodyHtml = `
    <h2 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;color:#888">Terminy</h2>
    <p style="margin:0 0 20px;line-height:1.6">${escapeHtml(formatDates(dates))} <span style="color:#666">(${pricing.dayCount} ${dayLabel(pricing.dayCount)})</span></p>

    <h2 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;color:#888">Obsługa</h2>
    <p style="margin:0 0 20px;line-height:1.6">${escapeHtml(serviceLevel.name)}${serviceLevel.priceAdd > 0 ? ` <span style="color:#666">(+${formatPln(serviceLevel.priceAdd)}/dzień)</span>` : " <span style=\"color:#666\">(w cenie)</span>"}</p>

    <h2 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;color:#888">Dowóz</h2>
    <p style="margin:0 0 20px;line-height:1.6">${
      delivery.outsideZone
        ? `Poza strefą gratis (${escapeHtml(DELIVERY_FREE_ZONE)}): +${delivery.km} km w jedną stronę (+${formatPln(delivery.fee)})`
        : `Gratis w strefie: ${escapeHtml(DELIVERY_FREE_ZONE)}`
    }</p>

    <h2 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;color:#888">Opcje dodatkowe</h2>
    <ul style="margin:0 0 20px;padding-left:18px;line-height:1.7">${addonRows}</ul>

    <h2 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;color:#888">Wycena</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">${pricingRows}</table>

    <h2 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;color:#888">Dane kontaktowe</h2>
    <p style="margin:0 0 6px"><strong>${escapeHtml(customer.name)}</strong></p>
    <p style="margin:0 0 6px"><a href="tel:${escapeHtml(customer.phone)}" style="color:#130018">${escapeHtml(customer.phone)}</a></p>
    <p style="margin:0 0 6px"><a href="mailto:${escapeHtml(customer.email)}" style="color:#130018">${escapeHtml(customer.email)}</a></p>
    ${customer.company ? `<p style="margin:0 0 6px;color:#555">Firma: ${escapeHtml(customer.company)}</p>` : ""}
    ${
      customer.notes
        ? `<div style="margin-top:16px;padding:14px 16px;background:#fafafa;border:1px solid #eee;border-radius:12px;line-height:1.6">${escapeHtml(customer.notes).replaceAll("\n", "<br>")}</div>`
        : ""
    }`;

  return wrapEmailHtml({
    preheader: `${customer.name} — ${pkg.name}, ${formatDates(dates)}`,
    title: pkg.name,
    eyebrow: "Nowe zapytanie rezerwacyjne",
    bodyHtml,
  });
}
