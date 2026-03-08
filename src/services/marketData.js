/**
 * Market Data Service
 * Fetches real-time and historical prices via Yahoo Finance CORS proxy
 */

const CORS_PROXY = 'https://corsproxy.io/?url=';
const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance';

// Cache to reduce API calls
const priceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch a quote for a given Yahoo Finance symbol
 */
export async function fetchQuote(symbol) {
  const cacheKey = `quote:${symbol}`;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `${CORS_PROXY}${encodeURIComponent(`${YAHOO_BASE}/chart/${symbol}?interval=1d&range=1d`)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const result = json.chart?.result?.[0];
    if (!result) throw new Error('No data');

    const meta = result.meta;
    const quote = {
      symbol: meta.symbol,
      price: meta.regularMarketPrice,
      previousClose: meta.chartPreviousClose || meta.previousClose,
      change: meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice),
      changePercent: ((meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice)) / (meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice) * 100),
      currency: meta.currency,
      exchange: meta.exchangeName,
      timestamp: Date.now()
    };

    priceCache.set(cacheKey, { data: quote, timestamp: Date.now() });
    return quote;
  } catch (err) {
    console.warn(`Failed to fetch quote for ${symbol}:`, err.message);
    return null;
  }
}

/**
 * Fetch historical data for a symbol
 * @param {string} symbol 
 * @param {string} range - 1mo, 3mo, 6mo, 1y, 2y, 5y
 */
export async function fetchHistoricalData(symbol, range = '1y') {
  const cacheKey = `hist:${symbol}:${range}`;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `${CORS_PROXY}${encodeURIComponent(`${YAHOO_BASE}/chart/${symbol}?interval=1d&range=${range}`)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const result = json.chart?.result?.[0];
    if (!result) throw new Error('No data');

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const volumes = result.indicators?.quote?.[0]?.volume || [];

    const data = timestamps.map((ts, i) => ({
      date: new Date(ts * 1000),
      close: closes[i],
      volume: volumes[i]
    })).filter(d => d.close !== null);

    priceCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (err) {
    console.warn(`Failed to fetch historical data for ${symbol}:`, err.message);
    return [];
  }
}

/**
 * Calculate simple technical indicators from historical data
 */
export function calculateIndicators(historicalData) {
  if (!historicalData || historicalData.length < 20) {
    return { sma20: null, sma50: null, sma200: null, momentum: 'neutral', rsi: 50 };
  }

  const closes = historicalData.map(d => d.close);
  const len = closes.length;

  const sma = (arr, period) => {
    if (arr.length < period) return null;
    const slice = arr.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  };

  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, Math.min(200, len));
  const currentPrice = closes[len - 1];

  // Simple momentum: price vs moving averages
  let momentum = 'neutral';
  if (sma50 && currentPrice > sma50 * 1.02) momentum = 'bullish';
  else if (sma50 && currentPrice < sma50 * 0.98) momentum = 'bearish';

  // Simplified RSI (14-period)
  let rsi = 50;
  if (closes.length >= 15) {
    let gains = 0, losses = 0;
    for (let i = len - 14; i < len; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    if (avgLoss === 0) rsi = 100;
    else {
      const rs = avgGain / avgLoss;
      rsi = 100 - (100 / (1 + rs));
    }
  }

  return { sma20, sma50, sma200, momentum, rsi: Math.round(rsi) };
}

/**
 * Calculate historical return (CAGR-style) from price data
 */
export function calculateHistoricalReturn(historicalData) {
  if (!historicalData || historicalData.length < 20) return null;

  const startPrice = historicalData[0].close;
  const endPrice = historicalData[historicalData.length - 1].close;
  const days = (historicalData[historicalData.length - 1].date - historicalData[0].date) / (1000 * 60 * 60 * 24);
  const years = days / 365;

  if (years <= 0 || startPrice <= 0) return null;

  const totalReturn = (endPrice - startPrice) / startPrice;
  const cagr = Math.pow(1 + totalReturn, 1 / years) - 1;

  return {
    totalReturn: totalReturn * 100,
    cagr: cagr * 100,
    days: Math.round(days),
    volatility: calculateVolatility(historicalData)
  };
}

/**
 * Calculate annualized volatility from historical data
 */
export function calculateVolatility(historicalData) {
  if (!historicalData || historicalData.length < 20) return null;

  const closes = historicalData.map(d => d.close);
  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const dailyVol = Math.sqrt(variance);
  const annualizedVol = dailyVol * Math.sqrt(252);

  return annualizedVol * 100;
}

/**
 * Batch fetch quotes for multiple symbols
 */
export async function fetchMultipleQuotes(symbols) {
  const results = {};
  const batchSize = 5;
  
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map(async (sym) => {
      const quote = await fetchQuote(sym);
      if (quote) results[sym] = quote;
    });
    await Promise.all(promises);
    
    // Small delay between batches to respect rate limits
    if (i + batchSize < symbols.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  return results;
}

/**
 * Search for stocks/instruments via Yahoo Finance autocomplete
 * Returns matching instruments across all exchanges
 * @param {string} query - search string (company name or symbol)
 */
export async function searchYahooFinance(query) {
  if (!query || query.length < 2) return [];

  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `${CORS_PROXY}${encodeURIComponent(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0&listsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`
    )}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const results = (json.quotes || [])
      .filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'MUTUALFUND' || q.quoteType === 'INDEX')
      .map(q => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        shortName: q.shortname || q.symbol.replace('.NS', '').replace('.BO', ''),
        exchange: q.exchange,
        exchangeDisplay: q.exchDisp,
        quoteType: q.quoteType,
        isNSE: q.symbol.endsWith('.NS'),
        isBSE: q.symbol.endsWith('.BO'),
        isIndian: q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO'),
      }));

    priceCache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  } catch (err) {
    console.warn('Yahoo Finance search failed:', err.message);
    return [];
  }
}

export function clearCache() {
  priceCache.clear();
}
