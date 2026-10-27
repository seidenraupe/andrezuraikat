import { clearSession, editApi, esc, siteRoot, writeSession } from "./edit-config.js";

export async function startEditMode(session) {
  const me = await editApi("/session", { token: session.token });
  if (!me.role) {
    location.assign(new URL("edit/", siteRoot()).href);
    return;
  }
  const next = { token: session.token, email: me.email, role: me.role, exp: me.exp };
  writeSession(next);
  const root = siteRoot();
  const bar = document.createElement("div");
  bar.className = "az-edit-bar";
  bar.innerHTML = `
    <strong>Bearbeitung</strong>
    <span>${next.role === "freigabe" ? "Freigabe" : "Redaktion"} · ${esc(next.email)}</span>
    <button type="button" data-cmd="bold">Fett</button>
    <button type="button" data-cmd="italic">Kursiv</button>
    <button type="button" data-cmd="underline">Unterstrichen</button>
    <button type="button" data-act="save">Entwurf speichern</button>
    <button type="button" data-act="publish" ${next.role === "freigabe" ? "" : "disabled"}>Live schalten</button>
    ${next.role === "freigabe" ? `<a href="${esc(new URL("edit/?ansicht=zugaenge", root).href)}">Zugänge</a>` : ""}
    <a href="${esc(new URL("edit/?rolle=1", root).href)}">Rolle wechseln</a>
    <button type="button" data-act="logout">Abmelden</button>
    <span data-status></span>
  `;
  const style = document.createElement("style");
  style.textContent = `
    .az-edit-bar { position: sticky; top: 0; z-index: 50; display: flex; flex-wrap: wrap; gap: .4rem .7rem; align-items: center; padding: .55rem .9rem; background: #003c69; color: #fff; font: 600 .95rem/1.3 var(--font), Arial, sans-serif; }
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
  for (const el of fields) {
    el.setAttribute("contenteditable", "true");
    el.setAttribute("spellcheck", "true");
    if (el.tagName === "A") el.addEventListener("click", (event) => event.preventDefault());
  }

  function note(text) {
    if (status) status.textContent = text;
  }

  function collect() {
    const payload = {};
    for (const el of fields) payload[el.getAttribute("data-edit")] = el.innerHTML;
    return payload;
  }

  try {
    const data = await editApi("/content", { token: next.token });
    const saved = data.fields || {};
    for (const el of fields) {
      const html = saved[el.getAttribute("data-edit")];
      if (typeof html === "string") el.innerHTML = html;
    }
  } catch {
    note("Entwurf konnte nicht geladen werden.");
  }

  bar.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const command = button.getAttribute("data-cmd");
    if (command) {
      event.preventDefault();
      document.execCommand(command);
      return;
    }
    const action = button.getAttribute("data-act");
    if (action === "logout") {
      try {
        await editApi("/logout", { method: "POST", body: {}, token: next.token });
      } catch {
        /* lokal trotzdem abmelden */
      }
      clearSession();
      location.assign(new URL("edit/", root).href);
      return;
    }
    if (action !== "save" && action !== "publish") return;
    if (action === "publish" && next.role !== "freigabe") return;
    note(action === "publish" ? "Schalte live …" : "Speichere Entwurf …");
    try {
      await editApi("/content", {
        method: "POST",
        token: next.token,
        body: { action, fields: collect() },
      });
      note(action === "publish" ? "Live geschaltet." : "Entwurf gespeichert.");
    } catch (error) {
      note(error.message || "Speichern fehlgeschlagen.");
    }
  });
}
