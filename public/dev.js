const status = document.querySelector('#dev-status');
const ticks = document.querySelector('#dev-ticks');
const actions = document.querySelector('#dev-actions');
const history = document.querySelector('#dev-history');

function renderList(target, rows, formatter) {
  target.replaceChildren(
    ...rows.map((row) => {
      const item = document.createElement('li');
      item.textContent = formatter(row);
      return item;
    })
  );
}

async function loadDevState() {
  try {
    const response = await fetch('/dev/state');
    const payload = await response.json();

    if (!response.ok) {
      status.textContent = payload.error ?? 'Dev state unavailable.';
      return;
    }

    status.textContent = 'Live debug data loaded.';
    renderList(
      ticks,
      payload.ticks,
      (tick) =>
        `Tick ${tick.tick_number} | ${tick.status} | day ${tick.game_day ?? 'none'} | ${tick.duration_ms ?? 0}ms`
    );
    renderList(actions, payload.actions, (action) => `${action.status}: ${action.count}`);
    renderList(history, payload.history, (event) => `${event.tick_number ?? 'pre-history'} | ${event.summary}`);
  } catch {
    status.textContent = 'Dev state unavailable.';
  }
}

loadDevState();
window.setInterval(loadDevState, 5000);
