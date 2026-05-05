export interface CalculationInput {
  investmentType: 'SIP' | 'LUMPSUM' | 'SWP';
  amount: number;           // monthly SIP / one-time lump sum / initial corpus (SWP)
  periodYears: number;
  expectedReturn: number;   // annual % rate
  withdrawalAmount?: number; // SWP: fixed monthly withdrawal
}

export interface YearlyBreakdown {
  year: number;
  invested: number;   // SIP: cumulative | LUMPSUM: constant | SWP: initial corpus
  value: number;      // portfolio / corpus value at end of year
  returns: number;    // SIP/LUMPSUM: total returns | SWP: cumulative withdrawn
  growthPercent: number;
}

export interface CalculationResult {
  totalInvested: number;
  estimatedReturns: number;
  finalValue: number;
  yearlyBreakdown: YearlyBreakdown[];
  cagr: number;
  wealthMultiplier: number;
  // SWP-specific (undefined for SIP/LUMPSUM)
  totalWithdrawn?: number;
  remainingCorpus?: number;
  corpusDepletesAtYear?: number | null;
}

/**
 * SIP Formula — Groww-compatible
 *
 * Monthly rate (geometric, not simple division):
 *   r = (1 + annualRate)^(1/12) - 1
 *
 * Final Value (annuity-due — payments at START of each month):
 *   FV = P × [((1 + r)^n - 1) / r] × (1 + r)
 */
export function calculateSIP(input: CalculationInput): CalculationResult {
  const { amount, periodYears, expectedReturn } = input;

  const annualRate = expectedReturn / 100;
  const r = Math.pow(1 + annualRate, 1 / 12) - 1;
  const n = periodYears * 12;
  const totalInvested = amount * n;

  const sipFV = (months: number): number => {
    if (r === 0) return amount * months;
    return amount * (((Math.pow(1 + r, months) - 1) / r) * (1 + r));
  };

  const finalValue = sipFV(n);
  const estimatedReturns = finalValue - totalInvested;

  const yearlyBreakdown: YearlyBreakdown[] = [];
  for (let year = 1; year <= periodYears; year++) {
    const months = year * 12;
    const invested = amount * months;
    const value = sipFV(months);
    const prevValue = year === 1 ? amount * 12 : yearlyBreakdown[year - 2].value;
    yearlyBreakdown.push({
      year,
      invested: Math.round(invested),
      value: Math.round(value),
      returns: Math.round(value - invested),
      growthPercent: parseFloat(((value - prevValue) / prevValue * 100).toFixed(2)),
    });
  }

  const cagr = Math.pow(finalValue / totalInvested, 1 / periodYears) - 1;

  return {
    totalInvested: Math.round(totalInvested),
    estimatedReturns: Math.round(estimatedReturns),
    finalValue: Math.round(finalValue),
    yearlyBreakdown,
    cagr: parseFloat((cagr * 100).toFixed(2)),
    wealthMultiplier: parseFloat((finalValue / totalInvested).toFixed(2)),
  };
}

/**
 * Lump Sum Formula — Groww-compatible
 *   FV = P × (1 + r)^n   (annual compounding)
 */
export function calculateLumpSum(input: CalculationInput): CalculationResult {
  const { amount, periodYears, expectedReturn } = input;
  const r = expectedReturn / 100;
  const totalInvested = amount;
  const finalValue = amount * Math.pow(1 + r, periodYears);
  const estimatedReturns = finalValue - totalInvested;

  const yearlyBreakdown: YearlyBreakdown[] = [];
  for (let year = 1; year <= periodYears; year++) {
    const value = amount * Math.pow(1 + r, year);
    const prevValue = year === 1 ? amount : yearlyBreakdown[year - 2].value;
    yearlyBreakdown.push({
      year,
      invested: Math.round(totalInvested),
      value: Math.round(value),
      returns: Math.round(value - totalInvested),
      growthPercent: parseFloat(((value - prevValue) / prevValue * 100).toFixed(2)),
    });
  }

  return {
    totalInvested: Math.round(totalInvested),
    estimatedReturns: Math.round(estimatedReturns),
    finalValue: Math.round(finalValue),
    yearlyBreakdown,
    cagr: expectedReturn,
    wealthMultiplier: parseFloat((finalValue / totalInvested).toFixed(2)),
  };
}

