/**
 * Instrument Registry
 * Pre-built catalog of popular Indian market instruments
 */

export const INSTRUMENT_TYPES = {
  EQUITY: 'equity',
  FUTURES: 'futures',
  BONDS: 'bonds',
  GOLD: 'gold',
  MF: 'mf'
};

export const INSTRUMENT_TYPE_LABELS = {
  [INSTRUMENT_TYPES.EQUITY]: 'Equities',
  [INSTRUMENT_TYPES.FUTURES]: 'Futures',
  [INSTRUMENT_TYPES.BONDS]: 'Bonds',
  [INSTRUMENT_TYPES.GOLD]: 'Gold',
  [INSTRUMENT_TYPES.MF]: 'Mutual Funds'
};

export const INSTRUMENT_TYPE_COLORS = {
  [INSTRUMENT_TYPES.EQUITY]: '#6366f1',
  [INSTRUMENT_TYPES.FUTURES]: '#ec4899',
  [INSTRUMENT_TYPES.BONDS]: '#10b981',
  [INSTRUMENT_TYPES.GOLD]: '#f59e0b',
  [INSTRUMENT_TYPES.MF]: '#3b82f6'
};

export const RISK_LEVELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  VERY_HIGH: 'Very High'
};

/**
 * Master instrument registry
 */
