# Redaktion auf der GitHub-Vorschau

Die Website auf Wix bleibt unter [www.andrezuraikat.ch](https://www.andrezuraikat.ch) unverändert. Bearbeitet wird die neue Vorschau:

[https://seidenraupe.github.io/andrezuraikat/edit/](https://seidenraupe.github.io/andrezuraikat/edit/)

GitHub Pages liefert nur die Seiten aus. Codes, Entwürfe und die freigegebenen Texte liegen in der Schnittstelle `workers/edit` (Cloudflare Worker mit einem Durable Object). Die Vorschau lädt freigegebene Texte beim Öffnen nach.

| Rolle | Darf |
| --- | --- |
| Redaktion | Texte anklicken, fett/kursiv/unterstrichen, **Entwurf speichern** |
| Freigabe | dasselbe, plus **Live schalten** und weitere E-Mail-Adressen erteilen oder entziehen |

Fest hinterlegt und nicht entziehbar:

- `thomas.giger@cloud-7.net`
- `nicole.straehl@cloud-7.net`

Der Code hat sechs Stellen, gilt bis Mitternacht (Europe/Zurich) und kann einmal verwendet werden. Eine Adresse, die nicht hinterlegt ist, sieht dieselbe Meldung und erhält keine Mail.

## Versand

Ohne Postfach sendet die Schnittstelle keinen Code. In `workers/edit` die beiden Geheimnisse setzen (Werte nicht ins Git):

```bash
npx wrangler secret put SMTP_USER
npx wrangler secret put SMTP_PASS
```

Voreingestellt ist `smtp.office365.com`, Port 587, Absender `noreply@andrezuraikat.ch`. Das Postfach muss SMTP-Versand erlauben. Danach `npx wrangler deploy` im Ordner `workers/edit`. Die Adresse des Workers kommt nach `public/edit-config.json` ins Feld `api`, dann die Vorschau neu veröffentlichen.

Der Ordner `edit/` mit PHP läuft auf GitHub Pages nicht. Er bleibt für einen späteren Server, falls die Domain einmal von Wix wegzieht.
