/**
 * LOC Stats Card — Vercel Serverless API Endpoint
 * 
 * Add this file to: github-readme-stats/api/loc.js
 * 
 * URL: https://github-readme-stats-phi-seven-83.vercel.app/api/loc
 *      ?username=Build-with-Akshit&theme=cobalt2&border_radius=15&card_width=550
 * 
 * Generates a dynamic SVG card showing total lines of code across all GitHub repos.
 * Auto-updates every 6 hours via CDN cache. No commits needed.
 */

// ─── Theme Definitions ──────────────────────────────────────────────────────

const THEMES = {
  cobalt2: {
    bg: "#193549",
    border: "#ffc600",
    title: "#ffc600",
    text: "#ffffff",
    subtext: "#b0bec5",
    icon: "#ffc600",
    langBar: ["#ffc600", "#0088ff", "#ff6347", "#00d4aa", "#c084fc", "#f97316", "#06b6d4", "#ec4899"],
  },
  dark: {
    bg: "#0d1117",
    border: "#30363d",
    title: "#58a6ff",
    text: "#c9d1d9",
    subtext: "#8b949e",
    icon: "#58a6ff",
    langBar: ["#58a6ff", "#f78166", "#3fb950", "#d2a8ff", "#f0883e", "#79c0ff", "#56d364", "#ff7b72"],
  },
  radical: {
    bg: "#141321",
    border: "#fe428e",
    title: "#fe428e",
    text: "#a9fef7",
    subtext: "#7a8f97",
    icon: "#f8d847",
    langBar: ["#fe428e", "#f8d847", "#a9fef7", "#c084fc", "#f97316", "#06b6d4", "#ec4899", "#10b981"],
  },
  tokyonight: {
    bg: "#1a1b27",
    border: "#70a5fd",
    title: "#70a5fd",
    text: "#38bdae",
    subtext: "#6183bb",
    icon: "#bf91f3",
    langBar: ["#70a5fd", "#bf91f3", "#38bdae", "#fc7b7b", "#f8d847", "#a9fef7", "#fe428e", "#06b6d4"],
  },
  cobalt: {
    bg: "#193549",
    border: "#ffc600",
    title: "#ffc600",
    text: "#ffffff",
    subtext: "#b0bec5",
    icon: "#ffc600",
    langBar: ["#ffc600", "#0088ff", "#ff6347", "#00d4aa", "#c084fc", "#f97316", "#06b6d4", "#ec4899"],
  },
  default: {
    bg: "#fffefe",
    border: "#e4e2e2",
    title: "#2f80ed",
    text: "#434d58",
    subtext: "#777777",
    icon: "#4c71f2",
    langBar: ["#2f80ed", "#e34c26", "#3572A5", "#00ADD8", "#dea584", "#f1e05a", "#563d7c", "#89e051"],
  },
};

// ─── Bytes-to-LOC ───────────────────────────────────────────────────────────

const BYTES_PER_LINE = {
  Kotlin: 35, Java: 38, Python: 30, Dart: 34, JavaScript: 32,
  TypeScript: 34, "C++": 36, C: 32, Go: 28, Rust: 34,
  HTML: 45, CSS: 30, SCSS: 28, Shell: 25, Ruby: 28,
  PHP: 32, Swift: 34, Lua: 26, R: 28, CMake: 30,
  Makefile: 25, Dockerfile: 22, YAML: 28, JSON: 30,
  XML: 50, Markdown: 40, "Jupyter Notebook": 50,
  "Objective-C": 36, Haskell: 30, Scala: 34, Perl: 30,
  PowerShell: 32, Batchfile: 28, AIDL: 34, PLpgSQL: 35,
};
const DEFAULT_BPL = 32;

// ─── GitHub API ─────────────────────────────────────────────────────────────

async function ghFetch(endpoint, token) {
  const headers = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "LOC-Stats-Card/1.0",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const results = [];
  let url = `https://api.github.com${endpoint}`;

  while (url) {
    const res = await fetch(url, { headers });
    if (!res.ok) break;
    const data = await res.json();

    if (Array.isArray(data)) {
      results.push(...data);
    } else {
      return data;
    }

    const link = res.headers.get("link") || "";
    const next = link.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }
  return results;
}

