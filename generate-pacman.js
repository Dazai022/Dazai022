// generate-pacman.js
// Fetches real contribution data and renders a self-contained animated SVG
// (pure CSS/SMIL — no JS needed at render time, since GitHub only renders
// static SVG/image content in READMEs).

const fs = require("fs");

const USERNAME = process.env.GH_USERNAME || "Dazai022";
const COLS = 26;
const ROWS = 7;
const CELLS = COLS * ROWS;
const LOOP_SECONDS = 22;
const STEP = LOOP_SECONDS / CELLS;

const GRID_X = 40, GRID_Y = 70, GRID_W = 600, GRID_H = 140;
const GAP = 4;
const CELL_W = (GRID_W - (COLS - 1) * GAP) / COLS;
const CELL_H = (GRID_H - (ROWS - 1) * GAP) / ROWS;

async function fetchContributions() {
  const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${USERNAME}`);
  if (!res.ok) throw new Error("Failed to fetch contributions: " + res.status);
  const data = await res.json();
  return data.contributions.slice(-CELLS); // most recent N days, chronological
}

function serpentineCoords(i) {
  const row = Math.floor(i / COLS);
  const colInRow = i % COLS;
  const col = row % 2 === 0 ? colInRow : (COLS - 1 - colInRow);
  const cx = GRID_X + col * (CELL_W + GAP) + CELL_W / 2;
  const cy = GRID_Y + row * (CELL_H + GAP) + CELL_H / 2;
  return { cx, cy };
}

function buildTrackPath(n) {
  let d = "";
  for (let i = 0; i < n; i++) {
    const { cx, cy } = serpentineCoords(i);
    d += (i === 0 ? `M ${cx} ${cy}` : ` L ${cx} ${cy}`);
  }
  return d;
}

async function main() {
  let days;
  try {
    days = await fetchContributions();
  } catch (e) {
    console.error("Could not fetch real data, falling back to empty grid:", e.message);
    days = Array.from({ length: CELLS }, () => ({ count: 0 }));
  }
  while (days.length < CELLS) days.unshift({ count: 0 });

  const total = days.reduce((s, d) => s + (d.count || 0), 0);
  const track = buildTrackPath(CELLS);

  const fruitColors = ["#E24B4A", "#F2C230", "#3FA34D", "#E27A3F"];
  let dots = "";
  days.forEach((day, i) => {
    const { cx, cy } = serpentineCoords(i);
    const active = (day.count || 0) > 0;
    const t = (i * STEP).toFixed(3);
    if (active) {
      const color = fruitColors[i % fruitColors.length];
      dots += `
  <g>
    <animate attributeName="opacity" values="1;0" keyTimes="0;0.06"
      begin="${t}s" dur="${LOOP_SECONDS}s" repeatCount="indefinite" fill="freeze"/>
    <line x1="${cx.toFixed(1)}" y1="${(cy - 3.6).toFixed(1)}" x2="${(cx + 1.4).toFixed(1)}" y2="${(cy - 5.2).toFixed(1)}" stroke="#3FA34D" stroke-width="1"/>
    <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.2" fill="${color}"/>
  </g>`;
    } else {
      dots += `
  <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2" fill="#3a3f4b"/>`;
    }
  });

  const svg = `<svg width="900" height="230" viewBox="0 0 900 230" xmlns="http://www.w3.org/2000/svg">
  <rect width="900" height="230" fill="#0d1117" rx="10"/>
  <text x="30" y="34" font-family="monospace" font-size="14" fill="#8b949e">ACTIVITY</text>
  <text x="850" y="34" font-family="monospace" font-size="14" fill="#F2C230" text-anchor="end">SCORE ${total}</text>
  <path id="track" d="${track}" fill="none" stroke="none"/>
${dots}
  <g>
    <circle cx="0" cy="0" r="8" fill="#F2C230"/>
    <path d="M 0,0 L 8,0 L 8,0 Z" fill="#0d1117">
      <animate attributeName="d"
        values="M 0,0 L 8,-1 L 8,1 Z;M 0,0 L 8,-6 L 8,6 Z;M 0,0 L 8,-1 L 8,1 Z"
        dur="0.3s" repeatCount="indefinite"/>
    </path>
    <animateMotion dur="${LOOP_SECONDS}s" repeatCount="indefinite" rotate="auto">
      <mpath href="#track"/>
    </animateMotion>
  </g>
  <g opacity="0.9">
    <path d="M -7,8 Q -7,-8 0,-8 Q 7,-8 7,8 L 4,4 L 0,8 L -4,4 Z" fill="#E24B4A"/>
    <circle cx="-2.6" cy="-2" r="1.6" fill="#0d1117"/>
    <circle cx="2.6" cy="-2" r="1.6" fill="#0d1117"/>
    <animateMotion dur="${LOOP_SECONDS}s" repeatCount="indefinite" begin="-1.3s">
      <mpath href="#track"/>
    </animateMotion>
  </g>
</svg>`;

  fs.mkdirSync("dist", { recursive: true });
  fs.writeFileSync("dist/pacman.svg", svg);
  console.log(`Generated dist/pacman.svg — ${total} total contributions over last ${CELLS} days`);
}

main();
