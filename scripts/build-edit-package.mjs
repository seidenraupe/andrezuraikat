import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const out = join(root, "deploy", "edit");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, "dist"), out, { recursive: true });
cpSync(join(root, "edit", "zugang"), join(out, "zugang"), { recursive: true });
cpSync(join(root, "edit", "redaktion"), join(out, "redaktion"), { recursive: true });
cpSync(join(root, "edit", "js"), join(out, "js"), { recursive: true });
cpSync(join(root, "edit", ".htaccess"), join(out, ".htaccess"));
cpSync(join(root, "edit", "robots.txt"), join(out, "robots.txt"));
rmSync(join(out, "redaktion", "config.mail.php"), { force: true });
rmSync(join(out, "redaktion", "storage", "otp.json"), { force: true });
rmSync(join(out, "redaktion", "storage", "access-emails.json"), { force: true });
rmSync(join(out, "redaktion", "storage", "content-draft.json"), { force: true });
rmSync(join(out, "redaktion", "storage", "zugang-secret.txt"), { force: true });

writeFileSync(
  join(out, "UPLOAD.txt"),
  `Hostpoint-Bearbeitung — /edit/
============================

URL: https://www.andrezuraikat.ch/edit/
Zugang: hinterlegte E-Mail + sechsstelliger Code bis Mitternacht.
Danach Rolle wählen: Redaktion (Entwurf) oder Freigabe (live schalten, Zugänge vergeben).

Fest hinterlegt:
- thomas.giger@cloud-7.net
- nicole.straehl@cloud-7.net

SMTP: edit/redaktion/config.mail.php auf dem Server anlegen
(Vorlage config.mail.example.php). Ohne SMTP nutzt PHP mail().

Dieser Ordner liegt neben der öffentlichen Website:
  www/index.html
  www/data/content-live.json   ← Freigabe schreibt hierher
  www/edit/                    ← dieser Ordner

Die öffentliche Site beim Deploy nicht über data/content-live.json hinweg synchronisieren.
`,
);

console.log(`Paket: ${out}`);
