export const DELIVERY_FREE_ZONE = "Trójmiasto + 20 km";
export const DELIVERY_FEATURE = `Dostawa i montaż gratis — ${DELIVERY_FREE_ZONE}`;
export const DELIVERY_RATE_ONE_WAY = 4;
export const DELIVERY_TRIPS = 2;

export function calcOutOfZoneDeliveryFee(km: number): number {
  if (!Number.isFinite(km) || km <= 0) return 0;
  return Math.round(km * DELIVERY_RATE_ONE_WAY * DELIVERY_TRIPS);
}

export const SERVICE_LEVELS = [
  { id: "delivery", name: "Przywozimy i składamy", desc: "Ogarniamy dostawę i montaż. Ty ogarniasz resztę.", priceAdd: 0 },
  { id: "staffed", name: "Zostajemy na imprezie", desc: "Nasz tech siedzi z Tobą przez całą noc — bass nie umrze.", priceAdd: 200 },
  { id: "corporate", name: "Full event crew", desc: "Dedykowana ekipa od A do Z. Idealna na eventy firmowe.", priceAdd: 450, badge: "dla firm" },
] as const;

export type ServiceLevelId = (typeof SERVICE_LEVELS)[number]["id"];

export type PackageAddon = { id: string; label: string; price: number };

export type PackageData = {
  id: string;
  name: string;
  tagline: string;
  category: string;
  description: string;
  features: string[];
  addons: PackageAddon[];
  price: number;
  deposit: number;
  rating: number;
  reviews: number;
  capacity: string;
  setup: string;
};

