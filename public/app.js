import './components/api.js';
import './components/toast.js';
import { saveSession, clearSession, loadMyCharacters, renderAuthUI, handleRegister, handleLogin, handleLogout, createCharacter, onAuthChange, getSessionAccount } from './components/auth.js';
import { setRegions } from './components/map.js';
import { startMap, resizeCanvas } from './components/map.js';
import { loadWorldState, getClientState } from './components/render.js';
import { wireActionButtons } from './components/actions.js';
import { toast } from './components/toast.js';
import { api } from './components/api.js';

onAuthChange(() => {
  renderAuthUI();
});

// Wire auth forms
document.querySelector('#register-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const result = await handleRegister(fd.get('email'), fd.get('displayName'), fd.get('password'));
  const status = document.querySelector('#auth-result');
  if (!result.ok) {
    status.textContent = result.error;
    toast(result.error, 'error');
    return;
  }
  toast(`Welcome, ${result.data.account.displayName}! Account created and logged in.`, 'success');
  status.textContent = 'Logged in.';
  e.target.reset();
  await loadWorldState();
});

document.querySelector('#login-submit')?.addEventListener('click', async () => {
  const email = document.querySelector('#email').value;
  const password = document.querySelector('#password').value;
  if (!email || !password) { toast('Enter email and password.', 'error'); return; }
  const status = document.querySelector('#auth-result');
  status.textContent = 'Logging in...';
  const result = await handleLogin(email, password);
  if (!result.ok) {
    status.textContent = result.error;
    toast(result.error, 'error');
    return;
  }
  toast(`Welcome, ${result.data.account.displayName}!`, 'success');
  status.textContent = 'Logged in.';
  document.querySelector('#email').value = '';
  document.querySelector('#password').value = '';
  document.querySelector('#display-name').value = '';
  await loadWorldState();
});

document.querySelector('#logout-button')?.addEventListener('click', async () => {
  await handleLogout();
  toast('Logged out.', 'info');
  loadWorldState();
});

// Wire character dialog
const charDialog = document.querySelector('#character-dialog');
document.querySelector('#show-create-character')?.addEventListener('click', () => {
  document.querySelector('#character-name').value = '';
  charDialog.showModal();
});
document.querySelector('#character-cancel')?.addEventListener('click', () => charDialog.close());
document.querySelector('#character-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.querySelector('#character-name').value.trim();
  if (!name) return;
  const result = await createCharacter(name);
  if (result.ok) {
    toast(`Character ${result.data.character.name} created!`, 'success');
    charDialog.close();
  } else {
    toast(result.data?.error || 'Failed to create character', 'error');
  }
});

// Wire map reset
document.querySelector('#map-reset-button')?.addEventListener('click', () => {
  toast('Map centered.', 'info');
});

// Hash-based view routing
function navigateToView(hash) {
  const sections = document.querySelectorAll('.view-section');
  sections.forEach(s => s.style.display = 'none');
  if (!hash || hash === 'home') return;
  const target = document.querySelector(`#view-${hash}`);
  if (target) target.style.display = '';
}

window.addEventListener('hashchange', () => {
  navigateToView(window.location.hash.replace('#', ''));
});

// View data loaders
async function loadCharacterView() {
  const container = document.querySelector('#character-view-content');
  if (!container) return;
  container.innerHTML = '<p class="status-text">Loading...</p>';
  const { ok, data } = await api('GET', '/world/characters');
  if (!ok) { container.innerHTML = '<p class="status-text">Could not load characters.</p>'; return; }
  const chars = (data.characters || []).filter(c => getSessionAccount() && c.account_id === getSessionAccount().id);
  if (chars.length === 0) {
    container.innerHTML = '<p class="status-text">No character yet. Create one from the home screen.</p>';
    return;
  }
  container.innerHTML = chars.map(c => `
    <div style="border:1px solid var(--line);padding:10px;margin:6px 0">
      <strong>${c.name}</strong>
      <div style="font-size:13px;color:var(--muted)">
        Status: ${c.status} | Lineage: ${c.lineage_id || 'none'}
      </div>
      <div style="font-size:13px;color:var(--muted)">
        Created: ${c.created_at ? new Date(c.created_at).toLocaleString() : 'unknown'}
      </div>
    </div>
  `).join('');
}

