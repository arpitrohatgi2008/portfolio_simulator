/**
 * Portfolio Simulator — Main Application
 * Orchestrates UI, state management, and data flow
 */

import './styles/index.css';
import './styles/components.css';

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

import {
  instruments,
  getInstrumentsByType,
  searchInstruments,
  getInstrumentById,
  hasLivePrice,
  createDynamicInstrument,
  addInstrument,
  INSTRUMENT_TYPES,
  INSTRUMENT_TYPE_LABELS,
  INSTRUMENT_TYPE_COLORS,
} from './services/instrumentRegistry.js';

import {
  fetchQuote,
  fetchHistoricalData,
  calculateHistoricalReturn,
  calculateIndicators,
  searchYahooFinance,
} from './services/marketData.js';

import {
  calculateInstrumentReturn,
  calculatePortfolioReturn,
  generateProjection,
  calculateGapToTarget,
} from './engine/returnCalculator.js';

import {
  calculatePortfolioRisk,
  getRiskClass,
  getRiskColor,
} from './engine/riskMetrics.js';

import {
  saveScenario,
  loadScenario,
  listScenarios,
  deleteScenario,
  autoSaveState,
  autoRestoreState,
} from './services/storage.js';

import {
  optimizePortfolio,
  getAllocationPicks,
  getRiskProfile,
} from './engine/optimizer.js';

// ═══════════════════════════════════════════
// APP STATE
// ═══════════════════════════════════════════

const state = {
  totalCapital: 3000000,    // ₹30,00,000
  targetReturn: 400000,     // ₹4,00,000
  targetMonths: 6,
  portfolio: [],            // [{ instrument, allocation, userReturn, livePrice, historicalReturn, indicators }]
  activeTab: INSTRUMENT_TYPES.EQUITY,
  searchQuery: '',
  quotes: {},               // symbol -> quote data
};

// ═══════════════════════════════════════════
// FORMATTING HELPERS
// ═══════════════════════════════════════════

function formatINR(amount) {
  if (amount === null || amount === undefined) return '—';
  const abs = Math.abs(amount);
  let formatted;
  if (abs >= 10000000) formatted = (amount / 10000000).toFixed(2) + ' Cr';
  else if (abs >= 100000) formatted = (amount / 100000).toFixed(2) + ' L';
  else formatted = amount.toLocaleString('en-IN');
  return '₹' + formatted;
}

function formatPercent(val) {
  if (val === null || val === undefined) return '—';
  return (val >= 0 ? '+' : '') + val.toFixed(1) + '%';
}

function formatINRFull(amount) {
  if (amount === null || amount === undefined) return '—';
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

// ═══════════════════════════════════════════
// INSTRUMENT BROWSER (SIDEBAR)
// ═══════════════════════════════════════════

function renderInstrumentList() {
  const list = document.getElementById('instrument-list');
  let filtered = getInstrumentsByType(state.activeTab);

  if (state.searchQuery) {
    filtered = searchInstruments(state.searchQuery).filter(i => i.type === state.activeTab);
  }

  const portfolioIds = new Set(state.portfolio.map(p => p.instrument.id));

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding: var(--space-8);">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-text">No instruments found</div>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(inst => {
    const inPortfolio = portfolioIds.has(inst.id);
    const quote = state.quotes[inst.symbol];
    const priceDisplay = quote
      ? `<div class="instrument-price">
            <div class="price mono">${formatINRFull(quote.price)}</div>
            <div class="change ${quote.change >= 0 ? 'up' : 'down'} mono">${formatPercent(quote.changePercent)}</div>
          </div>`
      : (inst.isFixed
          ? `<div class="instrument-price"><div class="price mono">${inst.fixedYield}% yield</div></div>`
          : `<div class="instrument-price"><div class="price mono" style="color: var(--text-muted);">Loading...</div></div>`);

    return `
      <div class="instrument-item ${inPortfolio ? 'in-portfolio' : ''}"
           data-id="${inst.id}" role="button" tabindex="0">
        <div class="instrument-badge ${inst.type}">${inst.shortName.substring(0, 3)}</div>
        <div class="instrument-info">
          <div class="instrument-name">${inst.name}</div>
          <div class="instrument-meta">
            <span>${inst.sector}</span>
            <span class="risk-tag ${getRiskClass(inst.risk)}">${inst.risk}</span>
          </div>
        </div>
        ${priceDisplay}
        ${inPortfolio ? '<span class="badge badge-info" style="font-size:10px;">✓ Added</span>' : ''}
      </div>`;
  }).join('');

  // Attach click handlers
  list.querySelectorAll('.instrument-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      toggleInstrument(id);
    });
  });
}

function setupTabs() {
  const tabContainer = document.getElementById('instrument-tabs');
  tabContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab')) {
      tabContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      state.activeTab = e.target.dataset.type;
      renderInstrumentList();
    }
  });
}

