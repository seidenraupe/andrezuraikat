# Lokal auf Windows

Dieses Projekt wird **ohne WSL** bearbeitet: Git for Windows, Node.js, Cursor.

## Voraussetzungen

- Git for Windows
- Node.js (aktuell LTS oder neuer; geprüft: Node 24 / npm 11)
- GitHub-Konto **seidenraupe** (HTTPS)

## Repository holen

Falls der Ordner noch leer ist:

```bash
git clone https://github.com/seidenraupe/andrezuraikat.git
cd andrezuraikat
npm install
npm run dev
```

In Cursor den Ordner `KI-Projekte/andrezuraikat` öffnen.

Ohne GitHub Desktop: auf der Repo-Seite **Code → Download ZIP**, entpacken, `npm install`.

## Alltag

```bash
npm run dev      # http://127.0.0.1:5173
npm run check    # vor dem Commit
git add -A
git commit -m "Kurze Begründung"
git push
```
