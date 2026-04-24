#!/usr/bin/env node
'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────

const ROOT = __dirname;
const DIST = path.join(ROOT, 'docs');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const token = process.env.GH_TOKEN;
const { owner, repo, submit_url } = config.github;

// ─── Sample data (used locally when GH_TOKEN is absent) ──────────────────────

const SAMPLE_POSTS = [
  {
    number: 1,
    title: 'Show HB: A static site generator in 50 lines of Node.js',
    link: 'https://github.com/example/tiny-ssg',
    domain: 'github.com',
    description: 'Tired of 10MB frameworks. Built mine in an afternoon. It generates this very site.',
    tags: ['node', 'ssg', 'minimal'],
    author: 'bot_0xdeadbeef',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    url: `https://github.com/${owner}/${repo}/discussions/1`,
    upvotes: 47,
    comments: 12,
  },
  {
    number: 2,
    title: 'The unreasonable effectiveness of simple HTTP APIs',
    link: 'https://example.com/simple-apis',
    domain: 'example.com',
    description: 'REST is fine. JSON is fine. Stop over-engineering.',
    tags: ['api', 'http', 'simplicity'],
    author: 'pragmatic_coder',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    url: `https://github.com/${owner}/${repo}/discussions/2`,
    upvotes: 31,
    comments: 8,
  },
  {
    number: 3,
    title: 'I asked 10 LLMs to write the same program — results were surprising',
    link: 'https://example.com/llm-benchmark',
    domain: 'example.com',
    description: null,
    tags: ['llm', 'benchmark', 'ai'],
    author: 'llm_wanderer',
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
    url: `https://github.com/${owner}/${repo}/discussions/3`,
    upvotes: 24,
    comments: 19,
  },
  {
    number: 4,
    title: 'Erlang/OTP 27 released with significantly improved JSON support',
    link: 'https://erlang.org/news/otp-27',
    domain: 'erlang.org',
    description: null,
    tags: ['erlang', 'release'],
    author: 'beam_lover',
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    url: `https://github.com/${owner}/${repo}/discussions/4`,
    upvotes: 18,
    comments: 3,
  },
  {
    number: 5,
    title: 'Why I still use RSS in 2025',
    link: 'https://example.com/rss-2025',
    domain: 'example.com',
    description: 'Algorithmic feeds are a cage. RSS is freedom.',
    tags: ['rss', 'feeds', 'opinion'],
    author: 'rss_maximalist',
    createdAt: new Date(Date.now() - 18 * 3600000).toISOString(),
    url: `https://github.com/${owner}/${repo}/discussions/5`,
    upvotes: 15,
    comments: 6,
  },
  {
    number: 6,
    title: 'Writing a compiler in a weekend',
    link: 'https://example.com/compiler-weekend',
    domain: 'example.com',
    description: 'It\'s smaller than you think once you strip away the abstractions.',
    tags: ['compilers', 'language', 'tutorial'],
    author: 'zero_to_asm',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    url: `https://github.com/${owner}/${repo}/discussions/6`,
    upvotes: 12,
    comments: 5,
  },
  {
    number: 7,
    title: 'GitHub Discussions as a database: a field report',
    link: 'https://example.com/gh-discussions-db',
    domain: 'example.com',
    description: null,
    tags: ['github', 'architecture'],
    author: 'ghost_in_the_shell',
    createdAt: new Date(Date.now() - 36 * 3600000).toISOString(),
    url: `https://github.com/${owner}/${repo}/discussions/7`,
    upvotes: 9,
    comments: 2,
  },
];

// ─── GitHub GraphQL ───────────────────────────────────────────────────────────

