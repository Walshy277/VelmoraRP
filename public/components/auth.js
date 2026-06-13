import { api, getToken } from './api.js';
import { toast } from './toast.js';

let sessionToken = getToken();
let sessionAccount = JSON.parse(localStorage.getItem('velmora_account') || 'null');
let myCharacters = [];
let activeCharacterId = localStorage.getItem('velmora_active_character') || null;
let authListeners = [];

export function getSessionToken() { return sessionToken; }
export function getSessionAccount() { return sessionAccount; }
export function getMyCharacters() { return myCharacters; }
export function getActiveCharacterId() { return activeCharacterId; }
export function onAuthChange(fn) { authListeners.push(fn); }

function notify() {
  authListeners.forEach(fn => fn());
}

export function saveSession(token, account) {
  sessionToken = token;
  sessionAccount = account;
  localStorage.setItem('velmora_token', token);
  localStorage.setItem('velmora_account', JSON.stringify(account));
  notify();
}

export function clearSession() {
  sessionToken = null;
  sessionAccount = null;
  activeCharacterId = null;
  localStorage.removeItem('velmora_token');
  localStorage.removeItem('velmora_account');
  localStorage.removeItem('velmora_active_character');
  myCharacters = [];
  notify();
}

export async function loadMyCharacters() {
  if (!sessionToken) { myCharacters = []; notify(); return; }
  const { ok, data } = await api('GET', '/characters/my');
  if (ok) {
    myCharacters = data.characters || [];
    if (myCharacters.length > 0 && !activeCharacterId) {
      activeCharacterId = myCharacters[0].id;
      localStorage.setItem('velmora_active_character', activeCharacterId);
    }
    notify();
  }
}

export function renderAuthUI() {
  const accountPanel = document.querySelector('#account-panel');
  const sessionPanel = document.querySelector('#session-panel');
  if (!accountPanel || !sessionPanel) return;

  if (sessionAccount) {
    accountPanel.style.display = 'none';
    sessionPanel.style.display = '';
    const nameEl = document.querySelector('#session-display-name');
    if (nameEl) nameEl.textContent = sessionAccount.displayName;
    const charsEl = document.querySelector('#session-characters');
    if (charsEl) {
      charsEl.textContent = myCharacters.length > 0
        ? `Characters: ${myCharacters.map(c => c.name).join(', ')}`
        : 'No characters yet.';
    }
    const devLink = document.querySelector('#dev-panel-link');
    if (devLink) devLink.style.display = sessionAccount.isCreator ? '' : 'none';
  } else {
    accountPanel.style.display = '';
    sessionPanel.style.display = 'none';
  }
}

export async function handleRegister(email, displayName, password) {
  const { ok, data } = await api('POST', '/auth/register', { email, displayName, password });
  if (!ok) return { ok: false, error: data.error || 'Registration failed.' };
  saveSession(data.token, data.account);
  await loadMyCharacters();
  return { ok: true, data };
}

export async function handleLogin(email, password) {
  const { ok, data } = await api('POST', '/auth/login', { email, password });
  if (!ok) return { ok: false, error: data.error || 'Login failed.' };
  saveSession(data.token, data.account);
  await loadMyCharacters();
  return { ok: true, data };
}

export async function handleLogout() {
  await api('POST', '/auth/logout').catch(() => {});
  clearSession();
}

export async function createCharacter(name, focus) {
  const { ok, data } = await api('POST', '/characters', { name, focus });
  if (ok) {
    await loadMyCharacters();
  }
  return { ok, data };
}

export async function submitAction(actionType, extraPayload = {}) {
  if (!sessionToken) return { ok: false, error: 'Log in first.' };
  if (!activeCharacterId && myCharacters.length > 0) {
    activeCharacterId = myCharacters[0].id;
    localStorage.setItem('velmora_active_character', activeCharacterId);
  }
  if (!activeCharacterId) return { ok: false, error: 'Create a character first.' };

  const payload = { characterId: activeCharacterId, ...extraPayload };
  const { ok, data } = await api('POST', '/actions', {
    actionType,
    characterId: activeCharacterId,
    payload
  });
  return { ok, data };
}