/**
 * SWP Formula — Systematic Withdrawal Plan
 *
 * Monthly rate: r = (1 + annual_rate)^(1/12) - 1
 *
 * Each month:
 *   1. Corpus grows: corpus = corpus × (1 + r)
 *   2. Withdraw:     corpus = corpus − W
 *
 * Corpus after n months (closed form):
 *   FV = PV × (1+r)^n − W × [((1+r)^n − 1) / r]
 *
 * Corpus depletes when FV ≤ 0.
 * If W ≤ PV × r, corpus is self-sustaining (grows forever).
 */
export function calculateSWP(input: CalculationInput): CalculationResult {
  const { amount, periodYears, expectedReturn, withdrawalAmount = 0 } = input;

  const annualRate = expectedReturn / 100;
  const r = Math.pow(1 + annualRate, 1 / 12) - 1;

  // Simulate month-by-month for accuracy
  let corpus = amount;
  let totalWithdrawn = 0;
  let corpusDepletesAtYear: number | null = null;

  const yearlyBreakdown: YearlyBreakdown[] = [];

  for (let year = 1; year <= periodYears; year++) {
    for (let month = 1; month <= 12; month++) {
      if (corpus <= 0) break;
      corpus = corpus * (1 + r);               // grow
      const withdrawal = Math.min(withdrawalAmount, corpus);
      corpus -= withdrawal;
      totalWithdrawn += withdrawal;
    }

    if (corpus <= 0 && corpusDepletesAtYear === null) {
      corpusDepletesAtYear = year;
      corpus = 0;
    }

    const prevValue = year === 1 ? amount : Math.max(0, yearlyBreakdown[year - 2].value);
    const currentValue = Math.max(0, corpus);

    yearlyBreakdown.push({
      year,
      invested: Math.round(amount),        // initial corpus (constant reference)
      value: Math.round(currentValue),     // corpus remaining
      returns: Math.round(totalWithdrawn), // cumulative withdrawn
      growthPercent: prevValue > 0
        ? parseFloat(((currentValue - prevValue) / prevValue * 100).toFixed(2))
        : -100,
    });
  }

  const finalValue = Math.max(0, corpus);
  // Total interest earned = what you got out (withdrawn + remaining) minus what you put in
  const estimatedReturns = finalValue + totalWithdrawn - amount;

  return {
    totalInvested: Math.round(amount),
    estimatedReturns: Math.round(estimatedReturns),
    finalValue: Math.round(finalValue),
    yearlyBreakdown,
    cagr: parseFloat(expectedReturn.toFixed(2)),
    wealthMultiplier: amount > 0
      ? parseFloat(((finalValue + totalWithdrawn) / amount).toFixed(2))
      : 0,
    totalWithdrawn: Math.round(totalWithdrawn),
    remainingCorpus: Math.round(finalValue),
    corpusDepletesAtYear,
  };
}

export function calculate(input: CalculationInput): CalculationResult {
  if (input.investmentType === 'SIP') return calculateSIP(input);
  if (input.investmentType === 'SWP') return calculateSWP(input);
  return calculateLumpSum(input);
}

/** Format number to Indian currency — e.g. ₹23.63 L, ₹2.36 Cr */
export function formatCurrency(amount: number): string {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000)    return `₹${(amount / 100_000).toFixed(2)} L`;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount);
}

/** Risk level based on expected annual return */
export function getRiskLevel(expectedReturn: number): 'Low' | 'Moderate' | 'High' {
  if (expectedReturn <= 8)  return 'Low';
  if (expectedReturn <= 14) return 'Moderate';
  return 'High';
}
