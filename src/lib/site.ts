export const SITE = {
  name: "gobiba.pl",
  title: "gobiba.pl — wynajem sprzętu eventowego | Trójmiasto",
  description:
    "Wynajem sprzętu eventowego w Trójmieście: karaoke, strefa kibica, namiot klubowy VIP i prezentacje biznesowe. Dostawa, montaż i obsługa na miejscu.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://gobiba.pl",
  locale: "pl_PL",
  language: "pl",
  email: "kontakt@gobiba.pl",
  phone: "+48720512828",
  phoneDisplay: "+48 720 512 828",
  region: "Trójmiasto i okolice",
  ogImage: "/images/brand/logo-full.png",
  keywords: [
    "wynajem sprzętu eventowego",
    "karaoke na imprezę",
    "strefa kibica",
    "namiot imprezowy",
    "Trójmiasto",
    "Gdańsk",
    "Gdynia",
    "Sopot",
    "impreza w ogrodzie",
    "wynajem ekranu projektora",
    "obsługa eventów",
  ],
} as const;

export function absoluteUrl(path = ""): string {
  return new URL(path, SITE.url).toString();
}