function setupSearch() {
  const searchInput = document.getElementById('instrument-search');
  let localTimeout, liveTimeout;
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    
    // Filter local instruments immediately
    clearTimeout(localTimeout);
    localTimeout = setTimeout(() => {
      state.searchQuery = query;
      renderInstrumentList();
    }, 150);
    
    // Live search from Yahoo Finance (debounced, 2+ chars)
    clearTimeout(liveTimeout);
    if (query.length >= 2) {
      liveTimeout = setTimeout(() => {
        performLiveSearch(query);
      }, 400);
    } else {
      hideLiveSearchResults();
    }
  });
  
  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      hideLiveSearchResults();
    }
  });
}

async function performLiveSearch(query) {
  const dropdown = document.getElementById('live-search-results');
  dropdown.style.display = 'block';
  dropdown.innerHTML = '<div class="search-loading">🔍 Searching all NSE/BSE stocks...</div>';
  
  try {
    const results = await searchYahooFinance(query);
    if (results.length === 0) {
      dropdown.innerHTML = '<div class="search-loading">No results found</div>';
      return;
    }
    
    // Show results prioritizing Indian stocks
    const sorted = results.sort((a, b) => {
      if (a.isIndian && !b.isIndian) return -1;
      if (!a.isIndian && b.isIndian) return 1;
      return 0;
    });
    
    const portfolioIds = new Set(state.portfolio.map(p => p.instrument.id));
    
    dropdown.innerHTML = sorted.map(r => {
      const inPortfolio = portfolioIds.has(r.symbol);
      const existsInRegistry = instruments.find(i => i.symbol === r.symbol);
      return `
        <div class="search-result-item ${inPortfolio ? 'in-portfolio' : ''}" data-symbol="${r.symbol}" data-result='${JSON.stringify(r).replace(/'/g, "&#39;")}'>
          <div style="flex:1; min-width:0;">
            <div class="search-result-name">${r.name}</div>
            <div class="search-result-symbol">${r.symbol}</div>
          </div>
          <div class="search-result-exchange">
            ${r.isIndian ? (r.isNSE ? '🇮🇳 NSE' : '🇮🇳 BSE') : r.exchangeDisplay || r.exchange}
          </div>
          ${inPortfolio ? '<span class="badge badge-info" style="font-size:10px;">✓</span>' : ''}
          ${!inPortfolio && !existsInRegistry ? '<span class="badge badge-warning" style="font-size:9px;">NEW</span>' : ''}
        </div>`;
    }).join('');
    
    // Attach click handlers
    dropdown.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const resultData = JSON.parse(el.dataset.result.replace(/&#39;/g, "'"));
        addSearchResultToPortfolio(resultData);
        hideLiveSearchResults();
        document.getElementById('instrument-search').value = '';
        state.searchQuery = '';
      });
    });
  } catch (err) {
    dropdown.innerHTML = '<div class="search-loading">Search failed — try again</div>';
  }
}

function hideLiveSearchResults() {
  document.getElementById('live-search-results').style.display = 'none';
}

function addSearchResultToPortfolio(searchResult) {
  // Create (or find) instrument from search result
  const instrument = createDynamicInstrument(searchResult);
  addInstrument(instrument);
  
  // Add to portfolio
  const existing = state.portfolio.find(p => p.instrument.id === instrument.id);
  if (existing) {
    showToast(`${instrument.shortName} is already in your portfolio`);
    return;
  }
  
  const remaining = state.totalCapital - getTotalAllocated();
  const defaultAllocation = Math.min(remaining, Math.round(state.totalCapital / 10));
  
  state.portfolio.push({
    instrument,
    allocation: defaultAllocation,
    userReturn: null,
    livePrice: null,
    historicalReturn: null,
    indicators: null,
  });
  
  showToast(`Added ${instrument.shortName} to portfolio`);
  
  // Fetch live data
  if (hasLivePrice(instrument)) {
    fetchInstrumentData(instrument.symbol);
  }
  
  updateAll();
}

// ═══════════════════════════════════════════
// PORTFOLIO MANAGEMENT
// ═══════════════════════════════════════════

function toggleInstrument(id) {
  const idx = state.portfolio.findIndex(p => p.instrument.id === id);
  if (idx >= 0) {
    // Remove from portfolio
    state.portfolio.splice(idx, 1);
    showToast('Instrument removed from portfolio');
  } else {
    // Add to portfolio with default allocation
    const instrument = getInstrumentById(id);
    if (!instrument) return;

    const remaining = state.totalCapital - getTotalAllocated();
    const defaultAllocation = Math.min(remaining, Math.round(state.totalCapital / 10));

    state.portfolio.push({
      instrument,
      allocation: defaultAllocation,
      userReturn: null,
      livePrice: state.quotes[instrument.symbol]?.price || null,
      historicalReturn: null,
      indicators: null,
    });

    showToast(`Added ${instrument.shortName} to portfolio`);

    // Fetch live data if available
    if (hasLivePrice(instrument)) {
      fetchInstrumentData(instrument.symbol);
    }
  }
  
  updateAll();
}

