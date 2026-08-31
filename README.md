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
| `index.html` | Start mit Overlay-Porträt, Standpunkte, aktuelle Vorstösse |
| `ueber.html` | Werdegang, Karate, Smartvote, «Kurz nachgefragt» |
| `engagement.html` | Interview mit Porträt |
| `standpunkte.html` | Die sechs politischen Schwerpunkte |
| `referenzen.html` | Stimmen aus Politik, Sport und Wirtschaft |
| `geschaefte.html` | Vorstösse im Stadtparlament, neueste zuerst |
| `aktuell.html` | Abstimmungsempfehlungen |
| `kontakt.html` | E-Mail, Adresse, Spendenkonto, Porträt Obertor |
| `impressum.html` / `datenschutz.html` | Rechtliches |

Fotos aus der Wix-Seite liegen unter `src/media/`. Übersicht: [docs/FOTOS.md](docs/FOTOS.md).

## Dokumentation

- [Konzept](docs/KONZEPT.md) — Ziel, Inhalt, Architektur, was von Wix übernommen wird
- [Fotos](docs/FOTOS.md) — Herkunft und Einsatz der Bilder von andrezuraikat.ch
- [GitHub](docs/GITHUB.md) — Repository, Preview, Alltagsarbeit
- [Windows](docs/WINDOWS.md) — lokales Arbeiten ohne WSL

## Farben und Schrift

Angelehnt an das [CI von Die Mitte](https://die-mitte.ch/wp-content/uploads/2021/11/DE_DieMitte_BrandManual_210714.pdf):

- Orange `#FF9B00` (RGB 255 155 0) und Blau `#003C69` (RGB 0 60 105)
- Hausschrift **Modern Era**: Extra Bold für Überschriften, Medium für Lauftext (wie auf die-mitte.ch). System-Ersatz laut Manual: Arial.