export const instruments = [
  // ═══ EQUITIES (NSE) ═══
  {
    id: 'RELIANCE.NS',
    symbol: 'RELIANCE.NS',
    name: 'Reliance Industries',
    shortName: 'RELIANCE',
    type: INSTRUMENT_TYPES.EQUITY,
    sector: 'Energy/Conglomerate',
    risk: RISK_LEVELS.MEDIUM,
    description: 'India\'s largest company by market cap',
    expectedReturn: 15, // annualized default estimate
  },
  {
    id: 'TCS.NS',
    symbol: 'TCS.NS',
    name: 'Tata Consultancy Services',
    shortName: 'TCS',
    type: INSTRUMENT_TYPES.EQUITY,
    sector: 'IT Services',
    risk: RISK_LEVELS.MEDIUM,
    expectedReturn: 12,
  },
  {
    id: 'HDFCBANK.NS',
    symbol: 'HDFCBANK.NS',
    name: 'HDFC Bank',
    shortName: 'HDFCBANK',
    type: INSTRUMENT_TYPES.EQUITY,
    sector: 'Banking',
    risk: RISK_LEVELS.MEDIUM,
    expectedReturn: 14,
  },
  {
    id: 'INFY.NS',
    symbol: 'INFY.NS',
    name: 'Infosys',
    shortName: 'INFY',
    type: INSTRUMENT_TYPES.EQUITY,
    sector: 'IT Services',
    risk: RISK_LEVELS.MEDIUM,
    expectedReturn: 12,
  },
  {
    id: 'ICICIBANK.NS',
    symbol: 'ICICIBANK.NS',
    name: 'ICICI Bank',
    shortName: 'ICICIBANK',
    type: INSTRUMENT_TYPES.EQUITY,
    sector: 'Banking',
    risk: RISK_LEVELS.MEDIUM,
    expectedReturn: 16,
  },
  {
    id: 'HINDUNILVR.NS',
    symbol: 'HINDUNILVR.NS',
    name: 'Hindustan Unilever',
    shortName: 'HINDUNILVR',
    type: INSTRUMENT_TYPES.EQUITY,
    sector: 'FMCG',
    risk: RISK_LEVELS.LOW,
    expectedReturn: 10,
  },
  {
    id: 'SBIN.NS',
    symbol: 'SBIN.NS',
    name: 'State Bank of India',
    shortName: 'SBIN',
    type: INSTRUMENT_TYPES.EQUITY,
    sector: 'Banking',
    risk: RISK_LEVELS.MEDIUM,
    expectedReturn: 18,
  },
  {
    id: 'BHARTIARTL.NS',
    symbol: 'BHARTIARTL.NS',
    name: 'Bharti Airtel',
    shortName: 'BHARTIARTL',
    type: INSTRUMENT_TYPES.EQUITY,
    sector: 'Telecom',
    risk: RISK_LEVELS.MEDIUM,
    expectedReturn: 20,
  },
  {
    id: 'ITC.NS',
    symbol: 'ITC.NS',
    name: 'ITC Limited',
    shortName: 'ITC',
    type: INSTRUMENT_TYPES.EQUITY,
    sector: 'FMCG/Tobacco',
    risk: RISK_LEVELS.LOW,
    expectedReturn: 12,
  },
  {
    id: 'KOTAKBANK.NS',
    symbol: 'KOTAKBANK.NS',
    name: 'Kotak Mahindra Bank',
    shortName: 'KOTAKBANK',
    type: INSTRUMENT_TYPES.EQUITY,
    sector: 'Banking',
    risk: RISK_LEVELS.MEDIUM,
    expectedReturn: 14,
  },
  {
    id: 'LT.NS',
    symbol: 'LT.NS',
    name: 'Larsen & Toubro',
    shortName: 'L&T',
    type: INSTRUMENT_TYPES.EQUITY,
    sector: 'Infrastructure',
    risk: RISK_LEVELS.MEDIUM,
    expectedReturn: 16,
  },
  {
    id: 'AXISBANK.NS',
    symbol: 'AXISBANK.NS',
    name: 'Axis Bank',
    shortName: 'AXISBANK',
    type: INSTRUMENT_TYPES.EQUITY,
    sector: 'Banking',
    risk: RISK_LEVELS.MEDIUM,
    expectedReturn: 15,
  },
  {
    id: 'TATAMOTORS.NS',
    symbol: 'TATAMOTORS.NS',
    name: 'Tata Motors',
    shortName: 'TATAMOTORS',
    type: INSTRUMENT_TYPES.EQUITY,
    sector: 'Automobile',
    risk: RISK_LEVELS.HIGH,
    expectedReturn: 22,
  },
  {
    id: 'ADANIENT.NS',
    symbol: 'ADANIENT.NS',
    name: 'Adani Enterprises',
    shortName: 'ADANIENT',
    type: INSTRUMENT_TYPES.EQUITY,
    sector: 'Conglomerate',
    risk: RISK_LEVELS.VERY_HIGH,
    expectedReturn: 30,
  },
  {
    id: 'WIPRO.NS',
    symbol: 'WIPRO.NS',
    name: 'Wipro',
    shortName: 'WIPRO',
    type: INSTRUMENT_TYPES.EQUITY,
    sector: 'IT Services',
    risk: RISK_LEVELS.MEDIUM,
    expectedReturn: 10,
  },

  // ═══ FUTURES ═══
  {
    id: '^NSEI',
    symbol: '^NSEI',
    name: 'NIFTY 50 Index',
    shortName: 'NIFTY',
    type: INSTRUMENT_TYPES.FUTURES,
    sector: 'Index',
    risk: RISK_LEVELS.HIGH,
    expectedReturn: 24,
    description: 'NIFTY 50 futures — leveraged exposure to top 50 stocks',
    leverage: 5,
  },
  {
    id: '^NSEBANK',
    symbol: '^NSEBANK',
    name: 'BANK NIFTY Index',
    shortName: 'BANKNIFTY',
    type: INSTRUMENT_TYPES.FUTURES,
    sector: 'Index',
    risk: RISK_LEVELS.VERY_HIGH,
    expectedReturn: 30,
    description: 'Bank Nifty futures — leveraged banking sector exposure',
    leverage: 5,
  },
  {
    id: 'NIFTYMID50.NS',
    symbol: '^NSEMDCP50',
    name: 'NIFTY Midcap 50',
    shortName: 'MIDCAP',
    type: INSTRUMENT_TYPES.FUTURES,
    sector: 'Index',
    risk: RISK_LEVELS.VERY_HIGH,
    expectedReturn: 28,
    description: 'Midcap futures — high volatility, high potential',
    leverage: 3,
  },

  // ═══ BONDS ═══
  {
    id: 'GOVT-10Y',
    symbol: 'GOVT-10Y',
    name: 'Government Bond (10Y)',
    shortName: 'GSEC 10Y',
    type: INSTRUMENT_TYPES.BONDS,
    sector: 'Government',
    risk: RISK_LEVELS.LOW,
    expectedReturn: 7.1,
    description: 'Indian Government 10-Year Bond — ~7.1% yield',
    isFixed: true,
    fixedYield: 7.1,
  },
  {
    id: 'GOVT-5Y',
    symbol: 'GOVT-5Y',
    name: 'Government Bond (5Y)',
    shortName: 'GSEC 5Y',
    type: INSTRUMENT_TYPES.BONDS,
    sector: 'Government',
    risk: RISK_LEVELS.LOW,
    expectedReturn: 6.8,
    description: 'Indian Government 5-Year Bond — ~6.8% yield',
    isFixed: true,
    fixedYield: 6.8,
  },
  {
    id: 'CORP-AAA',
    symbol: 'CORP-AAA',
    name: 'Corporate Bond (AAA)',
    shortName: 'CORP AAA',
    type: INSTRUMENT_TYPES.BONDS,
    sector: 'Corporate',
    risk: RISK_LEVELS.LOW,
    expectedReturn: 8.2,
    description: 'AAA-rated corporate bond — ~8.2% yield',
    isFixed: true,
    fixedYield: 8.2,
  },
  {
    id: 'CORP-AA',
    symbol: 'CORP-AA',
    name: 'Corporate Bond (AA)',
    shortName: 'CORP AA',
    type: INSTRUMENT_TYPES.BONDS,
    sector: 'Corporate',
    risk: RISK_LEVELS.MEDIUM,
    expectedReturn: 9.5,
    description: 'AA-rated corporate bond — ~9.5% yield',
    isFixed: true,
    fixedYield: 9.5,
  },
  {
    id: 'TAX-FREE',
    symbol: 'TAX-FREE',
    name: 'Tax-Free Bond',
    shortName: 'TAX FREE',
    type: INSTRUMENT_TYPES.BONDS,
    sector: 'Government/PSU',
    risk: RISK_LEVELS.LOW,
    expectedReturn: 5.5,
    description: 'Tax-free bonds from PSU issuers — ~5.5% yield (tax-free)',
    isFixed: true,
    fixedYield: 5.5,
  },

  // ═══ GOLD ═══
  {
    id: 'GOLDBEES.NS',
    symbol: 'GOLDBEES.NS',
    name: 'Nippon Gold ETF',
    shortName: 'GOLDBEES',
    type: INSTRUMENT_TYPES.GOLD,
    sector: 'Commodity',
    risk: RISK_LEVELS.MEDIUM,
    expectedReturn: 12,
    description: 'Gold ETF tracking domestic gold prices',
  },
  {
    id: 'SGB',
    symbol: 'SGB',
    name: 'Sovereign Gold Bond',
    shortName: 'SGB',
    type: INSTRUMENT_TYPES.GOLD,
    sector: 'Government',
    risk: RISK_LEVELS.LOW,
    expectedReturn: 14.5,
    description: 'RBI Sovereign Gold Bond — gold price appreciation + 2.5% annual interest',
    fixedBonus: 2.5,
  },
  {
    id: 'GC=F',
    symbol: 'GC=F',
    name: 'Gold Futures (International)',
    shortName: 'GOLD FUT',
    type: INSTRUMENT_TYPES.GOLD,
    sector: 'Commodity',
    risk: RISK_LEVELS.HIGH,
    expectedReturn: 15,
    description: 'International gold futures price in USD',
  },

  // ═══ MUTUAL FUNDS ═══
  {
    id: 'MF-LARGECAP',
    symbol: 'MF-LARGECAP',
    name: 'Large Cap Index Fund',
    shortName: 'LARGECAP',
    type: INSTRUMENT_TYPES.MF,
    sector: 'Equity - Large Cap',
    risk: RISK_LEVELS.MEDIUM,
    expectedReturn: 13,
    description: 'Nifty 50 index fund — diversified large-cap exposure',
  },
  {
    id: 'MF-MIDCAP',
    symbol: 'MF-MIDCAP',
    name: 'Mid Cap Growth Fund',
    shortName: 'MIDCAP',
    type: INSTRUMENT_TYPES.MF,
    sector: 'Equity - Mid Cap',
    risk: RISK_LEVELS.HIGH,
    expectedReturn: 18,
    description: 'Actively managed mid-cap fund — higher growth potential',
  },
  {
    id: 'MF-SMALLCAP',
    symbol: 'MF-SMALLCAP',
    name: 'Small Cap Fund',
    shortName: 'SMALLCAP',
    type: INSTRUMENT_TYPES.MF,
    sector: 'Equity - Small Cap',
    risk: RISK_LEVELS.VERY_HIGH,
    expectedReturn: 22,
    description: 'Small-cap fund — highest growth with highest risk',
  },
  {
    id: 'MF-FLEXICAP',
    symbol: 'MF-FLEXICAP',
    name: 'Flexi Cap Fund',
    shortName: 'FLEXICAP',
    type: INSTRUMENT_TYPES.MF,
    sector: 'Equity - Flexi Cap',
    risk: RISK_LEVELS.MEDIUM,
    expectedReturn: 15,
    description: 'Flexible allocation across market caps',
  },
  {
    id: 'MF-DEBT',
    symbol: 'MF-DEBT',
    name: 'Short Duration Debt Fund',
    shortName: 'DEBT FUND',
    type: INSTRUMENT_TYPES.MF,
    sector: 'Debt',
    risk: RISK_LEVELS.LOW,
    expectedReturn: 7.5,
    description: 'Short-duration debt fund — stable income',
  },
  {
    id: 'MF-HYBRID',
    symbol: 'MF-HYBRID',
    name: 'Balanced Advantage Fund',
    shortName: 'BAF',
    type: INSTRUMENT_TYPES.MF,
    sector: 'Hybrid',
    risk: RISK_LEVELS.MEDIUM,
    expectedReturn: 11,
    description: 'Dynamic equity-debt allocation based on market valuations',
  },
  {
    id: 'MF-ELSS',
    symbol: 'MF-ELSS',
    name: 'ELSS Tax Saver Fund',
    shortName: 'ELSS',
    type: INSTRUMENT_TYPES.MF,
    sector: 'Equity - Tax Saver',
    risk: RISK_LEVELS.HIGH,
    expectedReturn: 16,
    description: 'Tax-saving equity fund — 3-year lock-in, Sec 80C benefit',
  },
];

