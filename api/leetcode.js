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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    },
  );
  return response.data;
}

function measureText(str, fontSize) {
  return str.length * fontSize * 0.6;
}

function renderLeetCodeCard(data, options = {}) {
  const { border_radius = "20" } = options;

  const user = data?.data?.matchedUser;
  if (!user) throw new CustomError("LeetCode user not found", "USER_NOT_FOUND");

  // ── Data Extraction ──
  const allQ = data.data.allQuestionsCount || [];
  const ac = user.submitStats?.acSubmissionNum || [];
  const ts = user.submitStats?.totalSubmissionNum || [];

  const easyQ   = allQ.find(q => q.difficulty === "Easy")?.count   || 958;
  const medQ    = allQ.find(q => q.difficulty === "Medium")?.count || 2095;
  const hardQ   = allQ.find(q => q.difficulty === "Hard")?.count   || 960;

  const solved     = ac.find(s => s.difficulty === "All")?.count    || 0;
  const easySolved = ac.find(s => s.difficulty === "Easy")?.count   || 0;
  const medSolved  = ac.find(s => s.difficulty === "Medium")?.count || 0;
  const hardSolved = ac.find(s => s.difficulty === "Hard")?.count   || 0;

  const totalSub = ts.find(s => s.difficulty === "All")?.submissions || 0;
  const streak   = user.userCalendar?.streak || 0;
  const active   = user.userCalendar?.totalActiveDays || 0;
  const ranking  = user.profile?.ranking || 0;
  const fmtRank  = ranking > 0 ? ranking.toLocaleString() : "N/A";
  const avatar   = user.profile?.userAvatar || "";

  const totalQ   = allQ.find(q => q.difficulty === "All")?.count || 4013;
  const pctAll   = totalQ > 0 ? (solved / totalQ) * 100 : 0;
  const pctEasy  = easyQ > 0 ? (easySolved / easyQ) * 100 : 0;
  const pctMed   = medQ > 0 ? (medSolved / medQ) * 100 : 0;
  const pctHard  = hardQ > 0 ? (hardSolved / hardQ) * 100 : 0;

  // ── Palette ──
  const bg       = "#0d1117";
  const bdr      = "#238636";
  const white    = "#e6edf3";
  const green    = "#2ea043";
  const dimGreen = "#238636";
  const grey     = "#8b949e";
  const track    = "#21262d";
  const easyC    = "#00b8a3";
  const medC     = "#ffc01e";
  const hardC    = "#ef4743";
  const pillBg   = "#0d1b12";

  // ── Ring Math ──
  const R = 40;
  const C = 2 * Math.PI * R;
  const off = C - (pctAll / 100) * C;

  // Streak ring
  const sR = 30;
  const sC = 2 * Math.PI * sR;

  // ── Card dimensions ──
  const W = 920;
  const pad = 35;
  const dividerX = 400;

  // ── Progress bar config ──
  const barW = 110;
  const barGroupX = 170;

  // ═══ Skills Badges ═══
  const tagData = user.tagProblemCounts || {};
  const allTags = [
    ...(tagData.fundamental || []),
    ...(tagData.intermediate || []),
    ...(tagData.advanced || []),
  ].sort((a, b) => b.problemsSolved - a.problemsSolved);

  let skillsSvg = "";
  let bx = 0, by = 0;
  allTags.slice(0, 14).forEach(t => {
    const lbl = `${t.tagName} \u00d7${t.problemsSolved}`;
    const w = measureText(lbl, 12) + 26;
    if (bx + w > W - pad * 2) { bx = 0; by += 32; }
    skillsSvg += `<g transform="translate(${bx},${by})">
      <rect width="${w}" height="26" rx="13" fill="${pillBg}" stroke="${dimGreen}" stroke-width="1.2"/>
      <text x="${w/2}" y="17" text-anchor="middle" font-size="12" font-weight="500" fill="${green}">${lbl}</text>
    </g>`;
    bx += w + 10;
  });
  const skillsH = by + 32;

  // ═══ Language Badges ═══
  const langs = user.languageProblemCount || [];
  let langSvg = "";
  let langBx = 0;
  langs.forEach(l => {
    const lbl = `${l.languageName} \u00d7${l.problemsSolved}`;
    const w = measureText(lbl, 12) + 26;
    langSvg += `<g transform="translate(${langBx},0)">
      <rect width="${w}" height="26" rx="13" fill="${pillBg}" stroke="${dimGreen}" stroke-width="1.2"/>
      <text x="${w/2}" y="17" text-anchor="middle" font-size="12" font-weight="500" fill="${green}">${lbl}</text>
    </g>`;
    langBx += w + 10;
  });

  // ═══ Heatmap ═══
  const calRaw = user.userCalendar?.submissionCalendar || "{}";
  let calMap = {};
  try { calMap = JSON.parse(calRaw); } catch (e) { /* empty */ }

  const today = new Date();
  const dayMs = 86400000;
  const numWeeks = 53;
  const cell = 12;
  const gap = 3;

  const dateCounts = {};
  for (const stamp of Object.keys(calMap)) {
    const d = new Date(parseInt(stamp) * 1000);
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

  // ═══ Dynamic Y positions ═══
  const headerEnd   = 70;
  const topEnd      = 200;
  const div1Y       = topEnd + 5;
  const skillLblY   = div1Y + 28;
  const skillBdgY   = skillLblY + 18;
  const div2Y       = skillBdgY + skillsH + 8;
  const langLblY    = div2Y + 28;
  const langBdgY    = langLblY + 18;
  const div3Y       = langBdgY + 40;
  const heatLblY    = div3Y + 28;
  const heatGridY   = heatLblY + 25;
  const heatH       = 7 * (cell + gap);
  const legendY     = heatGridY + heatH + 18;
  const totalH      = legendY + 25;

  const rx = border_radius;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}" viewBox="0 0 ${W} ${totalH}">
<style>text{font-family:'Segoe UI',Ubuntu,'Helvetica Neue',sans-serif}</style>

<!-- Card -->
<rect x="1" y="1" width="${W - 2}" height="${totalH - 2}" rx="${rx}" fill="${bg}" stroke="${bdr}" stroke-width="2"/>

<!-- ════════════════════ HEADER ════════════════════ -->
<g transform="translate(${pad}, 38)">
  <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.17 5.79a1.374 1.374 0 0 0-.012 1.936l1.374 1.374a1.374 1.374 0 0 0 1.936-.012l5.352-5.352A1.374 1.374 0 0 0 14.88 1.8L13.5.438A1.374 1.374 0 0 0 13.483 0zm-8.6 7.422a1.374 1.374 0 0 0-.968.423l-3.48 3.48a1.374 1.374 0 0 0 0 1.943l1.374 1.374a1.374 1.374 0 0 0 1.943 0l3.48-3.48a1.374 1.374 0 0 0 0-1.943L5.858 7.845a1.374 1.374 0 0 0-.975-.423z" fill="#FFA116" transform="translate(0,-14) scale(1.4)"/>
  <text x="32" y="-2" font-size="18" font-weight="700" fill="${white}">${user.username}</text>
  <text x="32" y="18" font-size="13" font-weight="600" fill="${green}">Rank ${fmtRank}</text>
</g>

<!-- Avatar -->
<g transform="translate(305, 22)">
  <defs><clipPath id="aclip"><circle cx="22" cy="22" r="20"/></clipPath></defs>
  <circle cx="22" cy="22" r="22" fill="#161b22" stroke="${grey}" stroke-width="1.5"/>
  ${avatar ? `<image href="${avatar}" x="2" y="2" width="40" height="40" clip-path="url(#aclip)"/>` : `<text x="22" y="28" text-anchor="middle" font-size="16" font-weight="700" fill="${green}">${user.username.substring(0, 2).toUpperCase()}</text>`}
</g>

<!-- ════════════════════ TOP SECTION ════════════════════ -->
<!-- Vertical divider -->
<line x1="${dividerX}" y1="30" x2="${dividerX}" y2="${topEnd}" stroke="${dimGreen}" stroke-width="1" stroke-opacity="0.4"/>

<!-- Solved Ring -->
<g transform="translate(95, 135)">
  <circle cx="0" cy="0" r="${R}" stroke-width="7" fill="none" stroke="${track}"/>
  <circle cx="0" cy="0" r="${R}" stroke-width="7" fill="none" stroke="${green}" stroke-dasharray="${C}" stroke-dashoffset="${off}" stroke-linecap="round" transform="rotate(-90)"/>
  <circle cx="${-R * Math.cos(Math.PI / 4)}" cy="${-R * Math.sin(Math.PI / 4) - 4}" r="4.5" fill="${green}"/>
  <text x="0" y="5" text-anchor="middle" font-size="30" font-weight="800" fill="${white}">${solved}</text>
  <text x="0" y="26" text-anchor="middle" font-size="12" font-weight="600" fill="${green}">Solved</text>
</g>

<!-- Easy / Medium / Hard Progress Bars -->
<g transform="translate(${barGroupX}, 100)">
  <text x="0" y="14" font-size="13" font-weight="600" fill="${white}">Easy</text>
  <circle cx="52" cy="10" r="4.5" fill="${easyC}"/>
  <rect x="65" y="6" width="${barW}" height="8" rx="4" fill="${track}"/>
  <rect x="65" y="6" width="${Math.max(2, (pctEasy / 100) * barW)}" height="8" rx="4" fill="${easyC}"/>
  <text x="${65 + barW + 12}" y="14" font-size="12" font-weight="600" fill="${green}">${easySolved}/${easyQ}</text>

  <text x="0" y="44" font-size="13" font-weight="600" fill="${white}">Medium</text>
  <circle cx="52" cy="40" r="4.5" fill="${medC}"/>
  <rect x="65" y="36" width="${barW}" height="8" rx="4" fill="${track}"/>
  <rect x="65" y="36" width="${Math.max(2, (pctMed / 100) * barW)}" height="8" rx="4" fill="${medC}"/>
  <text x="${65 + barW + 12}" y="44" font-size="12" font-weight="600" fill="${medC}">${medSolved}/${medQ}</text>

  <text x="0" y="74" font-size="13" font-weight="600" fill="${white}">Hard</text>
  <circle cx="52" cy="70" r="4.5" fill="${hardC}"/>
  <rect x="65" y="66" width="${barW}" height="8" rx="4" fill="${track}"/>
  <rect x="65" y="66" width="${Math.max(2, (pctHard / 100) * barW)}" height="8" rx="4" fill="${hardC}"/>
  <text x="${65 + barW + 12}" y="74" font-size="12" font-weight="600" fill="${hardC}">${hardSolved}/${hardQ}</text>
</g>

<!-- Total Submissions -->
<g transform="translate(490, 115)">
  <text x="0" y="10" text-anchor="middle" font-size="32" font-weight="800" fill="${white}">${totalSub}</text>
  <text x="0" y="35" text-anchor="middle" font-size="12" font-weight="500" fill="${grey}">Total Submissions</text>
</g>

<!-- Current Streak Ring -->
<g transform="translate(650, 125)">
  <circle cx="0" cy="0" r="${sR}" stroke-width="3" fill="none" stroke="${track}"/>
  <circle cx="0" cy="0" r="${sR}" stroke-width="3" fill="none" stroke="${green}" stroke-dasharray="${sC}" stroke-dashoffset="0" stroke-linecap="round"/>
  <!-- Flame icon at top -->
  <path d="M0,-6c1.2,3-0.8,4.5-2,5.5c-1.5,1-2.2,2.5-2.2,4.2c0,2.5,1.8,4.3,4.2,4.3s4.2-1.8,4.2-4.3c0-2.5-1.5-4-3.2-5.5c0.2,1.5-0.5,2.5-1,3.3z" fill="${green}" transform="translate(0,${-sR - 5}) scale(0.7)"/>
  <text x="0" y="6" text-anchor="middle" font-size="22" font-weight="800" fill="${white}">${streak}</text>
  <text x="0" y="${sR + 25}" text-anchor="middle" font-size="13" font-weight="700" fill="${white}">Current Streak</text>
</g>

<!-- Highest Streak -->
<g transform="translate(820, 115)">
  <text x="0" y="10" text-anchor="middle" font-size="32" font-weight="800" fill="${white}">${active}</text>
  <text x="0" y="35" text-anchor="middle" font-size="12" font-weight="500" fill="${grey}">Highest Streak</text>
</g>

<!-- ════════════════════ DIVIDER 1 ════════════════════ -->
<line x1="${pad}" y1="${div1Y}" x2="${W - pad}" y2="${div1Y}" stroke="${dimGreen}" stroke-width="1" stroke-opacity="0.4"/>

<!-- ════════════════════ SKILLS ════════════════════ -->
<text x="${pad}" y="${skillLblY}" font-size="15" font-weight="700" fill="${white}">Skills</text>
<g transform="translate(${pad}, ${skillBdgY})">
  ${skillsSvg}
</g>

<!-- ════════════════════ DIVIDER 2 ════════════════════ -->
<line x1="${pad}" y1="${div2Y}" x2="${W - pad}" y2="${div2Y}" stroke="${dimGreen}" stroke-width="1" stroke-opacity="0.4"/>

<!-- ════════════════════ LANGUAGES ════════════════════ -->
<text x="${pad}" y="${langLblY}" font-size="15" font-weight="700" fill="${white}">Languages</text>
<g transform="translate(${pad}, ${langBdgY})">
  ${langSvg}
</g>

<!-- ════════════════════ DIVIDER 3 ════════════════════ -->
<line x1="${pad}" y1="${div3Y}" x2="${W - pad}" y2="${div3Y}" stroke="${dimGreen}" stroke-width="1" stroke-opacity="0.4"/>

<!-- ════════════════════ HEATMAP ════════════════════ -->
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
    const svg = renderLeetCodeCard(data, req.query);
    return res.status(200).send(svg);
  } catch (err) {
    return res.status(500).send(`<svg xmlns="http://www.w3.org/2000/svg" width="920" height="100">
      <rect width="920" height="100" fill="#0d1117" rx="20" stroke="#238636" stroke-width="2"/>
      <text x="460" y="55" fill="#ef4743" text-anchor="middle" font-size="14">Error: ${err.message || "Failed to fetch"}</text>
    </svg>`);
  }
}
