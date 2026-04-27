import { NextRequest, NextResponse } from 'next/server';
import { calculate, CalculationInput } from '@/lib/calculator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { investmentType, amount, periodYears, expectedReturn } = body;

    // Validation
    if (!['SIP', 'LUMPSUM'].includes(investmentType)) {
      return NextResponse.json({ error: 'Invalid investment type' }, { status: 400 });
    }
    if (!amount || amount <= 0 || amount > 100000000) {
      return NextResponse.json({ error: 'Amount must be between ₹1 and ₹10 Crore' }, { status: 400 });
    }
    if (!periodYears || periodYears < 1 || periodYears > 40) {
      return NextResponse.json({ error: 'Period must be between 1 and 40 years' }, { status: 400 });
    }
    if (!expectedReturn || expectedReturn < 1 || expectedReturn > 50) {
      return NextResponse.json({ error: 'Expected return must be between 1% and 50%' }, { status: 400 });
    }

    const input: CalculationInput = {
      investmentType,
      amount: parseFloat(amount),
      periodYears: parseInt(periodYears),
      expectedReturn: parseFloat(expectedReturn),
    };

    const results = calculate(input);
    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error('Calculate API error:', err);
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 });
  }
}
