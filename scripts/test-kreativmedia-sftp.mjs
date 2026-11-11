import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import SftpClient from "ssh2-sftp-client";

const root = resolve(import.meta.dirname, "..");
const envFile = resolve(root, ".env");

function loadEnv() {
  if (!existsSync(envFile)) {
    throw new Error(".env fehlt im Projektroot.");
  }
  const values = {};
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 1) continue;
    values[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return values;
}

const required = [
  "KREATIVMEDIA_SFTP_HOST",
  "KREATIVMEDIA_SFTP_USER",
  "KREATIVMEDIA_SFTP_PASSWORD",
  "KREATIVMEDIA_REMOTE_PATH",
];

const env = loadEnv();
for (const key of required) {
  if (!env[key]) {
    console.error(JSON.stringify({ ok: false, error: `Variable ${key} ist leer.` }));
    process.exit(1);
  }
}

const client = new SftpClient();
const remotePath = env.KREATIVMEDIA_REMOTE_PATH.replace(/\/+$/, "") || "/";
const port = Number(env.KREATIVMEDIA_SFTP_PORT || 2121);

try {
  await client.connect({
    host: env.KREATIVMEDIA_SFTP_HOST,
    port,
    username: env.KREATIVMEDIA_SFTP_USER,
    password: env.KREATIVMEDIA_SFTP_PASSWORD,
    readyTimeout: 20000,
  });
  const listing = await client.list(remotePath);
  console.log(
    JSON.stringify({
      ok: true,
      host: env.KREATIVMEDIA_SFTP_HOST,
      port,
      remotePath,
      entries: listing.length,
      names: listing.slice(0, 8).map((item) => item.name),
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      ok: false,
      host: env.KREATIVMEDIA_SFTP_HOST,
      port,
      remotePath,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
} finally {
  client.end();
}
