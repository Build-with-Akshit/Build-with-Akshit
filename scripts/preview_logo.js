const fs = require('fs');

const html = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { background: #222; display: flex; gap: 50px; padding: 50px; }
  svg { width: 100px; height: 100px; outline: 1px solid red; }
</style>
</head>
<body>

  <!-- Version 1: Original (Broken) -->
  <svg viewBox="0 0 32 32">
    <g transform="scale(0.95)">
      <path d="M 17 3 L 5 15 L 17 27" fill="none" stroke="#FFFFFF" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 19 9 C 13 9, 11 14, 11 19 C 11 24, 13 29, 19 29" fill="none" stroke="#FFA116" stroke-width="4.2" stroke-linecap="round"/>
      <line x1="16" y1="19" x2="26" y2="19" stroke="#B3B3B3" stroke-width="4.2" stroke-linecap="round"/>
    </g>
  </svg>

  <!-- Version 2: Fixed Order and Coordinates -->
  <svg viewBox="0 0 32 32">
    <g transform="translate(1, 1) scale(0.95)">
      <!-- Orange curve UNDER white -->
      <path d="M 11 8 C 19 8, 22 10, 22 15 C 22 20, 19 22, 11 22" fill="none" stroke="#FFA116" stroke-width="4.2" stroke-linecap="round"/>
      <!-- Grey bar -->
      <line x1="13" y1="15" x2="23" y2="15" stroke="#B3B3B3" stroke-width="4.2" stroke-linecap="round"/>
      <!-- White bracket ON TOP -->
      <path d="M 17 3 L 5 15 L 17 27" fill="none" stroke="#FFFFFF" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>

  <!-- Version 3: Adjusting points to match exact shape -->
  <svg viewBox="0 0 32 32">
    <g transform="translate(1, 1) scale(0.95)">
      <!-- Orange curve -->
      <path d="M 12.5 7.5 C 21 8, 24 11, 24 15 C 24 19, 21 22, 12.5 22.5" fill="none" stroke="#FFA116" stroke-width="4.2" stroke-linecap="round"/>
      <!-- Grey bar -->
      <line x1="14" y1="15" x2="24" y2="15" stroke="#B3B3B3" stroke-width="4.2" stroke-linecap="round"/>
      <!-- White bracket ON TOP -->
      <path d="M 17 3 L 5 15 L 17 27" fill="none" stroke="#FFFFFF" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>

  <!-- Version 4: Replicating real logo exactly -->
  <svg viewBox="0 0 32 32">
    <g transform="translate(1, 1)">
      <!-- Orange -->
      <path d="M 13.5 8 C 22 8, 25 11, 25 16 C 25 21, 22 24, 13.5 24" fill="none" stroke="#FFA116" stroke-width="4.2" stroke-linecap="round"/>
      <!-- Grey -->
      <line x1="15" y1="16" x2="25" y2="16" stroke="#B3B3B3" stroke-width="4.2" stroke-linecap="round"/>
      <!-- White -->
      <path d="M 18 3 L 5 16 L 18 29" fill="none" stroke="#FFFFFF" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>

</body>
</html>
`;
fs.writeFileSync('scripts/preview_logo.html', html);