function updateAllocation(id, amount) {
  const item = state.portfolio.find(p => p.instrument.id === id);
  if (!item) return;

  amount = Math.max(0, Math.round(amount));
  const otherAllocated = state.portfolio
    .filter(p => p.instrument.id !== id)
    .reduce((s, p) => s + p.allocation, 0);
  
  amount = Math.min(amount, state.totalCapital - otherAllocated);
  item.allocation = amount;
  updateAll();
}

function updateUserReturn(id, ret) {
  const item = state.portfolio.find(p => p.instrument.id === id);
  if (!item) return;
  item.userReturn = ret === '' ? null : parseFloat(ret);
  updateAll();
}

function getTotalAllocated() {
  return state.portfolio.reduce((s, p) => s + p.allocation, 0);
}

function removeInstrument(id) {
  state.portfolio = state.portfolio.filter(p => p.instrument.id !== id);
  showToast('Instrument removed');
  updateAll();
}

// ═══════════════════════════════════════════
// PORTFOLIO TABLE
// ═══════════════════════════════════════════

function renderPortfolioTable() {
  const empty = document.getElementById('portfolio-empty');
  const tableWrapper = document.getElementById('portfolio-table-wrapper');
  const tbody = document.getElementById('portfolio-tbody');
  const tfoot = document.getElementById('portfolio-tfoot');
  const countBadge = document.getElementById('portfolio-count');

  if (state.portfolio.length === 0) {
    empty.style.display = 'flex';
    tableWrapper.style.display = 'none';
    countBadge.textContent = '0 instruments';
    return;
  }

  empty.style.display = 'none';
  tableWrapper.style.display = 'block';
  countBadge.textContent = `${state.portfolio.length} instrument${state.portfolio.length > 1 ? 's' : ''}`;

  const totalAllocated = getTotalAllocated();
  const remaining = state.totalCapital - totalAllocated;

  const instrumentReturns = calculateAllReturns();
  const portfolioResult = calculatePortfolioReturn(instrumentReturns, state.totalCapital);

  tbody.innerHTML = state.portfolio.map((item, idx) => {
    const inst = item.instrument;
    const ret = instrumentReturns[idx];
    const quote = state.quotes[inst.symbol];
    const priceStr = quote
      ? formatINRFull(quote.price)
      : (inst.isFixed ? `${inst.fixedYield}% yield` : '—');

    const returnClass = ret.absoluteReturn >= 0 ? 'profit' : 'loss';
    const maxAlloc = item.allocation + remaining;
    const allocPercent = totalAllocated > 0 ? (item.allocation / state.totalCapital * 100).toFixed(1) : '0.0';

    return `
      <tr data-id="${inst.id}" class="animate-fadeIn" style="animation-delay: ${idx * 50}ms">
        <td>
          <div style="display:flex; align-items:center; gap:var(--space-2);">
            <div class="instrument-badge ${inst.type}" style="width:32px;height:32px;font-size:10px;">${inst.shortName.substring(0, 3)}</div>
            <div>
              <div style="font-weight:600; font-size:var(--text-sm);">${inst.shortName}</div>
              <div style="font-size:var(--text-xs); color:var(--text-muted);">${inst.name}</div>
            </div>
          </div>
        </td>
        <td><span class="badge badge-info" style="font-size:10px;">${INSTRUMENT_TYPE_LABELS[inst.type]}</span></td>
        <td><span class="mono" style="font-size:var(--text-sm);">${priceStr}</span></td>
        <td>
          <div class="allocation-cell">
            <input type="range" min="0" max="${maxAlloc}" value="${item.allocation}" step="10000"
                   data-id="${inst.id}" class="alloc-slider" style="flex:1;" />
            <input type="number" class="input input-mono allocation-input" value="${item.allocation}"
                   data-id="${inst.id}" min="0" max="${maxAlloc}" step="10000" />
          </div>
          <div style="font-size:var(--text-xs); color:var(--text-muted); margin-top:2px; font-family:var(--font-mono);">
            ${allocPercent}% of capital
          </div>
        </td>
        <td>
          <input type="number" class="input input-mono return-input" value="${item.userReturn ?? ret.annualReturn}"
                 data-id="${inst.id}" step="0.5" style="width:80px; text-align:right;" />
        </td>
        <td>
          <span class="return-cell ${returnClass}">${formatINRFull(ret.absoluteReturn)}</span>
        </td>
        <td><span class="risk-tag ${getRiskClass(inst.risk)}">${inst.risk}</span></td>
        <td>
          <button class="btn btn-danger btn-sm btn-remove" data-id="${inst.id}" title="Remove">✕</button>
        </td>
      </tr>`;
  }).join('');

  // Footer totals
  tfoot.innerHTML = `
    <tr style="font-weight:700; border-top: 2px solid var(--border-medium);">
      <td colspan="3" style="font-size:var(--text-sm);">
        Total (${state.portfolio.length} instruments)
      </td>
      <td>
        <span class="mono" style="font-size:var(--text-sm);">${formatINRFull(totalAllocated)}</span>
        <div style="font-size:var(--text-xs); color:var(--text-muted); font-family:var(--font-mono);">
          ${formatINRFull(remaining)} remaining
        </div>
      </td>
      <td><span class="mono" style="font-size:var(--text-sm);">${formatPercent(portfolioResult.weightedAnnualReturn)}</span></td>
      <td><span class="mono ${portfolioResult.expectedReturn >= 0 ? 'profit' : 'loss'}" style="font-size:var(--text-sm);">${formatINRFull(portfolioResult.expectedReturn)}</span></td>
      <td colspan="2"></td>
    </tr>`;

  // Attach event handlers
  tbody.querySelectorAll('.alloc-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const id = e.target.dataset.id;
      const val = parseInt(e.target.value);
      updateAllocation(id, val);
    });
  });

  tbody.querySelectorAll('.allocation-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      const val = parseInt(e.target.value) || 0;
      updateAllocation(id, val);
    });
  });

  tbody.querySelectorAll('.return-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      updateUserReturn(id, e.target.value);
    });
  });

  tbody.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeInstrument(btn.dataset.id);
    });
  });
}

