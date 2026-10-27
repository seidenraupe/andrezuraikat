import {
  SEED_EMAILS,
  acceptFields,
  accessEmails,
  emailAllowed,
  hashCode,
  isEmail,
  isSeed,
  judgeOtp,
  normalizeEmail,
  prepareOtp,
  randomCode,
  randomToken,
  safeEqual,
  zurichDayEnd,
} from "./logic.js";

const ORIGINS = new Set([
  "https://seidenraupe.github.io",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);

export async function handleRequest(request, storage, env, deps = {}) {
  try {
    if (!originAllowed(request)) {
      return respond(request, 403, { ok: false, error: "Ursprung nicht erlaubt." });
    }
    if (request.method === "OPTIONS") return respond(request, 204, null);
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (request.method === "GET" && path === "/live") return live(request, storage);
    if (request.method === "POST" && path === "/code") return sendCode(request, storage, env, deps);
    if (request.method === "POST" && path === "/verify") return verifyCode(request, storage, deps);
    const session = await readSession(request, storage);
    if (request.method === "GET" && path === "/session") return sessionView(request, session);
    if (!session) return respond(request, 401, { ok: false, error: "Bitte anmelden." });
    if (request.method === "POST" && path === "/logout") return logout(request, storage, session);
    if (request.method === "POST" && path === "/role") return setRole(request, storage, session);
    if (path === "/content") return content(request, storage, session);
    if (path === "/access") return access(request, storage, session);
    return respond(request, 404, { ok: false, error: "Nicht gefunden." });
  } catch (error) {
    const status = Number(error.status) || 500;
    if (status >= 500) {
      console.error(JSON.stringify({
        message: "edit request failed",
        error: error instanceof Error ? error.message : "unknown",
      }));
    }
    return respond(request, status, {
      ok: false,
      error: status >= 500 ? "Unerwarteter Fehler." : error.message,
    });
  }
}

async function sendCode(request, storage, env, deps) {
  await pause(deps);
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  if (!isEmail(email)) {
    return respond(request, 400, { ok: false, error: "Ungültige E-Mail-Adresse." });
  }
  if (!(await allowIp(request, storage))) {
    return respond(request, 429, { ok: false, error: "Zu viele Anfragen. Bitte später erneut versuchen." });
  }
  const canSend = typeof deps.sendMail === "function" || mailReady(env);
  if (!canSend) {
    return respond(request, 503, { ok: false, error: "E-Mail-Versand ist noch nicht eingerichtet." });
  }
  const extra = (await storage.get("access"))?.emails;
  if (!emailAllowed(email, extra)) {
    return respond(request, 200, { ok: true, step: "code" });
  }
  const now = Date.now();
  const previous = await storage.get(`otp:${email}`);
  const prepared = prepareOtp(previous, now, zurichDayEnd(now));
  if (prepared.error) return respond(request, 429, { ok: false, error: prepared.error });
  const code = randomCode();
  const pepper = await otpPepper(storage, env);
  await storage.put(`otp:${email}`, { ...prepared.record, hash: await hashCode(code, pepper) });
  try {
    await deliver(env, email, code, deps);
  } catch (error) {
    await storage.delete(`otp:${email}`);
    console.error(JSON.stringify({
      message: "code mail failed",
      error: error instanceof Error ? error.message : "unknown",
    }));
    return respond(request, 502, { ok: false, error: "E-Mail konnte nicht gesendet werden." });
  }
  return respond(request, 200, { ok: true, step: "code" });
}

async function verifyCode(request, storage, deps) {
  await pause(deps);
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const code = String(body.code ?? "").replace(/\D+/g, "");
  const extra = (await storage.get("access"))?.emails;
  const record = emailAllowed(email, extra) ? await storage.get(`otp:${email}`) : null;
  const pepper = await storage.get("pepper");
  const hash = record && pepper && code.length === 6 ? await hashCode(code, pepper) : "";
  const verdict = judgeOtp(record, Date.now(), Boolean(hash) && safeEqual(hash, record.hash));
  if (verdict.drop) await storage.delete(`otp:${email}`);
  else if (verdict.record) await storage.put(`otp:${email}`, verdict.record);
  if (!verdict.ok) {
    return respond(request, 401, { ok: false, error: "Code ungültig oder abgelaufen." });
  }
  const token = randomToken();
  const exp = zurichDayEnd();
  await storage.put(`session:${token}`, { email, role: "", exp });
  return respond(request, 200, { ok: true, token, email, role: "", exp });
}

function sessionView(request, session) {
  if (!session) return respond(request, 401, { ok: false, error: "Bitte anmelden." });
  return respond(request, 200, {
    ok: true,
    email: session.email,
    role: session.role || "",
    exp: session.exp,
  });
}

async function setRole(request, storage, session) {
  const body = await readJson(request);
  const role = body.role === "redaktion" || body.role === "freigabe" ? body.role : "";
  if (body.role && !role) {
    return respond(request, 400, { ok: false, error: "Unbekannte Rolle." });
  }
  await storage.put(`session:${session.token}`, { ...session, role });
  return respond(request, 200, { ok: true, role });
}

async function logout(request, storage, session) {
  await storage.delete(`session:${session.token}`);
  return respond(request, 200, { ok: true });
}

async function content(request, storage, session) {
  if (!session.role) return respond(request, 403, { ok: false, error: "Bitte zuerst eine Rolle wählen." });
  if (request.method === "GET") {
    return respond(request, 200, {
      ok: true,
      email: session.email,
      role: session.role,
      fields: mergedFields(await storage.get("live"), await storage.get("draft")),
    });
  }
  if (request.method !== "POST") return respond(request, 405, { ok: false, error: "Nicht gefunden." });
  const body = await readJson(request);
  const draft = await storage.get("draft");
  const fields = acceptFields(draft?.fields, body.fields);
  const stamp = new Date().toISOString();
  if (body.action === "save") {
    await storage.put("draft", { updatedAt: stamp, fields });
    return respond(request, 200, { ok: true });
  }
  if (body.action === "publish") {
    if (session.role !== "freigabe") {
      return respond(request, 403, { ok: false, error: "Nur die Freigabe kann live schalten." });
    }
    const live = await storage.get("live");
    const published = { ...(live?.fields || {}), ...fields };
    guardSize(published);
    await storage.put("live", { updatedAt: stamp, fields: published });
    await storage.put("draft", { updatedAt: stamp, fields: {} });
    return respond(request, 200, { ok: true });
  }
  return respond(request, 400, { ok: false, error: "Unbekannte Aktion." });
}

async function live(request, storage) {
  const current = await storage.get("live");
  return respond(request, 200, {
    ok: true,
    updatedAt: current?.updatedAt || null,
    fields: current?.fields || {},
  });
}

async function access(request, storage, session) {
  if (session.role !== "freigabe") {
    return respond(request, 403, { ok: false, error: "Nur die Freigabe verwaltet Zugänge." });
  }
  const stored = (await storage.get("access"))?.emails || [];
  if (request.method === "GET") {
    return respond(request, 200, { ok: true, emails: accessEmails(stored), seeds: [...SEED_EMAILS] });
  }
  if (request.method !== "POST") return respond(request, 405, { ok: false, error: "Nicht gefunden." });
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  if (!isEmail(email)) return respond(request, 400, { ok: false, error: "Ungültige E-Mail-Adresse." });
  let extra = accessEmails(stored).filter((item) => !isSeed(item));
  if (body.action === "add") {
    extra = accessEmails([...extra, email]).filter((item) => !isSeed(item));
  } else if (body.action === "remove") {
    if (isSeed(email)) {
      return respond(request, 400, {
        ok: false,
        error: "Diese Adresse ist fest hinterlegt und kann nicht entzogen werden.",
      });
    }
    extra = extra.filter((item) => item !== email);
  } else {
    return respond(request, 400, { ok: false, error: "Unbekannte Aktion." });
  }
  await storage.put("access", { emails: extra });
  return respond(request, 200, { ok: true, emails: accessEmails(extra) });
}

function mergedFields(liveRecord, draftRecord) {
  return { ...(liveRecord?.fields || {}), ...(draftRecord?.fields || {}) };
}

function guardSize(fields) {
  if (JSON.stringify(fields).length > 1_500_000) {
    const error = new Error("Die Texte sind zusammen zu lang.");
    error.status = 400;
    throw error;
  }
}

async function readSession(request, storage) {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await storage.get(`session:${token}`);
  if (!row || Number(row.exp) < Date.now()) {
    if (row) await storage.delete(`session:${token}`);
    return null;
  }
  return { token, email: row.email, role: row.role || "", exp: row.exp };
}

async function otpPepper(storage, env) {
  if (env.OTP_PEPPER) return env.OTP_PEPPER;
  const existing = await storage.get("pepper");
  if (typeof existing === "string" && existing) return existing;
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const pepper = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  await storage.put("pepper", pepper);
  return pepper;
}

async function allowIp(request, storage) {
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const key = `ip:${ip}`;
  const now = Date.now();
  const row = (await storage.get(key)) || { count: 0, start: now };
  const fresh = row.start < now - 3_600_000;
  const count = fresh ? 1 : Number(row.count) + 1;
  if (count > 30) return false;
  await storage.put(key, { count, start: fresh ? now : row.start });
  return true;
}

function mailReady(env) {
  return Boolean(env?.SMTP_HOST && env?.SMTP_USER && env?.SMTP_PASS);
}

async function deliver(env, email, code, deps) {
  if (typeof deps.sendMail === "function") {
    await deps.sendMail(env, email, code);
    return;
  }
  const { sendAccessCode } = await import("./mail.js");
  await sendAccessCode(env, email, code);
}

async function pause(deps) {
  const ms = deps.delayMs ?? 200;
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(request) {
  const claimed = Number(request.headers.get("Content-Length") || 0);
  if (claimed > 1_000_000) {
    const error = new Error("Anfrage ist zu gross.");
    error.status = 413;
    throw error;
  }
  const text = await request.text();
  if (text.length > 1_000_000) {
    const error = new Error("Anfrage ist zu gross.");
    error.status = 413;
    throw error;
  }
  if (!text) return {};
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    return data;
  } catch {
    const error = new Error("Die Eingabe ist ungültig.");
    error.status = 400;
    throw error;
  }
}

function originAllowed(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  return ORIGINS.has(origin);
}

function respond(request, status, payload) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    Vary: "Origin",
  };
  const origin = request.headers.get("Origin");
  if (origin && ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Max-Age"] = "86400";
  }
  if (payload == null) delete headers["Content-Type"];
  return new Response(payload == null ? null : JSON.stringify(payload), { status, headers });
}
