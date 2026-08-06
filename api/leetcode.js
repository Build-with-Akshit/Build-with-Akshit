// @ts-check

import axios from "axios";
import { themes } from "../themes/index.js";
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
    {
      query: LEETCODE_QUERY,
      variables: { username },
    },
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

function renderLeetCodeCard(data, options = {}) {
  const {
    username,
    theme = "github_dark",
    custom_title,
    border_radius = "20",
    hide_border = "false",
  } = options;

  const currentTheme = themes[theme] || themes.github_dark || {
    bg_color: "0d1117",
    title_color: "58a6ff",
    text_color: "c9d1d9",
    border_color: "30363d",
  };

  const matchedUser = data?.data?.matchedUser;
  if (!matchedUser) {
    throw new CustomError("LeetCode user not found", "USER_NOT_FOUND");
  }

  const allQuestions = data.data.allQuestionsCount || [];
  const acSubmissions = matchedUser.submitStats?.acSubmissionNum || [];
  const totalSubmissionsList = matchedUser.submitStats?.totalSubmissionNum || [];

  const totalQuestions = allQuestions.find((q) => q.difficulty === "All")?.count || 4013;
  const easyQuestions = allQuestions.find((q) => q.difficulty === "Easy")?.count || 958;
  const mediumQuestions = allQuestions.find((q) => q.difficulty === "Medium")?.count || 2095;
  const hardQuestions = allQuestions.find((q) => q.difficulty === "Hard")?.count || 960;

  const totalSolved = acSubmissions.find((s) => s.difficulty === "All")?.count || 0;
  const easySolved = acSubmissions.find((s) => s.difficulty === "Easy")?.count || 0;
  const mediumSolved = acSubmissions.find((s) => s.difficulty === "Medium")?.count || 0;
  const hardSolved = acSubmissions.find((s) => s.difficulty === "Hard")?.count || 0;

  const totalSubmissions = totalSubmissionsList.find((s) => s.difficulty === "All")?.submissions || totalSolved;

  const streak = matchedUser.userCalendar?.streak || 0;
  const highestStreak = streak; // Best available streak estimate
  const ranking = matchedUser.profile?.ranking || "N/A";
  const formattedRanking = typeof ranking === "number" ? ranking.toLocaleString() : ranking;
  const avatarUrl = matchedUser.profile?.userAvatar;

  // Exact UI Neon Theme Palette
  const isDarkTheme = theme.includes("dark") || theme.includes("cobalt");
  const cardBg = isDarkTheme ? "#06090e" : `#${currentTheme.bg_color}`;
  const neonGreen = "#00e676";
  const neonTeal = "#00b8a3";
  const neonYellow = "#ffc01e";
  const neonRed = "#ff375f";
  const textWhite = "#f0f6fc";
  const textSub = "#8b949e";
  const cardBorder = "#1b4332";

  // Percentages & Circle Math
  const totalPercent = Math.min(100, Math.round((totalSolved / totalQuestions) * 100 * 10) / 10);
  const easyPercent = easyQuestions > 0 ? Math.min(100, Math.round((easySolved / easyQuestions) * 100)) : 0;
  const mediumPercent = mediumQuestions > 0 ? Math.min(100, Math.round((mediumSolved / mediumQuestions) * 100)) : 0;
  const hardPercent = hardQuestions > 0 ? Math.min(100, Math.round((hardSolved / hardQuestions) * 100)) : 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius; // ~213.6
  const strokeDashoffset = circumference - (totalPercent / 100) * circumference;

  // Skills Badges (Tag Problem Counts)
  const tagCounts = matchedUser.tagProblemCounts || {};
  const allTags = [
    ...(tagCounts.fundamental || []),
    ...(tagCounts.intermediate || []),
    ...(tagCounts.advanced || []),
  ].sort((a, b) => b.problemsSolved - a.problemsSolved);

  let skillsBadgesSvg = "";
  let curX = 30;
  let curY = 220;

  allTags.slice(0, 14).forEach((tag) => {
    const label = `${tag.tagName} ×${tag.problemsSolved}`;
    const badgeW = label.length * 7.5 + 24;
    if (curX + badgeW > 670) {
      curX = 30;
      curY += 32;
    }
    skillsBadgesSvg += `
      <g transform="translate(${curX}, ${curY})">
        <rect width="${badgeW}" height="24" rx="12" fill="#082314" stroke="#10572b" stroke-width="1.2"/>
        <text x="${badgeW / 2}" y="16" text-anchor="middle" font-size="11.5" font-weight="600" font-family="'Segoe UI', Ubuntu, sans-serif" fill="#00e676">${label}</text>
      </g>`;
    curX += badgeW + 10;
  });

  if (allTags.length === 0) {
    skillsBadgesSvg = `<text x="30" y="235" font-size="12" font-family="'Segoe UI', sans-serif" fill="${textSub}">No skills data</text>`;
    curY = 225;
  }

  // Languages Badges
  const languages = matchedUser.languageProblemCount || [];
  let langBadgesSvg = "";
  let langX = 30;
  const langY = curY + 50;

  languages.forEach((lang) => {
    const label = `${lang.languageName} ×${lang.problemsSolved}`;
    const badgeW = label.length * 7.5 + 24;
    langBadgesSvg += `
      <g transform="translate(${langX}, ${langY})">
        <rect width="${badgeW}" height="24" rx="12" fill="#082314" stroke="#10572b" stroke-width="1.2"/>
        <text x="${badgeW / 2}" y="16" text-anchor="middle" font-size="11.5" font-weight="600" font-family="'Segoe UI', Ubuntu, sans-serif" fill="#00e676">${label}</text>
      </g>`;
    langX += badgeW + 10;
  });

  if (languages.length === 0) {
    langBadgesSvg = `<text x="30" y="${langY + 18}" font-size="12" font-family="'Segoe UI', sans-serif" fill="${textSub}">No languages data</text>`;
  }

  // Submission Heatmap (52 Weeks Grid)
  const heatmapY = langY + 52;
  const subCalendarRaw = matchedUser.userCalendar?.submissionCalendar || "{}";
  let subMap = {};
  try {
    subMap = JSON.parse(subCalendarRaw);
  } catch (e) {}

  const today = new Date();
  const weeksCount = 50;
  const dayMs = 86400 * 1000;

  const dateCounts = {};
  Object.keys(subMap).forEach((ts) => {
    const d = new Date(parseInt(ts, 10) * 1000);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    dateCounts[key] = subMap[ts];
  });

  let heatmapRectsSvg = "";
  const cellStep = 12;
  const gridStartX = 30;
  const gridStartY = heatmapY + 28;

  for (let w = 0; w < weeksCount; w++) {
    for (let d = 0; d < 7; d++) {
      const daysAgo = (weeksCount - 1 - w) * 7 + (6 - d);
      const targetDate = new Date(today.getTime() - daysAgo * dayMs);
      const key = `${targetDate.getFullYear()}-${targetDate.getMonth() + 1}-${targetDate.getDate()}`;
      const count = dateCounts[key] || 0;

      let color = "#12191d";
      if (count >= 1 && count <= 2) color = "#0e4429";
      else if (count >= 3 && count <= 4) color = "#006d32";
      else if (count >= 5 && count <= 6) color = "#26a641";
      else if (count >= 7) color = "#39d353";

      const x = gridStartX + w * cellStep;
      const y = gridStartY + d * cellStep;
      heatmapRectsSvg += `<rect x="${x}" y="${y}" width="9.5" height="9.5" rx="2" fill="${color}"/>`;
    }
  }

  // Month Labels
  const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  let monthLabelsSvg = "";
  months.forEach((m, idx) => {
    const x = gridStartX + idx * 45;
    monthLabelsSvg += `<text x="${x}" y="${gridStartY - 8}" font-size="11" font-weight="500" font-family="'Segoe UI', sans-serif" fill="${textSub}">${m}</text>`;
  });

  const cardWidth = 700;
  const totalHeight = gridStartY + 7 * cellStep + 40;
  const rx = border_radius || "20";

  return `<svg
    width="${cardWidth}"
    height="${totalHeight}"
    viewBox="0 0 ${cardWidth} ${totalHeight}"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <style>
      .user-title { font: 700 18px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${textWhite}; }
      .user-rank { font: 600 12.5px 'Segoe UI', Ubuntu, Sans-Serif; fill: #00e676; }
      .sec-heading { font: 700 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${textWhite}; }
      
      .stat-big { font: 800 24px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${textWhite}; }
      .stat-label-sub { font: 600 11px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${textSub}; }
      
      .diff-text { font: 600 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${textWhite}; }
      .diff-val { font: 600 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: #00e676; }
    </style>

    <!-- Outer Glowing Card Border -->
    <rect
      x="1"
      y="1"
      rx="${rx}"
      width="${cardWidth - 2}"
      height="${totalHeight - 2}"
      fill="${cardBg}"
      stroke="${cardBorder}"
      stroke-width="1.8"
    />

    <!-- Header Section -->
    <g transform="translate(30, 30)">
      <!-- LeetCode Icon -->
      <g transform="translate(0, 0)">
        <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.17 5.79a1.374 1.374 0 0 0-.012 1.936l1.374 1.374a1.374 1.374 0 0 0 1.936-.012l5.352-5.352A1.374 1.374 0 0 0 14.88 1.8L13.5.438A1.374 1.374 0 0 0 13.483 0zm-8.6 7.422a1.374 1.374 0 0 0-.968.423l-3.48 3.48a1.374 1.374 0 0 0 0 1.943l1.374 1.374a1.374 1.374 0 0 0 1.943 0l3.48-3.48a1.374 1.374 0 0 0 0-1.943L5.858 7.845a1.374 1.374 0 0 0-.975-.423z" fill="#FFA116" transform="scale(1.3)"/>
      </g>
      
      <text x="32" y="14" class="user-title">${matchedUser.username}</text>
      <text x="32" y="32" class="user-rank">Rank ${formattedRanking}</text>

      <!-- Avatar Circle / Image -->
      <g transform="translate(210, -5)">
        <circle cx="20" cy="20" r="20" fill="#16221c" stroke="#00e676" stroke-width="1.5"/>
        ${
          avatarUrl
            ? `<image href="${avatarUrl}" x="2" y="2" width="36" height="36" clip-path="url(#avatar-clip)"/>
               <defs><clipPath id="avatar-clip"><circle cx="20" cy="20" r="18"/></clipPath></defs>`
            : `<text x="20" y="25" text-anchor="middle" font-size="16" font-weight="700" fill="#00e676">${matchedUser.username.substring(0, 2).toUpperCase()}</text>`
        }
      </g>

      <!-- Vertical Divider -->
      <line x1="260" y1="-10" x2="260" y2="120" stroke="#162e24" stroke-width="1.2"/>
    </g>

    <!-- Top Solved Gauge & Difficulty Bars -->
    <g transform="translate(30, 90)">
      <!-- Solved Ring -->
      <g transform="translate(45, 35)">
        <circle cx="0" cy="0" r="${radius}" stroke-width="6" fill="none" stroke="#10261b"/>
        <circle cx="0" cy="0" r="${radius}" stroke-width="6" fill="none" stroke="${neonGreen}" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" transform="rotate(-90)"/>
        <text x="0" y="-3" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="800" font-family="'Segoe UI', sans-serif" fill="${textWhite}">${totalSolved}</text>
        <text x="0" y="16" text-anchor="middle" font-size="9.5" font-weight="600" font-family="'Segoe UI', sans-serif" fill="${textSub}">Solved</text>
      </g>

      <!-- Difficulty Bars -->
      <g transform="translate(105, 5)">
        <!-- Easy -->
        <text x="0" y="12" class="diff-text">Easy</text>
        <circle cx="50" cy="8" r="3" fill="${neonTeal}"/>
        <rect x="60" y="6" width="70" height="4" rx="2" fill="#10261b"/>
        <rect x="60" y="6" width="${(easyPercent / 100) * 70}" height="4" rx="2" fill="${neonTeal}"/>
        <text x="140" y="12" class="diff-val">${easySolved}/${easyQuestions}</text>

        <!-- Medium -->
        <text x="0" y="36" class="diff-text">Medium</text>
        <circle cx="50" cy="32" r="3" fill="${neonYellow}"/>
        <rect x="60" y="30" width="70" height="4" rx="2" fill="#10261b"/>
        <rect x="60" y="30" width="${(mediumPercent / 100) * 70}" height="4" rx="2" fill="${neonYellow}"/>
        <text x="140" y="36" class="diff-val" fill="${neonYellow}">${mediumSolved}/${mediumQuestions}</text>

        <!-- Hard -->
        <text x="0" y="60" class="diff-text">Hard</text>
        <circle cx="50" cy="56" r="3" fill="${neonRed}"/>
        <rect x="60" y="54" width="70" height="4" rx="2" fill="#10261b"/>
        <rect x="60" y="54" width="${(hardPercent / 100) * 70}" height="4" rx="2" fill="${neonRed}"/>
        <text x="140" y="60" class="diff-val" fill="${neonRed}">${hardSolved}/${hardQuestions}</text>
      </g>
    </g>

    <!-- Top Right 3 Columns -->
    <!-- Column 1: Total Submissions -->
    <g transform="translate(350, 60)">
      <text x="40" y="45" text-anchor="middle" class="stat-big">${totalSubmissions}</text>
      <text x="40" y="65" text-anchor="middle" class="stat-label-sub">Total Submissions</text>
    </g>

    <!-- Column 2: Current Streak -->
    <g transform="translate(470, 60)">
      <circle cx="40" cy="30" r="22" fill="none" stroke="#00e676" stroke-width="2.5"/>
      <path d="M40 18c.8 2.5-.8 4.2-1.6 5-1.7.9-2.5 2.5-2.5 4.2 0 2.5 1.7 4.2 4.1 4.2s4.1-1.7 4.1-4.2c0-2.5-1.7-4.2-3.3-5.8 0 1.7-.8 2.5-.8 3.3z" fill="#38bdae"/>
      <text x="40" y="35" text-anchor="middle" font-size="16" font-weight="800" font-family="'Segoe UI', sans-serif" fill="${textWhite}">${streak}</text>
      <text x="40" y="65" text-anchor="middle" class="stat-label-sub">Current Streak</text>
    </g>

    <!-- Column 3: Highest Streak -->
    <g transform="translate(585, 60)">
      <text x="40" y="45" text-anchor="middle" class="stat-big">${highestStreak}</text>
      <text x="40" y="65" text-anchor="middle" class="stat-label-sub">Highest Streak</text>
    </g>

    <!-- Horizontal Section Divider 1 -->
    <line x1="30" y1="178" x2="670" y2="178" stroke="#122b1f" stroke-width="1.2"/>

    <!-- Skills Section -->
    <text x="30" y="202" class="sec-heading">Skills</text>
    ${skillsBadgesSvg}

    <!-- Horizontal Section Divider 2 -->
    <line x1="30" y1="${langY - 20}" x2="670" y2="${langY - 20}" stroke="#122b1f" stroke-width="1.2"/>

    <!-- Languages Section -->
    <text x="30" y="${langY + 2}" class="sec-heading">Languages</text>
    ${langBadgesSvg}

    <!-- Horizontal Section Divider 3 -->
    <line x1="30" y1="${heatmapY - 20}" x2="670" y2="${heatmapY - 20}" stroke="#122b1f" stroke-width="1.2"/>

    <!-- Submission Heatmap Section -->
    <text x="30" y="${heatmapY + 2}" class="sec-heading">Submission Heatmap</text>
    <g transform="translate(0, 5)">
      ${monthLabelsSvg}
      ${heatmapRectsSvg}

      <!-- Legend -->
      <g transform="translate(525, ${gridStartY + 7 * cellStep + 10})">
        <text x="0" y="9" font-size="10" font-family="'Segoe UI', sans-serif" fill="${textSub}">Less</text>
        <rect x="28" y="0" width="9" height="9" rx="2" fill="#12191d"/>
        <rect x="40" y="0" width="9" height="9" rx="2" fill="#0e4429"/>
        <rect x="52" y="0" width="9" height="9" rx="2" fill="#006d32"/>
        <rect x="64" y="0" width="9" height="9" rx="2" fill="#26a641"/>
        <rect x="76" y="0" width="9" height="9" rx="2" fill="#39d353"/>
        <text x="91" y="9" font-size="10" font-family="'Segoe UI', sans-serif" fill="${textSub}">More</text>
      </g>
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
    return res.status(500).send(`<svg xmlns="http://www.w3.org/2000/svg" width="700" height="100">
      <rect width="700" height="100" fill="#06090e" rx="20" stroke="#1b4332"/>
      <text x="350" y="55" fill="#ff375f" text-anchor="middle" font-size="14" font-family="sans-serif">Error: ${err.message || "Failed to fetch LeetCode data"}</text>
    </svg>`);
  }
}
