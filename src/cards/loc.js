// @ts-check

import { Card } from "../common/Card.js";
import { getCardColors } from "../common/color.js";
import { flexLayout, measureText } from "../common/render.js";

function fmt(n) {
  return n.toLocaleString("en-US");
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Render LOC Stats Card.
 *
 * @param {object} stats LOC Stats object.
 * @param {number} stats.totalLoc Total lines of code.
 * @param {number} stats.repoCount Total non-fork repos.
 * @param {Array<{ name: string, color: string, loc: number, bytes: number }>} stats.languages Language array.
 * @param {object} options Options object.
 */
const renderLOCCard = (stats, options = {}) => {
  const {
    custom_title,
    hide_border = false,
    hide_title = false,
    card_width = 495,
    border_radius = 15,
    title_color,
    text_color,
    icon_color,
    bg_color,
    border_color,
    theme = "cobalt2",
    disable_animations = false,
    show_icons = true,
  } = options;

  const { totalLoc, repoCount, languages } = stats;
  const width = typeof card_width === "number" && !isNaN(card_width) ? card_width : 495;
  const borderRadius = typeof border_radius === "number" && !isNaN(border_radius) ? border_radius : 15;

  const colors = getCardColors({
    title_color,
    text_color,
    icon_color,
    bg_color,
    border_color,
    theme,
  });

  const card = new Card({
    customTitle: custom_title || "Lifetime Coding Stats",
    defaultTitle: "Lifetime Coding Stats",
    width,
    height: 220,
    border_radius: borderRadius,
    colors,
  });

  if (hide_border) card.setHideBorder(true);
  if (hide_title) card.setHideTitle(true);
  if (disable_animations) card.disableAnimations();

  const codeIcon = `
    <svg x="0" y="0" width="16" height="16" viewBox="0 0 24 24" fill="${colors.iconColor}">
      <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
    </svg>
  `;

  const repoIcon = `
    <svg x="0" y="0" width="16" height="16" viewBox="0 0 16 16" fill="${colors.iconColor}">
      <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1h-8a1 1 0 00-1 1v6.708A2.486 2.486 0 014.5 9h8V1.5zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
    </svg>
  `;

  // Top 6 languages
  const topLangs = languages.slice(0, 6);
  const totalForTop = topLangs.reduce((s, v) => s + v.loc, 0) || 1;

  const barWidth = width - 50;
  const barY = 85;
  let barSegments = "";
  let bx = 0;

  topLangs.forEach((lang, i) => {
    const pct = lang.loc / totalForTop;
    const segW = Math.max(pct * barWidth, 3);
    barSegments += `<rect x="${25 + bx}" y="${barY}" width="${segW}" height="10" fill="${lang.color || "#858585"}" ${i === 0 ? 'rx="5"' : i === topLangs.length - 1 ? 'rx="5"' : ""}/>`;
    bx += segW;
  });

  let legend = "";
  const cols = 2;
  topLangs.forEach((lang, i) => {
    const pct = ((lang.loc / totalForTop) * 100).toFixed(1);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 25 + col * Math.floor(barWidth / 2);
    const y = 112 + row * 22;
    legend += `
      <g transform="translate(${x}, ${y})">
        <circle cx="0" cy="0" r="5" fill="${lang.color || "#858585"}"/>
        <text x="14" y="4" class="stat-lbl" font-size="11.5">
          ${escapeXml(lang.name)} <tspan class="stat-sub">${pct}%</tspan>
        </text>
      </g>`;
  });

  const legendRows = Math.ceil(topLangs.length / cols);
  card.height = 135 + legendRows * 22 + 15;

  const css = `
    .stat-lbl { font: 400 13px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${colors.textColor}; }
    .stat-val { font: 700 13px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${colors.textColor}; }
    .stat-sub { fill: ${colors.textColor}; opacity: 0.7; }
    .section  { font: 400 11px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${colors.textColor}; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px; }

    .stagger { animation: fadeInAnimation 0.8s ease-in-out forwards; }
    .bar-grow { transform-origin: 25px ${barY}px; animation: scaleInAnimation 0.8s ease-in-out forwards; }
  `;

  card.setCSS(css);

  const iconX = show_icons ? 25 : 25;
  const labelX = show_icons ? 48 : 25;

  const body = `
    <!-- Stats Row 1: Total LOC -->
    <g class="stagger" transform="translate(0, 0)">
      ${show_icons ? `<g transform="translate(25, 0)">${codeIcon}</g>` : ""}
      <text x="${labelX}" y="12" class="stat-lbl">Total Lines of Code</text>
      <text x="${width - 25}" y="12" class="stat-val" text-anchor="end">${fmt(totalLoc)}</text>
    </g>

    <!-- Stats Row 2: Total Repos -->
    <g class="stagger" transform="translate(0, 25)">
      ${show_icons ? `<g transform="translate(25, 0)">${repoIcon}</g>` : ""}
      <text x="${labelX}" y="12" class="stat-lbl">Total Repositories</text>
      <text x="${width - 25}" y="12" class="stat-val" text-anchor="end">${repoCount}</text>
    </g>

    <!-- Section Label -->
    <g class="stagger" transform="translate(25, 72)">
      <text x="0" y="0" class="section">Language Breakdown</text>
    </g>

    <!-- Progress Bar -->
    <g class="bar-grow">
      <rect x="25" y="${barY}" width="${barWidth}" height="10" rx="5" fill="${colors.bgColor}" stroke="${colors.borderColor}" stroke-width="0.3" stroke-opacity="0.4"/>
      ${barSegments}
    </g>

    <!-- Language Legend -->
    <g class="stagger">
      ${legend}
    </g>
  `;

  return card.render(body);
};

export { renderLOCCard };
export default renderLOCCard;
