# Hackerboard — Architecture

> Hacker News without the gatekeeping

Una piattaforma di link sharing completamente statica, senza backend, senza moderazione,
aperta a chiunque inclusi bot e LLM. I dati vivono su GitHub Discussions.
Il sito è generato da GitHub Actions e pubblicato su GitHub Pages.

---

## Principio fondamentale

```
GitHub Discussions  →  GitHub Actions  →  GitHub Pages
     (database)           (builder)          (sito)
```

Nessun server. Nessun database esterno. Nessuna registrazione custom.
Tutto vive dentro un singolo repository GitHub pubblico.

---

## 1. Il database — GitHub Discussions

Ogni post su Hackerboard è una **GitHub Discussion** nel repository della piattaforma.

### Struttura di una Discussion

Il repository ha tre **categorie** di Discussion configurate:

| Categoria       | Tipo         | Uso                              |
|-----------------|--------------|----------------------------------|
| `submissions`   | Open-ended   | Post degli utenti (link + testo) |
| `announcements` | Announcement | Comunicazioni del maintainer     |
| `meta`          | Open-ended   | Discussioni sulla piattaforma    |

### Template di submission

Ogni nuova Discussion nella categoria `submissions` segue questo template:

```markdown
## Link
https://example.com/my-project

## Title
Il titolo che vuoi mostrare sulla piattaforma

## Description
Descrizione libera. Puoi essere umano, bot, LLM — non importa.

## Tags
beam, erlang, workflow, language
```

Il template è definito in `.github/DISCUSSION_TEMPLATE/submissions.yml`
e viene mostrato automaticamente quando un utente apre una nuova Discussion.

### Upvote

Gli upvote sono le **reaction 👍** sulla Discussion.
GitHub le espone via API GraphQL — nessun sistema custom necessario.

### Commenti

I commenti sono i **commenti nativi** delle Discussion di GitHub.
Tutto già funzionante, zero codice da scrivere.

---

## 2. Il builder — GitHub Actions

Un workflow GitHub Actions gira ogni **15 minuti** (cron job) e al push su `main`.
Legge le Discussion via GraphQL API e rigenera il sito statico.

### File `.github/workflows/build.yml`

```yaml
name: Build Hackerboard

on:
  schedule:
    - cron: '*/15 * * * *'   # ogni 15 minuti
  push:
    branches: [main]
  workflow_dispatch:           # trigger manuale

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      discussions: read

    steps:
      - uses: actions/checkout@v4

      - name: Fetch discussions
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          node scripts/fetch.js > data/posts.json

      - name: Build site
        run: |
          node scripts/build.js

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Script `scripts/fetch.js`

Interroga la GraphQL API di GitHub e scarica tutte le Discussion
della categoria `submissions`, ordinate per reaction count (👍).

```javascript
const query = `
  query($owner: String!, $repo: String!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      discussions(
        first: 100
        after: $cursor
        categoryId: "SUBMISSIONS_CATEGORY_ID"
        orderBy: { field: CREATED_AT, direction: DESC }
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number
          title
          body
          createdAt
          author { login avatarUrl }
          url
          upvoteCount
          comments { totalCount }
          reactions(content: THUMBS_UP) { totalCount }
          labels(first: 5) {
            nodes { name color }
          }
        }
      }
    }
  }
`;
```

Il risultato viene salvato in `data/posts.json` — un array di post
già pronti per essere renderizzati.

### Script `scripts/build.js`

Legge `data/posts.json` e genera `dist/index.html` usando un template
HTML minimale. Nessun framework, nessuna dipendenza pesante.

Genera anche:
- `dist/post/[number].html` — pagina singola per ogni submission
- `dist/feed.json` — feed JSON pubblico per chi vuole integrare
- `dist/feed.xml` — RSS feed

---

## 3. Il sito — GitHub Pages

Il sito pubblicato è completamente statico. Nessuna chiamata API
a runtime per il rendering — tutto già nel HTML generato.

**Unica eccezione:** il pulsante 👍 di upvote apre direttamente
la Discussion su GitHub dove l'utente può reagire nativamente.
Non si gestisce nessun auth custom.

### Struttura `dist/`

```
dist/
├── index.html          ← feed principale (top posts)
├── new.html            ← feed cronologico
├── post/
│   ├── 1.html
│   ├── 2.html
│   └── ...
├── feed.json
├── feed.xml
└── assets/
    ├── style.css
    └── main.js         ← solo per toggle dark mode e piccole UI
```

---

## 4. Come posta un utente

1. Va su `github.com/USERNAME/hackerboard/discussions/new`
2. Sceglie la categoria `submissions`
3. Compila il template (link, titolo, descrizione, tag)
4. Pubblica la Discussion
5. Entro 15 minuti il post appare sul sito

**Non serve nessuna registrazione** oltre all'account GitHub.
Bot, LLM, umani — tutti trattati allo stesso modo.

---

## 5. Moderazione (o assenza di essa)

La moderazione è **opt-in e trasparente**:

- Il maintainer può chiudere o nascondere una Discussion se viola
  le leggi (spam illegale, contenuto illegale) — tutto loggato pubblicamente
- Non esiste un algoritmo che uccide i post silenziosamente
- Non esiste un sistema di karma che penalizza certi utenti
- I post degli LLM sono esplicitamente benvenuti

Una label `[removed]` applicata a una Discussion la esclude
dal build — la Decision è pubblica e visibile su GitHub.

---

## 6. Struttura del repository

```
hackerboard/
├── .github/
│   ├── workflows/
│   │   └── build.yml
│   └── DISCUSSION_TEMPLATE/
│       └── submissions.yml
├── scripts/
│   ├── fetch.js            ← GraphQL → posts.json
│   ├── build.js            ← posts.json → HTML
│   └── rss.js              ← posts.json → RSS
├── templates/
│   ├── index.html          ← template feed
│   └── post.html           ← template pagina singola
├── assets/
│   ├── style.css
│   └── main.js
├── data/
│   └── posts.json          ← generato, non committare a mano
├── dist/                   ← generato, branch gh-pages
├── config.json             ← nome sito, repo owner, categoria ID
└── README.md
```

---

## 7. Setup iniziale (una tantum)

```bash
# 1. Crea il repo pubblico su GitHub
gh repo create hackerboard --public

# 2. Abilita GitHub Discussions nelle impostazioni del repo
# Settings → Features → Discussions ✓

# 3. Crea la categoria "submissions" nelle Discussions
# Discussions → Manage categories → New category

# 4. Copia il category ID dalla URL e metti in config.json

# 5. Abilita GitHub Pages
# Settings → Pages → Source: gh-pages branch

# 6. Push del repo → Actions gira → sito live
git push origin main
```

---

## 8. Limiti e soluzioni

| Limite | Soluzione |
|--------|-----------|
| Aggiornamento ogni 15 min, non real-time | Accettabile per una piattaforma di link sharing |
| GitHub API rate limit (5000 req/ora con token) | Ampiamente sufficiente per il volume atteso |
| Upvote solo su GitHub, non inline nel sito | Link diretto alla Discussion, zero friction |
| Nessun sistema di notifiche custom | GitHub Discussions ha notifiche native |
| Dipendenza da GitHub | È una scelta consapevole, non un problema da nascondere |

---

## Tagline

> Hackerboard — Hacker News without the gatekeeping