async function graphql(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });
    const req = https.request({
      hostname: 'api.github.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Authorization': `bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'Hackerboard/1.0',
      },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function fetchPosts() {
  const catResult = await graphql(`
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        discussionCategories(first: 20) {
          nodes { id name slug }
        }
      }
    }
  `, { owner, repo });

  const categories = catResult.data.repository.discussionCategories.nodes;
  const cat = categories.find(c =>
    c.slug === 'submissions' || c.name.toLowerCase() === 'submissions'
  );
  if (!cat) throw new Error('Category "submissions" not found in GitHub Discussions');

  const posts = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const result = await graphql(`
      query($owner: String!, $repo: String!, $categoryId: ID!, $cursor: String) {
        repository(owner: $owner, name: $repo) {
          discussions(
            first: 100
            after: $cursor
            categoryId: $categoryId
            orderBy: { field: CREATED_AT, direction: DESC }
          ) {
            pageInfo { hasNextPage endCursor }
            nodes {
              number
              title
              body
              createdAt
              author { login }
              url
              comments { totalCount }
              reactions(content: THUMBS_UP) { totalCount }
              labels(first: 10) { nodes { name } }
            }
          }
        }
      }
    `, { owner, repo, categoryId: cat.id, cursor });

    const disc = result.data.repository.discussions;

    for (const node of disc.nodes) {
      const labels = node.labels.nodes.map(l => l.name);
      if (labels.includes('[removed]')) continue;

      const parsed = parseBody(node.body);
      const link = parsed.link || '';
      posts.push({
        number: node.number,
        title: parsed.title || node.title,
        link,
        domain: getDomain(link),
        description: parsed.description || null,
        tags: parsed.tags,
        author: node.author?.login || 'ghost',
        createdAt: node.createdAt,
        url: node.url,
        upvotes: node.reactions.totalCount,
        comments: node.comments.totalCount,
      });
    }

    hasNextPage = disc.pageInfo.hasNextPage;
    cursor = disc.pageInfo.endCursor;
  }

  return posts;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseBody(body) {
  const sections = {};
  let current = null;
  const lines = [];

  for (const line of (body || '').split('\n')) {
    const m = line.match(/^#{2,3}\s+(.+)/);
    if (m) {
      if (current !== null) sections[current] = lines.splice(0).join('\n').trim();
      current = m[1].trim().toLowerCase();
    } else if (current !== null) {
      lines.push(line);
    }
  }
  if (current !== null) sections[current] = lines.join('\n').trim();

  return {
    link: sections['link'] || '',
    title: sections['title'] || '',
    description: sections['description'] || '',
    tags: (sections['tags'] || '').split(',').map(t => t.trim()).filter(Boolean),
  };
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}mo`;
}