// ═══════════════════════════════════════════
// CALCULATIONS
// ═══════════════════════════════════════════

function calculateAllReturns() {
  return state.portfolio.map(item => {
    return calculateInstrumentReturn(
      item.instrument,
      item.allocation,
      state.targetMonths,
      {
        historicalReturn: item.historicalReturn,
        momentum: item.indicators?.momentum,
        userOverride: item.userReturn,
      }
    );
  });
}

// ═══════════════════════════════════════════
// STATS & TARGET TRACKER
// ═══════════════════════════════════════════

function updateStats() {
  const instrumentReturns = calculateAllReturns();
  const result = calculatePortfolioReturn(instrumentReturns, state.totalCapital);
  const gap = calculateGapToTarget(result.expectedReturn, state.targetReturn);
  const risk = calculatePortfolioRisk(state.portfolio, instrumentReturns);

  // Stats
  document.getElementById('stat-allocated').textContent = formatINRFull(result.totalAllocated);
  document.getElementById('stat-allocated-pct').textContent = 
    `${(result.totalAllocated / state.totalCapital * 100).toFixed(1)}% deployed`;

  const retEl = document.getElementById('stat-return');
  retEl.textContent = formatINRFull(result.expectedReturn);
  retEl.className = `stat-value mono ${result.expectedReturn >= 0 ? 'profit' : 'loss'}`;
  document.getElementById('stat-return-pct').textContent = 
    `${formatPercent(result.expectedReturnPercent)} in ${state.targetMonths} months`;

  // Target bar label (dynamic)
  document.getElementById('target-card-title').textContent = `Target Progress — ${formatINR(state.targetReturn)} in ${state.targetMonths} Months`;
  document.getElementById('target-bar-label').textContent = formatINRFull(state.targetReturn);

  // Target gap
  const gapEl = document.getElementById('stat-target-gap');
  if (gap.isOnTrack) {
    gapEl.textContent = `✅ On track! +${formatINRFull(gap.surplus)} surplus`;
    gapEl.style.color = 'var(--color-profit)';
  } else {
    gapEl.textContent = `${formatINRFull(gap.gap)} gap to target`;
    gapEl.style.color = 'var(--color-warning)';
  }

  // Target bar
  const bar = document.getElementById('target-bar');
  const pct = Math.min(100, gap.percentage);
  bar.style.width = `${pct}%`;
  if (pct >= 100) bar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
  else if (pct >= 70) bar.style.background = 'var(--accent-gradient)';
  else if (pct >= 40) bar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
  else bar.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';

  const badge = document.getElementById('target-badge');
  badge.textContent = `${pct.toFixed(0)}%`;
  if (pct >= 100) { badge.className = 'badge badge-profit'; }
  else if (pct >= 60) { badge.className = 'badge badge-info'; }
  else { badge.className = 'badge badge-warning'; }

  // Target message
  const msgEl = document.getElementById('target-message');
  if (state.portfolio.length === 0) {
    msgEl.textContent = 'Add instruments to start building your portfolio.';
  } else if (gap.isOnTrack) {
    msgEl.innerHTML = `🎯 <span style="color:var(--color-profit);">Your portfolio is on track to exceed the ₹4L target!</span> Expected: ${formatINRFull(result.expectedReturn)}`;
  } else {
    const neededPct = ((state.targetReturn / result.totalAllocated) * 100 * (12 / state.targetMonths)).toFixed(1);
    msgEl.textContent = `You need ${formatINRFull(gap.gap)} more return. That's ~${neededPct}% annualized on deployed capital.`;
  }

  // Risk metrics
  updateRiskDisplay(risk);
}

