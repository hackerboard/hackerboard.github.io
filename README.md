# Hackerboard

A community-curated link board for hackers, builders, and curious minds. Every post is a GitHub Discussion; the site is a static snapshot rebuilt from those discussions every 15 minutes.

## How it works

1. Users submit links via GitHub Discussions (category: `hackerboard`).
2. A GitHub Actions workflow runs `build.js` every 15 minutes.
3. `build.js` fetches discussions via the GitHub GraphQL API, renders HTML, and writes everything to `docs/`.
4. GitHub Pages serves the `docs/` folder.

## Project structure

```
build.js          — build script (Node.js, no dependencies)
config.json       — site name, GitHub repo, base URL
Makefile          — build / serve / clean targets
docs/             — generated web root (served by GitHub Pages)
  assets/
    style.css     — all styles
    main.js       — dark-mode toggle
    favicon.svg   — 32×32 square logo (purple + HB in pink)
    logo.svg      — 128×128 square logo (same design, larger)
  index.html      — "new" feed (chronological)
  signal.html     — "signal" feed (ranked by upvotes)
  submit.html     — static submission guide page
  feed.xml        — RSS feed
  feed.json       — JSON Feed
  archive/        — one HTML page per post
.github/
  workflows/build.yml        — CI/CD: build on push + cron every 15 min
  DISCUSSION_TEMPLATE/       — GitHub Discussion template for submissions
```

## Running locally

```bash
make serve     # builds with sample data, starts http.server on :8085
make build     # build only
make clean     # remove generated HTML/feeds (keeps assets)
```

Set `GH_TOKEN` to fetch real discussions instead of sample data:

```bash
GH_TOKEN=ghp_xxx make build
```

---

## Design guidelines

These rules govern every visual decision in Hackerboard.

### Typography

| Element | Font | Rationale |
| --- | --- | --- |
| News titles & body copy | `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | Native system fonts: zero latency, highest legibility at any size |
| Logo (`Hackerboard` wordmark) | `ui-monospace, Menlo, Consolas, 'Courier New', monospace` | Fixed-width gives the logo a retro terminal identity |
| UI chrome: tabs, meta lines, tags, footer, `[dark]` toggle | monospace | Keeps the interface aesthetic coherent with the logo |

The guiding principle: **prose reads in the system reading font; UI elements use mono**.

### Colour palette

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#ffffff` | `#0f0f14` | Page background |
| `--text` | `#1a1a1a` | `#ccc5dc` | Body text |
| `--dim` | `#888` | `#686878` | Secondary text (meta, visited links) |
| `--accent` | `#c2387e` | `#d9539a` | Upvote link, section headings on submit page |
| `--hdr-bg` | `#5c2d91` | `#3a1c62` | Header / tab chrome; also the CTA button colour |
| `--hdr-border` | `#000` | `#000` | Header bottom border + active-tab border |
| `--border` | `#e8e2f0` | `#2a2038` | Structural borders |
| `--tag-bg` | `#f3eefb` | `#1a1228` | Tag pill background |

### Logo & favicon

Both use the same motif: a solid purple square (`#5c2d91`) with **HB** in bold pink (`#e879b8`) monospace type. No rounded corners. `favicon.svg` is 32×32; `logo.svg` is 128×128.

### Header / navigation

- The header bar uses `padding: 12px 16px 0` — more purple visible above the tabs, no bottom padding so tabs sit flush against the content area.
- Tabs are 26 px tall, text vertically centred inside.
- The active tab uses the page background colour for its fill and hides the header border beneath it, creating the classic "open tab" shape.
- The `submit` link (right side of header) points to `submit.html`, a dedicated explanation page with a violet CTA — it does **not** link directly to GitHub Discussions.

### Post list

- **No numbered rank**: items in the feed are not prefixed with 1. 2. 3. — ranking is implied by position alone.
- **No horizontal dividers**: news items are separated by vertical padding only; no `border-bottom` lines.
- **Title links open the external URL in a new tab** (`target="_blank"`). Clicking the title takes you directly to the submitted article, not to an internal archive page.
- Domain, points, author, age, and comment count appear on the second line in monospace, muted colour.
- Tags are small mono pill badges.

### Submit page

A static editorial page (`submit.html`) that:
1. Explains what Hackerboard is and what to submit.
2. Describes the submission workflow (GitHub Discussion template).
3. Lists community guidelines.
4. Ends with a single centred CTA button in `--hdr-bg` violet that opens GitHub Discussions in a new tab.
