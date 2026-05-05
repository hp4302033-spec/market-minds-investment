import { NextRequest, NextResponse } from 'next/server';
import { calculate } from '@/lib/calculator';
import { generateAdvice } from '@/lib/advisor';
import { saveLead } from '@/lib/supabase';
import { sendPlanEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, investmentType, amount, periodYears, expectedReturn, withdrawalAmount } = body;

    // ── Validation ────────────────────────────────────────────────────────
    const errors: Record<string, string> = {};

    if (!name || name.trim().length < 2) {
      errors.name = 'Please enter your full name (at least 2 characters)';
    }

    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phone || !phoneRegex.test(phone.toString().trim())) {
      errors.phone = 'Please enter a valid 10-digit Indian mobile number';
    }

    if (!['SIP', 'LUMPSUM', 'SWP'].includes(investmentType)) {
      errors.investmentType = 'Please select SIP, Lump Sum, or SWP';
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 500) {
      errors.amount = investmentType === 'SIP'
        ? 'Minimum SIP amount is ₹500'
        : 'Minimum investment is ₹500';
    }

    const years = parseInt(periodYears);
    if (isNaN(years) || years < 1 || years > 40) {
      errors.periodYears = 'Investment period must be between 1 and 40 years';
    }

    const ret = parseFloat(expectedReturn);
    if (isNaN(ret) || ret < 1 || ret > 50) {
      errors.expectedReturn = 'Expected return must be between 1% and 50%';
    }

    const withdrawal = parseFloat(withdrawalAmount) || 0;
    if (investmentType === 'SWP') {
      if (!withdrawalAmount || withdrawal < 500) {
        errors.withdrawalAmount = 'Minimum monthly withdrawal is ₹500';
      } else if (withdrawal > amt) {
        errors.withdrawalAmount = 'Monthly withdrawal cannot exceed initial corpus';
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 });
    }

    // ── Calculate ─────────────────────────────────────────────────────────
    const results = calculate({
      investmentType,
      amount: amt,
      periodYears: years,
      expectedReturn: ret,
      ...(investmentType === 'SWP' && { withdrawalAmount: withdrawal }),
    });

    // ── Generate Advice ───────────────────────────────────────────────────
    const advisorNote = generateAdvice(
      { name: name.trim(), investmentType, amount: amt, periodYears: years, expectedReturn: ret, withdrawalAmount: withdrawal },
      results
    );

    // ── Save to Database ──────────────────────────────────────────────────
    const leadData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      investment_type: investmentType,
      amount: amt,
      period_years: years,
      expected_return: ret,
      total_invested: results.totalInvested,
      estimated_returns: results.estimatedReturns,
      final_value: results.finalValue,
      cagr: results.cagr,
      wealth_multiplier: results.wealthMultiplier,
      advisor_note: advisorNote,
    };

    const savedLead = await saveLead(leadData);

    // ── Send Email ────────────────────────────────────────────────────────
    const emailResult = await sendPlanEmail({
      to: email.trim().toLowerCase(),
      name: name.trim(),
      investmentType,
      amount: amt,
      periodYears: years,
      expectedReturn: ret,
      totalInvested: results.totalInvested,
      estimatedReturns: results.estimatedReturns,
      finalValue: results.finalValue,
    });

    return NextResponse.json({
      success: true,
      results,
      advisorNote,
      leadId: savedLead?.id || null,
      emailSent: emailResult.success,
      emailMessage: emailResult.success
        ? 'Report sent to your email successfully!'
        : `Email not sent: ${emailResult.error || 'Service unavailable'}`,
    });

  } catch (err) {
    console.error('Submit API error:', err);
    return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