async function getStats(username, token) {
  const repos = await ghFetch(
    token
      ? "/user/repos?per_page=100&affiliation=owner&type=all"
      : `/users/${username}/repos?per_page=100&type=owner`,
    token
  );

  const ownedRepos = repos.filter((r) => !r.fork);
  const allLangs = {};

  // Fetch languages for all repos in parallel
  await Promise.all(
    ownedRepos.map(async (repo) => {
      try {
        const langs = await ghFetch(
          `/repos/${repo.owner.login}/${repo.name}/languages`,
          token
        );
        if (langs && typeof langs === "object") {
          for (const [lang, bytes] of Object.entries(langs)) {
            allLangs[lang] = (allLangs[lang] || 0) + bytes;
          }
        }
      } catch (_) { /* skip failed repos */ }
    })
  );

  // Convert bytes → LOC
  const langLoc = {};
  for (const [lang, bytes] of Object.entries(allLangs)) {
    const bpl = BYTES_PER_LINE[lang] || DEFAULT_BPL;
    const loc = Math.floor(bytes / bpl);
    if (loc > 0) langLoc[lang] = loc;
  }

  const totalLoc = Object.values(langLoc).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(langLoc).sort((a, b) => b[1] - a[1]);

  return { totalLoc, languages: sorted, repoCount: ownedRepos.length };
}

// ─── SVG Card ───────────────────────────────────────────────────────────────

