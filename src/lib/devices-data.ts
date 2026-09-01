/**
 * Wynajem pojedynczego sprzętu: dostawa w strefie gratis dopiero od tej kwoty.
 * Poniżej progu doliczamy stałą opłatę DEVICE_DELIVERY_FEE.
 * Pakiety mają dostawę gratis niezależnie od kwoty — próg ich nie dotyczy.
 */
export const FREE_DELIVERY_MIN_TOTAL = 500;
export const DEVICE_DELIVERY_FEE = 50;

export type DeviceCategoryId = "naglosnienie" | "obraz" | "swiatlo" | "zasilanie" | "atrakcje";

export type DeviceCategory = {
  id: DeviceCategoryId;
  name: string;
  tagline: string;
};

export const DEVICE_CATEGORIES: DeviceCategory[] = [
  { id: "naglosnienie", name: "Nagłośnienie i mikrofony", tagline: "Głośniki, mikrofony i statywy" },
  { id: "obraz", name: "Projektory i ekrany", tagline: "Obraz na każdą okazję — od biura po ogród" },
  { id: "swiatlo", name: "Światło i efekty", tagline: "Klimat klubu w Twoim ogrodzie" },
  { id: "zasilanie", name: "Zasilanie", tagline: "Prąd tam, gdzie go nie ma" },
  { id: "atrakcje", name: "Atrakcje i dodatki", tagline: "Coś ekstra na Twoją imprezę" },
];

export type DeviceData = {
  id: string;
  name: string;
  category: DeviceCategoryId;
  description: string;
  image: string;
  /** Cena za dobę za 1 szt. */
  price: number;
  /** Kaucja zwrotna za 1 szt. (naliczana raz, niezależnie od liczby dób) */
  deposit: number;
  /** Maksymalna liczba sztuk do wypożyczenia */
  maxQty: number;
  /**
   * Cena łączna za dobę dla danej liczby sztuk (nadpisuje price × qty).
   * Np. JBL Partybox 720: 1 szt. = 140 zł, 2 szt. = 260 zł.
   */
  tierPrices?: Record<number, number>;
  /** Wynajem możliwy wyłącznie z dowozem i montażem przez nas */
  deliveryOnly?: boolean;
  badge?: string;
};

