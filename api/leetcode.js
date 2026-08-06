// @ts-check
import axios from "axios";
import { CustomError } from "../src/common/error.js";

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

const LEETCODE_QUERY = `
  query userFullData($username: String!) {
    allQuestionsCount { difficulty count }
    matchedUser(username: $username) {
      username
      profile { ranking userAvatar realName }
      submitStats {
        acSubmissionNum { difficulty count submissions }
        totalSubmissionNum { difficulty count submissions }
      }
      userCalendar { streak totalActiveDays submissionCalendar }
      languageProblemCount { languageName problemsSolved }
      tagProblemCounts {
        advanced { tagName problemsSolved }
        intermediate { tagName problemsSolved }
        fundamental { tagName problemsSolved }
      }
    }
  }
`;

async function fetchLeetCodeData(username) {
  const response = await axios.post(
    LEETCODE_GRAPHQL_URL,
    { query: LEETCODE_QUERY, variables: { username } },
    {
      headers: {
        "Content-Type": "application/json",
        Referer: "https://leetcode.com",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    }
  );
  return response.data;
}

async function fetchAvatarBase64(avatarUrl) {
  if (!avatarUrl) return null;
  try {
    const res = await axios.get(avatarUrl, {
      responseType: "arraybuffer",
      timeout: 5000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });
    const mime = res.headers["content-type"] || "image/png";
    const base64 = Buffer.from(res.data).toString("base64");
    return `data:${mime};base64,${base64}`;
  } catch (e) {
    return null;
  }
}

function calcCurrentStreak(submissionCalendar) {
  if (!submissionCalendar) return 0;
  let calMap;
  try {
    calMap = JSON.parse(submissionCalendar);
  } catch (e) {
    return 0;
  }

  const dateSet = new Set();
  for (const ts of Object.keys(calMap)) {
    if (calMap[ts] > 0) {
      const d = new Date(parseInt(ts, 10) * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      dateSet.add(key);
    }
  }

  const today = new Date();
  const dayMs = 86400000;
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const todayKey = fmt(today);
  const yesterdayKey = fmt(new Date(today.getTime() - dayMs));

  let currentKey = null;
  if (dateSet.has(todayKey)) {
    currentKey = todayKey;
  } else if (dateSet.has(yesterdayKey)) {
    currentKey = yesterdayKey;
  } else {
    return 0;
  }

  let streak = 0;
  let checkDate = currentKey === todayKey ? today : new Date(today.getTime() - dayMs);
  while (dateSet.has(fmt(checkDate))) {
    streak++;
    checkDate = new Date(checkDate.getTime() - dayMs);
  }

  return streak;
}

function measureText(str, fontSize) {
  return str.length * fontSize * 0.6;
}

async function renderLeetCodeCard(data, options = {}) {
  const { border_radius = "20" } = options;

  const user = data?.data?.matchedUser;
  if (!user) throw new CustomError("LeetCode user not found", "USER_NOT_FOUND");

  const avatarB64 = await fetchAvatarBase64(user.profile?.userAvatar);

  // ── Data Extraction ──
  const allQ = data.data.allQuestionsCount || [];
  const ac = user.submitStats?.acSubmissionNum || [];
  const ts = user.submitStats?.totalSubmissionNum || [];

  const easyQ = allQ.find((q) => q.difficulty === "Easy")?.count || 958;
  const medQ = allQ.find((q) => q.difficulty === "Medium")?.count || 2095;
  const hardQ = allQ.find((q) => q.difficulty === "Hard")?.count || 960;
  const totalQ = allQ.find((q) => q.difficulty === "All")?.count || 4013;

  const solved = ac.find((s) => s.difficulty === "All")?.count || 0;
  const easySolved = ac.find((s) => s.difficulty === "Easy")?.count || 0;
  const medSolved = ac.find((s) => s.difficulty === "Medium")?.count || 0;
  const hardSolved = ac.find((s) => s.difficulty === "Hard")?.count || 0;

  const totalSub = ts.find((s) => s.difficulty === "All")?.submissions || 0;

  const currentStreak = calcCurrentStreak(user.userCalendar?.submissionCalendar);
  const highestStreak = user.userCalendar?.streak || 0;

  const ranking = user.profile?.ranking || 0;
  const fmtRank = ranking > 0 ? ranking.toLocaleString() : "N/A";

  // Percentages
  const pctAll = totalQ > 0 ? (solved / totalQ) * 100 : 0;
  const pctEasy = easyQ > 0 ? (easySolved / easyQ) * 100 : 0;
  const pctMed = medQ > 0 ? (medSolved / medQ) * 100 : 0;
  const pctHard = hardQ > 0 ? (hardSolved / hardQ) * 100 : 0;

  // ── Palette ──
  const bg = "#0d1117";
  const bdr = "#238636";
  const white = "#e6edf3";
  const green = "#2ea043";
  const dimGreen = "#238636";
  const grey = "#8b949e";
  const track = "#21262d";
  const easyC = "#00b8a3";
  const medC = "#ffc01e";
  const hardC = "#ef4743";
  const pillBg = "#0d1b12";

  // ── Solved Ring Math ──
  const R = 40;
  const C = 2 * Math.PI * R;
  const off = C - (pctAll / 100) * C;

  // ── Layout Dimensions ──
  const W = 920;
  const pad = 35;
  const dividerX = 410;
  const barW = 120;

  // ═══ Skills Badges ═══
  const tagData = user.tagProblemCounts || {};
  const allTags = [
    ...(tagData.fundamental || []),
    ...(tagData.intermediate || []),
    ...(tagData.advanced || []),
  ].sort((a, b) => b.problemsSolved - a.problemsSolved);

  let skillsSvg = "";
  let bx = 0,
    by = 0;
  allTags.slice(0, 14).forEach((t) => {
    const lbl = `${t.tagName} \u00d7${t.problemsSolved}`;
    const w = measureText(lbl, 12) + 26;
    if (bx + w > W - pad * 2) {
      bx = 0;
      by += 32;
    }
    skillsSvg += `<g transform="translate(${bx},${by})">
      <rect width="${w}" height="26" rx="13" fill="${pillBg}" stroke="${dimGreen}" stroke-width="1.2"/>
      <text x="${w / 2}" y="17" text-anchor="middle" font-size="12" font-weight="500" fill="${green}">${lbl}</text>
    </g>`;
    bx += w + 10;
  });
  const skillsH = by + 32;

  // ═══ Language Badges ═══
  const langs = user.languageProblemCount || [];
  let langSvg = "";
  let langBx = 0;
  langs.forEach((l) => {
    const lbl = `${l.languageName} \u00d7${l.problemsSolved}`;
    const w = measureText(lbl, 12) + 26;
    langSvg += `<g transform="translate(${langBx},0)">
      <rect width="${w}" height="26" rx="13" fill="${pillBg}" stroke="${dimGreen}" stroke-width="1.2"/>
      <text x="${w / 2}" y="17" text-anchor="middle" font-size="12" font-weight="500" fill="${green}">${lbl}</text>
    </g>`;
    langBx += w + 10;
  });

  // ═══ Heatmap ═══
  const calRaw = user.userCalendar?.submissionCalendar || "{}";
  let calMap = {};
  try {
    calMap = JSON.parse(calRaw);
  } catch (e) {}

  const today = new Date();
  const dayMs = 86400000;
  const numWeeks = 53;
  const cell = 12;
  const gap = 3;

  const dateCounts = {};
  for (const stamp of Object.keys(calMap)) {
    const d = new Date(parseInt(stamp, 10) * 1000);
    dateCounts[`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`] = calMap[stamp];
  }

  let heatSvg = "";
  for (let w = 0; w < numWeeks; w++) {
    for (let d = 0; d < 7; d++) {
      const ago = (numWeeks - 1 - w) * 7 + (6 - d);
      const dt = new Date(today.getTime() - ago * dayMs);
      const key = `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`;
      const cnt = dateCounts[key] || 0;
      let col = "#161b22";
      if (cnt >= 1 && cnt <= 2) col = "#0e4429";
      else if (cnt >= 3 && cnt <= 4) col = "#006d32";
      else if (cnt >= 5 && cnt <= 7) col = "#26a641";
      else if (cnt > 7) col = "#39d353";
      heatSvg += `<rect x="${w * (cell + gap)}" y="${d * (cell + gap)}" width="${cell}" height="${cell}" rx="2" fill="${col}"/>`;
    }
  }

  // Month labels
  const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let mLabelSvg = "";
  const startDate = new Date(today.getTime() - (numWeeks * 7 - 1) * dayMs);
  let lastM = -1;
  for (let w = 0; w < numWeeks; w++) {
    const wd = new Date(startDate.getTime() + w * 7 * dayMs);
    const m = wd.getMonth();
    if (m !== lastM) {
      mLabelSvg += `<text x="${w * (cell + gap)}" y="-6" font-size="11" fill="${grey}">${mNames[m]}</text>`;
      lastM = m;
    }
  }

  // Y positions
  const topEnd = 200;
  const div1Y = topEnd + 5;
  const skillLblY = div1Y + 28;
  const skillBdgY = skillLblY + 18;
  const div2Y = skillBdgY + skillsH + 8;
  const langLblY = div2Y + 28;
  const langBdgY = langLblY + 18;
  const div3Y = langBdgY + 40;
  const heatLblY = div3Y + 28;
  const heatGridY = heatLblY + 25;
  const heatH = 7 * (cell + gap);
  const legendY = heatGridY + heatH + 18;
  const totalH = legendY + 25;

  const rx = border_radius;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}" viewBox="0 0 ${W} ${totalH}">
<style>text{font-family:'Segoe UI',Ubuntu,'Helvetica Neue',sans-serif}</style>

<defs>
  <!-- Glow Filters -->
  <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur result="blur">
      <animate attributeName="stdDeviation" values="2; 5.5; 2" dur="2s" repeatCount="indefinite" />
    </feGaussianBlur>
    <feMerge>
      <feMergeNode in="blur" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>

  <filter id="flame-glow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur result="blur">
      <animate attributeName="stdDeviation" values="1.5; 4.5; 1.5" dur="2s" repeatCount="indefinite" />
    </feGaussianBlur>
    <feMerge>
      <feMergeNode in="blur" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>

  <!-- Avatar Clip Circle -->
  <clipPath id="aclip">
    <circle cx="22" cy="22" r="20" />
  </clipPath>
</defs>

<!-- Card Background -->
<rect x="1" y="1" width="${W - 2}" height="${totalH - 2}" rx="${rx}" fill="${bg}" stroke="${bdr}" stroke-width="2"/>

<!-- ═══════════ HEADER ═══════════ -->
<g transform="translate(${pad}, 38)">
  <!-- Exact Official LeetCode Logo (Base64 PNG from Reference) -->
  <image href="data:image/png;base64,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" x="-2" y="-18" width="28" height="28" />
  <text x="34" y="-2" font-size="18" font-weight="700" fill="${white}">${user.username}</text>
  <text x="34" y="18" font-size="13" font-weight="600" fill="${green}">Rank ${fmtRank}</text>
</g>

<!-- Avatar -->
<g transform="translate(305, 22)">
  <circle cx="22" cy="22" r="22" fill="#161b22" stroke="${green}" stroke-width="1.8"/>
  ${
    avatarB64
      ? `<image href="${avatarB64}" x="2" y="2" width="40" height="40" clip-path="url(#aclip)"/>`
      : `<text x="22" y="28" text-anchor="middle" font-size="15" font-weight="700" fill="${green}">${user.username.substring(0, 2).toUpperCase()}</text>`
  }
</g>

<!-- ═══════════ TOP SECTION ═══════════ -->
<!-- Vertical divider -->
<line x1="${dividerX}" y1="30" x2="${dividerX}" y2="${topEnd}" stroke="${dimGreen}" stroke-width="1" stroke-opacity="0.4"/>

<!-- Solved Ring -->
<g transform="translate(95, 135)">
  <circle cx="0" cy="0" r="${R}" stroke-width="7" fill="none" stroke="${track}"/>
  <circle cx="0" cy="0" r="${R}" stroke-width="7" fill="none" stroke="${green}" stroke-dasharray="${C}" stroke-dashoffset="${off}" stroke-linecap="round" transform="rotate(-90)"/>
  <text x="0" y="5" text-anchor="middle" font-size="30" font-weight="800" fill="${white}">${solved}</text>
  <text x="0" y="26" text-anchor="middle" font-size="12" font-weight="600" fill="${green}">Solved</text>
</g>

<!-- Easy / Medium / Hard Progress Bars -->
<g transform="translate(175, 100)">
  <!-- Easy -->
  <text x="0" y="14" font-size="14" font-weight="600" fill="${white}">Easy</text>
  <rect x="70" y="7" width="${barW}" height="8" rx="4" fill="${track}"/>
  <rect x="70" y="7" width="${Math.max(2, (pctEasy / 100) * barW)}" height="8" rx="4" fill="${easyC}"/>
  <text x="${70 + barW + 14}" y="15" font-size="13" font-weight="600" fill="${green}">${easySolved}/${easyQ}</text>

  <!-- Medium -->
  <text x="0" y="44" font-size="14" font-weight="600" fill="${white}">Medium</text>
  <rect x="70" y="37" width="${barW}" height="8" rx="4" fill="${track}"/>
  <rect x="70" y="37" width="${Math.max(2, (pctMed / 100) * barW)}" height="8" rx="4" fill="${medC}"/>
  <text x="${70 + barW + 14}" y="45" font-size="13" font-weight="600" fill="${medC}">${medSolved}/${medQ}</text>

  <!-- Hard -->
  <text x="0" y="74" font-size="14" font-weight="600" fill="${white}">Hard</text>
  <rect x="70" y="67" width="${barW}" height="8" rx="4" fill="${track}"/>
  <rect x="70" y="67" width="${Math.max(2, (pctHard / 100) * barW)}" height="8" rx="4" fill="${hardC}"/>
  <text x="${70 + barW + 14}" y="75" font-size="13" font-weight="600" fill="${hardC}">${hardSolved}/${hardQ}</text>
</g>

<!-- Total Submissions -->
<g transform="translate(500, 115)">
  <text x="0" y="10" text-anchor="middle" font-size="32" font-weight="800" fill="${white}">${totalSub}</text>
  <text x="0" y="35" text-anchor="middle" font-size="12" font-weight="500" fill="${grey}">Total Submissions</text>
</g>

<!-- Current Streak Ring with Top Gap & Electric Blue Flame Icon -->
<g transform="translate(660, 125)">
  <!-- Track Ring with Top Gap -->
  <path d="M -12 -33 A 35 35 0 1 0 12 -33" fill="none" stroke="${track}" stroke-width="4.5" stroke-linecap="round"/>

  <!-- Glowing Neon Green Streak Arc with Top Gap -->
  <g filter="url(#neon-glow)">
    <path d="M -12 -33 A 35 35 0 1 0 12 -33" fill="none" stroke="${green}" stroke-width="4.5" stroke-linecap="round"/>
  </g>
  <path d="M -12 -33 A 35 35 0 1 0 12 -33" fill="none" stroke="${green}" stroke-width="4.5" stroke-linecap="round"/>

  <!-- Animated Flame Icon at Top Gap -->
  <g transform="translate(0, -35)">
    <!-- Elevation Float Animation -->
    <animateTransform attributeName="transform" type="translate" values="0,0; 0,-3; 0,0" dur="2s" repeatCount="indefinite" additive="sum"/>
    <animateTransform attributeName="transform" type="scale" values="1; 1.05; 1" dur="2s" repeatCount="indefinite" additive="sum"/>
    
    <circle cx="0" cy="0" r="10" fill="${bg}"/>
    
    <g filter="url(#flame-glow)">
      <!-- Outer Electric Blue Flame (hooks left) -->
      <path d="M -2 -11 C -2 -7, 6 -6, 6 1 C 6 5, 3.5 8, 0 8 C -3.5 8, -6 5, -6 1 C -6 -4, -4 -7, -2 -11 Z" fill="#1e88e5"/>
    </g>
    <!-- Base flame over the glow -->
    <path d="M -2 -11 C -2 -7, 6 -6, 6 1 C 6 5, 3.5 8, 0 8 C -3.5 8, -6 5, -6 1 C -6 -4, -4 -7, -2 -11 Z" fill="#1e88e5"/>
    
    <!-- Inner Dark Teardrop -->
    <path d="M -1 -4 C 1 -2, 3 0, 3 3 C 3 5, 1.5 6, 0 6 C -1.5 6, -3 5, -3 3 C -3 1, -2 -1, -1 -4 Z" fill="${bg}"/>
  </g>

  <text x="0" y="10" text-anchor="middle" font-size="28" font-weight="800" fill="${white}">${currentStreak}</text>
  <text x="0" y="60" text-anchor="middle" font-size="13" font-weight="700" fill="${white}">Current Streak</text>
</g>

<!-- Highest Streak -->
<g transform="translate(820, 115)">
  <text x="0" y="10" text-anchor="middle" font-size="32" font-weight="800" fill="${white}">${highestStreak}</text>
  <text x="0" y="35" text-anchor="middle" font-size="12" font-weight="500" fill="${grey}">Highest Streak</text>
</g>

<!-- ═══════════ DIVIDER 1 ═══════════ -->
<line x1="${pad}" y1="${div1Y}" x2="${W - pad}" y2="${div1Y}" stroke="${dimGreen}" stroke-width="1" stroke-opacity="0.4"/>

<!-- ═══════════ SKILLS ═══════════ -->
<text x="${pad}" y="${skillLblY}" font-size="15" font-weight="700" fill="${white}">Skills</text>
<g transform="translate(${pad}, ${skillBdgY})">
  ${skillsSvg}
</g>

<!-- ═══════════ DIVIDER 2 ═══════════ -->
<line x1="${pad}" y1="${div2Y}" x2="${W - pad}" y2="${div2Y}" stroke="${dimGreen}" stroke-width="1" stroke-opacity="0.4"/>

<!-- ═══════════ LANGUAGES ═══════════ -->
<text x="${pad}" y="${langLblY}" font-size="15" font-weight="700" fill="${white}">Languages</text>
<g transform="translate(${pad}, ${langBdgY})">
  ${langSvg}
</g>

<!-- ═══════════ DIVIDER 3 ═══════════ -->
<line x1="${pad}" y1="${div3Y}" x2="${W - pad}" y2="${div3Y}" stroke="${dimGreen}" stroke-width="1" stroke-opacity="0.4"/>

<!-- ═══════════ HEATMAP ═══════════ -->
<text x="${pad}" y="${heatLblY}" font-size="15" font-weight="700" fill="${white}">Submission Heatmap</text>
<g transform="translate(${pad}, ${heatGridY})">
  ${mLabelSvg}
  ${heatSvg}
</g>

<!-- Legend -->
<g transform="translate(${W - 180}, ${legendY})">
  <text x="0" y="10" font-size="11" fill="${grey}">Less</text>
  <rect x="30" y="0" width="${cell}" height="${cell}" rx="2" fill="#161b22"/>
  <rect x="${30 + cell + 3}" y="0" width="${cell}" height="${cell}" rx="2" fill="#0e4429"/>
  <rect x="${30 + (cell + 3) * 2}" y="0" width="${cell}" height="${cell}" rx="2" fill="#006d32"/>
  <rect x="${30 + (cell + 3) * 3}" y="0" width="${cell}" height="${cell}" rx="2" fill="#26a641"/>
  <rect x="${30 + (cell + 3) * 4}" y="0" width="${cell}" height="${cell}" rx="2" fill="#39d353"/>
  <text x="${30 + (cell + 3) * 5 + 4}" y="10" font-size="11" fill="${grey}">More</text>
</g>
</svg>`;
}

export default async function handler(req, res) {
  const { username = "Build-with-Akshit" } = req.query;
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=3600");
  try {
    const data = await fetchLeetCodeData(username);
    const svg = await renderLeetCodeCard(data, req.query);
    return res.status(200).send(svg);
  } catch (err) {
    return res.status(500).send(`<svg xmlns="http://www.w3.org/2000/svg" width="920" height="100">
      <rect width="920" height="100" fill="#0d1117" rx="20" stroke="#238636" stroke-width="2"/>
      <text x="460" y="55" fill="#ef4743" text-anchor="middle" font-size="14">Error: ${err.message || "Failed to fetch"}</text>
    </svg>`);
  }
}
