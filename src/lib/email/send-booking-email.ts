import { Resend } from "resend";
import type { BookingSummary } from "@/lib/booking";
import { SITE } from "@/lib/site";
import {
  buildBookingEmailHtml,
  buildBookingEmailSubject,
  buildBookingEmailText,
} from "@/lib/email/booking-email";
import {
  buildCustomerConfirmationHtml,
  buildCustomerConfirmationSubject,
  buildCustomerConfirmationText,
} from "@/lib/email/customer-confirmation-email";

export type SendBookingEmailsResult =
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
  console.info(`[booking] ${label} preview:`);
  console.info(payload);
  console.info(text);
}

export async function sendBookingEmails(summary: BookingSummary): Promise<SendBookingEmailsResult> {
  const internalTo = getBookingToEmail();
  const from = getResendFrom();
  const replyTo = getResendReplyTo();
  const apiKey = process.env.RESEND_API_KEY?.trim();

  const internalPayload = {
    from,
    to: internalTo,
    replyTo: summary.customer.email,
    subject: buildBookingEmailSubject(summary),
    text: buildBookingEmailText(summary),
    html: buildBookingEmailHtml(summary),
    tags: [{ name: "type", value: "booking-internal" }],
  };

  const customerPayload = {
    from,
    to: summary.customer.email,
    replyTo,
    subject: buildCustomerConfirmationSubject(summary),
    text: buildCustomerConfirmationText(summary),
    html: buildCustomerConfirmationHtml(summary),
    tags: [{ name: "type", value: "booking-confirmation" }],
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
    console.error("[booking] Internal email error:", internalResult.error);
  }
  if (customerResult.error) {
    console.error("[booking] Customer confirmation error:", customerResult.error);
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

/** @deprecated Use sendBookingEmails */
export async function sendBookingEmail(summary: BookingSummary): Promise<SendBookingEmailsResult> {
  return sendBookingEmails(summary);
}
