import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const dist = resolve(import.meta.dirname, "..", "dist");
const pages = [
  "index.html",
  "ueber.html",
  "standpunkte.html",
  "kontakt.html",
  "impressum.html",
  "datenschutz.html",
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
});

test("Kontakt zeigt E-Mail und Spenden-IBAN", () => {
  const html = readFileSync(resolve(dist, "kontakt.html"), "utf8");
  assert.match(html, /info@andrezuraikat\.ch/);
  assert.match(html, /CH10 8080 8009 2892 0327 5/);
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
