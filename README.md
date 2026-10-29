# Gym Lipka

Szybki, darmowy i prywatny dziennik treningowy na Androida. Działa offline, dane zostają w telefonie.

**Aplikacja:** https://aipiotrlipinski.github.io/gym-lipka/

## Aplikacja APK (zalecana)

**Pobierz:** https://github.com/aipiotrlipinski/gym-lipka/releases/download/apk/gym-lipka.apk

1. Otwórz link na telefonie i pobierz plik. Przy instalacji Android poprosi o zgodę na instalację z Chrome — zezwól.
2. Nowe wersje instalujesz tak samo, na starej — dane zostają.
3. Na ekranie Start stuknij **Połącz z Google Fit**: kroki z Google Fit (przez Health Connect) i zapis treningów z kaloriami do Google Fit.

### Przeniesienie danych z wersji przeglądarkowej

1. W starej apce: Ustawienia → Kopia zapasowa → **Zapisz kopię** (plik ląduje w Pobranych).
2. W APK: Ustawienia → Kopia zapasowa → **Przywróć z pliku** → wybierz ten plik.
3. Sprawdź historię w APK. Dopiero wtedy usuń starą ikonę.

## Wersja przeglądarkowa

1. Otwórz adres aplikacji w Chrome na Androidzie.
2. Menu (⋮) → **Dodaj do ekranu głównego** / **Zainstaluj aplikację**.
3. Ikona Gym Lipka działa jak zwykła aplikacja, także bez internetu.
4. Przytrzymaj ikonę → skróty **Zacznij trening**, **Historia**, **Ćwiczenia**. Skrót można przeciągnąć na pulpit jako osobną ikonę.

## Zdjęcia ćwiczeń

Zdjęcia (pozycja startowa i końcowa) pochodzą z [free-exercise-db](https://github.com/yuhonas/free-exercise-db), domena publiczna (Unlicense). Pliki WebP leżą w `public/ex/`, przypisanie do nazw w `src/data/exerciseImages.ts`. Własnym ćwiczeniom zdjęcie wybiera się z tej samej biblioteki.

## Technologia

React + TypeScript + Vite, Tailwind CSS, Dexie (IndexedDB), vite-plugin-pwa. Publikacja przez GitHub Actions na GitHub Pages przy każdym pushu do `main`.

APK: Capacitor 8 (`android/`) z własnym modułem Health Connect (`android/app/src/main/java/pl/lipka/gym/HealthPlugin.kt`): odczyt kroków, zapis treningu siłowego z aktywnymi kaloriami. GitHub Actions (`apk.yml`) buduje APK przy każdym pushu i wystawia je w Releases pod stałym adresem. Podpis: `android/app/gym-lipka.keystore` (prywatny projekt — klucz w repo, żeby każda wersja instalowała się na poprzedniej).

Kalorie: szacunek MET 5,0 × masa ciała × czas (`src/lib/kcal.ts`). Do Google Fit trafiają aktywne kalorie (MET − 1), bo Fit sam dolicza spoczynkowe.

```bash
npm run build:apk  # wersja do APK + kopiowanie do android/
npm install
npm run dev      # podgląd lokalny
npm run build    # wersja produkcyjna w dist/
npm test         # testy (m.in. import z GymRun)
```

## Etapy

- [x] Etap 0 — szkielet, motyw jasny/ciemny, instalacja i tryb offline
- [x] Etap 1 — baza ćwiczeń i plany
- [x] Etap 2 — trening na żywo, timer przerwy
- [x] Etap 3 — historia, wykresy, rekordy
- [x] Etap 4 — kopia zapasowa (Ustawienia → Kopia zapasowa), import z GymRun (Ustawienia → Import)
- [x] Etap 5a — aplikacja APK, kroki z Google Fit, treningi i kalorie do Google Fit
- [ ] Etap 5b — widget na ekran główny
- [x] Superserie (w dniu planu „+ połącz w superserię” albo w menu ćwiczenia podczas treningu), stałe notatki do ćwiczeń, przesuwanie palcem między ćwiczeniami
