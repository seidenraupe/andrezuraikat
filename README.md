# andrezuraikat.ch

Persönliche Website von **André Zuraikat**, Stadtparlamentarier (Die Mitte) in Winterthur und Präsident der Mitte Bezirk Winterthur.

Ablösung der bisherigen Wix-Seite unter [www.andrezuraikat.ch](https://www.andrezuraikat.ch/). Quellcode und Dokumentation liegen in diesem Repository: [github.com/seidenraupe/andrezuraikat](https://github.com/seidenraupe/andrezuraikat).

## Lokal starten

```bash
npm install
npm run dev
```

Der Dev-Server läuft auf [http://127.0.0.1:5173](http://127.0.0.1:5173).

```bash
npm run check    # Build und Inhaltstests
npm run build    # statische Dateien nach dist/
npm run preview  # Produktionsbuild lokal ansehen
```

## Seiten

| Seite | Inhalt |
| --- | --- |
| `index.html` | Start, Mandat, sechs Standpunkte im Überblick |
| `ueber.html` | Werdegang, Kommission, «Kurz nachgefragt» |
| `standpunkte.html` | Die sechs politischen Schwerpunkte |
| `kontakt.html` | E-Mail, Adresse, Spendenkonto, Links |
| `impressum.html` / `datenschutz.html` | Rechtliches |

Texte, Kopf- und Fusszeile stehen unter `src/`. Erscheinungsbild: `src/css/styles.css`. Gemeinsame Teile: `src/partials/`.

## Dokumentation

- [Konzept](docs/KONZEPT.md) — Ziel, Inhalt, Architektur, was von Wix übernommen wird
- [GitHub](docs/GITHUB.md) — Repository, Preview, Alltagsarbeit
- [Windows](docs/WINDOWS.md) — lokales Arbeiten ohne WSL

## Farben

Angelehnt an das CI von Die Mitte: Orange `#FF9B00` (RGB 255 155 0) und Blau `#003C69` (RGB 0 60 105).