/**
 * Get instruments filtered by type
 */
export function getInstrumentsByType(type) {
  return instruments.filter(i => i.type === type);
}

/**
 * Search instruments by name or symbol
 */
export function searchInstruments(query) {
  const q = query.toLowerCase().trim();
  if (!q) return instruments;
  return instruments.filter(i =>
    i.name.toLowerCase().includes(q) ||
    i.shortName.toLowerCase().includes(q) ||
    i.symbol.toLowerCase().includes(q) ||
    i.sector.toLowerCase().includes(q)
  );
}

/**
 * Get a single instrument by ID
 */
export function getInstrumentById(id) {
  return instruments.find(i => i.id === id);
}

/**
 * Check if instrument has real-time price data (Yahoo symbol)
 */
export function hasLivePrice(instrument) {
  return instrument.symbol.includes('.NS') || instrument.symbol.startsWith('^') || instrument.symbol.includes('=') || instrument.symbol.includes('.BO');
}

/**
 * Create dynamic instrument from Yahoo Finance search result
 */
export function createDynamicInstrument(searchResult) {
  const symbol = searchResult.symbol;
  const existing = instruments.find(i => i.symbol === symbol);
  if (existing) return existing;

  // Determine type
  let type = INSTRUMENT_TYPES.EQUITY;
  if (searchResult.quoteType === 'ETF') type = INSTRUMENT_TYPES.MF;
  else if (searchResult.quoteType === 'MUTUALFUND') type = INSTRUMENT_TYPES.MF;
  else if (searchResult.quoteType === 'INDEX') type = INSTRUMENT_TYPES.FUTURES;

  // Determine risk based on exchange/type
  let risk = RISK_LEVELS.MEDIUM;
  if (type === INSTRUMENT_TYPES.FUTURES) risk = RISK_LEVELS.HIGH;
  if (type === INSTRUMENT_TYPES.MF) risk = RISK_LEVELS.MEDIUM;

  const shortName = searchResult.shortName || symbol.replace('.NS', '').replace('.BO', '');

  return {
    id: symbol,
    symbol: symbol,
    name: searchResult.name,
    shortName: shortName.substring(0, 12),
    type,
    sector: searchResult.exchangeDisplay || (searchResult.isNSE ? 'NSE' : searchResult.isBSE ? 'BSE' : 'Global'),
    risk,
    expectedReturn: 15, // default, user can override
    isDynamic: true,
  };
}

/**
 * Add a dynamic instrument to the registry if not already present
 */
export function addInstrument(instrument) {
  const existing = instruments.find(i => i.id === instrument.id);
  if (!existing) {
    instruments.push(instrument);
  }
  return instrument;
}

/**
 * Get all instruments for optimizer
 */
export function getAllInstruments() {
  return [...instruments];
}
