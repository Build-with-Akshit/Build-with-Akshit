const fs = require('fs');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="-100 -100 200 200" fill="none">
  <defs>
    <!-- Pulsing Green Glow for the Ring -->
    <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur result="blur">
        <animate attributeName="stdDeviation" values="2; 6; 2" dur="2s" repeatCount="indefinite" />
      </feGaussianBlur>
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Pulsing Blue Glow for the Flame -->
    <filter id="flame-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur result="blur">
        <animate attributeName="stdDeviation" values="1.5; 4.5; 1.5" dur="2s" repeatCount="indefinite" />
      </feGaussianBlur>
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <rect x="-100" y="-100" width="200" height="200" fill="#0d1117"/>

  <!-- Streak Ring with Top Gap -->
  <g filter="url(#neon-glow)">
    <path d="M -12 -33 A 35 35 0 1 0 12 -33" fill="none" stroke="#2ea043" stroke-width="4.5" stroke-linecap="round"/>
  </g>
  <path d="M -12 -33 A 35 35 0 1 0 12 -33" fill="none" stroke="#2ea043" stroke-width="4.5" stroke-linecap="round"/>

  <!-- Animated Flame Icon at Top Gap -->
  <g transform="translate(0, -35)">
    <!-- Elevation Float Animation -->
    <animateTransform attributeName="transform" type="translate" values="0,0; 0,-3; 0,0" dur="2s" repeatCount="indefinite" additive="sum"/>
    <animateTransform attributeName="transform" type="scale" values="1; 1.05; 1" dur="2s" repeatCount="indefinite" additive="sum"/>
    
    <circle cx="0" cy="0" r="10" fill="#0d1117"/>
    
    <g filter="url(#flame-glow)">
      <!-- Outer Electric Blue Flame (hooks left) -->
      <path d="M -2 -11 C -2 -7, 6 -6, 6 1 C 6 5, 3.5 8, 0 8 C -3.5 8, -6 5, -6 1 C -6 -4, -4 -7, -2 -11 Z" fill="#1e88e5"/>
    </g>
    <!-- Base flame over the glow -->
    <path d="M -2 -11 C -2 -7, 6 -6, 6 1 C 6 5, 3.5 8, 0 8 C -3.5 8, -6 5, -6 1 C -6 -4, -4 -7, -2 -11 Z" fill="#1e88e5"/>
    
    <!-- Inner Dark Teardrop -->
    <path d="M -1 -4 C 1 -2, 3 0, 3 3 C 3 5, 1.5 6, 0 6 C -1.5 6, -3 5, -3 3 C -3 1, -2 -1, -1 -4 Z" fill="#0d1117"/>
  </g>

  <!-- Number inside -->
  <text x="0" y="10" text-anchor="middle" font-size="28" font-weight="800" font-family="sans-serif" fill="#ffffff">16</text>
  <text x="0" y="60" text-anchor="middle" font-size="14" font-weight="700" font-family="sans-serif" fill="#ffffff">Current Streak</text>
</svg>
`;

fs.writeFileSync('scripts/preview_flame.html', svg);
