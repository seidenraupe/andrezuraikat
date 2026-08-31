import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const dist = resolve(import.meta.dirname, "..", "dist");
const media = resolve(import.meta.dirname, "..", "src", "media");
const pages = [
  "index.html",
  "ueber.html",
  "standpunkte.html",
  "referenzen.html",
  "engagement.html",
  "geschaefte.html",
  "aktuell.html",
  "kontakt.html",
  "impressum.html",
  "datenschutz.html",
];

const photos = [
  "portrait-hero.jpg",
  "portrait-obertor.jpg",
  "portrait-engagement.jpg",
  "architektur.jpg",
  "banner-die-mitte.jpg",
  "logo-z.png",
  "smartspider.jpg",
  "abstimmung.jpg",
  "silvia-steiner.jpg",
  "mike-kuenzle.jpg",
  "monika-bosshard.jpg",
  "christian-huggenberg.jpg",
  "luana-antunes.jpg",
  "roland-zolliker.jpg",
  "giuseppe-ticchio.jpg",
];

test("Produktionsbuild enthält alle Seiten", () => {
  for (const page of pages) {
    const file = resolve(dist, page);
    assert.equal(existsSync(file), true, `fehlt: ${page}`);
  }
});

test("Startseite nennt Mandat und Partei", () => {
  const html = readFileSync(resolve(dist, "index.html"), "utf8");
  assert.match(html, /Stadtparlamentarier/);
  assert.match(html, /Die Mitte/);
  assert.match(html, /Winterthur/);
  assert.match(html, /portrait-hero/);
  assert.match(html, /logo-die-mitte/);
  assert.match(html, /geschaefte\.html/);
});

test("Parlamentsseite listet Vorstösse neueste zuerst", () => {
  const html = readFileSync(resolve(dist, "geschaefte.html"), "utf8");
  assert.match(html, /Meine Geschäfte/);
  assert.match(html, /2026\.86/);
  assert.match(html, /2019\.79/);
  assert.match(html, /Erstunterzeichner/);
  assert.match(html, /Mitunterzeichner/);
  assert.match(html, /parlament\.winterthur\.ch\/behoerdenmitglieder\/280949/);
  const first = html.indexOf("2026.86");
  const last = html.indexOf("2019.79");
  assert.ok(first > 0 && last > first, "neueste Geschäfte müssen zuerst stehen");
  assert.equal((html.match(/<tr>/g) || []).length, 31);
});

test("Kontakt zeigt E-Mail und Spenden-IBAN", () => {
  const html = readFileSync(resolve(dist, "kontakt.html"), "utf8");
  assert.match(html, /info@andrezuraikat\.ch/);
  assert.match(html, /CH10 8080 8009 2892 0327 5/);
  assert.match(html, /portrait-obertor/);
});

test("Standpunkte enthalten alle sechs Schwerpunkte", () => {
  const html = readFileSync(resolve(dist, "standpunkte.html"), "utf8");
  for (const title of [
    "Soziale Gerechtigkeit",
    "Solide Bildung",
    "Attraktiver Wirtschaftsstandort",
    "Faire Familienpolitik",
    "Engagierte Integrationspolitik",
    "Gute Sportförderung",
  ]) {
    assert.match(html, new RegExp(title));
  }
});

test("Wix-Fotos liegen lokal unter src/media", () => {
  const files = new Set(readdirSync(media));
  for (const photo of photos) {
    assert.equal(files.has(photo), true, `Foto fehlt: ${photo}`);
  }
});

test("Referenzen enthalten die Stimmen mit Porträts", () => {
  const html = readFileSync(resolve(dist, "referenzen.html"), "utf8");
  assert.match(html, /Silvia Steiner/);
  assert.match(html, /Mike Künzle/);
  assert.match(html, /Luana Antunes/);
  assert.match(html, /silvia-steiner/);
});

test("CI-Schrift Modern Era ist im Build", () => {
  const fonts = resolve(import.meta.dirname, "..", "src", "css", "fonts");
  for (const file of [
    "ModernEra-Medium.woff2",
    "ModernEra-MediumItalic.woff2",
    "ModernEra-ExtraBold.woff2",
  ]) {
    assert.equal(existsSync(resolve(fonts, file)), true, `Schrift fehlt: ${file}`);
  }
  const cssDir = resolve(dist, "assets");
  const cssFile = readdirSync(cssDir).find((name) => name.endsWith(".css"));
  assert.ok(cssFile, "kein CSS im Build");
  const css = readFileSync(resolve(cssDir, cssFile), "utf8");
  assert.match(css, /Modern Era/);
  assert.match(css, /Arial/);
});