function updateRiskDisplay(risk) {
  document.getElementById('risk-level').textContent = risk.overallRisk;
  document.getElementById('risk-level').className = `stat-value ${getRiskClass(risk.overallRisk)}`;

  document.getElementById('risk-volatility').textContent = risk.volatility ? `${risk.volatility}%` : '—';
  document.getElementById('risk-sharpe').textContent = risk.sharpeRatio ? risk.sharpeRatio.toFixed(2) : '—';
  document.getElementById('risk-drawdown').textContent = risk.maxDrawdown ? `-${risk.maxDrawdown}%` : '—';
  document.getElementById('risk-diversification').textContent = risk.diversificationScore ? `${risk.diversificationScore}/100` : '—';

  const riskBadge = document.getElementById('risk-badge');
  riskBadge.textContent = risk.overallRisk;
  riskBadge.style.color = getRiskColor(risk.overallRisk);
  riskBadge.style.background = `${getRiskColor(risk.overallRisk)}20`;
}

// ═══════════════════════════════════════════
// CHARTS
// ═══════════════════════════════════════════

let allocationChart = null;
let projectionChart = null;

function updateCharts() {
  updateAllocationChart();
  updateProjectionChart();
}

function updateAllocationChart() {
  const canvas = document.getElementById('allocation-chart');
  const ctx = canvas.getContext('2d');

  if (allocationChart) allocationChart.destroy();

  if (state.portfolio.length === 0) {
    allocationChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Unallocated'],
        datasets: [{
          data: [100],
          backgroundColor: ['rgba(255,255,255,0.05)'],
          borderColor: ['rgba(255,255,255,0.1)'],
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        cutout: '70%',
      }
    });
    return;
  }

  // Group by type
  const typeMap = {};
  state.portfolio.forEach(item => {
    const type = item.instrument.type;
    typeMap[type] = (typeMap[type] || 0) + item.allocation;
  });

  const remaining = state.totalCapital - getTotalAllocated();
  const labels = [];
  const data = [];
  const colors = [];

  Object.entries(typeMap).forEach(([type, amount]) => {
    labels.push(INSTRUMENT_TYPE_LABELS[type]);
    data.push(amount);
    colors.push(INSTRUMENT_TYPE_COLORS[type]);
  });

  if (remaining > 0) {
    labels.push('Unallocated');
    data.push(remaining);
    colors.push('rgba(255,255,255,0.05)');
  }

  allocationChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + '40'),
        borderColor: colors,
        borderWidth: 2,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#94a3b8',
            padding: 16,
            font: { family: 'Inter', size: 12 },
            usePointStyle: true,
            pointStyleWidth: 8,
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          bodyFont: { family: 'JetBrains Mono' },
          callbacks: {
            label: (ctx) => ` ${formatINRFull(ctx.raw)} (${(ctx.raw / state.totalCapital * 100).toFixed(1)}%)`
          }
        }
      },
    }
  });
}

