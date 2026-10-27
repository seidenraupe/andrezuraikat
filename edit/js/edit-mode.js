(() => {
  const cfg = window.AZ_EDIT;
  if (!cfg || !cfg.api) return;

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  const bar = document.createElement("div");
  bar.className = "az-edit-bar";
  bar.innerHTML = `
    <strong>Bearbeitung</strong>
    <span>${cfg.role === "freigabe" ? "Freigabe" : "Redaktion"} · ${esc(cfg.email)}</span>
    <button type="button" data-cmd="bold">Fett</button>
    <button type="button" data-cmd="italic">Kursiv</button>
    <button type="button" data-cmd="underline">Unterstrichen</button>
    <button type="button" data-act="save">Entwurf speichern</button>
    <button type="button" data-act="publish" ${cfg.role === "freigabe" ? "" : "disabled"}>Live schalten</button>
    ${cfg.role === "freigabe" ? `<a href="${esc(cfg.access)}">Zugänge</a>` : ""}
    <a href="${esc(cfg.roleSwitch)}">Rolle wechseln</a>
    <a href="${esc(cfg.logout)}">Abmelden</a>
    <span data-status></span>
  `;
  const style = document.createElement("style");
  style.textContent = `
    .az-edit-bar { position: sticky; top: 0; z-index: 50; display: flex; flex-wrap: wrap; gap: .4rem .7rem; align-items: center; padding: .55rem .9rem; background: #003c69; color: #fff; font: 600 .95rem/1.3 Arial, sans-serif; }
    .az-edit-bar button, .az-edit-bar a { color: #1a1714; background: #ff9b00; text-decoration: none; border: 0; font: inherit; font-weight: 800; padding: .35rem .7rem; cursor: pointer; }
    .az-edit-bar button[disabled] { opacity: .45; cursor: not-allowed; }
    .az-edit-bar [data-status] { font-weight: 500; }
    [data-edit] { outline: 1px dashed transparent; }
    [data-edit]:hover, [data-edit]:focus { outline-color: #ff9b00; background: rgb(255 155 0 / .12); }
  `;
  document.head.append(style);
  document.body.prepend(bar);

  const status = bar.querySelector("[data-status]");
  const fields = document.querySelectorAll("[data-edit]");
  fields.forEach((el) => {
    el.setAttribute("contenteditable", "true");
    el.setAttribute("spellcheck", "true");
  });

  function note(text) {
    if (status) status.textContent = text;
  }

  async function load() {
    const response = await fetch(cfg.api, { credentials: "same-origin" });
    if (!response.ok) return;
    const data = await response.json();
    const saved = data.fields || {};
    for (const el of fields) {
      const html = saved[el.getAttribute("data-edit")];
      if (typeof html === "string" && html !== "") el.innerHTML = html;
    }
  }

  function collect() {
    const payload = {};
    for (const el of fields) {
      payload[el.getAttribute("data-edit")] = el.innerHTML;
    }
    return payload;
  }

  async function post(action) {
    note(action === "publish" ? "Schalte live …" : "Speichere Entwurf …");
    const response = await fetch(cfg.api, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": cfg.csrf,
      },
      body: JSON.stringify({ action, fields: collect() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      note(data.error || "Speichern fehlgeschlagen.");
      return;
    }
    note(action === "publish" ? "Live geschaltet." : "Entwurf gespeichert.");
  }

  bar.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const cmd = button.getAttribute("data-cmd");
    if (cmd) {
      event.preventDefault();
      document.execCommand(cmd);
      return;
    }
    const act = button.getAttribute("data-act");
    if (act === "save") post("save");
    if (act === "publish" && cfg.role === "freigabe") post("publish");
  });

  load().catch(() => note("Entwurf konnte nicht geladen werden."));
})();
