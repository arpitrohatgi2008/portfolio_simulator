/**
 * Risk Metrics Engine
 * Portfolio-level risk analysis
 */

/**
 * Calculate portfolio risk metrics
 */
export function calculatePortfolioRisk(portfolioItems, instrumentReturns) {
  if (!portfolioItems || portfolioItems.length === 0) {
    return {
      overallRisk: 'N/A',
      riskScore: 0,
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      diversificationScore: 0,
      typeAllocation: {},
    };
  }

  const totalAllocation = portfolioItems.reduce((s, item) => s + item.allocation, 0);
  if (totalAllocation === 0) {
    return { overallRisk: 'N/A', riskScore: 0, volatility: 0, sharpeRatio: 0, maxDrawdown: 0, diversificationScore: 0, typeAllocation: {} };
  }

  // Type allocation breakdown
  const typeAllocation = {};
  portfolioItems.forEach(item => {
    const type = item.instrument.type;
    typeAllocation[type] = (typeAllocation[type] || 0) + item.allocation;
  });

  // Weighted risk score
  const riskWeights = { 'Low': 1, 'Medium': 2, 'High': 3, 'Very High': 4 };
  const weightedRiskScore = portfolioItems.reduce((sum, item) => {
    const weight = item.allocation / totalAllocation;
    return sum + (riskWeights[item.instrument.risk] || 2) * weight;
  }, 0);

  // Map score to label
  let overallRisk;
  if (weightedRiskScore <= 1.5) overallRisk = 'Low';
  else if (weightedRiskScore <= 2.5) overallRisk = 'Medium';
  else if (weightedRiskScore <= 3.2) overallRisk = 'High';
  else overallRisk = 'Very High';

  // Estimated portfolio volatility (simplified)
  const typeVolatilities = {
    equity: 22, futures: 35, bonds: 4, gold: 15, mf: 18
  };

  let portfolioVolatility = 0;
  Object.entries(typeAllocation).forEach(([type, amount]) => {
    const weight = amount / totalAllocation;
    const vol = typeVolatilities[type] || 20;
    portfolioVolatility += weight * weight * vol * vol;
  });
  // Add cross-correlations (simplified — assume 0.4 avg correlation)
  const types = Object.keys(typeAllocation);
  for (let i = 0; i < types.length; i++) {
    for (let j = i + 1; j < types.length; j++) {
      const wi = typeAllocation[types[i]] / totalAllocation;
      const wj = typeAllocation[types[j]] / totalAllocation;
      const vi = typeVolatilities[types[i]] || 20;
      const vj = typeVolatilities[types[j]] || 20;
      portfolioVolatility += 2 * wi * wj * vi * vj * 0.4;
    }
  }
  portfolioVolatility = Math.sqrt(portfolioVolatility);

  // Sharpe Ratio (risk-free = 6.5% for India)
  const riskFreeRate = 6.5;
  const weightedReturn = instrumentReturns
    ? instrumentReturns.reduce((sum, r) => sum + (r.annualReturn * r.allocation / totalAllocation), 0)
    : 0;
  const sharpeRatio = portfolioVolatility > 0
    ? (weightedReturn - riskFreeRate) / portfolioVolatility
    : 0;

  // Max drawdown estimate
  const maxDrawdown = portfolioVolatility * 1.5; // rough estimate

  // Diversification score (0-100)
  const numTypes = Object.keys(typeAllocation).length;
  const maxWeight = Math.max(...Object.values(typeAllocation).map(a => a / totalAllocation));
  const diversificationScore = Math.round(
    (numTypes / 5) * 50 + (1 - maxWeight) * 50
  );

  return {
    overallRisk,
    riskScore: Math.round(weightedRiskScore * 10) / 10,
    volatility: Math.round(portfolioVolatility * 10) / 10,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10) / 10,
    diversificationScore: Math.min(100, diversificationScore),
    typeAllocation,
  };
}

/**
 * Get risk color for a risk level
 */
export function getRiskColor(risk) {
  switch (risk) {
    case 'Low': return '#10b981';
    case 'Medium': return '#f59e0b';
    case 'High': return '#ef4444';
    case 'Very High': return '#dc2626';
    default: return '#94a3b8';
  }
}

/**
 * Get risk CSS class
 */
export function getRiskClass(risk) {
  switch (risk) {
    case 'Low': return 'risk-low';
    case 'Medium': return 'risk-medium';
    case 'High': return 'risk-high';
    case 'Very High': return 'risk-very-high';
    default: return '';
  }
}
