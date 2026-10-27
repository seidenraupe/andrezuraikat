import {
  clearSession,
  editApi,
  esc,
  loadEditConfig,
  readSession,
  siteRoot,
  writeSession,
} from "./edit-config.js";

const gate = document.querySelector("#edit-gate");
const params = new URLSearchParams(location.search);

boot().catch((error) => showError(error.message));

async function boot() {
  const config = await loadEditConfig();
  if (!config.api) {
    gate.innerHTML =
      '<p class="lede">Die Redaktionsschnittstelle ist für diese Vorschau noch nicht verbunden.</p>';
    return;
  }
  let session = readSession();
  if (params.get("abmelden") === "1" && session) {
    try {
      await editApi("/logout", { method: "POST", body: {}, token: session.token });
    } catch {
      /* lokal trotzdem abmelden */
    }
    clearSession();
    session = null;
  }
  if (session) {
    try {
      const me = await editApi("/session", { token: session.token });
      session = { ...session, email: me.email, role: me.role || "", exp: me.exp };
      writeSession(session);
    } catch {
      clearSession();
      session = null;
    }
  }
  if (session && params.get("rolle") === "1") {
    await editApi("/role", { method: "POST", body: { role: "" }, token: session.token });
    session = { ...session, role: "" };
    writeSession(session);
    renderRole(session);
    return;
  }
  if (session?.role === "freigabe" && params.get("ansicht") === "zugaenge") {
    await renderAccess(session);
    return;
  }
  if (session?.role) {
    renderReady(session);
    return;
  }
  if (session) {
    renderRole(session);
    return;
  }
  renderEmail("");
}

function renderEmail(error) {
  gate.innerHTML = `
    <p class="lede">Nur hinterlegte E-Mail-Adressen erhalten einen sechsstelligen Code. Der Zugang gilt bis Mitternacht. Danach wählen Sie Redaktion oder Freigabe.</p>
    ${error ? `<p class="edit-error">${esc(error)}</p>` : ""}
    <form>
      <label for="email">E-Mail-Adresse</label>
      <input id="email" name="email" type="email" autocomplete="username" required>
      <button class="button" type="submit">Code senden</button>
    </form>
  `;
  gate.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");
    setBusy(true);
    try {
      await editApi("/code", { method: "POST", body: { email } });
      renderCode(String(email).trim(), "");
    } catch (err) {
      renderEmail(err.message);
    }
  });
}

function renderCode(email, error) {
  gate.innerHTML = `
    <p class="lede">Code an <strong>${esc(email)}</strong>, falls die Adresse berechtigt ist. Gültig bis Mitternacht.</p>
    ${error ? `<p class="edit-error">${esc(error)}</p>` : ""}
    <form>
      <label for="code">Code aus der E-Mail</label>
      <input id="code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required>
      <button class="button" type="submit">Weiter</button>
      <button class="button button-ghost" type="button" data-back>Andere Adresse</button>
    </form>
  `;
  gate.querySelector("[data-back]").addEventListener("click", () => renderEmail(""));
  gate.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get("code");
    setBusy(true);
    try {
      const data = await editApi("/verify", { method: "POST", body: { email, code } });
      const session = { token: data.token, email: data.email, role: "", exp: data.exp };
      writeSession(session);
      renderRole(session);
    } catch (err) {
      renderCode(email, err.message);
    }
  });
}

function renderRole(session) {
  gate.innerHTML = `
    <p class="lede">${esc(session.email)} — die Wahl gilt bis Mitternacht.</p>
    <p class="lede">Redaktion speichert Entwürfe. Freigabe schaltet Texte live und vergibt weitere E-Mail-Zugänge.</p>
    <div class="edit-actions">
      <button class="button" type="button" data-role="redaktion">Als Redaktion</button>
      <button class="button button-ghost" type="button" data-role="freigabe">Als Freigabe</button>
    </div>
  `;
  gate.querySelectorAll("[data-role]").forEach((button) => {
    button.addEventListener("click", async () => {
      setBusy(true);
      try {
        const role = button.getAttribute("data-role");
        await editApi("/role", { method: "POST", body: { role }, token: session.token });
        writeSession({ ...session, role });
        location.assign(new URL("index.html", siteRoot()).href);
      } catch (error) {
        showError(error.message);
      }
    });
  });
}

function renderReady(session) {
  const home = new URL("index.html", siteRoot()).href;
  gate.innerHTML = `
    <p class="lede">Angemeldet als ${esc(session.email)} · ${session.role === "freigabe" ? "Freigabe" : "Redaktion"}.</p>
    <div class="edit-actions">
      <a class="button" href="${esc(home)}">Texte bearbeiten</a>
      ${session.role === "freigabe" ? '<a class="button button-ghost" href="?ansicht=zugaenge">Zugänge</a>' : ""}
      <a class="button button-ghost" href="?rolle=1">Rolle wechseln</a>
      <button class="button button-ghost" type="button" data-logout>Abmelden</button>
    </div>
  `;
  gate.querySelector("[data-logout]").addEventListener("click", () => logout(session));
}

async function renderAccess(session) {
  const data = await editApi("/access", { token: session.token });
  const seeds = new Set(data.seeds || []);
  const items = (data.emails || [])
    .map((email) => {
      const fixed = seeds.has(email);
      return `<li><span>${esc(email)}${fixed ? " · fest" : ""}</span>${
        fixed
          ? ""
          : `<button class="button button-ghost" type="button" data-remove="${esc(email)}">Entziehen</button>`
      }</li>`;
    })
    .join("");
  gate.innerHTML = `
    <p class="lede">Weitere Adressen dürfen einen Code anfordern. Die beiden fest hinterlegten Adressen bleiben.</p>
    <form>
      <label for="grant">E-Mail-Adresse</label>
      <input id="grant" name="email" type="email" autocomplete="off" required>
      <button class="button" type="submit">Zugang erteilen</button>
    </form>
    <ul class="edit-access">${items}</ul>
    <p><a href="?">Zurück</a></p>
  `;
  gate.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");
    try {
      await editApi("/access", {
        method: "POST",
        token: session.token,
        body: { action: "add", email },
      });
      await renderAccess(session);
    } catch (error) {
      showError(error.message);
    }
  });
  gate.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await editApi("/access", {
          method: "POST",
          token: session.token,
          body: { action: "remove", email: button.getAttribute("data-remove") },
        });
        await renderAccess(session);
      } catch (error) {
        showError(error.message);
      }
    });
  });
}

async function logout(session) {
  try {
    await editApi("/logout", { method: "POST", body: {}, token: session.token });
  } catch {
    /* lokal trotzdem abmelden */
  }
  clearSession();
  location.assign(new URL("edit/", siteRoot()).href);
}

function showError(message) {
  const note = document.createElement("p");
  note.className = "edit-error";
  note.textContent = message;
  gate.prepend(note);
}

function setBusy(busy) {
  gate.querySelectorAll("button").forEach((button) => {
    button.disabled = busy;
  });
}
