# Konzept: Website André Zuraikat

## Ziel

Persönlicher Webauftritt für André Zuraikat als **lokaler Stadtparlamentarier in Winterthur** (Die Mitte), erreichbar unter [www.andrezuraikat.ch](https://www.andrezuraikat.ch/).

Die bisherige Seite ist ein Wix-Baukasten (Titel noch «CVP - Die Mitte»). Dieses Repository ersetzt ihn durch statisches HTML: dieselben Kerninhalte, ohne Abo, mit Versionierung auf GitHub.

## Person und Mandat (Stand August 2026)

| | |
| --- | --- |
| Name | André Zuraikat |
| Partei | Die Mitte |
| Amt | Stadtparlamentarier Winterthur seit 13. Mai 2019 |
| Stadtkreis | Töss |
| Weitere Ämter | Präsident Die Mitte Bezirk Winterthur (seit 2022); Mitglied Kommission Bildung, Sport und Kultur (BSKK) |
| Wiederwahl | 8. März 2026, Legislatur 2026–2030 |
| Kontakt | info@andrezuraikat.ch, Finkenrain 17, 8406 Winterthur |

Quellen: bestehende Site, [Die Mitte Stadt Winterthur](https://winterthur.die-mitte.ch/menschen/andre-zuraikat/), [Stadtparlament](https://parlament.winterthur.ch/behoerdenmitglieder/280949).

## Was von Wix übernommen wird

- Rolle und Claim (Stadtparlamentarier, Bezirkspräsident)
- Die sechs Standpunkte (Gerechtigkeit, Bildung, Wirtschaft, Familie, Integration, Sport)
- «Kurz nachgefragt» (Q&A)
- Kontakt, Spendenkonto (IBAN Die Mitte Stadt Winterthur, Zweck «Komitee André Zuraikat»)
- Links zur Mitte Stadt / Kanton

## Was sich gegenüber Wix ändert

- Wahlkampfzeile «am 8. März 2026 wieder ins Stadtparlament» wird zur **amtierenden Legislatur 2026–2030** (Wiederwahl ist erfolgt).
- Parteibezeichnung überall **Die Mitte**, nicht CVP.
- Kein Wix-Tracking, kein Baukasten.
- Impressum und Datenschutz als eigene Seiten.
- Fotos vom bisherigen Auftritt sind noch nicht im Repo — folgen, sobald sie vorliegen.

## Informationsarchitektur

1. Start — Person, Mandat, Standpunkte-Übersicht
2. Über mich — Werdegang und Q&A
3. Standpunkte — Langtexte
4. Kontakt — Mail, Spende, Partei-Links
5. Impressum / Datenschutz

Später möglich, aber nicht im ersten Gerüst: aktuelle Vorstösse, Termine, Newsletter.

## Technik

Wie [kc3k](https://github.com/seidenraupe/kc3k) und [learnbox-website](https://github.com/seidenraupe/learnbox-website):

- Vite, statisches HTML unter `src/`
- Partials für Kopf, Fuss und gemeinsame Meta-Tags
- `base: "./"` damit GitHub Pages und später das Hosting der Domain in der Wurzel funktionieren
- Node-Tests gegen den Build (`npm run check`)

Produktiv bleibt die Domain **andrezuraikat.ch**. Hosting-Entscheidung (z. B. KreativMedia wie bei den anderen Sites) ist noch offen und wird hier nachgetragen.

## Offene Punkte

- Portrait- und Aktionsfotos beschaffen (Rechte klären)
- Kontaktformular: vorerst `mailto:`; PHP-Mail wie bei learnbox nur falls gewünscht
- Spendenhinweis nach der Wahl: Konto belassen oder auf Mandatsarbeit umstellen?
- Social-Media-Profile verlinken, sobald bestätigt
