# Zdjęcia urządzeń

Packshoty na białym tle, bez znaków wodnych. Aby podmienić — nadpisz plik zachowując nazwę
(JPG, sugerowane min. 800 px). Po podmianie ekranów/namiotu/głośnika przegeneruj grafiki pakietów:

    python3 scripts/build-package-images.py

## Pliki

- jbl-partybox-720.jpg        — Głośnik JBL Partybox 720 (x-kom)
- jbl-mic-wireless.jpg        — Mikrofony JBL Partybox Wireless (x-kom)
- shure-sm58.jpg              — Shure SM58SE (kytary.pl, usunięty znak z rogu)
- statyw-mikrofonowy.jpg      — Statyw K&M (muzyczny.pl)
- projektor-benq-lh650.jpg    — BenQ LH650 (abcprezentacji.pl)
- projektor-optoma-eh416.jpg  — Optoma EH416 (projectorcentral.com)
- ekran-120-stelaz.jpg        — Ekran na 2 stojakach (VEVOR) + logo gobiba na płótnie
- ekran-dmuchany-153.jpg      — Ekran dmuchany (VEVOR) + logo gobiba na płótnie
- belka-led.jpg               — Belka LED PAR/Flower/Ball/Laser/UV (light4me.pl)
- fazer-500.jpg               — Wytwornica dymu Light4Me Faze 500W (musikshop.pl)
- dji-power-1000.jpg          — DJI Power 1000 v2 (dji.com)
- agregat-majster-mp0661.jpg  — Majster Pro MP0661 (majsterpolska.pl)
- dmuchany-klub.jpg           — Namiot klubowy (VEVOR)
- ekspres-nivona-756.jpg      — NIVONA 756 (empik/ecsmedia)

## Logo na ekranach

W ekrany wkomponowane jest logo z `public/images/brand/logo-full.png` (tryb multiply, więc
zachowuje cienie płótna). Przy podmianie zdjęcia ekranu logo trzeba nałożyć ponownie.

Uwaga: to zdjęcia produktowe producentów/sklepów użyte tymczasowo — docelowo najlepiej
podmienić je na własne fotografie sprzętu.

Gdy plik nie istnieje, strona pokazuje placeholder (gradient + ikona kategorii).
