import { SITE, absoluteUrl } from "./site";

export function buildLocalBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE.url}/#localbusiness`,
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    image: absoluteUrl(SITE.ogImage),
    telephone: SITE.phone,
    email: SITE.email,
    priceRange: "$$",
    areaServed: {
      "@type": "GeoCircle",
      geoMidpoint: {
        "@type": "GeoCoordinates",
        latitude: 54.352,
        longitude: 18.646,
      },
      geoRadius: 50000,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Trójmiasto",
      addressRegion: "pomorskie",
      addressCountry: "PL",
    },
    sameAs: [] as string[],
  };
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    inLanguage: SITE.language,
    publisher: {
      "@id": `${SITE.url}/#localbusiness`,
    },
  };
}

export function buildServiceJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        item: {
          "@type": "Service",
          name: "Król Karaoke",
          description: "Wynajem zestawu karaoke z ekranem, projektorem i nagłośnieniem na imprezę plenerową.",
          provider: { "@id": `${SITE.url}/#localbusiness` },
          areaServed: SITE.region,
        },
      },
      {
        "@type": "ListItem",
        position: 2,
        item: {
          "@type": "Service",
          name: "Strefa Kibica & Kino",
          description: "Ekran plenerowy do transmisji sportowych i seansów filmowych w ogrodzie.",
          provider: { "@id": `${SITE.url}/#localbusiness` },
          areaServed: SITE.region,
        },
      },
      {
        "@type": "ListItem",
        position: 3,
        item: {
          "@type": "Service",
          name: "Nocny Klub VIP",
          description: "Namiot imprezowy z nagłośnieniem i oświetleniem — klub nocny na Twojej działce.",
          provider: { "@id": `${SITE.url}/#localbusiness` },
          areaServed: SITE.region,
        },
      },
      {
        "@type": "ListItem",
        position: 4,
        item: {
          "@type": "Service",
          name: "Szybka Prezentacja",
          description: "Mobilny zestaw do prezentacji biznesowych i szkoleń plenerowych.",
          provider: { "@id": `${SITE.url}/#localbusiness` },
          areaServed: SITE.region,
        },
      },
    ],
  };
}
