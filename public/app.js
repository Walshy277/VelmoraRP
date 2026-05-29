const canvas = document.querySelector('#world-canvas');
const context = canvas.getContext('2d');
const worldState = document.querySelector('#world-state');
const gameDay = document.querySelector('#game-day');
const calendarStatus = document.querySelector('#calendar-status');
const regionCount = document.querySelector('#region-count');
const historyCount = document.querySelector('#history-count');
const historyList = document.querySelector('#history-list');
const registerForm = document.querySelector('#register-form');
const registrationResult = document.querySelector('#registration-result');

let discoveredPoints = [];
let pulse = 0;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * scale));
  canvas.height = Math.max(1, Math.floor(rect.height * scale));
  context.setTransform(scale, 0, 0, scale, 0, 0);
}

function drawWorld() {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  pulse += 0.01;

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#18201d');
  gradient.addColorStop(0.5, '#111514');
  gradient.addColorStop(1, '#252018');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.18;
  context.strokeStyle = '#d7b46a';
  context.lineWidth = 1;

  const spacing = 56;
  for (let x = -spacing; x < width + spacing; x += spacing) {
    context.beginPath();
    context.moveTo(x + Math.sin(pulse + x * 0.01) * 10, 0);
    context.lineTo(x + Math.cos(pulse + x * 0.01) * 10, height);
    context.stroke();
  }

  for (let y = -spacing; y < height + spacing; y += spacing) {
    context.beginPath();
    context.moveTo(0, y + Math.cos(pulse + y * 0.01) * 10);
    context.lineTo(width, y + Math.sin(pulse + y * 0.01) * 10);
    context.stroke();
  }
  context.restore();

  context.save();
  for (const point of discoveredPoints) {
    const radius = 10 + Math.sin(pulse * 4 + point.x) * 2;
    context.beginPath();
    context.fillStyle = 'rgba(215, 180, 106, 0.9)';
    context.arc(point.x * width, point.y * height, radius, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.strokeStyle = 'rgba(215, 180, 106, 0.28)';
    context.lineWidth = 2;
    context.arc(point.x * width, point.y * height, radius * 3, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();

  window.requestAnimationFrame(drawWorld);
}

async function loadWorldState() {
  try {
    const [calendarResponse, regionsResponse, historyResponse] = await Promise.all([
      fetch('/world/calendar'),
      fetch('/world/regions'),
      fetch('/world/history')
    ]);

    const calendarPayload = await calendarResponse.json();
    const regionsPayload = await regionsResponse.json();
    const historyPayload = await historyResponse.json();
    const calendar = calendarPayload.calendar;
    const regions = regionsPayload.regions ?? [];
    const events = historyPayload.events ?? [];

    worldState.textContent = calendar?.has_time_concept ? 'Civilization begins' : 'Pre-history';
    gameDay.textContent = calendar?.game_day ? `Day ${calendar.game_day}` : 'No calendar';
    calendarStatus.textContent = calendar?.has_time_concept ? `Day ${calendar.game_day}` : 'Not invented';
    regionCount.textContent = String(regions.length);
    historyCount.textContent = String(events.length);

    historyList.replaceChildren(
      ...events.slice(0, 8).map((event) => {
        const item = document.createElement('li');
        item.textContent = event.summary;
        return item;
      })
    );
  } catch {
    worldState.textContent = 'Offline';
    gameDay.textContent = 'API unavailable';
    calendarStatus.textContent = 'Unavailable';
    regionCount.textContent = 'Unavailable';
    historyCount.textContent = 'Unavailable';
  }
}

function addDiscoveryPoint() {
  discoveredPoints = [
    ...discoveredPoints,
    {
      x: 0.15 + Math.random() * 0.7,
      y: 0.18 + Math.random() * 0.64
    }
  ].slice(-12);
}

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);

  registrationResult.textContent = 'Registering...';

  try {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.get('email'),
        displayName: formData.get('displayName'),
        password: formData.get('password')
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      registrationResult.textContent = payload.error ?? 'Registration failed.';
      return;
    }

    registrationResult.textContent = payload.account.isCreator
      ? 'Creator account created. The world still has no calendar.'
      : payload.world.dayOneStarted
        ? 'First player registered. Day 1 has begun.'
        : 'Player account created.';

    registerForm.reset();
    await loadWorldState();
  } catch {
    registrationResult.textContent = 'Registration service unavailable.';
  }
});

document.querySelector('#explore-button').addEventListener('click', addDiscoveryPoint);
document.querySelector('#forage-button').addEventListener('click', addDiscoveryPoint);
document.querySelector('#camp-button').addEventListener('click', addDiscoveryPoint);

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
drawWorld();
loadWorldState();
window.setInterval(loadWorldState, 10000);
