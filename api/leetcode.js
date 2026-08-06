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
    theme = "cobalt2",
    custom_title,
    border_radius = "15",
    hide_border = "false",
  } = options;

  const currentTheme = themes[theme] || themes.cobalt2;

  const matchedUser = data?.data?.matchedUser;
  if (!matchedUser) {
    throw new CustomError("LeetCode user not found", "USER_NOT_FOUND");
  }

  const allQuestions = data.data.allQuestionsCount || [];
  const acSubmissions = matchedUser.submitStats?.acSubmissionNum || [];
  const totalSubmissionsList = matchedUser.submitStats?.totalSubmissionNum || [];

  const totalQuestions = allQuestions.find((q) => q.difficulty === "All")?.count || 4000;
  const easyQuestions = allQuestions.find((q) => q.difficulty === "Easy")?.count || 950;
  const mediumQuestions = allQuestions.find((q) => q.difficulty === "Medium")?.count || 2000;
  const hardQuestions = allQuestions.find((q) => q.difficulty === "Hard")?.count || 950;

  const totalSolved = acSubmissions.find((s) => s.difficulty === "All")?.count || 0;
  const easySolved = acSubmissions.find((s) => s.difficulty === "Easy")?.count || 0;
  const mediumSolved = acSubmissions.find((s) => s.difficulty === "Medium")?.count || 0;
  const hardSolved = acSubmissions.find((s) => s.difficulty === "Hard")?.count || 0;

  const totalSubmissions = totalSubmissionsList.find((s) => s.difficulty === "All")?.submissions || totalSolved;

  const streak = matchedUser.userCalendar?.streak || 0;
  const totalActiveDays = matchedUser.userCalendar?.totalActiveDays || 0;
  const ranking = matchedUser.profile?.ranking || "N/A";
  const formattedRanking = typeof ranking === "number" ? ranking.toLocaleString() : ranking;

  // Colors
  const bgColor = currentTheme.bg_color || "193549";
  const titleColor = currentTheme.title_color || "ffc600";
  const textColor = currentTheme.text_color || "0088ff";
  const borderColor = currentTheme.border_color || "e4e2e2";

  const easyColor = "#00b8a3";
  const mediumColor = "#ffc01e";
  const hardColor = "#ff375f";

  // Percentages for Progress Bars
  const totalPercent = Math.min(100, Math.round((totalSolved / totalQuestions) * 100 * 10) / 10);
  const easyPercent = Math.min(100, Math.round((easySolved / easyQuestions) * 100));
  const mediumPercent = Math.min(100, Math.round((mediumSolved / mediumQuestions) * 100));
  const hardPercent = Math.min(100, Math.round((hardSolved / hardQuestions) * 100));

  // Circle Math
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (totalPercent / 100) * circumference;

  // Build Skills (Tags) Badges
  const tagCounts = matchedUser.tagProblemCounts || {};
  const allTags = [
    ...(tagCounts.fundamental || []),
    ...(tagCounts.intermediate || []),
    ...(tagCounts.advanced || []),
  ].sort((a, b) => b.problemsSolved - a.problemsSolved);

  let skillsBadgesSvg = "";
  let currentX = 25;
  let currentY = 175;

  allTags.slice(0, 10).forEach((tag) => {
    const label = `${tag.tagName} ×${tag.problemsSolved}`;
    const badgeWidth = label.length * 7.5 + 18;
    if (currentX + badgeWidth > 525) {
      currentX = 25;
      currentY += 28;
    }
    skillsBadgesSvg += `
      <g transform="translate(${currentX}, ${currentY})">
        <rect width="${badgeWidth}" height="22" rx="11" fill="#${textColor}" fill-opacity="0.15" stroke="#${textColor}" stroke-opacity="0.3"/>
        <text x="${badgeWidth / 2}" y="15" text-anchor="middle" font-size="11" font-weight="600" font-family="'Segoe UI', Ubuntu, sans-serif" fill="#${textColor}">${label}</text>
      </g>`;
    currentX += badgeWidth + 8;
  });

  if (allTags.length === 0) {
    skillsBadgesSvg = `<text x="25" y="190" font-size="12" font-family="'Segoe UI', sans-serif" fill="#8b949e">No skill tags available</text>`;
    currentY = 180;
  }

  // Build Languages Badges
  const languages = matchedUser.languageProblemCount || [];
  let langBadgesSvg = "";
  let langX = 25;
  const langY = currentY + 45;

  languages.forEach((lang) => {
    const label = `${lang.languageName} ×${lang.problemsSolved}`;
    const badgeWidth = label.length * 7.5 + 18;
    langBadgesSvg += `
      <g transform="translate(${langX}, ${langY})">
        <rect width="${badgeWidth}" height="22" rx="11" fill="#00b8a3" fill-opacity="0.2" stroke="#00b8a3" stroke-opacity="0.5"/>
        <text x="${badgeWidth / 2}" y="15" text-anchor="middle" font-size="11" font-weight="600" font-family="'Segoe UI', Ubuntu, sans-serif" fill="#00b8a3">${label}</text>
      </g>`;
    langX += badgeWidth + 8;
  });

  if (languages.length === 0) {
    langBadgesSvg = `<text x="25" y="${langY + 15}" font-size="12" font-family="'Segoe UI', sans-serif" fill="#8b949e">No language data available</text>`;
  }

  // Heatmap Calculations
  const heatmapY = langY + 45;
  const subCalendarRaw = matchedUser.userCalendar?.submissionCalendar || "{}";
  let subMap = {};
  try {
    subMap = JSON.parse(subCalendarRaw);
  } catch (e) {}

  // Build 52 weeks x 7 days grid ending today
  const today = new Date();
  const weeksCount = 42;
  const dayMs = 86400 * 1000;

  // Map dates to level
  const dateCounts = {};
  Object.keys(subMap).forEach((ts) => {
    const d = new Date(parseInt(ts, 10) * 1000);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    dateCounts[key] = subMap[ts];
  });

  let heatmapRectsSvg = "";
  const cellStep = 10;
  const gridStartX = 25;
  const gridStartY = heatmapY + 20;

  for (let w = 0; w < weeksCount; w++) {
    for (let d = 0; d < 7; d++) {
      const daysAgo = (weeksCount - 1 - w) * 7 + (6 - d);
      const targetDate = new Date(today.getTime() - daysAgo * dayMs);
      const key = `${targetDate.getFullYear()}-${targetDate.getMonth() + 1}-${targetDate.getDate()}`;
      const count = dateCounts[key] || 0;

      let color = "#161b22";
      if (count >= 1 && count <= 2) color = "#0e4429";
      else if (count >= 3 && count <= 4) color = "#006d32";
      else if (count >= 5 && count <= 6) color = "#26a641";
      else if (count >= 7) color = "#39d353";

      const x = gridStartX + w * cellStep;
      const y = gridStartY + d * cellStep;
      heatmapRectsSvg += `<rect x="${x}" y="${y}" width="8" height="8" rx="2" fill="${color}"/>`;
    }
  }

  const cardWidth = 550;
  const totalHeight = gridStartY + 7 * cellStep + 35;
  const showBorder = hide_border !== "true";
  const rx = border_radius || "15";

  return `<svg
    width="${cardWidth}"
    height="${totalHeight}"
    viewBox="0 0 ${cardWidth} ${totalHeight}"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <style>
      .header-name {
        font: 700 16px 'Segoe UI', Ubuntu, Sans-Serif;
        fill: #${titleColor};
      }
      .header-rank {
        font: 500 12px 'Segoe UI', Ubuntu, Sans-Serif;
        fill: #2ea043;
      }
      .sec-title {
        font: 700 13px 'Segoe UI', Ubuntu, Sans-Serif;
        fill: #${titleColor};
      }
      .stat-num {
        font: 800 22px 'Segoe UI', Ubuntu, Sans-Serif;
        fill: #${titleColor};
      }
      .stat-desc {
        font: 600 11px 'Segoe UI', Ubuntu, Sans-Serif;
        fill: #${textColor};
      }
      .bar-label {
        font: 600 11px 'Segoe UI', Ubuntu, Sans-Serif;
        fill: #${textColor};
      }
      .bar-val {
        font: 700 11px 'Segoe UI', Ubuntu, Sans-Serif;
        fill: #${textColor};
      }
      .legend-text {
        font: 400 10px 'Segoe UI', Ubuntu, Sans-Serif;
        fill: #8b949e;
      }
    </style>

    <!-- Card Background -->
    <rect
      x="0.5"
      y="0.5"
      rx="${rx}"
      width="${cardWidth - 1}"
      height="${totalHeight - 1}"
      fill="#${bgColor}"
      stroke="${showBorder ? `#${borderColor}` : "none"}"
      stroke-opacity="1"
    />

    <!-- Header Section -->
    <g transform="translate(25, 25)">
      <!-- LeetCode Logo Icon -->
      <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.17 5.79a1.374 1.374 0 0 0-.012 1.936l1.374 1.374a1.374 1.374 0 0 0 1.936-.012l5.352-5.352A1.374 1.374 0 0 0 14.88 1.8L13.5.438A1.374 1.374 0 0 0 13.483 0zm-8.6 7.422a1.374 1.374 0 0 0-.968.423l-3.48 3.48a1.374 1.374 0 0 0 0 1.943l1.374 1.374a1.374 1.374 0 0 0 1.943 0l3.48-3.48a1.374 1.374 0 0 0 0-1.943L5.858 7.845a1.374 1.374 0 0 0-.975-.423z" fill="#FFA116" transform="scale(1.2)"/>
      <text x="25" y="12" class="header-name">${matchedUser.username}</text>
      <text x="25" y="28" class="header-rank">Rank ${formattedRanking}</text>

      <!-- Vertical Divider line -->
      <line x1="165" y1="0" x2="165" y2="85" stroke="#${textColor}" stroke-opacity="0.2"/>
    </g>

    <!-- Top Stats Row -->
    <!-- Solved Ring & Bars -->
    <g transform="translate(200, 25)">
      <!-- Ring -->
      <g transform="translate(35, 42)">
        <circle cx="0" cy="0" r="${radius}" stroke-width="6" fill="none" stroke="#${textColor}" stroke-opacity="0.15"/>
        <circle cx="0" cy="0" r="${radius}" stroke-width="6" fill="none" stroke="#${titleColor}" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" transform="rotate(-90)"/>
        <text x="0" y="-2" text-anchor="middle" dominant-baseline="central" font-size="18" font-weight="800" font-family="'Segoe UI', sans-serif" fill="#${titleColor}">${totalSolved}</text>
        <text x="0" y="16" text-anchor="middle" font-size="9" font-weight="600" font-family="'Segoe UI', sans-serif" fill="#${textColor}">Solved</text>
      </g>

      <!-- Mini Bars -->
      <g transform="translate(85, 10)">
        <!-- Easy -->
        <text x="0" y="10" class="bar-label">Easy</text>
        <text x="95" y="10" text-anchor="end" class="bar-val">${easySolved}/${easyQuestions}</text>
        <rect x="0" y="15" width="95" height="4" rx="2" fill="#${textColor}" fill-opacity="0.15"/>
        <rect x="0" y="15" width="${(easyPercent / 100) * 95}" height="4" rx="2" fill="${easyColor}"/>

        <!-- Medium -->
        <text x="0" y="34" class="bar-label">Medium</text>
        <text x="95" y="34" text-anchor="end" class="bar-val">${mediumSolved}/${mediumQuestions}</text>
        <rect x="0" y="39" width="95" height="4" rx="2" fill="#${textColor}" fill-opacity="0.15"/>
        <rect x="0" y="39" width="${(mediumPercent / 100) * 95}" height="4" rx="2" fill="${mediumColor}"/>

        <!-- Hard -->
        <text x="0" y="58" class="bar-label">Hard</text>
        <text x="95" y="58" text-anchor="end" class="bar-val">${hardSolved}/${hardQuestions}</text>
        <rect x="0" y="63" width="95" height="4" rx="2" fill="#${textColor}" fill-opacity="0.15"/>
        <rect x="0" y="63" width="${(hardPercent / 100) * 95}" height="4" rx="2" fill="${hardColor}"/>
      </g>
    </g>

    <!-- Submissions Column -->
    <g transform="translate(395, 45)">
      <text x="25" y="20" text-anchor="middle" class="stat-num">${totalSubmissions}</text>
      <text x="25" y="38" text-anchor="middle" class="stat-desc">Total Submissions</text>
    </g>

    <!-- Streak Column -->
    <g transform="translate(475, 45)">
      <!-- Flame Circle -->
      <circle cx="25" cy="12" r="18" fill="none" stroke="#38bdae" stroke-width="3"/>
      <path d="M25 0c1 3-1 5-2 6-2 1-3 3-3 5 0 3 2 5 5 5s5-2 5-5c0-3-2-5-4-7 0 2-1 3-1 4z" fill="#38bdae" transform="translate(0, -6)"/>
      <text x="25" y="16" text-anchor="middle" font-size="14" font-weight="800" font-family="'Segoe UI', sans-serif" fill="#${titleColor}">${streak}</text>
      <text x="25" y="42" text-anchor="middle" class="stat-desc">Current Streak</text>
    </g>

    <!-- Section Divider Line -->
    <line x1="25" y1="125" x2="525" y2="125" stroke="#${textColor}" stroke-opacity="0.2"/>

    <!-- Skills Section -->
    <text x="25" y="150" class="sec-title">Skills</text>
    ${skillsBadgesSvg}

    <!-- Languages Section -->
    <text x="25" y="${langY + 22}" class="sec-title">Languages</text>
    ${langBadgesSvg}

    <!-- Section Divider Line -->
    <line x1="25" y1="${heatmapY - 5}" x2="525" y2="${heatmapY - 5}" stroke="#${textColor}" stroke-opacity="0.2"/>

    <!-- Heatmap Section -->
    <text x="25" y="${heatmapY + 12}" class="sec-title">Submission Heatmap</text>
    <g>
      ${heatmapRectsSvg}

      <!-- Legend -->
      <g transform="translate(385, ${gridStartY + 7 * cellStep + 8})">
        <text x="0" y="8" class="legend-text">Less</text>
        <rect x="25" y="0" width="8" height="8" rx="2" fill="#161b22"/>
        <rect x="36" y="0" width="8" height="8" rx="2" fill="#0e4429"/>
        <rect x="47" y="0" width="8" height="8" rx="2" fill="#006d32"/>
        <rect x="58" y="0" width="8" height="8" rx="2" fill="#26a641"/>
        <rect x="69" y="0" width="8" height="8" rx="2" fill="#39d353"/>
        <text x="83" y="8" class="legend-text">More</text>
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
    return res.status(500).send(`<svg xmlns="http://www.w3.org/2000/svg" width="550" height="100">
      <rect width="550" height="100" fill="#193549" rx="15" stroke="#e4e2e2"/>
      <text x="275" y="55" fill="#ff375f" text-anchor="middle" font-size="14" font-family="sans-serif">Error: ${err.message || "Failed to fetch LeetCode data"}</text>
    </svg>`);
  }
}