function esc(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── HTML templates ───────────────────────────────────────────────────────────

function shell(title, body, prefix = '', activePage = null) {
  const tab = (id, label, href) =>
    `<a class="tab${activePage === id ? ' active' : ''}" href="${prefix}${href}">${label}</a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<link rel="icon" href="${prefix}assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${prefix}assets/style.css">
<link rel="alternate" type="application/rss+xml" title="${esc(config.site.name)}" href="${prefix}feed.xml">
<script>var t=localStorage.getItem('hb-theme');if(t)document.documentElement.setAttribute('data-theme',t);</script>
</head>
<body>
<header>
  <div class="hi">
    <a class="hname" href="${prefix}index.html">${esc(config.site.name)}</a>
    ${tab('new', 'new', 'index.html')}
    ${tab('signal', 'signal', 'signal.html')}
    ${tab('submit', 'submit', 'submit.html')}
    <div class="hright">
      <button class="hdark" onclick="toggleDark()">[dark]</button>
    </div>
  </div>
</header>
<main>
${body}
</main>
<footer>
  <a href="${prefix}feed.xml">rss</a> &middot;
  <a href="${prefix}feed.json">json feed</a> &middot;
  <a href="https://github.com/${owner}/${repo}" target="_blank" rel="noopener">source</a>
  &middot; updated every 15 min
</footer>
<script src="${prefix}assets/main.js"></script>
</body>
</html>`;
}

function postRow(post) {
  const domain = post.domain ? ` <span class="dom">(${esc(post.domain)})</span>` : '';
  const tags = post.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('');
  const href = post.link ? esc(post.link) : `archive/${post.number}.html`;
  const linkAttrs = post.link ? ' target="_blank" rel="noopener"' : '';
  return `<li>
  <div class="pt"><a href="${href}"${linkAttrs}>${esc(post.title)}</a>${domain}</div>
  <div class="pm">${post.upvotes} pts &middot; by ${esc(post.author)} &middot; ${timeAgo(post.createdAt)} &middot; <a href="${esc(post.url)}" target="_blank" rel="noopener">${post.comments} comments</a></div>
</li>`;
}

function buildIndex(posts) {
  const sorted = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const rows = sorted.map(p => postRow(p)).join('\n');
  return shell(config.site.name, `<ul class="posts">${rows}</ul>`, '', 'new');
}

function buildSignal(posts) {
  const ranked = [...posts].sort((a, b) => b.upvotes - a.upvotes);
  const rows = ranked.map(p => postRow(p)).join('\n');
  return shell(`signal — ${config.site.name}`, `<ul class="posts">${rows}</ul>`, '', 'signal');
}

function buildSubmit() {
  const body = `<div class="submit-wrap">
    <h1>Submit to Hackerboard</h1>

    <h2>What is Hackerboard?</h2>
    <p>A community-curated link board for hackers and builders. Every post is a GitHub Discussion — no algorithm, no tracking, no walled garden. The site rebuilds from those discussions every 15 minutes.</p>

    <h2>What to submit</h2>
    <ul>
      <li>Articles, tools, or libraries worth reading</li>
      <li><strong>Show HB:</strong> your own projects and experiments</li>
      <li>Releases, papers, or deep-dives on programming and systems</li>
    </ul>

    <h2>How</h2>
    <ul>
      <li>Click the button below — a GitHub Discussion template opens</li>
      <li>Fill in title, link, description, and tags</li>
      <li>Submit — your post appears within 15 minutes</li>
    </ul>

    <h2>Guidelines</h2>
    <ul>
      <li>Link to the original source, not aggregators</li>
      <li>Use <strong>Show HB:</strong> when submitting your own work</li>
      <li>Spam or off-topic posts may be removed</li>
    </ul>

    <div class="submit-cta">
      <a class="cta-btn" href="${esc(submit_url)}" target="_blank" rel="noopener">+ New Submission</a>
    </div>
  </div>`;
  return shell(`Submit — ${config.site.name}`, body, '', 'submit');
}

function buildPost(post) {
  const domain = post.domain ? ` <span class="dom">(${esc(post.domain)})</span>` : '';
  const desc = post.description ? `<p class="pdesc">${esc(post.description)}</p>` : '';
  const tags = post.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('');
  const body = `<article>
  <h1 class="pt"><a href="${esc(post.link)}" target="_blank" rel="noopener">${esc(post.title)}</a>${domain}</h1>
  <div class="pm">${post.upvotes} pts &middot; by ${esc(post.author)} &middot; ${timeAgo(post.createdAt)}</div>
  ${desc}
  ${tags ? `<div class="ptags">${tags}</div>` : ''}
  <div class="pact">
    <a class="upvote" href="${esc(post.url)}" target="_blank" rel="noopener">↑ upvote on GitHub</a>
    &middot;
    <a href="${esc(post.url)}" target="_blank" rel="noopener">${post.comments} comments</a>
  </div>
</article>`;
  return shell(post.title, body, '../', null);
}

// ─── Feeds ────────────────────────────────────────────────────────────────────

function buildRss(posts) {
  const top = [...posts].sort((a, b) => b.upvotes - a.upvotes).slice(0, 30);
  const items = top.map(p => `  <item>
    <title>${esc(p.title)}</title>
    <link>${esc(p.link || p.url)}</link>
    <guid isPermaLink="false">${esc(p.url)}</guid>
    <pubDate>${new Date(p.createdAt).toUTCString()}</pubDate>
    <description>${esc(p.description || '')}</description>
  </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${esc(config.site.name)}</title>
  <link>${esc(config.site.url)}</link>
  <description>${esc(config.site.tagline)}</description>
${items}
</channel>
</rss>`;
}

function buildFeedJson(posts) {
  const top = [...posts].sort((a, b) => b.upvotes - a.upvotes);
  return JSON.stringify({
    version: 'https://jsonfeed.org/version/1.1',
    title: config.site.name,
    home_page_url: config.site.url,
    feed_url: `${config.site.url}/feed.json`,
    items: top.map(p => ({
      id: p.url,
      url: `${config.site.url}/archive/${p.number}.html`,
      external_url: p.link,
      title: p.title,
      summary: p.description,
      tags: p.tags,
      date_published: p.createdAt,
      authors: [{ name: p.author }],
    })),
  }, null, 2);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const posts = token ? await fetchPosts() : SAMPLE_POSTS;

  fs.mkdirSync(path.join(DIST, 'archive'), { recursive: true });

  fs.writeFileSync(path.join(DIST, 'index.html'), buildIndex(posts), 'utf8');
  fs.writeFileSync(path.join(DIST, 'signal.html'), buildSignal(posts), 'utf8');
  fs.writeFileSync(path.join(DIST, 'submit.html'), buildSubmit(), 'utf8');
  fs.writeFileSync(path.join(DIST, 'feed.xml'), buildRss(posts), 'utf8');
  fs.writeFileSync(path.join(DIST, 'feed.json'), buildFeedJson(posts), 'utf8');

  for (const post of posts) {
    fs.writeFileSync(path.join(DIST, 'archive', `${post.number}.html`), buildPost(post), 'utf8');
  }

  console.error(`[hackerboard] built ${posts.length} posts`);
}

main().catch(e => { console.error(e.message); process.exit(1); });