export const SEED_EMAILS = [
  "thomas.giger@cloud-7.net",
  "nicole.straehl@cloud-7.net",
];

const ALLOWED_TAGS = new Set(["strong", "em", "u", "br", "a"]);

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function isEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isSeed(email) {
  return SEED_EMAILS.includes(normalizeEmail(email));
}

export function accessEmails(extra) {
  const emails = new Set(SEED_EMAILS);
  const list = Array.isArray(extra) ? extra : [];
  for (const item of list) {
    const email = normalizeEmail(item);
    if (isEmail(email)) emails.add(email);
  }
  return [...emails];
}

export function emailAllowed(email, extra) {
  return accessEmails(extra).includes(normalizeEmail(email));
}

export function safeEqual(left, right) {
  const a = String(left ?? "");
  const b = String(right ?? "");
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let index = 0; index < length; index += 1) {
    diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return diff === 0;
}

export async function hashCode(code, pepper) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${pepper}\n${code}`),
  );
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomCode() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return String(value[0] % 1_000_000).padStart(6, "0");
}

export function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function zurichDayEnd(now = Date.now()) {
  const timeZone = "Europe/Zurich";
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const day = format.format(new Date(now));
  let cursor = now;
  while (format.format(new Date(cursor)) === day) cursor += 60_000;
  let low = cursor - 60_000;
  let high = cursor;
  while (high - low > 1000) {
    const mid = Math.floor((low + high) / 2);
    if (format.format(new Date(mid)) === day) low = mid;
    else high = mid;
  }
  return high;
}

export function prepareOtp(previous, now, exp) {
  const last = Number(previous?.sentAt || 0);
  if (last && now - last < 60_000) {
    return { error: "Bitte eine Minute warten, bevor Sie einen neuen Code anfordern." };
  }
  let hourCount = Number(previous?.hourCount || 0);
  let hourStart = Number(previous?.hourStart || 0);
  if (hourStart < now - 3_600_000) {
    hourCount = 0;
    hourStart = now;
  }
  if (hourCount >= 5) {
    return { error: "Zu viele Codes. Bitte später erneut versuchen." };
  }
  return {
    record: {
      exp,
      tries: 0,
      sentAt: now,
      hourCount: hourCount + 1,
      hourStart,
    },
  };
}

export function judgeOtp(record, now, hashMatches) {
  if (!record || Number(record.exp) < now) return { ok: false, drop: false };
  const tries = Number(record.tries || 0);
  if (tries >= 5) return { ok: false, drop: true };
  if (hashMatches) return { ok: true, drop: true };
  return { ok: false, drop: false, record: { ...record, tries: tries + 1 } };
}

export function sanitizeRich(html) {
  if (typeof html !== "string") return "";
  const source = html.replace(/<!--[\s\S]*?-->/g, "").trim();
  if (source.length > 8000) {
    const error = new Error("Ein Text ist zu lang.");
    error.status = 400;
    throw error;
  }
  return renderRich(tokenizeRich(source)).trim();
}

function tokenizeRich(html) {
  const tokens = [];
  const pattern = /<\/?([a-zA-Z0-9]+)([^>]*)>/g;
  let last = 0;
  for (const match of html.matchAll(pattern)) {
    if (match.index > last) tokens.push({ type: "text", value: html.slice(last, match.index) });
    const name = match[1].toLowerCase();
    tokens.push({
      type: match[0].startsWith("</") ? "close" : "open",
      name,
      attrs: match[2] || "",
    });
    last = match.index + match[0].length;
  }
  if (last < html.length) tokens.push({ type: "text", value: html.slice(last) });
  return tokens;
}

function renderRich(tokens) {
  let output = "";
  const stack = [];
  for (const token of tokens) {
    if (token.type === "text") {
      output += token.value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      continue;
    }
    if (token.type === "open") {
      if (!ALLOWED_TAGS.has(token.name)) continue;
      if (token.name === "br") {
        output += "<br>";
        continue;
      }
      if (token.name === "a") {
        const href = safeHref(token.attrs);
        output += href ? `<a href="${escapeAttr(href)}">` : "<a>";
      } else {
        output += `<${token.name}>`;
      }
      stack.push(token.name);
      continue;
    }
    const index = stack.lastIndexOf(token.name);
    if (index === -1) continue;
    while (stack.length > index) output += `</${stack.pop()}>`;
  }
  while (stack.length) output += `</${stack.pop()}>`;
  return output;
}

function safeHref(attrs) {
  const match = String(attrs).match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i);
  const href = (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
  if (!/^(https?:|\/|\.\/|\.\.\/|mailto:)/i.test(href)) return "";
  if (/[\u0000-\u001f]/.test(href)) return "";
  return href;
}

function escapeAttr(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function acceptFields(current, incoming) {
  const fields = { ...(current || {}) };
  if (!incoming || typeof incoming !== "object") return fields;
  for (const [id, html] of Object.entries(incoming)) {
    if (!/^[a-z0-9-]{1,80}$/.test(id) || typeof html !== "string") continue;
    fields[id] = sanitizeRich(html);
  }
  return fields;
}
