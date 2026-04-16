// @ts-check

import { retryer } from "../src/common/retryer.js";
import { CustomError } from "../src/common/error.js";
import { request } from "../src/common/http.js";

// GitHub Dark Theme Contribution Colors
const COLOR_MAP = {
  0: "#161b22", // NONE
  1: "#0e4429", // LOW
  2: "#006d32", // MEDIUM
  3: "#26a641", // HIGH
  4: "#39d353", // HIGHEST
};

const SNAKE_COLOR_BODY = "#58a6ff";
const SNAKE_COLOR_HEAD = "#ffc600";

const fetcher = (variables, token) => {
  const query = `
    query userInfo($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;
  return request(
    { query, variables },
    { Authorization: `token ${token}` }
  );
};

function getContributionLevel(count) {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

/**
 * Generate animated SVG contribution grid snake in GitHub Dark theme.
 */
function generateSnakeSVG(weeks, totalContributions) {
  const cellWidth = 10;
  const cellHeight = 10;
  const cellGap = 3;
  const step = cellWidth + cellGap;

  const width = weeks.length * step + 40;
  const height = 7 * step + 60;

  // Build grid rects and locate active cells for snake path
  let rectsSvg = "";
  const activeCells = [];

  weeks.forEach((week, wIndex) => {
    const x = 20 + wIndex * step;
    week.contributionDays.forEach((day, dIndex) => {
      const y = 30 + dIndex * step;
      const level = getContributionLevel(day.contributionCount);
      const color = COLOR_MAP[level];
      rectsSvg += `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" rx="2" fill="${color}"/>`;

      if (day.contributionCount > 0) {
        activeCells.push({ x: x + 5, y: y + 5, wIndex, dIndex, count: day.contributionCount });
      }
    });
  });

  // Create snake path across active contribution cells
  const snakePoints = [];
  if (activeCells.length > 0) {
    const stepSize = Math.max(1, Math.floor(activeCells.length / 28));
    for (let i = 0; i < activeCells.length; i += stepSize) {
      snakePoints.push(`${activeCells[i].x},${activeCells[i].y}`);
    }
  } else {
    for (let w = 0; w < weeks.length; w += 4) {
      snakePoints.push(`${20 + w * step + 5},${30 + 3 * step + 5}`);
    }
  }

  const pathD = snakePoints.length > 1 ? `M ${snakePoints.join(" L ")}` : `M 25,65 L ${width - 25},65`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <style>
    .bg { fill: #0d1117; rx: 12px; }
    .title { font: 600 13px 'Segoe UI', Ubuntu, sans-serif; fill: #c9d1d9; }
    .sub { font: 400 11px 'Segoe UI', Ubuntu, sans-serif; fill: #8b949e; }
    
    .snake-body {
      stroke: ${SNAKE_COLOR_BODY};
      stroke-width: 6;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 18 350;
      animation: moveBody 10s linear infinite;
    }

    .snake-head {
      fill: ${SNAKE_COLOR_HEAD};
      animation: moveHead 10s linear infinite;
    }

    @keyframes moveBody {
      0% { stroke-dashoffset: 360; }
      100% { stroke-dashoffset: 0; }
    }
  </style>

  <rect width="${width}" height="${height}" class="bg"/>

  <!-- Header -->
  <text x="20" y="20" class="title">🐍 Contribution Snake</text>
  <text x="${width - 20}" y="20" class="sub" text-anchor="end">${totalContributions} contributions in the last year</text>

  <!-- Grid -->
  <g transform="translate(0, 5)">
    ${rectsSvg}
    <path d="${pathD}" class="snake-body"/>
  </g>
</svg>`;
}

export default async function handler(req, res) {
  const { username = "Build-with-Akshit" } = req.query;
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=3600");

  try {
    const response = await retryer(fetcher, { login: username });

    if (response.data && response.data.data && response.data.data.user) {
      const cal = response.data.data.user.contributionsCollection.contributionCalendar;
      const svg = generateSnakeSVG(cal.weeks, cal.totalContributions);
      return res.status(200).send(svg);
    }

    throw new CustomError("User contribution data not found", "NOT_FOUND");
  } catch (err) {
    return res.status(500).send(`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="60">
      <rect width="500" height="60" fill="#0d1117" rx="8"/>
      <text x="250" y="35" fill="#f78166" text-anchor="middle" font-size="13" font-family="sans-serif">Error: ${err.message}</text>
    </svg>`);
  }
}
