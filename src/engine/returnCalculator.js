/**
 * Return Calculator Engine
 * Calculates expected returns per instrument and portfolio-level
 */

/**
 * Calculate expected return for an instrument over a given period
 * @param {Object} instrument - instrument from registry
 * @param {number} allocation - amount allocated in INR
 * @param {number} months - investment horizon in months
 * @param {Object} options - { historicalReturn, momentum, userOverride }
 * @returns {Object} return details
 */
export function calculateInstrumentReturn(instrument, allocation, months = 6, options = {}) {
  const { historicalReturn, momentum, userOverride } = options;

  // Determine the expected annual return rate
  let annualReturn;
  
  if (userOverride !== undefined && userOverride !== null) {
    // User override takes highest priority
    annualReturn = userOverride;
  } else {
    // Blend historical + default + momentum
    annualReturn = blendReturnEstimate(instrument, historicalReturn, momentum);
  }

  // Convert annual return to the period return
  const periodReturn = annualReturn * (months / 12);

  // Calculate absolute return
  const absoluteReturn = allocation * (periodReturn / 100);

  // Risk-adjusted return (simplified)
  const riskMultiplier = getRiskMultiplier(instrument.risk);
  const bestCase = absoluteReturn * (1 + riskMultiplier * 0.5);
  const worstCase = absoluteReturn * (1 - riskMultiplier * 0.8);

  return {
    instrumentId: instrument.id,
    allocation,
    annualReturn,
    periodReturn,
    absoluteReturn,
    bestCase,
    worstCase,
    months,
  };
}

/**
 * Blend different return estimates into a single expected return
 */
function blendReturnEstimate(instrument, historicalReturn, momentum) {
  const defaultReturn = instrument.expectedReturn;

  // Fixed-yield instruments always use their fixed rate
  if (instrument.isFixed && instrument.fixedYield) {
    return instrument.fixedYield;
  }

  let estimate = defaultReturn;

  // If we have historical data, blend it in (60% historical, 40% default)
  if (historicalReturn && historicalReturn.cagr) {
    estimate = historicalReturn.cagr * 0.6 + defaultReturn * 0.4;
  }

  // Adjust based on momentum (±10% of the estimate)
  if (momentum) {
    if (momentum === 'bullish') estimate *= 1.10;
    else if (momentum === 'bearish') estimate *= 0.90;
  }

  return Math.round(estimate * 10) / 10;
}

/**
 * Get risk multiplier for volatility adjustments
 */
function getRiskMultiplier(riskLevel) {
  switch (riskLevel) {
    case 'Low': return 0.15;
    case 'Medium': return 0.30;
    case 'High': return 0.50;
    case 'Very High': return 0.75;
    default: return 0.30;
  }
}

/**
 * Calculate portfolio-level aggregate returns
 * @param {Array} instrumentReturns - array of individual instrument returns
 * @param {number} totalCapital - total capital deployed
 * @returns {Object} portfolio summary
 */
export function calculatePortfolioReturn(instrumentReturns, totalCapital) {
  if (!instrumentReturns || instrumentReturns.length === 0) {
    return {
      totalAllocated: 0,
      unallocated: totalCapital,
      expectedReturn: 0,
      expectedReturnPercent: 0,
      bestCase: 0,
      worstCase: 0,
      weightedAnnualReturn: 0,
      instruments: [],
    };
  }

  const totalAllocated = instrumentReturns.reduce((sum, r) => sum + r.allocation, 0);
  const expectedReturn = instrumentReturns.reduce((sum, r) => sum + r.absoluteReturn, 0);
  const bestCase = instrumentReturns.reduce((sum, r) => sum + r.bestCase, 0);
  const worstCase = instrumentReturns.reduce((sum, r) => sum + r.worstCase, 0);

  // Weighted average annual return
  const weightedAnnualReturn = totalAllocated > 0
    ? instrumentReturns.reduce((sum, r) => sum + (r.annualReturn * r.allocation), 0) / totalAllocated
    : 0;

  return {
    totalAllocated,
    unallocated: totalCapital - totalAllocated,
    expectedReturn,
    expectedReturnPercent: totalAllocated > 0 ? (expectedReturn / totalAllocated) * 100 : 0,
    bestCase,
    worstCase,
    weightedAnnualReturn: Math.round(weightedAnnualReturn * 10) / 10,
    instruments: instrumentReturns,
  };
}

/**
 * Generate monthly projection data for chart
 * @param {number} totalCapital 
 * @param {number} annualReturn - weighted annual return %
 * @param {number} months 
 * @param {number} volatility - annualized volatility %
 */
export function generateProjection(totalCapital, annualReturn, months = 6, volatility = 15) {
  const monthlyReturn = annualReturn / 12 / 100;
  const monthlyVol = volatility / Math.sqrt(12) / 100;

  const expected = [];
  const optimistic = [];
  const pessimistic = [];

  for (let m = 0; m <= months; m++) {
    const expValue = totalCapital * Math.pow(1 + monthlyReturn, m);
    const optValue = totalCapital * Math.pow(1 + monthlyReturn + monthlyVol, m);
    const pesValue = totalCapital * Math.pow(1 + monthlyReturn - monthlyVol, m);

    expected.push({ month: m, value: Math.round(expValue) });
    optimistic.push({ month: m, value: Math.round(optValue) });
    pessimistic.push({ month: m, value: Math.round(pesValue) });
  }

  return { expected, optimistic, pessimistic };
}

/**
 * Calculate how much more return is needed to hit target
 */
export function calculateGapToTarget(currentExpectedReturn, targetReturn) {
  const gap = targetReturn - currentExpectedReturn;
  const percentage = currentExpectedReturn / targetReturn * 100;
  
  return {
    gap: Math.max(0, gap),
    surplus: Math.max(0, -gap),
    percentage: Math.min(100, Math.max(0, percentage)),
    isOnTrack: currentExpectedReturn >= targetReturn,
  };
}
