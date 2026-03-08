/**
 * Storage Service
 * localStorage wrapper for portfolio scenarios + auto-persistence
 */

const STORAGE_KEY = 'portfolio_simulator';
const LIVE_STATE_KEY = 'portfolio_simulator_live';

function getStore() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { scenarios: {}, activeScenario: null };
  } catch {
    return { scenarios: {}, activeScenario: null };
  }
}

function setStore(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Save a portfolio scenario
 */
export function saveScenario(name, portfolio) {
  const store = getStore();
  store.scenarios[name] = {
    name,
    portfolio: JSON.parse(JSON.stringify(portfolio)),
    savedAt: Date.now(),
  };
  store.activeScenario = name;
  setStore(store);
}

/**
 * Load a saved scenario
 */
export function loadScenario(name) {
  const store = getStore();
  return store.scenarios[name] || null;
}

/**
 * List all saved scenarios
 */
export function listScenarios() {
  const store = getStore();
  return Object.values(store.scenarios).sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Delete a scenario
 */
export function deleteScenario(name) {
  const store = getStore();
  delete store.scenarios[name];
  if (store.activeScenario === name) store.activeScenario = null;
  setStore(store);
}

/**
 * Get active scenario name
 */
export function getActiveScenario() {
  return getStore().activeScenario;
}

/**
 * Save app settings
 */
export function saveSettings(settings) {
  const store = getStore();
  store.settings = { ...(store.settings || {}), ...settings };
  setStore(store);
}

export function getSettings() {
  return getStore().settings || {};
}

// ═══════════════════════════════════════════
// LIVE STATE AUTO-PERSISTENCE
// ═══════════════════════════════════════════

/**
 * Auto-save the current portfolio state (called on every state change)
 * Stores: portfolio items, capital, target, quotes
 */
export function autoSaveState(state) {
  try {
    const toSave = {
      totalCapital: state.totalCapital,
      targetReturn: state.targetReturn,
      targetMonths: state.targetMonths,
      portfolio: state.portfolio.map(item => ({
        instrumentId: item.instrument.id,
        instrumentData: {
          id: item.instrument.id,
          symbol: item.instrument.symbol,
          name: item.instrument.name,
          shortName: item.instrument.shortName,
          type: item.instrument.type,
          sector: item.instrument.sector,
          risk: item.instrument.risk,
          expectedReturn: item.instrument.expectedReturn,
          isFixed: item.instrument.isFixed,
          fixedYield: item.instrument.fixedYield,
          fixedBonus: item.instrument.fixedBonus,
          leverage: item.instrument.leverage,
          description: item.instrument.description,
          isDynamic: item.instrument.isDynamic,
        },
        allocation: item.allocation,
        userReturn: item.userReturn,
      })),
      quotes: state.quotes,
      savedAt: Date.now(),
    };
    localStorage.setItem(LIVE_STATE_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.warn('Auto-save failed:', err);
  }
}

/**
 * Restore saved live state (called on init)
 * Returns null if no saved state exists
 */
export function autoRestoreState() {
  try {
    const data = localStorage.getItem(LIVE_STATE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    // Only restore if saved within last 7 days
    if (Date.now() - parsed.savedAt > 7 * 24 * 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clear live state
 */
export function clearLiveState() {
  localStorage.removeItem(LIVE_STATE_KEY);
}

