import {
  DEVICES_DATA,
  calcDeviceDeposit,
  calcDevicePerDay,
  type DeviceData,
} from "@/lib/devices-data";

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

export type PackageAddon = {
  id: string;
  label: string;
  price: number;
  /** Kaucja doliczana do kaucji pakietu, gdy klient wybierze ten dodatek */
  deposit: number;
};

// ─── Cennik pakietów liczony z katalogu sprzętu ──────────────────────────────
// Dopłata do pakietu = cena sprzętu z sekcji „Sam skompletuj swój zestaw”.
// Przy zamianie sprzętu liczymy różnicę, bo tańszy egzemplarz jest już w pakiecie.
// Wszystko liczymy z przekazanego katalogu, żeby ceny zmienione w panelu admina
// przeliczały też pakiety — cennik nie może rozjechać się z pojedynczym sprzętem.

/** Sprzęt z katalogu wchodzący w skład pakietu: [id urządzenia, liczba sztuk]. */
export const PACKAGE_EQUIPMENT: Record<string, Array<[string, number]>> = {
  karaoke: [
    ["ekran-120-stelaz", 1],
    ["projektor-optoma-eh416", 1],
    ["jbl-partybox-720", 1],
    ["jbl-mic-wireless", 1],
  ],
  "fan-zone": [
    ["ekran-120-stelaz", 1],
    ["projektor-optoma-eh416", 1],
    ["jbl-partybox-720", 1],
  ],
  "party-tent": [
    ["dmuchany-klub", 1],
    ["jbl-partybox-720", 2],
    ["belka-led", 1],
    ["fazer-500", 1],
  ],
};

/** O ile pakiet jest tańszy od wynajmu tego samego sprzętu pojedynczo. */
export const PACKAGE_DISCOUNT: Record<string, number> = {
  karaoke: 11,
  "fan-zone": 11,
  "party-tent": 61,
};

/** Jak policzyć cenę i kaucję dopłaty na podstawie katalogu sprzętu. */
export type AddonRecipe =
  /** pełna cena i kaucja urządzenia dokładanego do pakietu */
  | { kind: "device"; deviceId: string }
  /** zamiana sprzętu z pakietu na droższy — dopłacamy różnicę */
  | { kind: "upgrade"; fromId: string; toId: string }
  /** kolejna sztuka tego samego sprzętu (uwzględnia progi ilościowe) */
  | { kind: "extraUnit"; deviceId: string; qty: number }
  /** kilka urządzeń naraz */
  | { kind: "bundle"; deviceIds: string[] }
  /** sprzęt spoza katalogu — kwoty wpisane wprost */
  | { kind: "fixed"; price: number; deposit: number };

export const ADDON_RECIPES: Record<string, AddonRecipe> = {
  "screen-inflatable": { kind: "upgrade", fromId: "ekran-120-stelaz", toId: "ekran-dmuchany-153" },
  stereo: { kind: "extraUnit", deviceId: "jbl-partybox-720", qty: 2 },
  "laser-proj": { kind: "upgrade", fromId: "projektor-optoma-eh416", toId: "projektor-benq-lh650" },
  "wired-mic": { kind: "bundle", deviceIds: ["shure-sm58", "statyw-mikrofonowy"] },
  "led-bar": { kind: "device", deviceId: "belka-led" },
  fogger: { kind: "device", deviceId: "fazer-500" },
  generator: { kind: "device", deviceId: "agregat-majster-mp0661" },
  "power-station": { kind: "device", deviceId: "dji-power-1000" },
  coffee: { kind: "device", deviceId: "ekspres-nivona-756" },
  "cinema-set": { kind: "bundle", deviceIds: ["projektor-optoma-eh416", "ekran-120-stelaz"] },
  "karaoke-set": {
    kind: "bundle",
    deviceIds: ["projektor-optoma-eh416", "ekran-120-stelaz", "jbl-mic-wireless"],
  },
  // sprzęt spoza katalogu wynajmu pojedynczego
  "apple-tv": { kind: "fixed", price: 60, deposit: 100 },
  wireless: { kind: "fixed", price: 60, deposit: 100 },
  battery: { kind: "fixed", price: 30, deposit: 100 },
  lounger: { kind: "fixed", price: 20, deposit: 0 },
};

function findDevice(catalog: DeviceData[], id: string): DeviceData {
  const device = catalog.find((d) => d.id === id);
  if (!device) throw new Error(`Nieznane urządzenie w cenniku pakietów: ${id}`);
  return device;
}

/** Cena dopłaty policzona z podanego katalogu sprzętu. */
export function calcAddonPrice(recipe: AddonRecipe, catalog: DeviceData[]): number {
  switch (recipe.kind) {
    case "fixed":
      return recipe.price;
    case "device":
      return findDevice(catalog, recipe.deviceId).price;
    case "upgrade":
      return Math.max(
        0,
        findDevice(catalog, recipe.toId).price - findDevice(catalog, recipe.fromId).price,
      );
    case "extraUnit": {
      const device = findDevice(catalog, recipe.deviceId);
      return calcDevicePerDay(device, recipe.qty) - calcDevicePerDay(device, recipe.qty - 1);
    }
    case "bundle":
      return recipe.deviceIds.reduce((sum, id) => sum + findDevice(catalog, id).price, 0);
  }
}

