/**
 * Portfolio Optimizer Engine
 * Suggests optimal allocation across instrument types to hit target returns
 * Uses risk-level-driven allocation templates with Sharpe-ratio sub-allocation
 */

import {
  instruments,
  INSTRUMENT_TYPES,
  INSTRUMENT_TYPE_LABELS,
  INSTRUMENT_TYPE_COLORS,
} from '../services/instrumentRegistry.js';

/**
 * Asset class profiles with expected return & volatility estimates
 */
const ASSET_CLASS_PROFILES = {
  [INSTRUMENT_TYPES.EQUITY]: {
    label: 'Equities',
    subClasses: [
      { id: 'eq-largecap', label: 'Large Cap Equities', expReturn: 13, volatility: 18, risk: 2, picks: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS', 'HINDUNILVR.NS', 'ITC.NS', 'KOTAKBANK.NS'] },
      { id: 'eq-midcap', label: 'Mid Cap Equities', expReturn: 18, volatility: 25, risk: 3, picks: ['LT.NS', 'AXISBANK.NS', 'SBIN.NS', 'BHARTIARTL.NS'] },
      { id: 'eq-highbeta', label: 'High-Beta / Small Cap', expReturn: 28, volatility: 38, risk: 4.5, picks: ['TATAMOTORS.NS', 'ADANIENT.NS'] },
    ],
  },
  [INSTRUMENT_TYPES.FUTURES]: {
    label: 'Futures',
    subClasses: [
      { id: 'fut-nifty', label: 'NIFTY 50 Futures', expReturn: 24, volatility: 28, risk: 3.5, picks: ['^NSEI'] },
      { id: 'fut-banknifty', label: 'Bank NIFTY Futures', expReturn: 32, volatility: 42, risk: 4.5, picks: ['^NSEBANK'] },
    ],
  },
  [INSTRUMENT_TYPES.BONDS]: {
    label: 'Bonds',
    subClasses: [
      { id: 'bond-govt', label: 'Govt Bonds (10Y/5Y)', expReturn: 7, volatility: 3, risk: 0.5, picks: ['GOVT-10Y', 'GOVT-5Y'] },
      { id: 'bond-corp', label: 'Corporate Bonds (AAA/AA)', expReturn: 8.5, volatility: 5, risk: 1, picks: ['CORP-AAA', 'CORP-AA'] },
    ],
  },
  [INSTRUMENT_TYPES.GOLD]: {
    label: 'Gold',
    subClasses: [
      { id: 'gold-etf', label: 'Gold ETF / SGB', expReturn: 13, volatility: 14, risk: 1.5, picks: ['GOLDBEES.NS', 'SGB'] },
    ],
  },
  [INSTRUMENT_TYPES.MF]: {
    label: 'Mutual Funds',
    subClasses: [
      { id: 'mf-largecap', label: 'Large Cap / Flexi MF', expReturn: 14, volatility: 18, risk: 2, picks: ['MF-LARGECAP', 'MF-FLEXICAP'] },
      { id: 'mf-midsmall', label: 'Mid/Small Cap MF', expReturn: 20, volatility: 28, risk: 3.5, picks: ['MF-MIDCAP', 'MF-SMALLCAP'] },
      { id: 'mf-hybrid', label: 'Hybrid / BAF', expReturn: 11, volatility: 10, risk: 1.5, picks: ['MF-HYBRID'] },
      { id: 'mf-debt', label: 'Debt MF', expReturn: 7.5, volatility: 4, risk: 0.5, picks: ['MF-DEBT'] },
      { id: 'mf-elss', label: 'ELSS Tax Saver', expReturn: 16, volatility: 22, risk: 2.5, picks: ['MF-ELSS'] },
    ],
  },
};

/**
 * Risk-level allocation templates (% by asset type)
 * These define the TARGET mix for each risk level
 */
const RISK_TEMPLATES = {
  1: { // Ultra conservative
    equity: 0, futures: 0, bonds: 55, gold: 15, mf: 30,
    mfTilt: 'debt', // prefer debt MFs
    label: 'Ultra Conservative', description: 'Capital preservation — govt bonds, debt MFs, some gold',
  },
  2: {
    equity: 0, futures: 0, bonds: 45, gold: 15, mf: 40,
    mfTilt: 'hybrid',
    label: 'Very Conservative', description: 'Stable income — bonds, hybrid MFs, gold hedge',
  },
  3: {
    equity: 10, futures: 0, bonds: 30, gold: 15, mf: 45,
    mfTilt: 'hybrid',
    label: 'Conservative', description: 'Income + growth — mostly bonds/MFs, light equity exposure',
  },
  4: {
    equity: 20, futures: 0, bonds: 20, gold: 10, mf: 50,
    mfTilt: 'largecap',
    label: 'Moderately Conservative', description: 'Balanced — diversified across large-cap equity and debt',
  },
  5: {
    equity: 30, futures: 0, bonds: 15, gold: 10, mf: 45,
    mfTilt: 'largecap',
    label: 'Moderate', description: 'Growth focus — equity-heavy with bond cushion',
  },
  6: {
    equity: 40, futures: 0, bonds: 10, gold: 10, mf: 40,
    mfTilt: 'midsmall',
    label: 'Moderately Aggressive', description: 'Growth — strong equity with mid-cap MFs',
  },
  7: {
    equity: 45, futures: 10, bonds: 5, gold: 10, mf: 30,
    mfTilt: 'midsmall',
    label: 'Aggressive', description: 'High growth — equities + futures with small bond hedge',
  },
  8: {
    equity: 50, futures: 15, bonds: 0, gold: 5, mf: 30,
    mfTilt: 'midsmall',
    label: 'Very Aggressive', description: 'Max growth — equities, futures, and aggressive MFs',
  },
  9: {
    equity: 55, futures: 20, bonds: 0, gold: 5, mf: 20,
    mfTilt: 'midsmall',
    label: 'Ultra Aggressive', description: 'High conviction — concentrated equity + leveraged futures',
  },
  10: {
    equity: 50, futures: 30, bonds: 0, gold: 0, mf: 20,
    mfTilt: 'midsmall',
    label: 'Maximum Risk', description: 'Speculative — maximum futures leverage + high-beta equities',
  },
};

/**
 * Main optimizer function
 */
export function optimizePortfolio({ totalCapital, targetReturn, months, riskLevel }) {
  const template = RISK_TEMPLATES[riskLevel] || RISK_TEMPLATES[5];
  const targetReturnPct = (targetReturn / totalCapital) * 100 * (12 / months);

  // Compute allocations from the template
  const allocations = [];
  const typeBreakdownMap = {};

  // For each asset type with non-zero allocation
  const typeMap = {
    equity: INSTRUMENT_TYPES.EQUITY,
    futures: INSTRUMENT_TYPES.FUTURES,
    bonds: INSTRUMENT_TYPES.BONDS,
    gold: INSTRUMENT_TYPES.GOLD,
    mf: INSTRUMENT_TYPES.MF,
  };

  for (const [key, type] of Object.entries(typeMap)) {
    const pct = template[key];
    if (pct <= 0) continue;

    const typeCapital = Math.round((pct / 100) * totalCapital);
    const profile = ASSET_CLASS_PROFILES[type];
    if (!profile) continue;

    // Select sub-classes based on risk level and MF tilt
    let subClasses = [...profile.subClasses];

    // For MFs, apply tilt preference
    if (type === INSTRUMENT_TYPES.MF) {
      subClasses = selectMFSubClasses(subClasses, template.mfTilt, riskLevel);
    }

    // For equities, select sub-classes based on risk level
    if (type === INSTRUMENT_TYPES.EQUITY) {
      subClasses = selectEquitySubClasses(subClasses, riskLevel);
    }

    // For futures, select based on risk
    if (type === INSTRUMENT_TYPES.FUTURES) {
      subClasses = selectFuturesSubClasses(subClasses, riskLevel);
    }

    // Distribute capital across selected sub-classes
    const subAllocations = distributeAcrossSubClasses(subClasses, typeCapital, totalCapital);
    allocations.push(...subAllocations);

    typeBreakdownMap[type] = {
      type,
      label: profile.label,
      color: INSTRUMENT_TYPE_COLORS[type],
      totalAllocation: typeCapital,
      totalPct: pct,
      subClasses: subAllocations,
    };
  }

  // Calculate portfolio metrics
  const totalAllocated = allocations.reduce((s, a) => s + a.allocation, 0);
  const portfolioReturn = allocations.reduce(
    (s, a) => s + (a.expReturn * a.allocation / totalAllocated), 0
  ) || 0;
  const portfolioReturnPeriod = portfolioReturn * (months / 12);
  const portfolioReturnAbs = totalAllocated * (portfolioReturnPeriod / 100);
  const weightedVolatility = allocations.reduce(
    (s, a) => s + (a.volatility * a.allocation / totalAllocated), 0
  ) || 0;
  const sharpe = weightedVolatility > 0 ? (portfolioReturn - 6.5) / weightedVolatility : 0;
  const meetsTarget = portfolioReturnAbs >= targetReturn;

  return {
    success: true,
    meetsTarget,
    riskProfile: { label: template.label, description: template.description },
    riskLevel,
    allocations,
    typeBreakdown: Object.values(typeBreakdownMap),
    metrics: {
      totalAllocated,
      expectedReturnPct: Math.round(portfolioReturn * 10) / 10,
      expectedReturnPctPeriod: Math.round(portfolioReturnPeriod * 10) / 10,
      expectedReturnAbs: Math.round(portfolioReturnAbs),
      weightedVolatility: Math.round(weightedVolatility * 10) / 10,
      sharpeRatio: Math.round(sharpe * 100) / 100,
      targetReturn,
      targetReturnPct: Math.round(targetReturnPct * 10) / 10,
      gap: Math.max(0, targetReturn - portfolioReturnAbs),
    },
    message: meetsTarget
      ? `✅ This allocation is projected to generate ${formatINRShort(portfolioReturnAbs)} (target: ${formatINRShort(targetReturn)}) with a ${template.label.toLowerCase()} profile.`
      : `⚠️ At risk level ${riskLevel} (${template.label}), the projected return is ${formatINRShort(portfolioReturnAbs)}. Consider increasing risk or extending horizon to reach ${formatINRShort(targetReturn)}.`,
  };
}

/**
 * Select MF sub-classes based on tilt
 */
function selectMFSubClasses(subClasses, tilt, riskLevel) {
  if (tilt === 'debt') {
    return subClasses.filter(sc => sc.id === 'mf-debt' || sc.id === 'mf-hybrid');
  }
  if (tilt === 'hybrid') {
    return subClasses.filter(sc => sc.id === 'mf-hybrid' || sc.id === 'mf-largecap' || sc.id === 'mf-debt');
  }
  if (tilt === 'largecap') {
    return subClasses.filter(sc => sc.id === 'mf-largecap' || sc.id === 'mf-hybrid' || sc.id === 'mf-elss');
  }
  if (tilt === 'midsmall') {
    const selected = [subClasses.find(sc => sc.id === 'mf-midsmall')];
    if (riskLevel <= 8) selected.push(subClasses.find(sc => sc.id === 'mf-elss'));
    if (riskLevel <= 7) selected.push(subClasses.find(sc => sc.id === 'mf-largecap'));
    return selected.filter(Boolean);
  }
  return subClasses;
}

/**
 * Select equity sub-classes based on risk level
 */
function selectEquitySubClasses(subClasses, riskLevel) {
  if (riskLevel <= 4) {
    return subClasses.filter(sc => sc.id === 'eq-largecap');
  }
  if (riskLevel <= 6) {
    return subClasses.filter(sc => sc.id === 'eq-largecap' || sc.id === 'eq-midcap');
  }
  // 7+ includes high-beta
  return subClasses;
}

/**
 * Select futures sub-classes based on risk level
 */
function selectFuturesSubClasses(subClasses, riskLevel) {
  if (riskLevel <= 8) {
    return subClasses.filter(sc => sc.id === 'fut-nifty');
  }
  return subClasses;
}

/**
 * Distribute capital across sub-classes proportional to their Sharpe ratio
 */
function distributeAcrossSubClasses(subClasses, totalTypeCapital, totalCapital) {
  if (subClasses.length === 0) return [];

  // Weight by return (prefer higher returns within the risk-filtered group)
  const totalWeight = subClasses.reduce((s, sc) => s + sc.expReturn, 0);

  return subClasses.map(sc => {
    const weight = sc.expReturn / totalWeight;
    const allocation = Math.round((weight * totalTypeCapital) / 10000) * 10000;
    return {
      ...sc,
      allocation,
      allocationPct: (allocation / totalCapital) * 100,
      expectedReturn: sc.expReturn * (allocation / totalCapital),
    };
  }).filter(a => a.allocation > 0);
}

function formatINRShort(amount) {
  if (amount >= 100000) return '₹' + (amount / 100000).toFixed(2) + 'L';
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

/**
 * Get the instrument picks for an allocation
 */
export function getAllocationPicks(allocation) {
  const picks = [];
  const perPick = Math.round(allocation.allocation / allocation.picks.length / 10000) * 10000;

  allocation.picks.forEach(pickId => {
    const instrument = instruments.find(i => i.id === pickId);
    if (instrument) {
      picks.push({
        instrument,
        suggestedAllocation: Math.max(perPick, 10000),
      });
    }
  });

  return picks;
}

/**
 * Get risk profile info
 */
export function getRiskProfile(level) {
  const template = RISK_TEMPLATES[level] || RISK_TEMPLATES[5];
  return { label: template.label, description: template.description };
}

export { RISK_TEMPLATES, ASSET_CLASS_PROFILES };