export const PACKAGES_DATA: PackageData[] = [
  {
    id: "karaoke",
    name: "Król Karaoke",
    tagline: "Hit domówek",
    category: "Karaoke",
    description:
      "Kompletny zestaw zamieniający ogród lub działkę w prawdziwą scenę muzyczną. Idealny na urodziny, wieczory panieńskie/kawalerskie i integracje.",
    features: [
      "Ekran 120'' na stalowym stelażu (szybki montaż)",
      "Projektor Optoma EH416 — wysoka jasność i ostry tekst piosenek",
      "Głośnik JBL Partybox 720 — czysty dźwięk i mocny bas",
      "2× mikrofony bezprzewodowe JBL",
      "Xiaomi TV Stick 4K (YouTube Karaoke, gotowy do śpiewania)",
      "2× leżaki firmowe gratis",
      "Okablowanie wodoodporne + najazdy kablowe",
      "Namiot ochronny 3×3m dla sprzętu + worki z piaskiem",
      DELIVERY_FEATURE,
    ],
    addons: [
      { id: "screen-inflatable", label: "Większa scena — ekran dmuchany 153''", price: 100 },
      { id: "stereo", label: "Koncertowe Stereo — drugi JBL Partybox 720", price: 100 },
      { id: "extra-mics", label: "Śpiewanie w grupie — łącznie 4 mikrofony JBL", price: 40 },
      { id: "laser-proj", label: "Laserowa Jakość — projektor Benq LH650", price: 50 },
      { id: "apple-tv", label: "Apple TV 4K — najwyższa płynność, bez zacięć", price: 60 },
      { id: "battery", label: "Bateria do głośnika — pełna bezprzewodowość", price: 30 },
      { id: "generator", label: "Agregat inwerterowy 2000W+ — impreza bez prądu", price: 80 },
      { id: "lounger", label: "Dodatkowy leżak (za szt.)", price: 20 },
    ],
    price: 399,
    deposit: 200,
    rating: 4.9,
    reviews: 60,
    capacity: "do 150 osób",
    setup: "45—90 min",
  },
  {
    id: "fan-zone",
    name: "Strefa Kibica & Kino",
    tagline: "Jak stadion, tylko u Ciebie w ogrodzie",
    category: "Sport / Kino",
    description:
      "Stworzony do sportowych emocji na żywo i klimatycznych maratonów filmowych. Zero mikrofonów, 100% czystego widowiska — mecze, KSW, filmy, seriale.",
    features: [
      "Ekran 120'' na stalowym stelażu",
      "Projektor Optoma EH416 — doskonały do relacji sportowych",
      "Głośnik JBL Partybox 720 — ryk trybun i kinowe uderzenie",
      "Xiaomi TV Stick 4K — TVP Sport, Canal+, Netflix, HBO",
      "2× leżaki firmowe gratis",
      "Okablowanie wodoodporne + najazdy kablowe",
      "Namiot ochronny 3×3m dla sprzętu + worki z piaskiem",
      DELIVERY_FEATURE,
    ],
    addons: [
      { id: "screen-inflatable", label: "Efekt Stadionu — ekran dmuchany 153''", price: 100 },
      { id: "stereo", label: "Dźwięk Trybun Stereo — drugi JBL Partybox 720", price: 100 },
      { id: "laser-proj", label: "Laserowa Płynność — projektor Benq LH650", price: 50 },
      { id: "apple-tv", label: "Apple TV 4K — płynna transmisja bez buforowania", price: 60 },
      { id: "battery", label: "Bateria do głośnika (za szt.)", price: 30 },
      { id: "generator", label: "Agregat inwerterowy 2000W+ — mecz na środku polany", price: 80 },
      { id: "lounger", label: "Dodatkowy leżak (za szt.)", price: 20 },
    ],
    price: 349,
    deposit: 200,
    rating: 4.8,
    reviews: 29,
    capacity: "do 100 osób",
    setup: "60 min",
  },
  {
    id: "party-tent",
    name: "Nocny Klub VIP",
    tagline: "Ekskluzywny Namiot Dmuchany",
    category: "Klub",
    description:
      "Całonocna impreza klubowa odporna na każdą pogodę. Czarny namiot dmuchany 27 m² z czerwonym dywanem — klimat, którego Twoi goście długo nie zapomną.",
    features: [
      "Czarny namiot dmuchany Vevor 5×5,4m (27 m² przestrzeni klubowej)",
      "Elegancki czerwony dywan + słupki hotelowe ze sznurami",
      "2× JBL Partybox 720 w systemie stereo — maksymalny bas",
      "Profesjonalna belka LED RGB — reaguje na rytm muzyki",
      "Wytwornica dymu Fogger 400W",
      "Dedykowana podłoga eventowa — izoluje od trawy i wilgoci",
      "2× leżaki firmowe gratis przed namiotem",
      "Okablowanie wodoodporne + najazdy kablowe",
      DELIVERY_FEATURE,
    ],
    addons: [
      { id: "karaoke-set", label: "Klubowe Karaoke — projektor + ekran 120'' + 2 mikrofony JBL", price: 150 },
      { id: "cinema-set", label: "Klubowe Kino / Strefa Kibica — projektor + ekran 120''", price: 120 },
      { id: "generator", label: "Agregat inwerterowy 2000W+ — zasilanie w dowolnym miejscu", price: 80 },
      { id: "lounger", label: "Dodatkowy leżak (za szt.)", price: 20 },
    ],
    price: 899,
    deposit: 400,
    rating: 4.9,
    reviews: 64,
    capacity: "do 200 osób",
    setup: "75—90 min",
  },
  {
    id: "presentation",
    name: "Szybka Prezentacja",
    tagline: "Mobilne Biuro / B2B",
    category: "Biznes",
    description:
      "Profesjonalny zestaw do spotkań biznesowych, szkoleń i konferencji. Spakowany w skrzynię All-in-One — gotowy do działania w 3 minuty.",
    features: [
      "Ekran 120'' na eleganckim stalowym stelażu",
      "Skrzynia ALL-IN-ONE: projektor Optoma EH416 + głośnik szerokopasmowy + hub zasilający",
      "Montaż w 3 minuty — sprzęt już podłączony, otwierasz i wyświetlasz",
      "Długi czarny kabel HDMI + przedłużacz",
      "Najazdy kablowe (wymogi BHP w firmach)",
      DELIVERY_FEATURE,
    ],
    addons: [
      { id: "wireless", label: "Bezprzewodowe Prezentacje — Apple TV 4K / Xiaomi", price: 60 },
      { id: "laser-proj", label: "Laserowa Perfekcja — projektor Benq LH650 (dla Excela i tabel)", price: 50 },
      { id: "generator", label: "Prezentacja w terenie — cichy agregat inwerterowy", price: 80 },
    ],
    price: 249,
    deposit: 150,
    rating: 4.9,
    reviews: 33,
    capacity: "do 100 osób",
    setup: "3 min",
  },
];

export function getPackageById(id: string): PackageData | undefined {
  return PACKAGES_DATA.find((p) => p.id === id);
}
