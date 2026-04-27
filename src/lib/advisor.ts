import { CalculationInput, CalculationResult, formatCurrency, getRiskLevel } from './calculator';

export interface AdvisorInput extends CalculationInput {
  name: string;
}

export function generateAdvice(
  input: AdvisorInput,
  results: CalculationResult
): string {
  const { name, investmentType, amount, periodYears, expectedReturn } = input;
  const { totalInvested, estimatedReturns, finalValue, wealthMultiplier, cagr, yearlyBreakdown } = results;
  const risk = getRiskLevel(expectedReturn);
  const firstName = name.split(' ')[0];

  // Milestone: find 5-year value
  const fiveYearValue = yearlyBreakdown.find(y => y.year === 5)?.value ?? 0;
  const tenYearValue = yearlyBreakdown.find(y => y.year === 10)?.value ?? 0;
  const halfwayValue = yearlyBreakdown.find(y => y.year === Math.floor(periodYears / 2))?.value ?? 0;

  const riskColor = risk === 'Low' ? 'conservative' : risk === 'Moderate' ? 'balanced' : 'aggressive';

  let advice = `Hi ${firstName}, here's our expert analysis of your financial plan:\n\n`;

  // Investment overview
  if (investmentType === 'SIP') {
    advice += `Your decision to invest ₹${amount.toLocaleString('en-IN')} every month through a Systematic Investment Plan (SIP) is one of the smartest financial moves you can make. `;
    advice += `SIPs harness the power of rupee-cost averaging — you automatically buy more units when markets dip and fewer when they rise, which smooths out market volatility over time.\n\n`;
  } else {
    advice += `Your lump sum investment of ${formatCurrency(amount)} is a powerful way to put your capital to work immediately. `;
    advice += `Unlike SIPs, a lump sum benefits from full market exposure from day one — meaning every rupee starts compounding right away.\n\n`;
  }

  // Risk profile
  advice += `**Risk Profile: ${risk} (${riskColor} strategy)**\n`;
  if (risk === 'Low') {
    advice += `With an expected return of ${expectedReturn}%, you've chosen a conservative approach. This is ideal if you prioritize capital protection over aggressive growth. Think debt funds, FDs, or large-cap equity funds with steady performance.\n\n`;
  } else if (risk === 'Moderate') {
    advice += `An expected return of ${expectedReturn}% represents a healthy balance between growth and safety. This aligns well with diversified equity mutual funds or balanced advantage funds — exactly the right space for a ${periodYears}-year horizon.\n\n`;
  } else {
    advice += `At ${expectedReturn}% expected returns, you're targeting aggressive growth. This is achievable through high-quality small/mid-cap funds or direct equity — but it requires patience during market corrections. Your ${periodYears}-year timeline gives you the runway to ride out volatility. Stay invested!\n\n`;
  }

  // Compounding magic
  advice += `**The Power of Compounding Working for You**\n`;
  advice += `You invest ${formatCurrency(totalInvested)} in total, and compounding grows it to ${formatCurrency(finalValue)} — `;
  advice += `a wealth multiplier of ${wealthMultiplier}x. Your money earns ${formatCurrency(estimatedReturns)} in returns, `;
  advice += `which is ${Math.round((estimatedReturns / totalInvested) * 100)}% more than what you put in. `;
  advice += `Albert Einstein called compound interest the 8th wonder of the world — your plan demonstrates exactly why.\n\n`;

  // Milestones
  advice += `**Key Milestones in Your Journey**\n`;
  if (fiveYearValue > 0 && periodYears >= 5) {
    advice += `• Year 5: Your corpus reaches ${formatCurrency(fiveYearValue)}\n`;
  }
  if (tenYearValue > 0 && periodYears >= 10) {
    advice += `• Year 10: Your wealth grows to ${formatCurrency(tenYearValue)}\n`;
  }
  if (halfwayValue > 0 && periodYears > 4) {
    advice += `• Year ${Math.floor(periodYears / 2)} (Halfway): ${formatCurrency(halfwayValue)} — you're building serious momentum!\n`;
  }
  advice += `• Year ${periodYears} (Goal): ${formatCurrency(finalValue)} — your financial target achieved!\n\n`;

  // Suitability
  advice += `**Why This Plan Is Suitable for You**\n`;
  advice += `Your ${periodYears}-year investment horizon is ${periodYears >= 10 ? 'excellent' : periodYears >= 5 ? 'good' : 'adequate'}. `;
  if (periodYears >= 10) {
    advice += `Long-term investors historically have never lost money in diversified equity over any 10+ year period in India's market history. You're in a very strong position.\n\n`;
  } else if (periodYears >= 5) {
    advice += `A 5-7 year horizon is sufficient for equity investments to demonstrate their full potential through complete market cycles.\n\n`;
  } else {
    advice += `For shorter horizons, consider debt-heavy allocation to protect capital while still growing it steadily.\n\n`;
  }

  // Final recommendation
  advice += `**Our Recommendation**\n`;
  advice += `Stay the course. The biggest risk in investing is not market volatility — it's stopping your investments during a downturn. `;
  advice += `Review your plan annually and consider increasing your ${investmentType === 'SIP' ? 'SIP amount by 10% each year (step-up SIP)' : 'portfolio allocation'} as your income grows. `;
  advice += `This single habit can multiply your final corpus by an additional 1.5-2x over your investment period.\n\n`;
  advice += `Your financial future looks bright, ${firstName}. Let's make it happen! 🚀`;

  return advice;
}