/** Kaucja dopłaty policzona z podanego katalogu sprzętu. */
export function calcAddonDeposit(recipe: AddonRecipe, catalog: DeviceData[]): number {
  switch (recipe.kind) {
    case "fixed":
      return recipe.deposit;
    case "device":
      return findDevice(catalog, recipe.deviceId).deposit;
    case "upgrade":
      return Math.max(
        0,
        findDevice(catalog, recipe.toId).deposit - findDevice(catalog, recipe.fromId).deposit,
      );
    case "extraUnit": {
      const device = findDevice(catalog, recipe.deviceId);
      return calcDeviceDeposit(device, recipe.qty) - calcDeviceDeposit(device, recipe.qty - 1);
    }
    case "bundle":
      return recipe.deviceIds.reduce((sum, id) => sum + findDevice(catalog, id).deposit, 0);
  }
}

/** Cena pakietu = suma sprzętu z katalogu minus rabat. */
export function calcPackagePrice(packageId: string, catalog: DeviceData[]): number {
  const items = PACKAGE_EQUIPMENT[packageId] ?? [];
  const total = items.reduce(
    (sum, [deviceId, qty]) => sum + calcDevicePerDay(findDevice(catalog, deviceId), qty),
    0,
  );
  return total - (PACKAGE_DISCOUNT[packageId] ?? 0);
}

const price = (id: string) => calcAddonPrice(ADDON_RECIPES[id], DEVICES_DATA);
const deposit = (id: string) => calcAddonDeposit(ADDON_RECIPES[id], DEVICES_DATA);
const addon = (id: string, label: string): PackageAddon => ({
  id,
  label,
  price: price(id),
  deposit: deposit(id),
});
const packagePrice = (id: string) => calcPackagePrice(id, DEVICES_DATA);

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
      addon("screen-inflatable", "Większa scena — ekran dmuchany 153''"),
      addon("stereo", "Koncertowe Stereo — drugi JBL Partybox 720"),
      addon("wired-mic", "Mikrofon przewodowy Shure SM58SE + statyw"),
      addon("laser-proj", "Laserowa Jakość — projektor Benq LH650"),
      addon("led-bar", "Klimat klubu — belka LED (PAR / laser / UV)"),
      addon("fogger", "Wytwornica dymu Light4Me Faze 500W"),
      addon("apple-tv", "Apple TV 4K — najwyższa płynność, bez zacięć"),
      addon("battery", "Bateria do głośnika — pełna bezprzewodowość"),
      addon("generator", "Agregat inwerterowy 2000W+ — impreza bez prądu"),
      addon("lounger", "Dodatkowy leżak (za szt.)"),
    ],
    price: packagePrice("karaoke"),
    deposit: 800,
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
      addon("screen-inflatable", "Efekt Stadionu — ekran dmuchany 153''"),
      addon("stereo", "Dźwięk Trybun Stereo — drugi JBL Partybox 720"),
      addon("laser-proj", "Laserowa Płynność — projektor Benq LH650"),
      addon("apple-tv", "Apple TV 4K — płynna transmisja bez buforowania"),
      addon("battery", "Bateria do głośnika (za szt.)"),
      addon("generator", "Agregat inwerterowy 2000W+ — mecz na środku polany"),
      addon("power-station", "Cicha stacja zasilania DJI Power 1000 v2"),
      addon("lounger", "Dodatkowy leżak (za szt.)"),
    ],
    price: packagePrice("fan-zone"),
    deposit: 800,
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
      "Wytwornica dymu Light4Me Faze 500W",
      "Dedykowana podłoga eventowa — izoluje od trawy i wilgoci",
      "2× leżaki firmowe gratis przed namiotem",
      "Okablowanie wodoodporne + najazdy kablowe",
      DELIVERY_FEATURE,
    ],
    addons: [
      addon("karaoke-set", "Klubowe Karaoke — projektor + ekran 120'' + 2 mikrofony JBL"),
      addon("cinema-set", "Klubowe Kino / Strefa Kibica — projektor + ekran 120''"),
      addon("coffee", "Kawa dla gości — ekspres NIVONA CafeRomatica 756"),
      addon("generator", "Agregat inwerterowy 2000W+ — zasilanie w dowolnym miejscu"),
      addon("lounger", "Dodatkowy leżak (za szt.)"),
    ],
    price: packagePrice("party-tent"),
    deposit: 1500,
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
      addon("wireless", "Bezprzewodowe Prezentacje — Apple TV 4K / Xiaomi"),
      addon("laser-proj", "Laserowa Perfekcja — projektor Benq LH650 (dla Excela i tabel)"),
      addon("wired-mic", "Mikrofon przewodowy Shure SM58SE + statyw"),
      addon("coffee", "Przerwa kawowa — ekspres NIVONA CafeRomatica 756"),
      addon("power-station", "Prezentacja w terenie — stacja zasilania DJI Power 1000 v2"),
      addon("generator", "Prezentacja w terenie — cichy agregat inwerterowy"),
    ],
    price: 249,
    deposit: 500,
    rating: 4.9,
    reviews: 33,
    capacity: "do 100 osób",
    setup: "3 min",
  },
];

export function getPackageById(id: string): PackageData | undefined {
  return PACKAGES_DATA.find((p) => p.id === id);
}
