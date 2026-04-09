const STORAGE_KEY = "brisa-fc-state-v1";

export function loadState() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.players)) return null;
    return {
      players: parsed.players,
      confirmedIds: Array.isArray(parsed.confirmedIds) ? parsed.confirmedIds : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return null;
  }
}

export function saveState(state) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded or unavailable — ignore
  }
}

export function clearState() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
