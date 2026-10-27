export const SESSION_KEY = "az-edit-session";

let configPromise;

export function siteRoot() {
  const here = new URL(".", location.href);
  if (here.pathname.endsWith("/edit/")) return new URL("..", here).href;
  return here.href;
}

export function loadEditConfig() {
  if (!configPromise) {
    configPromise = fetch(new URL("edit-config.json", siteRoot()), { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : {}))
      .then((data) => ({ api: String(data?.api || "").replace(/\/$/, "") }))
      .catch(() => ({ api: "" }));
  }
  return configPromise;
}

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

export function readSession() {
  try {
    const data = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (!data || typeof data.token !== "string" || !data.exp) return null;
    if (Number(data.exp) < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function writeSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function editApi(path, { method = "GET", body, token } = {}) {
  const config = await loadEditConfig();
  if (!config.api) throw new Error("Die Redaktionsschnittstelle ist noch nicht verbunden.");
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${config.api}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Anfrage fehlgeschlagen.");
  }
  return data;
}
