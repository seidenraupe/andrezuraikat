import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const root = resolve(import.meta.dirname, "src");

const pages = [
  "index",
  "ueber",
  "standpunkte",
  "referenzen",
  "engagement",
  "geschaefte",
  "aktuell",
  "kontakt",
  "impressum",
  "datenschutz",
];

function htmlPartials() {
  return {
    name: "html-partials",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        const page = ctx.filename
          ? ctx.filename.replace(/\\/g, "/").split("/").pop().replace(".html", "")
          : "index";

        const replacePartial = (source, name) => {
          const file = resolve(root, "partials", `${name}.html`);
          if (!existsSync(file)) return source;
          let partial = readFileSync(file, "utf8");
          partial = partial.replaceAll(
            `data-nav="${page}"`,
            `data-nav="${page}" aria-current="page"`,
          );
          return source.replaceAll(`<!--partial:${name}-->`, partial);
        };

        return ["head-end", "header", "footer"].reduce(replacePartial, html);
      },
    },
  };
}

export default defineConfig({
  root,
  base: "./",
  publicDir: resolve(import.meta.dirname, "public"),
  plugins: [htmlPartials()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((name) => [
          name,
          resolve(root, name === "index" ? "index.html" : `${name}.html`),
        ]),
      ),
    },
  },
});
