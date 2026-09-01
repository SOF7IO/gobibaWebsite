import { DELIVERY_FREE_ZONE } from "@/lib/packages-data";
import { FREE_DELIVERY_MIN_TOTAL } from "@/lib/devices-data";
import type { DeviceRentalSummary } from "@/lib/device-rental";
import { SITE } from "@/lib/site";
import { emailFooterText, escapeHtml, wrapEmailHtml } from "@/lib/email/email-layout";

function formatPln(value: number): string {
  return `${value} zł`;
}

function formatDates(dates: string[]): string {
  return dates.join(", ");
}

function dayLabel(count: number): string {
  return count === 1 ? "doba" : count < 5 ? "doby" : "dób";
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function itemLabel(item: DeviceRentalSummary["items"][number]): string {
  return item.qty > 1 ? `${item.device.name} × ${item.qty}` : item.device.name;
}

function deliveryText(delivery: DeviceRentalSummary["delivery"]): string {
  if (delivery.method === "pickup") return "Odbiór osobisty";
  const zone =
    delivery.zoneFee > 0
      ? `Dowóz w strefie ${DELIVERY_FREE_ZONE} (+${formatPln(delivery.zoneFee)} — zamówienie poniżej ${FREE_DELIVERY_MIN_TOTAL} zł)`
      : `Dowóz gratis w strefie: ${DELIVERY_FREE_ZONE}`;
  return delivery.outsideZone
    ? `${zone}; poza strefą: +${delivery.km} km w jedną stronę (+${formatPln(delivery.fee)})`
    : zone;
}

// ── Mail wewnętrzny ──────────────────────────────────────────────────────────

export function buildDeviceRentalEmailSubject(summary: DeviceRentalSummary): string {
  const first = summary.items[0]?.device.name ?? "sprzęt";
  const extra = summary.items.length > 1 ? ` +${summary.items.length - 1}` : "";
  return `Nowe zapytanie o wynajem sprzętu: ${first}${extra} – gobiba.pl`;
}

export function buildDeviceRentalEmailText(summary: DeviceRentalSummary): string {
  const { items, dates, delivery, pricing, customer } = summary;
  const lines = [
    "Nowe zapytanie o wynajem sprzętu — gobiba.pl",
    "",
    "SPRZĘT",
    ...items.map(
      (item) =>
        `- ${itemLabel(item)} (${formatPln(item.perDay)}/doba${item.deposit > 0 ? `, kaucja ${formatPln(item.deposit)}` : ""})`,
    ),
    "",
    `TERMINY (${pricing.dayCount} ${dayLabel(pricing.dayCount)})`,
    `- ${formatDates(dates)}`,
    "",
    "DOSTAWA",
    `- ${deliveryText(delivery)}`,
    "",
    "WYCENA",
    `- Sprzęt: ${formatPln(pricing.perDayTotal)}/doba × ${pricing.dayCount} = ${formatPln(pricing.itemsTotal)}`,
    ...(pricing.zoneDeliveryFee > 0 ? [`- Dowóz w strefie: +${formatPln(pricing.zoneDeliveryFee)}`] : []),
    ...(pricing.deliveryFee > 0 ? [`- Dowóz poza strefą: +${formatPln(pricing.deliveryFee)}`] : []),
    `- Wynajem razem: ${formatPln(pricing.total)}`,
    `- Kaucja (zwrotna): ${formatPln(pricing.deposit)}`,
    `- DO ZAPŁATY PRZY ODBIORZE: ${formatPln(pricing.totalWithDeposit)} (w tym kaucja)`,
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

export function buildDeviceRentalEmailHtml(summary: DeviceRentalSummary): string {
  const { items, dates, delivery, pricing, customer } = summary;

  const itemRows = items
    .map(
      (item) =>
        `<li>${escapeHtml(itemLabel(item))} <span style="color:#666">(${formatPln(item.perDay)}/doba)</span></li>`,
    )
    .join("");

  const pricingRows = [
    `<tr><td style="padding:4px 0;color:#555">Sprzęt (${pricing.dayCount} ${dayLabel(pricing.dayCount)} × ${formatPln(pricing.perDayTotal)})</td><td style="padding:4px 0;text-align:right">${formatPln(pricing.itemsTotal)}</td></tr>`,
    pricing.zoneDeliveryFee > 0
      ? `<tr><td style="padding:4px 0;color:#555">Dowóz w strefie (zamówienie poniżej ${FREE_DELIVERY_MIN_TOTAL} zł)</td><td style="padding:4px 0;text-align:right">+${formatPln(pricing.zoneDeliveryFee)}</td></tr>`
      : "",
    pricing.deliveryFee > 0
      ? `<tr><td style="padding:4px 0;color:#555">Dowóz poza strefą (+${delivery.km} km)</td><td style="padding:4px 0;text-align:right">+${formatPln(pricing.deliveryFee)}</td></tr>`
      : "",
    `<tr><td style="padding:8px 0 4px;border-top:1px solid #eee">Wynajem razem</td><td style="padding:8px 0 4px;text-align:right;border-top:1px solid #eee">${formatPln(pricing.total)}</td></tr>`,
    `<tr><td style="padding:4px 0;color:#555">Kaucja (zwrotna)</td><td style="padding:4px 0;text-align:right">${formatPln(pricing.deposit)}</td></tr>`,
    `<tr><td style="padding:8px 0 4px;font-weight:700;border-top:1px solid #eee">Do zapłaty przy odbiorze</td><td style="padding:8px 0 4px;text-align:right;font-weight:700;border-top:1px solid #eee">${formatPln(pricing.totalWithDeposit)}</td></tr>`,
  ]
    .filter(Boolean)
    .join("");

  const bodyHtml = `
    <h2 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;color:#888">Sprzęt</h2>
    <ul style="margin:0 0 20px;padding-left:18px;line-height:1.7">${itemRows}</ul>

    <h2 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;color:#888">Terminy</h2>
    <p style="margin:0 0 20px;line-height:1.6">${escapeHtml(formatDates(dates))} <span style="color:#666">(${pricing.dayCount} ${dayLabel(pricing.dayCount)})</span></p>

    <h2 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;color:#888">Dostawa</h2>
    <p style="margin:0 0 20px;line-height:1.6">${escapeHtml(deliveryText(delivery))}</p>

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
    preheader: `${customer.name} — ${summary.items.map(itemLabel).join(", ")}, ${formatDates(dates)}`,
    title: "Wynajem sprzętu",
    eyebrow: "Nowe zapytanie o wynajem",
    bodyHtml,
  });
}

// ── Potwierdzenie dla klienta ────────────────────────────────────────────────

export function buildDeviceRentalConfirmationSubject(summary: DeviceRentalSummary): string {
  const first = summary.items[0]?.device.name ?? "sprzęt";
  return `Potwierdzenie zapytania: ${first}${summary.items.length > 1 ? " i więcej" : ""} – gobiba.pl`;
}

export function buildDeviceRentalConfirmationText(summary: DeviceRentalSummary): string {
  const { items, dates, delivery, pricing, customer } = summary;

  return [
    `Cześć ${firstName(customer.name)},`,
    "",
    "Dziękujemy za zapytanie o wynajem sprzętu na gobiba.pl.",
    "Otrzymaliśmy Twoje zgłoszenie i skontaktujemy się z Tobą w ciągu 24 godzin, aby potwierdzić dostępność i szczegóły.",
    "",
    "PODSUMOWANIE",
    "- Sprzęt:",
    ...items.map((item) => `  • ${itemLabel(item)} (${formatPln(item.perDay)}/doba)`),
    `- Terminy (${pricing.dayCount} ${dayLabel(pricing.dayCount)}): ${formatDates(dates)}`,
    `- Dostawa: ${deliveryText(delivery)}`,
    `- Wynajem: ${formatPln(pricing.total)}`,
    `- Kaucja zwrotna: ${formatPln(pricing.deposit)}`,
    `- Szacunkowa suma przy odbiorze: ${formatPln(pricing.totalWithDeposit)} (w tym kaucja)`,
    "",
    "To zapytanie — ostateczne potwierdzenie wynajmu otrzymasz od nas telefonicznie lub mailowo.",
    "",
    "Masz pytania? Napisz na " + SITE.email + " lub zadzwoń: " + SITE.phoneDisplay,
    "",
    emailFooterText(),
  ].join("\n");
}

export function buildDeviceRentalConfirmationHtml(summary: DeviceRentalSummary): string {
  const { items, dates, delivery, pricing, customer } = summary;
  const greeting = firstName(customer.name);

  const itemList = `<ul style="margin:8px 0 0;padding-left:18px;line-height:1.7">${items
    .map(
      (item) =>
        `<li>${escapeHtml(itemLabel(item))} <span style="color:#666">(${formatPln(item.perDay)}/doba)</span></li>`,
    )
    .join("")}</ul>`;

  const bodyHtml = `
    <p style="margin:0 0 16px;line-height:1.7">Cześć ${escapeHtml(greeting)},</p>
    <p style="margin:0 0 16px;line-height:1.7">
      Dziękujemy za zapytanie o wynajem sprzętu. Otrzymaliśmy Twoje zgłoszenie i skontaktujemy się z Tobą
      <strong>w ciągu 24 godzin</strong>, aby potwierdzić dostępność i szczegóły.
    </p>

    <div style="margin:24px 0;padding:16px 18px;background:#fafafa;border:1px solid #eee;border-radius:12px">
      <p style="margin:0 0 10px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888">Podsumowanie</p>
      <p style="margin:0 0 6px;line-height:1.6"><strong>Sprzęt</strong></p>
      ${itemList}
      <p style="margin:16px 0 6px;line-height:1.6"><strong>Terminy:</strong> ${escapeHtml(formatDates(dates))} (${pricing.dayCount} ${dayLabel(pricing.dayCount)})</p>
      <p style="margin:0 0 6px;line-height:1.6"><strong>Dostawa:</strong> ${escapeHtml(deliveryText(delivery))}</p>
      <p style="margin:16px 0 0;line-height:1.6"><strong>Wynajem:</strong> ${formatPln(pricing.total)}</p>
      <p style="margin:4px 0 0;line-height:1.6"><strong>Kaucja (zwrotna):</strong> ${formatPln(pricing.deposit)}</p>
      <p style="margin:4px 0 0;line-height:1.6"><strong>Razem przy odbiorze:</strong> ${formatPln(pricing.totalWithDeposit)}</p>
    </div>

    <p style="margin:0;line-height:1.7;color:#555">
      To zapytanie — ostateczne potwierdzenie wynajmu otrzymasz od nas telefonicznie lub mailowo.
      W razie pytań odpisz na tę wiadomość lub zadzwoń: ${escapeHtml(SITE.phoneDisplay)}.
    </p>`;

  return wrapEmailHtml({
    preheader: `Otrzymaliśmy Twoje zapytanie o wynajem sprzętu. Skontaktujemy się w ciągu 24 h.`,
    title: "Potwierdzenie zapytania o wynajem",
    eyebrow: "gobiba.pl",
    bodyHtml,
  });
}
