import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const tags = "h1|h2|h3|p|li|blockquote|dt|dd|span|a";

export function markHtml(html, slug) {
  const region = html.includes("<main")
    ? html.replace(/<main[\s\S]*<\/main>/, (main) => markMain(main, slug))
    : markRegion(html, slug);
  return region;
}

function markMain(main, slug) {
  const held = [];
  const parked = main.replace(
    /<div class="stimme-feature"[\s\S]*?<\/div>\s*<\/div>/,
    (block) => {
      held.push(block);
      return `<!--stimme-hold-${held.length - 1}-->`;
    },
  );
  let marked = markRegion(parked, slug);
  marked = marked.replace(/<!--stimme-hold-(\d+)-->/g, (_, i) => held[Number(i)]);
  return marked;
}

function markRegion(html, slug) {
  let n = maxId(html, slug);
  return html.replace(
    new RegExp(`<(${tags})(\\s[^>]*)?>`, "gi"),
    (full, tag, attrs = "") => {
      const attr = attrs || "";
      if (/\sdata-edit=/.test(attr)) return full;
      if (tag.toLowerCase() === "span" && !/wordmark-(name|role)/.test(attr)) {
        return full;
      }
      if (tag.toLowerCase() === "a" && /\b(button|wordmark|party-logo)\b/.test(attr)) {
        return full;
      }
      if (/\bhero-actions\b/.test(attr)) return full;
      n += 1;
      return `<${tag}${attr} data-edit="${slug}-${n}">`;
    },
  );
}

function maxId(html, slug) {
  let max = 0;
  const re = new RegExp(`data-edit="${slug}-(\\d+)"`, "g");
  for (const match of html.matchAll(re)) {
    max = Math.max(max, Number(match[1]));
  }
  return max;
}

export function markFile(file) {
  const slug = basename(file, ".html");
  const before = readFileSync(file, "utf8");
  const after = markHtml(before, slug);
  if (after !== before) writeFileSync(file, after);
  const count = (after.match(/data-edit="/g) || []).length;
  console.log(`${file}: ${count} Felder`);
}

const root = join(import.meta.dirname, "..");
if (process.argv[1] && process.argv[1].endsWith("mark-edits.mjs")) {
  for (const name of readdirSync(join(root, "src"))) {
    if (name.endsWith(".html")) markFile(join(root, "src", name));
  }
  for (const name of readdirSync(join(root, "src", "partials"))) {
    if (name.endsWith(".html")) markFile(join(root, "src", "partials", name));
  }
}
