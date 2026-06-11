const canvas = document.querySelector('#world-canvas');
const context = canvas?.getContext('2d');

const foundationSites = [
  { x: 0.22, y: 0.57, name: 'Unclaimed River Basin', color: '#d2a448', size: 10, terrain: 'river plain' },
  { x: 0.39, y: 0.42, name: 'Stone Outcrop', color: '#8f9ca7', size: 8, terrain: 'highland stone' },
  { x: 0.63, y: 0.34, name: 'Old Forest Edge', color: '#4f9d70', size: 8, terrain: 'woodland' },
  { x: 0.74, y: 0.58, name: 'Cold Marsh', color: '#5879c9', size: 7, terrain: 'wetland' },
  { x: 0.52, y: 0.72, name: 'Salt Coast', color: '#c2b170', size: 7, terrain: 'coast' }
];
const terrainBands = ['#2d3f2f', '#334b39', '#53603d', '#777044', '#4f5f63', '#3b3328'];

let pulse = 0;
let regions = [];

export function setRegions(r) { regions = r || []; }

function getVisibleSites() {
  if (regions.length === 0) return foundationSites;
  return regions.slice(0, 12).map((region, index) => {
    const base = foundationSites[index % foundationSites.length];
    return {
      ...base,
      name: region.name,
      terrain: [region.terrain, region.climate].filter(Boolean).join(', ') || base.terrain,
      x: 0.16 + ((index * 0.17) % 0.68),
      y: 0.25 + ((index * 0.23) % 0.5)
    };
  });
}

function drawMapImpl() {
  if (!canvas) { window.requestAnimationFrame(drawMapImpl); return; }
  const rect = canvas.getBoundingClientRect();
  const width = rect.width, height = rect.height;
  if (width <= 0 || height <= 0) { window.requestAnimationFrame(drawMapImpl); return; }
  const sites = getVisibleSites();
  pulse += 0.01;

  const sea = context.createLinearGradient(0, 0, width, height);
  sea.addColorStop(0, '#26393b');
  sea.addColorStop(0.55, '#182720');
  sea.addColorStop(1, '#352d20');
  context.fillStyle = sea;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.16;
  context.strokeStyle = '#e5c77b';
  for (let x = 0; x < width; x += 38) {
    context.beginPath();
    context.moveTo(x + Math.sin(pulse + x) * 3, 0);
    context.lineTo(x - 28, height);
    context.stroke();
  }
  context.restore();

  context.save();
  context.translate(width * 0.04, height * 0.1);
  context.beginPath();
  context.moveTo(width * 0.03, height * 0.42);
  const pts = [[0.1,0.24],[0.2,0.18],[0.34,0.21],[0.43,0.12],[0.58,0.2],[0.7,0.15],[0.86,0.28],[0.91,0.47],[0.82,0.62],[0.69,0.68],[0.58,0.83],[0.42,0.72],[0.29,0.79],[0.18,0.67],[0.06,0.62]];
  for (const [px, py] of pts) context.lineTo(width * px, height * py);
  context.closePath();
  context.fillStyle = '#314536';
  context.fill();
  context.clip();
  for (let i = 0; i < 42; i++) {
    const bx = ((i * 137) % 1000) / 1000;
    const by = ((i * 293) % 1000) / 1000;
    const rad = 70 + ((i * 19) % 90);
    const grad = context.createRadialGradient(width * bx, height * by, 0, width * bx, height * by, rad);
    grad.addColorStop(0, `${terrainBands[i % terrainBands.length]}cc`);
    grad.addColorStop(1, 'rgba(20, 24, 18, 0)');
    context.fillStyle = grad;
    context.fillRect(0, 0, width, height);
  }
  context.globalAlpha = 0.24;
  context.strokeStyle = '#d8bd7a';
  context.lineWidth = 1;
  for (let i = 0; i < 16; i++) {
    context.beginPath();
    const ly = height * (0.12 + i * 0.05);
    context.moveTo(width * 0.08, ly);
    context.bezierCurveTo(width * 0.28, ly + Math.sin(i) * 28, width * 0.54, ly - 38, width * 0.88, ly + 18);
    context.stroke();
  }
  context.restore();

  for (let i = 0; i < sites.length - 1; i++) {
    context.save();
    context.strokeStyle = 'rgba(235, 210, 148, 0.33)';
    context.lineWidth = 2;
    context.setLineDash([6, 8]);
    context.beginPath();
    context.moveTo(sites[i].x * width, sites[i].y * height);
    context.quadraticCurveTo(width * 0.5, height * 0.45, sites[i + 1].x * width, sites[i + 1].y * height);
    context.stroke();
    context.restore();
  }

  for (const point of sites) {
    const x = point.x * width, y = point.y * height;
    const radius = point.size + Math.sin(pulse * 3 + point.x * 10) * 1.2;
    context.save();
    context.fillStyle = 'rgba(8, 9, 7, 0.5)';
    context.beginPath();
    context.arc(x, y + 2, radius * 2.5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = point.color;
    context.strokeStyle = '#f0d998';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = '#f5e8c9';
    context.font = '12px Georgia, serif';
    context.textAlign = 'center';
    context.fillText(point.name, x, y + radius + 18);
    context.restore();
  }

  window.requestAnimationFrame(drawMapImpl);
}

export function startMap() {
  if (!canvas) return;
  resizeCanvas();
  window.requestAnimationFrame(drawMapImpl);
}

export function resizeCanvas() {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * scale));
  canvas.height = Math.max(1, Math.floor(rect.height * scale));
  context.setTransform(scale, 0, 0, scale, 0, 0);
}
