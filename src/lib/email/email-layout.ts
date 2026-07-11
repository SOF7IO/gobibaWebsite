import { SITE } from "@/lib/site";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function emailFooterText(): string {
  return [
    SITE.name,
    SITE.region,
    `Tel: ${SITE.phoneDisplay}`,
    `E-mail: ${SITE.email}`,
    SITE.url,
  ].join("\n");
}

export function emailFooterHtml(): string {
  return `<p style="margin:0 0 4px;font-size:12px;color:#888">${escapeHtml(SITE.name)} — wynajem sprzętu eventowego</p>
<p style="margin:0 0 4px;font-size:12px;color:#888">${escapeHtml(SITE.region)}</p>
<p style="margin:0 0 4px;font-size:12px;color:#888">Tel: <a href="tel:${escapeHtml(SITE.phone)}" style="color:#555">${escapeHtml(SITE.phoneDisplay)}</a></p>
<p style="margin:0;font-size:12px;color:#888">E-mail: <a href="mailto:${escapeHtml(SITE.email)}" style="color:#555">${escapeHtml(SITE.email)}</a></p>`;
}

export function wrapEmailHtml(input: {
  preheader: string;
  title: string;
  eyebrow: string;
  bodyHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f7f7f8;font-family:Arial,Helvetica,sans-serif;color:#130018">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(input.preheader)}</div>
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #ececec;border-radius:16px;overflow:hidden">
      <div style="height:4px;background:#130018"></div>
      <div style="padding:24px 28px">
        <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#999">${escapeHtml(input.eyebrow)}</p>
        <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3">${escapeHtml(input.title)}</h1>
        ${input.bodyHtml}
        <div style="margin-top:28px;padding-top:20px;border-top:1px solid #eee">
          ${emailFooterHtml()}
        </div>
      </div>
    </div>
  </body>
</html>`;
}
