import stimmen from "../data/stimmen.json";
import { loadEditConfig, readSession, siteRoot } from "./edit-config.js";
import { startEditMode } from "./edit-mode.js";

const portraits = import.meta.glob(
  "../media/{silvia-steiner,mike-kuenzle,monika-bosshard,christian-huggenberg,luana-antunes,roland-zolliker,giuseppe-ticchio,yvonne-buergin-portrait}.jpg",
  {
    eager: true,
    import: "default",
  },
);

const year = document.querySelector("[data-year]");
if (year) {
  year.textContent = String(new Date().getFullYear());
}

applyContentLive();

async function applyContentLive() {
  try {
    const response = await fetch(new URL("data/content-live.json", siteRoot()));
    if (response.ok) applyFields((await response.json()).fields);
  } catch {
    /* ohne Freigabe-Datei bleibt der gebaute Text */
  }
  try {
    const config = await loadEditConfig();
    if (config.api) {
      const response = await fetch(`${config.api}/live`);
      if (response.ok) applyFields((await response.json()).fields);
    }
  } catch {
    /* Vorschau bleibt beim gebauten Text, wenn die Schnittstelle fehlt */
  }
  initStimmenRandom();
  const session = readSession();
  if (session?.token) {
    try {
      await startEditMode(session);
    } catch {
      /* Bearbeitung bleibt aus */
    }
  }
}

function applyFields(fields) {
  if (!fields || typeof fields !== "object") return;
  for (const [id, html] of Object.entries(fields)) {
    const el = document.querySelector(`[data-edit="${CSS.escape(id)}"]`);
    if (el && typeof html === "string") el.innerHTML = html;
  }
}

function initStimmenRandom() {
  const root = document.querySelector("[data-stimmen-random]");
  if (!root) return;

  const imageEl = root.querySelector("[data-stimmen-image]");
  const nameEl = root.querySelector("[data-stimmen-name]");
  const roleEl = root.querySelector("[data-stimmen-role]");
  const quoteEl = root.querySelector("[data-stimmen-quote]");
  if (!imageEl || !nameEl || !quoteEl) return;

  const people = (stimmen.people || []).filter((person) => person.image);
  if (!people.length) return;

  const person = people[Math.floor(Math.random() * people.length)];
  const image = portraits[`../media/${person.image}`];
  if (image) {
    imageEl.src = image;
  }
  imageEl.alt = person.name || "";
  nameEl.textContent = person.name || "";
  if (roleEl) roleEl.textContent = person.role || "";
  quoteEl.textContent = wrapQuote(person.quote);
}

function wrapQuote(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("«") ||
    trimmed.startsWith('"') ||
    trimmed.startsWith("„")
  ) {
    return trimmed;
  }
  return `«${trimmed}»`;
}