function updateProjectionChart() {
  const canvas = document.getElementById('projection-chart');
  const ctx = canvas.getContext('2d');

  if (projectionChart) projectionChart.destroy();

  const instrumentReturns = calculateAllReturns();
  const portfolioResult = calculatePortfolioReturn(instrumentReturns, state.totalCapital);
  const risk = calculatePortfolioRisk(state.portfolio, instrumentReturns);

  const totalAllocated = portfolioResult.totalAllocated || state.totalCapital;
  const annualReturn = portfolioResult.weightedAnnualReturn || 0;
  const volatility = risk.volatility || 15;

  const projection = generateProjection(totalAllocated, annualReturn, state.targetMonths, volatility);
  const targetLine = Array.from({ length: state.targetMonths + 1 }, (_, i) => state.totalCapital + state.targetReturn);

  const monthLabels = projection.expected.map(p => `M${p.month}`);

  projectionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: monthLabels,
      datasets: [
        {
          label: 'Expected',
          data: projection.expected.map(p => p.value),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.1)',
          fill: false,
          tension: 0.3,
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#6366f1',
        },
        {
          label: 'Optimistic',
          data: projection.optimistic.map(p => p.value),
          borderColor: '#10b981',
          borderDash: [6, 4],
          fill: false,
          tension: 0.3,
          borderWidth: 1.5,
          pointRadius: 0,
        },
        {
          label: 'Pessimistic',
          data: projection.pessimistic.map(p => p.value),
          borderColor: '#ef4444',
          borderDash: [6, 4],
          fill: false,
          tension: 0.3,
          borderWidth: 1.5,
          pointRadius: 0,
        },
        {
          label: 'Target (₹34L)',
          data: targetLine,
          borderColor: '#f59e0b',
          borderDash: [10, 5],
          fill: false,
          borderWidth: 2,
          pointRadius: 0,
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: '#64748b',
            font: { family: 'JetBrains Mono', size: 11 },
            callback: (val) => formatINR(val),
          },
        },
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#94a3b8',
            padding: 16,
            font: { family: 'Inter', size: 12 },
            usePointStyle: true,
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          bodyFont: { family: 'JetBrains Mono' },
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${formatINRFull(ctx.raw)}`
          }
        }
      },
    }
  });
}

// ═══════════════════════════════════════════
// DATA FETCHING
// ═══════════════════════════════════════════

async function fetchInstrumentData(symbol) {
  try {
    const [quote, history] = await Promise.all([
      fetchQuote(symbol),
      fetchHistoricalData(symbol, '1y'),
    ]);

    if (quote) {
      state.quotes[symbol] = quote;
    }

    // Update portfolio item with fetched data
    const item = state.portfolio.find(p => p.instrument.symbol === symbol);
    if (item) {
      if (quote) item.livePrice = quote.price;
      if (history && history.length > 0) {
        item.historicalReturn = calculateHistoricalReturn(history);
        item.indicators = calculateIndicators(history);
      }
    }

    updateAll();
  } catch (err) {
    console.warn(`Data fetch failed for ${symbol}:`, err);
  }
}

async function fetchAllPrices() {
  showToast('Refreshing prices...');
  
  // Fetch prices for instruments with live data
  const liveInstruments = instruments.filter(i => hasLivePrice(i));
  const batchSize = 5;
  
  for (let i = 0; i < liveInstruments.length; i += batchSize) {
    const batch = liveInstruments.slice(i, i + batchSize);
    await Promise.all(batch.map(async (inst) => {
      const quote = await fetchQuote(inst.symbol);
      if (quote) state.quotes[inst.symbol] = quote;
    }));
    // Delay between batches
    if (i + batchSize < liveInstruments.length) {
      await new Promise(r => setTimeout(r, 800));
    }
    renderInstrumentList(); // Progressive update
  }

  // Also fetch history for portfolio items
  for (const item of state.portfolio) {
    if (hasLivePrice(item.instrument)) {
      await fetchInstrumentData(item.instrument.symbol);
    }
  }

  showToast('Prices updated!');
  updateAll();
}

// ═══════════════════════════════════════════
// SAVE / LOAD SCENARIOS
// ═══════════════════════════════════════════

function handleSave() {
  const name = prompt('Name this portfolio scenario:');
  if (!name) return;

  const portfolio = state.portfolio.map(item => ({
    instrumentId: item.instrument.id,
    allocation: item.allocation,
    userReturn: item.userReturn,
  }));

  saveScenario(name, portfolio);
  showToast(`Scenario "${name}" saved!`);
}

function handleLoad() {
  const scenarios = listScenarios();
  if (scenarios.length === 0) {
    showToast('No saved scenarios');
    return;
  }

  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');

  content.innerHTML = `
    <div class="card-header">
      <span class="card-title">Load Scenario</span>
      <button class="btn btn-ghost btn-sm" id="modal-close">✕</button>
    </div>
    <div style="display:flex; flex-direction:column; gap:var(--space-2);">
      ${scenarios.map(s => `
        <div class="instrument-item" data-name="${s.name}" style="cursor:pointer;">
          <div class="instrument-info">
            <div class="instrument-name">${s.name}</div>
            <div class="instrument-meta">
              <span>${s.portfolio.length} instruments</span>
              <span>${new Date(s.savedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <button class="btn btn-danger btn-sm btn-delete-scenario" data-name="${s.name}" title="Delete">🗑️</button>
        </div>
      `).join('')}
    </div>`;

  overlay.style.display = 'flex';

  document.getElementById('modal-close').addEventListener('click', () => {
    overlay.style.display = 'none';
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.style.display = 'none';
  });

  content.querySelectorAll('.instrument-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.btn-delete-scenario')) return;
      const name = el.dataset.name;
      const scenario = loadScenario(name);
      if (scenario) {
        state.portfolio = scenario.portfolio.map(p => {
          const instrument = getInstrumentById(p.instrumentId);
          return instrument ? {
            instrument,
            allocation: p.allocation,
            userReturn: p.userReturn,
            livePrice: state.quotes[instrument.symbol]?.price || null,
            historicalReturn: null,
            indicators: null,
          } : null;
        }).filter(Boolean);

        overlay.style.display = 'none';
        showToast(`Loaded scenario: ${name}`);
        updateAll();

        // Fetch live data for loaded instruments
        state.portfolio.forEach(item => {
          if (hasLivePrice(item.instrument)) {
            fetchInstrumentData(item.instrument.symbol);
          }
        });
      }
    });
  });

  content.querySelectorAll('.btn-delete-scenario').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = btn.dataset.name;
      deleteScenario(name);
      showToast(`Deleted scenario: ${name}`);
      handleLoad(); // Refresh
    });
  });
}

// ═══════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════

let toastTimeout;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ═══════════════════════════════════════════
// AI PORTFOLIO OPTIMIZER
// ═══════════════════════════════════════════

let lastOptResult = null;

function setupOptimizer() {
  const riskSlider = document.getElementById('opt-risk');
  const riskVal = document.getElementById('opt-risk-val');
  const riskLabel = document.getElementById('opt-risk-label');
  const btnOptimize = document.getElementById('btn-optimize');
  
  riskSlider.addEventListener('input', () => {
    const level = parseInt(riskSlider.value);
    riskVal.textContent = level;
    const profile = getRiskProfile(level);
    riskLabel.textContent = profile.label;
    
    // Color the value based on risk
    if (level <= 3) riskVal.style.color = 'var(--color-profit)';
    else if (level <= 6) riskVal.style.color = 'var(--color-warning)';
    else riskVal.style.color = 'var(--color-loss)';
  });
  
  btnOptimize.addEventListener('click', runOptimizer);
}

function runOptimizer() {
  const riskLevel = parseInt(document.getElementById('opt-risk').value);
  const targetReturn = parseInt(document.getElementById('opt-target').value) || state.targetReturn;
  const months = parseInt(document.getElementById('opt-months').value) || state.targetMonths;
  
  const result = optimizePortfolio({
    totalCapital: state.totalCapital,
    targetReturn,
    months,
    riskLevel,
  });
  
  lastOptResult = result;
  renderOptimizerResults(result);
}

function renderOptimizerResults(result) {
  const container = document.getElementById('optimizer-results');
  container.style.display = 'block';
  
  if (!result.success) {
    container.innerHTML = `
      <div class="optimizer-result-header warning">
        <span style="font-size:1.5rem;">⚠️</span>
        <span style="font-size:var(--text-sm);">${result.message}</span>
      </div>`;
    return;
  }
  
  const m = result.metrics;
  
  container.innerHTML = `
    <div class="optimizer-result-header ${result.meetsTarget ? 'success' : 'warning'}">
      <span style="font-size:1.5rem;">${result.meetsTarget ? '✅' : '⚠️'}</span>
      <div style="flex:1;">
        <div style="font-size:var(--text-sm); font-weight:600; color:var(--text-primary);">${result.message}</div>
        <div style="font-size:var(--text-xs); color:var(--text-muted); margin-top:4px;">
          Risk: ${result.riskProfile.label} | Sharpe: ${m.sharpeRatio} | Volatility: ${m.weightedVolatility}%
        </div>
      </div>
    </div>
    
    <!-- Metrics Summary -->
    <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); margin-bottom: var(--space-4);">
      <div class="stat-card">
        <span class="stat-label">Expected Return</span>
        <span class="stat-value mono ${m.expectedReturnAbs >= m.targetReturn ? 'profit' : 'warning'}" style="font-size:var(--text-lg);">${formatINRFull(m.expectedReturnAbs)}</span>
        <span class="stat-sub">${formatPercent(m.expectedReturnPctPeriod)} in ${document.getElementById('opt-months').value}mo</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Annualized</span>
        <span class="stat-value mono" style="font-size:var(--text-lg);">${formatPercent(m.expectedReturnPct)}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Volatility</span>
        <span class="stat-value mono" style="font-size:var(--text-lg);">${m.weightedVolatility}%</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Target Gap</span>
        <span class="stat-value mono ${m.gap > 0 ? 'warning' : 'profit'}" style="font-size:var(--text-lg);">${m.gap > 0 ? formatINRFull(m.gap) : '✅ Met'}</span>
      </div>
    </div>
    
    <!-- Allocation Breakdown -->
    <h4 style="font-size:var(--text-sm); font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:var(--space-2);">Recommended Allocation</h4>
    <table class="optimizer-allocation-table">
      <thead>
        <tr>
          <th>Asset Class</th>
          <th>Allocation</th>
          <th>%</th>
          <th>Exp. Return</th>
          <th>Volatility</th>
        </tr>
      </thead>
      <tbody>
        ${result.typeBreakdown.map(type => `
          <tr class="optimizer-type-row">
            <td colspan="5">
              <span class="optimizer-type-dot" style="background:${type.color};"></span>
              ${type.label} — ${formatINRFull(type.totalAllocation)} (${type.totalPct.toFixed(1)}%)
            </td>
          </tr>
          ${type.subClasses.map(sc => `
            <tr>
              <td style="padding-left:var(--space-8);">${sc.label}</td>
              <td class="mono">${formatINRFull(sc.allocation)}</td>
              <td class="mono">${sc.allocationPct.toFixed(1)}%</td>
              <td class="mono" style="color:var(--color-profit);">${sc.expReturn}%</td>
              <td class="mono">${sc.volatility}%</td>
            </tr>
          `).join('')}
        `).join('')}
      </tbody>
    </table>
    
    <button class="btn btn-primary btn-apply-optimizer" id="btn-apply-optimizer" style="width:100%; margin-top:var(--space-4);">
      ⚡ Apply This Portfolio
    </button>
    <p style="font-size:var(--text-xs); color:var(--text-muted); margin-top:var(--space-2); text-align:center;">This will replace your current portfolio with the optimized allocation</p>
  `;
  
  // Apply button handler
  document.getElementById('btn-apply-optimizer').addEventListener('click', () => {
    applyOptimizedPortfolio(result);
  });
}

function applyOptimizedPortfolio(result) {
  // Clear current portfolio
  state.portfolio = [];
  
  // Add each allocation's picks
  for (const allocation of result.allocations) {
    const picks = getAllocationPicks(allocation);
    for (const pick of picks) {
      const existing = state.portfolio.find(p => p.instrument.id === pick.instrument.id);
      if (existing) {
        existing.allocation += pick.suggestedAllocation;
      } else {
        state.portfolio.push({
          instrument: pick.instrument,
          allocation: pick.suggestedAllocation,
          userReturn: null,
          livePrice: state.quotes[pick.instrument.symbol]?.price || null,
          historicalReturn: null,
          indicators: null,
        });
      }
    }
  }
  
  showToast('🎯 Optimized portfolio applied!');
  updateAll();
  
  // Fetch live data for all new instruments
  state.portfolio.forEach(item => {
    if (hasLivePrice(item.instrument)) {
      fetchInstrumentData(item.instrument.symbol);
    }
  });
  
  // Scroll to portfolio table
  document.getElementById('portfolio-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ═══════════════════════════════════════════
// MASTER UPDATE
// ═══════════════════════════════════════════

function updateAll() {
  renderInstrumentList();
  renderPortfolioTable();
  updateStats();
  updateCharts();
  // Auto-persist state to localStorage
  autoSaveState(state);
}

// ═══════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════

function init() {
  // Restore saved state BEFORE setting up UI
  restoreState();

  setupTabs();
  setupSearch();
  setupOptimizer();
  setupConfigInputs();

  document.getElementById('btn-save').addEventListener('click', handleSave);
  document.getElementById('btn-load').addEventListener('click', handleLoad);
  document.getElementById('btn-refresh').addEventListener('click', fetchAllPrices);

  // Initial render
  updateAll();

  // Fetch initial prices (non-blocking)
  fetchAllPrices();
}

/**
 * Restore saved portfolio state from localStorage
 */
function restoreState() {
  const saved = autoRestoreState();
  if (!saved) return;

  // Restore capital & target
  state.totalCapital = saved.totalCapital || 3000000;
  state.targetReturn = saved.targetReturn || 400000;
  state.targetMonths = saved.targetMonths || 6;
  state.quotes = saved.quotes || {};

  // Update input fields to match restored values
  document.getElementById('input-capital').value = state.totalCapital;
  document.getElementById('input-target').value = state.targetReturn;

  // Restore portfolio instruments
  if (saved.portfolio && saved.portfolio.length > 0) {
    state.portfolio = saved.portfolio.map(item => {
      // Try to find in registry first, otherwise use saved data
      let instrument = getInstrumentById(item.instrumentId);
      if (!instrument && item.instrumentData) {
        // Dynamic instrument — add it to registry
        instrument = item.instrumentData;
        addInstrument(instrument);
      }
      if (!instrument) return null;

      return {
        instrument,
        allocation: item.allocation,
        userReturn: item.userReturn,
        livePrice: state.quotes[instrument.symbol]?.price || null,
        historicalReturn: null,
        indicators: null,
      };
    }).filter(Boolean);
  }
}

/**
 * Setup configurable capital & target inputs
 */
function setupConfigInputs() {
  const capitalInput = document.getElementById('input-capital');
  const targetInput = document.getElementById('input-target');

  capitalInput.addEventListener('change', (e) => {
    const val = parseInt(e.target.value);
    if (val > 0) {
      state.totalCapital = val;
      updateAll();
    }
  });

  targetInput.addEventListener('change', (e) => {
    const val = parseInt(e.target.value);
    if (val >= 0) {
      state.targetReturn = val;
      // Also update optimizer's target field
      document.getElementById('opt-target').value = val;
      updateAll();
    }
  });
}

// Boot
document.addEventListener('DOMContentLoaded', init);