function fmt(n) {
  return n.toLocaleString("en-US");
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function generateSVG(stats, options) {
  const {
    theme = "cobalt2",
    borderRadius = 15,
    cardWidth = 495,
    hideBorder = false,
    customTitle = "",
    showIcons = true,
  } = options;

  const t = THEMES[theme] || THEMES.default;
  const w = cardWidth;
  const br = borderRadius;
  const { totalLoc, languages, repoCount } = stats;
  const topLangs = languages.slice(0, 6);
  const totalForTop = topLangs.reduce((s, [, v]) => s + v, 0) || 1;

  const title = escapeXml(customTitle || "Lifetime Coding Stats");

  // ── Language bar ──
  const barWidth = w - 50;
  const barY = 118;
  let barSegments = "";
  let bx = 0;

  topLangs.forEach(([, loc], i) => {
    const pct = loc / totalForTop;
    const segW = Math.max(pct * barWidth, 3);
    const color = t.langBar[i % t.langBar.length];
    barSegments += `<rect x="${25 + bx}" y="${barY}" width="${segW}" height="10" fill="${color}" ${i === 0 ? 'rx="5"' : i === topLangs.length - 1 ? 'rx="5"' : ""}/>`;
    bx += segW;
  });

  // ── Language legend ──
  let legend = "";
  const cols = 2;
  topLangs.forEach(([lang, loc], i) => {
    const pct = ((loc / totalForTop) * 100).toFixed(1);
    const color = t.langBar[i % t.langBar.length];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 25 + col * Math.floor(barWidth / 2);
    const y = 145 + row * 22;
    legend += `
      <g>
        <circle cx="${x}" cy="${y}" r="5" fill="${color}"/>
        <text x="${x + 14}" y="${y + 4}" fill="${t.text}" font-size="11.5"
              font-family="'Segoe UI', Ubuntu, 'Helvetica Neue', sans-serif">
          ${escapeXml(lang)} <tspan fill="${t.subtext}">${pct}%</tspan>
        </text>
      </g>`;
  });

  const legendRows = Math.ceil(topLangs.length / cols);
  const cardHeight = 155 + legendRows * 22 + 15;

  // ── Icon paths ──
  const codeIcon = showIcons
    ? `<svg x="25" y="52" width="16" height="16" viewBox="0 0 24 24" fill="${t.icon}">
         <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
       </svg>`
    : "";
  const repoIcon = showIcons
    ? `<svg x="25" y="77" width="16" height="16" viewBox="0 0 16 16" fill="${t.icon}">
         <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1h-8a1 1 0 00-1 1v6.708A2.486 2.486 0 014.5 9h8V1.5zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
       </svg>`
    : "";
  const labelX = showIcons ? 48 : 25;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${cardHeight}" viewBox="0 0 ${w} ${cardHeight}" fill="none">
  <style>
    .header { font: 600 18px 'Segoe UI', Ubuntu, 'Helvetica Neue', sans-serif; fill: ${t.title}; }
    .stat-lbl { font: 400 13.5px 'Segoe UI', Ubuntu, 'Helvetica Neue', sans-serif; fill: ${t.text}; }
    .stat-val { font: 700 13.5px 'Segoe UI', Ubuntu, 'Helvetica Neue', sans-serif; fill: ${t.text}; }
    .section  { font: 400 11px 'Segoe UI', Ubuntu, 'Helvetica Neue', sans-serif; fill: ${t.subtext}; text-transform: uppercase; letter-spacing: 0.5px; }

    @keyframes fadeIn { from { opacity: 0; transform: translateX(-5px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes scaleIn { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    .stagger1 { opacity: 0; animation: fadeIn 0.5s ease 0.1s forwards; }
    .stagger2 { opacity: 0; animation: fadeIn 0.5s ease 0.25s forwards; }
    .stagger3 { opacity: 0; animation: fadeIn 0.5s ease 0.4s forwards; }
    .stagger4 { opacity: 0; animation: fadeIn 0.5s ease 0.55s forwards; }
    .bar-grow { transform-origin: 25px ${barY}px; animation: scaleIn 0.8s ease 0.3s both; }
  </style>

  <!-- Card background -->
  <rect x="0.5" y="0.5" rx="${br}" ry="${br}" width="${w - 1}" height="${cardHeight - 1}"
        fill="${t.bg}" stroke="${hideBorder ? "none" : t.border}" stroke-width="1"/>

  <!-- Title -->
  <g class="stagger1">
    <svg x="14" y="14" width="22" height="22" viewBox="0 0 24 24" fill="${t.icon}">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
    <text x="42" y="32" class="header">${title}</text>
  </g>

  <!-- Total LOC -->
  <g class="stagger2">
    ${codeIcon}
    <text x="${labelX}" y="65" class="stat-lbl">Total Lines of Code</text>
    <text x="${w - 25}" y="65" class="stat-val" text-anchor="end">${fmt(totalLoc)}</text>
  </g>

  <!-- Total Repos -->
  <g class="stagger3">
    ${repoIcon}
    <text x="${labelX}" y="90" class="stat-lbl">Total Repositories</text>
    <text x="${w - 25}" y="90" class="stat-val" text-anchor="end">${repoCount}</text>
  </g>

  <!-- Section label -->
  <g class="stagger3">
    <text x="25" y="112" class="section">Most Used Languages</text>
  </g>

  <!-- Language Bar -->
  <g class="bar-grow">
    <rect x="25" y="${barY}" width="${barWidth}" height="10" rx="5" fill="${t.bg}" stroke="${t.border}" stroke-width="0.3" stroke-opacity="0.4"/>
    ${barSegments}
  </g>

  <!-- Language Legend -->
  <g class="stagger4">
    ${legend}
  </g>
</svg>`;
}

// ─── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  try {
    const {
      username = "Build-with-Akshit",
      theme = "cobalt2",
      border_radius = "15",
      card_width = "495",
      hide_border = "false",
      custom_title = "",
      show_icons = "true",
    } = req.query;

    const token = process.env.PAT_1 || process.env.GH_TOKEN || "";
    const stats = await getStats(username, token);

    const svg = generateSVG(stats, {
      theme,
      borderRadius: parseInt(border_radius) || 15,
      cardWidth: parseInt(card_width) || 495,
      hideBorder: hide_border === "true",
      customTitle: custom_title,
      showIcons: show_icons !== "false",
    });

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=21600, s-maxage=21600, stale-while-revalidate=3600");
    return res.status(200).send(svg);
  } catch (err) {
    return res.status(500).send(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100">
      <rect width="400" height="100" fill="#141321" rx="10"/>
      <text x="200" y="55" fill="#fe428e" text-anchor="middle" font-size="14" font-family="sans-serif">Error: ${escapeXml(err.message)}</text>
    </svg>`);
  }
}