async function loadInventoryView() {
  const container = document.querySelector('#inventory-view-content');
  if (!container) return;
  container.innerHTML = '<p class="status-text">Inventory integration coming soon.</p>';
}

async function loadKnowledgeView() {
  const container = document.querySelector('#knowledge-view-content');
  if (!container) return;
  container.innerHTML = '<p class="status-text">Knowledge tracking coming soon.</p>';
}

async function loadSocietyView() {
  const container = document.querySelector('#society-view-content');
  if (!container) return;
  container.innerHTML = '<p class="status-text">Loading...</p>';

  const [groupsRes, settlementsRes, charsRes] = await Promise.all([
    api('GET', '/world/groups'),
    api('GET', '/world/settlements'),
    api('GET', '/world/characters')
  ]);

  const groups = groupsRes.ok ? (groupsRes.data.groups || []) : [];
  const settlements = settlementsRes.ok ? (settlementsRes.data.settlements || []) : [];
  const chars = charsRes.ok ? (charsRes.data.characters || []) : [];

  container.innerHTML = `
    <p>Groups: ${groups.length} | Settlements: ${settlements.length} | Characters: ${chars.length}</p>
  `;

  const groupsContainer = document.querySelector('#groups-view-content');
  if (groupsContainer) {
    if (groups.length === 0) {
      groupsContainer.innerHTML = '<p class="status-text">No groups formed yet.</p>';
    } else {
      groupsContainer.innerHTML = groups.map(g => `
        <div style="border:1px solid var(--line);padding:10px;margin:6px 0">
          <strong>${g.name}</strong>
          <div style="font-size:13px;color:var(--muted)">${g.description || ''}</div>
        </div>
      `).join('');
    }
  }

  const settlementsContainer = document.querySelector('#settlements-view-content');
  if (settlementsContainer) {
    if (settlements.length === 0) {
      settlementsContainer.innerHTML = '<p class="status-text">No settlements founded yet.</p>';
    } else {
      settlementsContainer.innerHTML = settlements.map(s => `
        <div style="border:1px solid var(--line);padding:10px;margin:6px 0">
          <strong>${s.name}</strong>
          <div style="font-size:13px;color:var(--muted)">
            Region: ${s.region_id} | Status: ${s.abandoned_at ? 'Abandoned' : 'Active'}
          </div>
        </div>
      `).join('');
    }
  }
}

async function loadKnowledgeTreeView() {
  const container = document.querySelector('#knowledge-tree-content');
  if (!container) return;
  container.innerHTML = '<p class="status-text">Loading...</p>';
  const { ok, data } = await api('GET', '/world/knowledge');
  if (!ok) { container.innerHTML = '<p class="status-text">Could not load knowledge.</p>'; return; }
  const entries = data.knowledge || [];
  if (entries.length === 0) {
    container.innerHTML = '<p class="status-text">No knowledge has been discovered yet.</p>';
    return;
  }
  container.innerHTML = entries.map(k => `
    <div style="border:1px solid var(--line);padding:10px;margin:6px 0">
      <strong>${k.name || k.label}</strong>
      <div style="font-size:13px;color:var(--muted)">${k.description || k.category || ''}</div>
      <div style="font-size:12px;color:var(--muted)">Category: ${k.category || 'uncategorized'}</div>
    </div>
  `).join('');
}

async function loadCultureView() {
  const container = document.querySelector('#culture-view-content');
  if (!container) return;
  container.innerHTML = `
    <p class="status-text">Cultural encyclopedia will populate as civilizations develop traditions, religions, and customs.</p>
  `;
}

// Route changes trigger data loading
const viewLoaders = {
  character: loadCharacterView,
  society: loadSocietyView,
  learn: loadKnowledgeTreeView,
  culture: loadCultureView
};

function handleRoute() {
  const hash = window.location.hash.replace('#', '');
  const loader = viewLoaders[hash];
  if (loader) loader();
}

window.addEventListener('hashchange', handleRoute);

// Init
renderAuthUI();
loadWorldState();
if (getSessionAccount()) loadMyCharacters();

window.setInterval(async () => {
  await loadWorldState();
  const cs = getClientState();
  setRegions(cs.regions);
}, 10000);

wireActionButtons();
window.addEventListener('resize', resizeCanvas);
startMap();

// Initial route
handleRoute();
navigateToView(window.location.hash.replace('#', ''));
