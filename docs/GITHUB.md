# GitHub

Repository: **[seidenraupe/andrezuraikat](https://github.com/seidenraupe/andrezuraikat)**

Hier liegen Quellcode, Dokumentation und die Grundlage für die Vorschau. Die öffentliche Domain bleibt [andrezuraikat.ch](https://www.andrezuraikat.ch/) — GitHub ist die Werkstatt, nicht der Ersatz der Domain.

## Was automatisch laufen soll

| Workflow | Wann | Was |
| --- | --- | --- |
| Prüfen (CI) | jeder Push / Pull Request | `npm run check` (Build + Inhaltstests) |
| Deployment | Push auf `main` | dieselben Checks, danach GitHub Pages |

Nach dem ersten grünen Deployment liegt die Vorschau unter der Pages-URL des Repos (Settings → Pages). Das ist die interne Adresse zum Gegenlesen — nicht die Politiker-Domain.

## Alltagsarbeit

1. Lokal `npm run dev` (http://127.0.0.1:5173).
2. Text in `src/` anpassen.
3. `npm run check`.
4. Commit und Push auf `main`.
5. Actions und Pages prüfen.

## Konto

Git-Operationen laufen über das GitHub-Konto **seidenraupe** (`gh` ist angemeldet, HTTPS). Kein WSL, kein Origin-CLI nötig — gleiches Muster wie bei kc3k und learnbox-website.