export const DEVICES_DATA: DeviceData[] = [
  // ── Nagłośnienie ──
  {
    id: "jbl-partybox-720",
    name: "Głośnik JBL Partybox 720",
    category: "naglosnienie",
    description:
      "Potężny głośnik imprezowy z mocnym basem i oświetleniem LED. Jeden wystarczy na domówkę, dwa w stereo robią prawdziwy koncert.",
    image: "/images/devices/jbl-partybox-720.jpg",
    price: 140,
    deposit: 500,
    maxQty: 2,
    tierPrices: { 1: 140, 2: 260 },
    badge: "2 szt. = 260 zł",
  },
  {
    id: "jbl-mic-wireless",
    name: "Mikrofony JBL Partybox Wireless (2 szt.)",
    category: "naglosnienie",
    description:
      "Komplet dwóch bezprzewodowych mikrofonów z odbiornikiem, dedykowany do głośników JBL Partybox. Parują się w kilka sekund — idealne do karaoke i duetów.",
    image: "/images/devices/jbl-mic-wireless.jpg",
    price: 50,
    deposit: 100,
    maxQty: 1,
    badge: "komplet 2 szt.",
  },
  {
    id: "shure-sm58",
    name: "Mikrofon przewodowy Shure SM58SE",
    category: "naglosnienie",
    description:
      "Legenda sceny — niezawodny mikrofon dynamiczny do wokalu i przemówień. Z wyłącznikiem, kabel XLR w zestawie.",
    image: "/images/devices/shure-sm58.jpg",
    price: 50,
    deposit: 100,
    maxQty: 1,
  },
  {
    id: "statyw-mikrofonowy",
    name: "Statyw mikrofonowy",
    category: "naglosnienie",
    description: "Stabilny statyw z regulacją wysokości i wysięgnikiem. Pasuje do każdego mikrofonu.",
    image: "/images/devices/statyw-mikrofonowy.jpg",
    price: 20,
    deposit: 50,
    maxQty: 1,
  },

  // ── Obraz ──
  {
    id: "projektor-benq-lh650",
    name: "Projektor BenQ LH650",
    category: "obraz",
    description:
      "Laserowy projektor Full HD 4000 lm — ostry, jasny obraz nawet przy niepełnym zaciemnieniu. Zero wymiany lamp, natychmiastowy start.",
    image: "/images/devices/projektor-benq-lh650.jpg",
    price: 160,
    deposit: 800,
    maxQty: 1,
    badge: "laserowy",
  },
  {
    id: "projektor-optoma-eh416",
    name: "Projektor Optoma EH416",
    category: "obraz",
    description:
      "Jasny projektor Full HD 4200 lm — sprawdzony na dziesiątkach imprez. Świetny do kina plenerowego, meczów i prezentacji.",
    image: "/images/devices/projektor-optoma-eh416.jpg",
    price: 100,
    deposit: 500,
    maxQty: 1,
  },
  {
    id: "ekran-120-stelaz",
    name: "Ekran 120'' na stalowym stelażu",
    category: "obraz",
    description:
      "Ekran projekcyjny 120 cali na solidnym stalowym stelażu. Szybki montaż w kilka minut — w domu, ogrodzie i sali konferencyjnej.",
    image: "/images/devices/ekran-120-stelaz.jpg",
    price: 100,
    deposit: 100,
    maxQty: 1,
    badge: "szybki montaż",
  },
  {
    id: "ekran-dmuchany-153",
    name: "Ekran dmuchany 153''",
    category: "obraz",
    description:
      "Gigantyczny ekran pneumatyczny 153 cale — efekt prawdziwego kina plenerowego. Przywozimy, pompujemy i kotwiczymy — Ty tylko włączasz film.",
    image: "/images/devices/ekran-dmuchany-153.jpg",
    price: 300,
    deposit: 500,
    maxQty: 1,
    deliveryOnly: true,
  },

  // ── Światło i efekty ──
  {
    id: "belka-led",
    name: "Belka LED PAR / Flower / Ball / Laser / UV",
    category: "swiatlo",
    description:
      "Belka na statywie 5 w 1: reflektory PAR RGB, efekt flower, kula dyskotekowa, laser i UV. Reaguje na muzykę — pilot w zestawie.",
    image: "/images/devices/belka-led.jpg",
    price: 50,
    deposit: 100,
    maxQty: 1,
    badge: "5 efektów w 1",
  },
  {
    id: "fazer-500",
    name: "Wytwornica dymu Light4Me Faze 500W",
    category: "swiatlo",
    description:
      "Delikatna, równomierna mgła, która wydobywa światła i lasery. Zbiornik 1,5 l starcza na kilka godzin — sterowanie pilotem bezprzewodowym.",
    image: "/images/devices/fazer-500.jpg",
    price: 50,
    deposit: 100,
    maxQty: 1,
  },

  // ── Zasilanie ──
  {
    id: "dji-power-1000",
    name: "Stacja zasilania DJI Power 1000 v2",
    category: "zasilanie",
    description:
      "Cicha przenośna stacja zasilania 1024 Wh / 2200 W. Zasili głośnik, projektor i oświetlenie — bez kabli i bez spalin.",
    image: "/images/devices/dji-power-1000.jpg",
    price: 100,
    deposit: 500,
    maxQty: 1,
    badge: "bezgłośna",
  },
  {
    id: "agregat-majster-mp0661",
    name: "Agregat inwerterowy Majster Pro MP0661",
    category: "zasilanie",
    description:
      "Cichy agregat inwerterowy z czystym przebiegiem — bezpieczny dla elektroniki. Impreza w środku lasu? Żaden problem.",
    image: "/images/devices/agregat-majster-mp0661.jpg",
    price: 80,
    deposit: 500,
    maxQty: 1,
  },

  // ── Atrakcje ──
  {
    id: "dmuchany-klub",
    name: "Dmuchany Klub 5×5,3 m",
    category: "atrakcje",
    description:
      "Czarny dmuchany namiot klubowy — 27 m² parkietu w Twoim ogrodzie. Przywozimy, montujemy i odbieramy po imprezie.",
    image: "/images/devices/dmuchany-klub.jpg",
    price: 600,
    deposit: 1000,
    maxQty: 1,
    deliveryOnly: true,
    badge: "hit imprez",
  },
  {
    id: "ekspres-nivona-756",
    name: "Ekspres ciśnieniowy NIVONA CafeRomatica 756",
    category: "atrakcje",
    description:
      "Automatyczny ekspres ciśnieniowy — świeżo mielona kawa, cappuccino i latte jednym przyciskiem. Idealny na eventy firmowe i wesela.",
    image: "/images/devices/ekspres-nivona-756.jpg",
    price: 160,
    deposit: 500,
    maxQty: 1,
  },
];

export function getDeviceById(id: string): DeviceData | undefined {
  return DEVICES_DATA.find((d) => d.id === id);
}

/** Kaucja łączna za daną liczbę sztuk (jednorazowa, nie mnoży się przez doby). */
export function calcDeviceDeposit(device: DeviceData, qty: number): number {
  if (qty <= 0) return 0;
  return device.deposit * qty;
}

/** Cena łączna za dobę dla danej liczby sztuk (uwzględnia progi cenowe). */
export function calcDevicePerDay(device: DeviceData, qty: number): number {
  if (qty <= 0) return 0;
  if (device.tierPrices?.[qty] != null) return device.tierPrices[qty];
  return device.price * qty;
}
