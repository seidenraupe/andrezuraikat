import { connect } from "cloudflare:sockets";

export function mailConfigured(env) {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

export async function sendAccessCode(env, email, code) {
  if (!mailConfigured(env)) {
    throw new Error("E-Mail-Versand ist noch nicht eingerichtet.");
  }
  const port = Number(env.SMTP_PORT || 587);
  if (port !== 465 && port !== 587) {
    throw new Error("SMTP-Port muss 465 oder 587 sein.");
  }
  const from = env.SMTP_FROM || env.SMTP_USER;
  const fromName = env.SMTP_FROM_NAME || "André Zuraikat";
  const subject = "Ihr Zugangscode — André Zuraikat";
  const body = [
    "Guten Tag",
    "",
    "Ihr Code für den Redaktions-Modus lautet:",
    "",
    `  ${code}`,
    "",
    "Er gilt bis Mitternacht (Schweizer Zeit) und kann nur einmal verwendet werden.",
    "",
    "Wenn Sie diesen Code nicht angefordert haben, ignorieren Sie die Nachricht.",
    "",
    "André Zuraikat",
    "",
  ].join("\r\n");
  await sendSmtp({
    host: env.SMTP_HOST,
    port,
    secure: env.SMTP_SECURE || (port === 465 ? "ssl" : "tls"),
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from,
    fromName,
    to: email,
    subject,
    body,
  });
}

async function sendSmtp(options) {
  const secure = options.secure === "ssl" ? "ssl" : "tls";
  let socket = connect(
    { hostname: options.host, port: options.port },
    { secureTransport: secure === "tls" ? "starttls" : "on" },
  );
  const work = (async () => {
    let talk = smtpDialog(socket);
    const greeting = await talk.readReply();
    if (!greeting.startsWith("220")) {
      throw new Error(`Mailserver antwortet mit ${greeting.slice(0, 3) || "000"}.`);
    }
    await talk.cmd("EHLO andrezuraikat.ch", [250]);
    if (secure === "tls") {
      await talk.cmd("STARTTLS", [220]);
      talk.release();
      socket = await Promise.resolve(socket.startTls());
      talk = smtpDialog(socket);
      await talk.cmd("EHLO andrezuraikat.ch", [250]);
    }
    await talk.cmd("AUTH LOGIN", [334]);
    await talk.cmd(toBase64(options.user), [334]);
    await talk.cmd(toBase64(options.pass), [235]);
    await talk.cmd(`MAIL FROM:<${options.from}>`, [250]);
    await talk.cmd(`RCPT TO:<${options.to}>`, [250, 251]);
    await talk.cmd("DATA", [354]);
    const message = [
      `From: ${encodedWord(options.fromName)} <${options.from}>`,
      `To: <${options.to}>`,
      `Subject: ${encodedWord(options.subject)}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      options.body.replace(/^\./gm, ".."),
      ".",
    ].join("\r\n");
    await talk.raw(message);
    const accepted = await talk.readReply();
    if (!accepted.startsWith("250")) {
      throw new Error(`Mailserver antwortet mit ${accepted.slice(0, 3) || "000"}.`);
    }
    await talk.cmd("QUIT", [221, 250]);
    talk.release();
  })();
  try {
    await Promise.race([
      work,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Mailserver antwortet nicht.")), 20_000);
      }),
    ]);
  } finally {
    try {
      await socket.close();
    } catch {
      /* Verbindung ist bereits zu */
    }
  }
}

function smtpDialog(socket) {
  const reader = socket.readable.getReader();
  const writer = socket.writable.getWriter();
  const decoder = new TextDecoder();
  let pending = "";

  async function readReply() {
    while (true) {
      const parts = pending.split("\r\n");
      const complete = parts.slice(0, -1);
      const end = complete.findIndex((line) => /^\d{3} /.test(line));
      if (end >= 0) {
        const reply = complete.slice(0, end + 1).join("\r\n");
        pending = [...complete.slice(end + 1), parts.at(-1)].join("\r\n");
        return reply;
      }
      const { value, done } = await reader.read();
      if (done) throw new Error("Mailserver hat die Verbindung geschlossen.");
      pending += decoder.decode(value, { stream: true });
    }
  }

  async function raw(text) {
    await writer.write(new TextEncoder().encode(text.endsWith("\r\n") ? text : `${text}\r\n`));
  }

  async function cmd(line, ok) {
    await raw(line);
    const reply = await readReply();
    const status = Number(reply.slice(0, 3));
    if (!ok.includes(status)) throw new Error(`Mailserver antwortet mit ${status || "000"}.`);
    return reply;
  }

  return {
    readReply,
    cmd,
    raw,
    release() {
      try {
        reader.releaseLock();
      } catch {
        /* bereits freigegeben */
      }
      try {
        writer.releaseLock();
      } catch {
        /* bereits freigegeben */
      }
    },
  };
}

function toBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function encodedWord(value) {
  return `=?UTF-8?B?${toBase64(value)}?=`;
}
