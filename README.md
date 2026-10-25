# Gym Lipka

Szybki, darmowy i prywatny dziennik treningowy na Androida. Działa offline, dane zostają w telefonie.

**Aplikacja:** https://aipiotrlipinski.github.io/gym-lipka/

## Instalacja na telefonie

1. Otwórz adres aplikacji w Chrome na Androidzie.
2. Menu (⋮) → **Dodaj do ekranu głównego** / **Zainstaluj aplikację**.
3. Ikona Gym Lipka działa jak zwykła aplikacja, także bez internetu.

## Technologia

React + TypeScript + Vite, Tailwind CSS, Dexie (IndexedDB), vite-plugin-pwa. Publikacja przez GitHub Actions na GitHub Pages przy każdym pushu do `main`.

```bash
npm install
npm run dev      # podgląd lokalny
npm run build    # wersja produkcyjna w dist/
```

## Etapy

- [x] Etap 0 — szkielet, motyw jasny/ciemny, instalacja i tryb offline
- [x] Etap 1 — baza ćwiczeń i plany
- [x] Etap 2 — trening na żywo, timer przerwy
- [x] Etap 3 — historia, wykresy, rekordy
- [ ] Etap 4 — kopia zapasowa, CSV, import z GymRun
- [ ] Etap 5 — aplikacja APK
