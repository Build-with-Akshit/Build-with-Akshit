// @ts-check

import axios from "axios";
import { themes } from "../themes/index.js";
import { CustomError } from "../src/common/error.js";

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

const LEETCODE_QUERY = `
  query userProblemsSolved($username: String!) {
    allQuestionsCount {
      difficulty
      count
    }
    matchedUser(username: $username) {
      username
      submitStats {
        acSubmissionNum {
          difficulty
          count
          submissions
        }
      }
      profile {
        ranking
        reputation
        starRating
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

  const totalQuestions = allQuestions.find((q) => q.difficulty === "All")?.count || 4000;
  const easyQuestions = allQuestions.find((q) => q.difficulty === "Easy")?.count || 900;
  const mediumQuestions = allQuestions.find((q) => q.difficulty === "Medium")?.count || 2000;
  const hardQuestions = allQuestions.find((q) => q.difficulty === "Hard")?.count || 900;

  const totalSolved = acSubmissions.find((s) => s.difficulty === "All")?.count || 0;
  const easySolved = acSubmissions.find((s) => s.difficulty === "Easy")?.count || 0;
  const mediumSolved = acSubmissions.find((s) => s.difficulty === "Medium")?.count || 0;
  const hardSolved = acSubmissions.find((s) => s.difficulty === "Hard")?.count || 0;

  const ranking = matchedUser.profile?.ranking || "N/A";
  const formattedRanking = typeof ranking === "number" ? ranking.toLocaleString() : ranking;

  const title = custom_title || `${matchedUser.username}'s LeetCode Stats`;

  // Colors
  const bgColor = currentTheme.bg_color || "193549";
  const titleColor = currentTheme.title_color || "ffc600";
  const textColor = currentTheme.text_color || "0088ff";
  const borderColor = currentTheme.border_color || "e4e2e2";

  const easyColor = "#00b8a3";
  const mediumColor = "#ffc01e";
  const hardColor = "#ff375f";

  // Percentages & Math for Progress Bars
  const totalPercent = Math.min(100, Math.round((totalSolved / totalQuestions) * 100 * 10) / 10);
  const easyPercent = Math.min(100, Math.round((easySolved / easyQuestions) * 100));
  const mediumPercent = Math.min(100, Math.round((mediumSolved / mediumQuestions) * 100));
  const hardPercent = Math.min(100, Math.round((hardSolved / hardQuestions) * 100));

  // Circle Math
  const radius = 40;
  const circumference = 2 * Math.PI * radius; // ~251.32
  const strokeDashoffset = circumference - (totalPercent / 100) * circumference;

  const width = 466;
  const height = 200;
  const showBorder = hide_border !== "true";
  const rx = border_radius || "15";

  return `<svg
    width="${width}"
    height="${height}"
    viewBox="0 0 ${width} ${height}"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <style>
      .header {
        font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif;
        fill: #${titleColor};
        animation: fadeIn 0.8s ease-in-out forwards;
      }
      .stat-label {
        font: 600 13px 'Segoe UI', Ubuntu, Sans-Serif;
        fill: #${textColor};
      }
      .stat-val {
        font: 700 13px 'Segoe UI', Ubuntu, Sans-Serif;
        fill: #${textColor};
      }
      .rank-badge-bg {
        fill: #${textColor};
        fill-opacity: 0.15;
      }
      .rank-badge-text {
        font: 600 12px 'Segoe UI', Ubuntu, Sans-Serif;
        fill: #${textColor};
      }
      .circle-bg {
        stroke: #${textColor};
        stroke-opacity: 0.15;
      }
      .circle-progress {
        stroke: #${titleColor};
        stroke-dasharray: ${circumference};
        stroke-dashoffset: ${strokeDashoffset};
        transition: stroke-dashoffset 1s ease-in-out;
      }
      .circle-text-num {
        font: 800 24px 'Segoe UI', Ubuntu, Sans-Serif;
        fill: #${titleColor};
      }
      .circle-text-sub {
        font: 600 11px 'Segoe UI', Ubuntu, Sans-Serif;
        fill: #${textColor};
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    </style>

    <rect
      x="0.5"
      y="0.5"
      rx="${rx}"
      width="${width - 1}"
      height="${height - 1}"
      fill="#${bgColor}"
      stroke="${showBorder ? `#${borderColor}` : "none"}"
      stroke-opacity="1"
    />

    <!-- Title & Rank Badge -->
    <g transform="translate(25, 35)">
      <!-- LeetCode Logo Icon -->
      <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.17 5.79a1.374 1.374 0 0 0-.012 1.936l1.374 1.374a1.374 1.374 0 0 0 1.936-.012l5.352-5.352A1.374 1.374 0 0 0 14.88 1.8L13.5.438A1.374 1.374 0 0 0 13.483 0zm-8.6 7.422a1.374 1.374 0 0 0-.968.423l-3.48 3.48a1.374 1.374 0 0 0 0 1.943l1.374 1.374a1.374 1.374 0 0 0 1.943 0l3.48-3.48a1.374 1.374 0 0 0 0-1.943L5.858 7.845a1.374 1.374 0 0 0-.975-.423z" fill="#FFA116" transform="translate(0, -14) scale(1.1)"/>
      <text x="25" y="0" class="header">${title}</text>

      <g transform="translate(260, -16)">
        <rect width="155" height="24" rx="12" class="rank-badge-bg"/>
        <text x="77.5" y="16" text-anchor="middle" class="rank-badge-text">Rank: ${formattedRanking}</text>
      </g>
    </g>

    <!-- Main Content -->
    <g transform="translate(25, 60)">
      <!-- Left Circle Gauge -->
      <g transform="translate(55, 65)">
        <circle cx="0" cy="0" r="${radius}" stroke-width="8" fill="none" class="circle-bg"/>
        <circle cx="0" cy="0" r="${radius}" stroke-width="8" fill="none" class="circle-progress" stroke-linecap="round" transform="rotate(-90)"/>
        <text x="0" y="-2" text-anchor="middle" dominant-baseline="central" class="circle-text-num">${totalSolved}</text>
        <text x="0" y="20" text-anchor="middle" class="circle-text-sub">Solved (${totalPercent}%)</text>
      </g>

      <!-- Right Progress Bars -->
      <g transform="translate(135, 15)">
        <!-- Easy -->
        <g transform="translate(0, 0)">
          <text x="0" y="12" class="stat-label">Easy</text>
          <text x="270" y="12" text-anchor="end" class="stat-val">${easySolved}/${easyQuestions}</text>
          <rect x="0" y="20" width="270" height="8" rx="4" fill="#${textColor}" fill-opacity="0.15"/>
          <rect x="0" y="20" width="${(easyPercent / 100) * 270}" height="8" rx="4" fill="${easyColor}"/>
        </g>

        <!-- Medium -->
        <g transform="translate(0, 38)">
          <text x="0" y="12" class="stat-label">Medium</text>
          <text x="270" y="12" text-anchor="end" class="stat-val">${mediumSolved}/${mediumQuestions}</text>
          <rect x="0" y="20" width="270" height="8" rx="4" fill="#${textColor}" fill-opacity="0.15"/>
          <rect x="0" y="20" width="${(mediumPercent / 100) * 270}" height="8" rx="4" fill="${mediumColor}"/>
        </g>

        <!-- Hard -->
        <g transform="translate(0, 76)">
          <text x="0" y="12" class="stat-label">Hard</text>
          <text x="270" y="12" text-anchor="end" class="stat-val">${hardSolved}/${hardQuestions}</text>
          <rect x="0" y="20" width="270" height="8" rx="4" fill="#${textColor}" fill-opacity="0.15"/>
          <rect x="0" y="20" width="${(hardPercent / 100) * 270}" height="8" rx="4" fill="${hardColor}"/>
        </g>
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
    return res.status(500).send(`<svg xmlns="http://www.w3.org/2000/svg" width="466" height="100">
      <rect width="466" height="100" fill="#193549" rx="15" stroke="#e4e2e2"/>
      <text x="233" y="55" fill="#ff375f" text-anchor="middle" font-size="14" font-family="sans-serif">Error: ${err.message || "Failed to fetch LeetCode data"}</text>
    </svg>`);
  }
}
