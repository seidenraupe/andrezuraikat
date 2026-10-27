import test from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../workers/edit/src/api.js";
import { sanitizeRich, zurichDayEnd } from "../workers/edit/src/logic.js";

const origin = "https://seidenraupe.github.io";

test("Rich-Text lässt nur erlaubte Formatierung zu", () => {
  assert.equal(
    sanitizeRich('<strong>Hallo</strong><script>x</script><a href="javascript:alert(1)">nein</a>'),
    "<strong>Hallo</strong>x<a>nein</a>",
  );
  assert.equal(
    sanitizeRich('<a href="https://example.ch/pfad">Link</a>'),
    '<a href="https://example.ch/pfad">Link</a>',
  );
  assert.throws(() => sanitizeRich("x".repeat(8001)), /zu lang/);
});

test("Mitternacht liegt im nächsten Zürcher Tag", () => {
  const now = Date.now();
  const end = zurichDayEnd(now);
  assert.ok(end > now);
  assert.ok(end - now < 26 * 60 * 60 * 1000);
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  assert.notEqual(format.format(new Date(end)), format.format(new Date(now)));
  assert.equal(format.format(new Date(end - 1000)), format.format(new Date(now)));
});

test("Code, Rolle, Entwurf und Freigabe", async () => {
  const storage = memory();
  const sent = [];
  const deps = {
    delayMs: 0,
    async sendMail(_env, email, code) {
      sent.push({ email, code });
    },
  };

  const hidden = await post("/code", { email: "fremd@example.com" }, storage, deps);
  assert.equal(hidden.status, 200);
  assert.equal(sent.length, 0);

  const issued = await post("/code", { email: "Thomas.Giger@cloud-7.net" }, storage, deps);
  assert.equal(issued.status, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].email, "thomas.giger@cloud-7.net");

  const again = await post("/code", { email: "thomas.giger@cloud-7.net" }, storage, deps);
  assert.equal(again.status, 429);

  const wrong = await post("/verify", { email: "thomas.giger@cloud-7.net", code: "000000" }, storage, deps);
  assert.equal(wrong.status, 401);

  const verified = await post(
    "/verify",
    { email: "thomas.giger@cloud-7.net", code: sent[0].code },
    storage,
    deps,
  );
  assert.equal(verified.status, 200);
  const token = verified.data.token;

  const saved = await post(
    "/content",
    { action: "save", fields: { "index-1": "<strong>Entwurf</strong><img src=x onerror=alert(1)>" } },
    storage,
    deps,
    token,
  );
  assert.equal(saved.status, 403);

  await post("/role", { role: "redaktion" }, storage, deps, token);
  const draft = await post(
    "/content",
    { action: "save", fields: { "index-1": "<strong>Entwurf</strong><img src=x onerror=alert(1)>" } },
    storage,
    deps,
    token,
  );
  assert.equal(draft.status, 200);
  const blocked = await post("/content", { action: "publish", fields: {} }, storage, deps, token);
  assert.equal(blocked.status, 403);

  await post("/role", { role: "freigabe" }, storage, deps, token);
  const published = await post("/content", { action: "publish", fields: {} }, storage, deps, token);
  assert.equal(published.status, 200);
  const live = await get("/live", storage);
  assert.equal(live.data.fields["index-1"], "<strong>Entwurf</strong>");

  const added = await post(
    "/access",
    { action: "add", email: "neu@example.com" },
    storage,
    deps,
    token,
  );
  assert.equal(added.status, 200);
  assert.ok(added.data.emails.includes("neu@example.com"));
  const kept = await post(
    "/access",
    { action: "remove", email: "nicole.straehl@cloud-7.net" },
    storage,
    deps,
    token,
  );
  assert.equal(kept.status, 400);
  assert.ok(added.data.emails.includes("nicole.straehl@cloud-7.net"));
});

test("Ohne Postfach gibt es keinen Code", async () => {
  const response = await post("/code", { email: "thomas.giger@cloud-7.net" }, memory(), { delayMs: 0 });
  assert.equal(response.status, 503);
});

test("Fremde Herkunft wird abgelehnt", async () => {
  const response = await handleRequest(
    new Request("https://edit.example/code", {
      method: "POST",
      headers: { Origin: "https://example.com", "Content-Type": "application/json" },
      body: JSON.stringify({ email: "thomas.giger@cloud-7.net" }),
    }),
    memory(),
    {},
    { delayMs: 0, async sendMail() {} },
  );
  assert.equal(response.status, 403);
});

function memory() {
  const map = new Map();
  return {
    async get(key) {
      return map.has(key) ? structuredClone(map.get(key)) : undefined;
    },
    async put(key, value) {
      map.set(key, structuredClone(value));
    },
    async delete(key) {
      map.delete(key);
    },
  };
}

async function post(path, body, storage, deps, token) {
  return call(path, "POST", storage, deps, token, body);
}

async function get(path, storage, token) {
  return call(path, "GET", storage, { delayMs: 0 }, token);
}

async function call(path, method, storage, deps, token, body) {
  const headers = { Origin: origin };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await handleRequest(
    new Request(`https://edit.example${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    storage,
    {},
    deps,
  );
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data };
}
