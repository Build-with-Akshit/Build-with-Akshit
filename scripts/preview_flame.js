const fs = require('fs');
const html = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { background: #0d1117; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
  .streak-flame {
    animation: pulse-glow 2s ease-in-out infinite alternate;
    transform-origin: center;
  }
  @keyframes pulse-glow {
    0% { filter: drop-shadow(0 0 2px rgba(30,136,229,0.4)); transform: translateY(0px) scale(1); }
    100% { filter: drop-shadow(0 0 12px rgba(30,136,229,0.9)); transform: translateY(-2px) scale(1.05); }
  }
</style>
</head>
<body>
  <svg width="200" height="200" viewBox="-20 -20 40 40">
    <g class="streak-flame">
      <!-- exact leetcode flame shape approximation -->
      <path d="M -2 -12 C -2 -8, 6 -6, 6 1 C 6 5, 3.5 8 0 8 C -3.5 8, -6 5, -6 1 C -6 -4, -4 -7, -2 -12 Z" fill="#1e88e5"/>
      <path d="M -1 -4 C 1 -2, 3 0, 3 3 C 3 5, 1.5 6 0 6 C -1.5 6, -3 5, -3 3 C -3 1, -2 -1, -1 -4 Z" fill="#0d1117"/>
    </g>
  </svg>
</body>
</html>
`;
fs.writeFileSync('scripts/preview_flame.html', html);
