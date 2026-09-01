import { Resend } from "resend";
import type { DeviceRentalSummary } from "@/lib/device-rental";
import { SITE } from "@/lib/site";
import {
  buildDeviceRentalEmailHtml,
  buildDeviceRentalEmailSubject,
  buildDeviceRentalEmailText,
  buildDeviceRentalConfirmationHtml,
  buildDeviceRentalConfirmationSubject,
  buildDeviceRentalConfirmationText,
} from "@/lib/email/device-rental-email";

export type SendDeviceRentalEmailsResult =
  | {
      ok: true;
      mode: "resend" | "preview";
      internalMessageId?: string;
      customerMessageId?: string;
    }
  | { ok: false; error: string };

function getBookingToEmail(): string {
  return process.env.BOOKING_TO_EMAIL?.trim() || SITE.email;
}

function getResendFrom(): string {
  return process.env.RESEND_FROM?.trim() || "gobiba Rezerwacje <onboarding@resend.dev>";
}

function getResendReplyTo(): string {
  return process.env.BOOKING_REPLY_TO?.trim() || SITE.email;
}

function previewLog(label: string, payload: Record<string, string>, text: string) {
  console.info(`[device-rental] ${label} preview:`);
  console.info(payload);
  console.info(text);
}

export async function sendDeviceRentalEmails(
  summary: DeviceRentalSummary,
): Promise<SendDeviceRentalEmailsResult> {
  const internalTo = getBookingToEmail();
  const from = getResendFrom();
  const replyTo = getResendReplyTo();
  const apiKey = process.env.RESEND_API_KEY?.trim();

  const internalPayload = {
    from,
    to: internalTo,
    replyTo: summary.customer.email,
    subject: buildDeviceRentalEmailSubject(summary),
    text: buildDeviceRentalEmailText(summary),
    html: buildDeviceRentalEmailHtml(summary),
    tags: [{ name: "type", value: "device-rental-internal" }],
  };

  const customerPayload = {
    from,
    to: summary.customer.email,
    replyTo,
    subject: buildDeviceRentalConfirmationSubject(summary),
    text: buildDeviceRentalConfirmationText(summary),
    html: buildDeviceRentalConfirmationHtml(summary),
    tags: [{ name: "type", value: "device-rental-confirmation" }],
  };

  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      previewLog("internal", { from, to: internalTo, replyTo: summary.customer.email, subject: internalPayload.subject }, internalPayload.text);
      previewLog("customer", { from, to: summary.customer.email, replyTo, subject: customerPayload.subject }, customerPayload.text);
      return { ok: true, mode: "preview" };
    }
    return {
      ok: false,
      error: "Wysyłka e-mail nie jest skonfigurowana (brak RESEND_API_KEY).",
    };
  }

  const resend = new Resend(apiKey);

  const [internalResult, customerResult] = await Promise.all([
    resend.emails.send(internalPayload),
    resend.emails.send(customerPayload),
  ]);

  if (internalResult.error) {
    console.error("[device-rental] Internal email error:", internalResult.error);
  }
  if (customerResult.error) {
    console.error("[device-rental] Customer confirmation error:", customerResult.error);
  }

  if (internalResult.error && customerResult.error) {
    return { ok: false, error: "Nie udało się wysłać wiadomości e-mail." };
  }

  if (customerResult.error) {
    return {
      ok: false,
      error: "Zapytanie zapisane, ale nie udało się wysłać potwierdzenia do klienta. Sprawdź adres e-mail.",
    };
  }

  if (internalResult.error) {
    return {
      ok: false,
      error: "Potwierdzenie wysłano do klienta, ale powiadomienie wewnętrzne nie dotarło. Sprawdź skrzynkę kontakt@gobiba.pl.",
    };
  }

  return {
    ok: true,
    mode: "resend",
    internalMessageId: internalResult.data?.id,
    customerMessageId: customerResult.data?.id,
  };
}
