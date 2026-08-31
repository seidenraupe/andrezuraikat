import { readFileSync, writeFileSync } from "node:fs";

const items = JSON.parse(readFileSync("src/data/geschaefte.json", "utf8"));

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const rows = items
  .map((item) => {
    const iso = item.datum.split(".").reverse().join("-");
    const url = `https://parlament.winterthur.ch/_rte/information/${item.id}`;
    return `          <tr>
            <td class="num"><time datetime="${iso}">${esc(item.datum)}</time></td>
            <td class="num"><a href="${url}" rel="noopener noreferrer">${esc(item.nummer)}</a></td>
            <td>${esc(item.art)}</td>
            <td>
              <a href="${url}" rel="noopener noreferrer">${esc(item.titel)}</a>
              <p class="geschaeft-summary">${esc(item.zusammenfassung)}</p>
            </td>
            <td>${esc(item.rolle)}</td>
          </tr>`;
  })
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="de-CH">
  <head>
    <!--partial:head-end-->
    <title>Parlament — André Zuraikat</title>
    <meta
      name="description"
      content="Vorstösse von André Zuraikat im Stadtparlament Winterthur: Motionen, Postulate, Interpellationen und Anfragen, die er eingebracht oder mitunterzeichnet hat."
    />
  </head>
  <body>
    <!--partial:header-->
    <main id="inhalt">
      <section class="page-intro">
        <div class="wrap">
          <p class="kicker">Stadtparlament</p>
          <h1>Meine Geschäfte</h1>
          <p class="lede">
            Vorstösse, die ich als Stadtparlamentarier eingebracht oder
            mitunterzeichnet habe. Neueste Geschäfte zuerst. Quelle:
            <a
              href="https://parlament.winterthur.ch/behoerdenmitglieder/280949"
              rel="noopener noreferrer"
              >Politische Vorstösse im Ratsinformationssystem</a
            >.
          </p>
        </div>
      </section>
      <section class="section">
        <div class="wrap table-wrap">
          <table class="geschaefte">
            <thead>
              <tr>
                <th scope="col">Datum</th>
                <th scope="col">Nr.</th>
                <th scope="col">Art</th>
                <th scope="col">Geschäft</th>
                <th scope="col">Rolle</th>
              </tr>
            </thead>
            <tbody>
${rows}
            </tbody>
          </table>
        </div>
        <div class="wrap">
          <p class="source-note">
            ${items.length} Geschäfte, neueste zuerst. Stand laut
            Mitgliederprofil von André Zuraikat im Stadtparlament Winterthur.
            Nummer und Titel führen zum Originalgeschäft.
          </p>
        </div>
      </section>
    </main>
    <!--partial:footer-->
    <script type="module" src="./js/main.js"></script>
  </body>
</html>
`;

writeFileSync("src/geschaefte.html", html);
console.log(`wrote ${items.length} rows`);
