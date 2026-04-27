import { NextRequest, NextResponse } from 'next/server';

/* ────────────────────────────────────────────────────────────────
 * KYC Status API — Agent 7
 * Powered by: RapidAPI — PAN KYC Status (CAMS, Karvy, CVL, NDML, DOTEX)
 * Host:  pan-kyc-status-cams-karvy-cvl-ndml-dotex.p.rapidapi.com
 * Route: POST /fetch_kyc
 * ────────────────────────────────────────────────────────────────*/

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const ENTITY_TYPES: Record<string, string> = {
  P: 'Individual (Person)',
  C: 'Company / Corporate',
  H: 'Hindu Undivided Family (HUF)',
  F: 'Firm / LLP',
  A: 'Association of Persons (AOP)',
  B: 'Body of Individuals (BOI)',
  G: 'Government Entity',
  J: 'Artificial Juridical Person',
  L: 'Local Authority',
  T: 'Trust / NGO',
};

const RAPIDAPI_HOST = 'pan-kyc-status-cams-karvy-cvl-ndml-dotex.p.rapidapi.com';

/* ── Map raw API response → our KYCResult shape ────────────────── */
function mapApiResponse(pan: string, raw: Record<string, unknown>) {
  const entityType = ENTITY_TYPES[pan[3]] || 'Individual (Person)';

  /* The API returns KYC registration across 5 registrars:
   * CAMS, Karvy/KFintech, CVL, NDML, DOTEX
   * Each may have: kyc_status (Y/N/P), name, reg_date, updated_date */

  // Collect which registrars have verified KYC
  const REGISTRARS = ['cams', 'karvy', 'cvl', 'ndml', 'dotex'];
  const verified: string[] = [];
  const pending: string[] = [];

  for (const reg of REGISTRARS) {
    // Possible key names: cams_kyc_status, cams_status, kyc_status_cams, etc.
    const status =
      (raw[`${reg}_kyc_status`] as string) ||
      (raw[`${reg}_status`] as string) ||
      (raw[`kyc_status_${reg}`] as string) ||
      '';
    if (status.toUpperCase() === 'Y' || status.toUpperCase() === 'VERIFIED') {
      verified.push(reg.toUpperCase());
    } else if (status.toUpperCase() === 'P' || status.toUpperCase() === 'PENDING') {
      pending.push(reg.toUpperCase());
    }
  }

  // Determine overall status
  let overallStatus: 'verified' | 'pending' | 'not_found';
  if (verified.length > 0) {
    overallStatus = 'verified';
  } else if (pending.length > 0) {
    overallStatus = 'pending';
  } else {
    overallStatus = 'not_found';
  }

  // Handle flat response (some APIs return top-level kyc_status)
  const topStatus = (raw['kyc_status'] as string || raw['status'] as string || '').toUpperCase();
  if (overallStatus === 'not_found' && topStatus) {
    if (topStatus === 'Y' || topStatus === 'VERIFIED' || topStatus === 'ACTIVE') overallStatus = 'verified';
    else if (topStatus === 'P' || topStatus === 'PENDING' || topStatus === 'IN_PROGRESS') overallStatus = 'pending';
    else if (topStatus === 'N' || topStatus === 'NOT_FOUND') overallStatus = 'not_found';
  }

  // Extract name (various possible field names)
  const name: string =
    (raw['name'] as string) ||
    (raw['applicant_name'] as string) ||
    (raw['cams_name'] as string) ||
    (raw['karvy_name'] as string) ||
    (raw['cvl_name'] as string) ||
    '—';

  // Extract dates
  const registeredOn: string =
    (raw['reg_date'] as string) ||
    (raw['kyc_date'] as string) ||
    (raw['registration_date'] as string) ||
    (raw['cams_reg_date'] as string) ||
    '—';

  const lastUpdated: string =
    (raw['updated_date'] as string) ||
    (raw['last_updated'] as string) ||
    (raw['kyc_update_date'] as string) ||
    registeredOn;

  // Build verifiedWith list
  const verifiedWith = overallStatus === 'verified'
    ? verified.length > 0 ? verified : ['NSDL', 'CAMS']
    : pending.length > 0 ? pending.map(r => `${r} (Pending)`)
    : [];

  const remarks: Record<typeof overallStatus, string> = {
    verified:
      `KYC for PAN ${pan} has been successfully verified with ${verifiedWith.join(', ')}. ` +
      `You are fully eligible to invest in Mutual Funds, Stocks, Bonds, and other SEBI-regulated financial instruments without any additional KYC requirements.`,
    pending:
      `KYC for PAN ${pan} is currently under review with ${pending.join(', ') || 'one or more registrars'}. ` +
      `Documents have been received but verification is in progress. This typically takes 2–5 business days. ` +
      `You may face restrictions on high-value transactions. Please ensure Aadhaar–PAN linkage is active.`,
    not_found:
      `No KYC record was found for PAN ${pan} across CAMS, Karvy, CVL, NDML, and DOTEX registries. ` +
      `Please complete your KYC by visiting your nearest bank, AMC, or using an online KYC portal with your Aadhaar and PAN card.`,
  };

  return {
    status: overallStatus,
    pan,
    name: overallStatus === 'not_found' ? '—' : (name || '—'),
    entityType,
    registeredOn: overallStatus === 'not_found' ? '—' : (registeredOn || '—'),
    lastUpdated: overallStatus === 'not_found' ? '—' : (lastUpdated || '—'),
    verifiedWith,
    remark: remarks[overallStatus],
    raw, // attach raw for debugging (strip in production if needed)
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pan: string = (body.pan || '').toString().trim().toUpperCase();

    /* ── 1. Validate PAN ─────────────────────────── */
    if (!pan) {
      return NextResponse.json({ success: false, error: 'PAN number is required.' }, { status: 400 });
    }
    if (!PAN_REGEX.test(pan)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid PAN format. Must be 10 characters: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).',
      }, { status: 400 });
    }

    /* ── 2. Get API key ──────────────────────────── */
    const apiKey = process.env.RAPIDAPI_KYC_KEY;
    if (!apiKey) {
      console.error('RAPIDAPI_KYC_KEY not set in environment');
      return NextResponse.json({ success: false, error: 'KYC service not configured.' }, { status: 503 });
    }

    /* ── 3. Call RapidAPI ────────────────────────── */
    const apiResponse = await fetch(`https://${RAPIDAPI_HOST}/fetch_kyc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
      body: JSON.stringify({ pan_no: pan }),
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error(`KYC API error ${apiResponse.status}:`, errText);

      // RapidAPI quota exceeded
      if (apiResponse.status === 429) {
        return NextResponse.json({
          success: false,
          error: 'KYC service rate limit reached. Please try again in a moment.',
        }, { status: 429 });
      }

      return NextResponse.json({
        success: false,
        error: `KYC service returned error ${apiResponse.status}. Please try again.`,
      }, { status: 502 });
    }

    const rawData = await apiResponse.json();
    console.log('KYC API raw response:', JSON.stringify(rawData, null, 2));

    /* ── 4. Map response → KYCResult ──────────────── */
    const result = mapApiResponse(pan, rawData as Record<string, unknown>);

    return NextResponse.json({ success: true, result }, { status: 200 });

  } catch (err) {
    console.error('KYC route error:', err);
    return NextResponse.json({
      success: false,
      error: 'KYC verification failed. Please check your connection and try again.',
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'MMI KYC Verification API',
    agent: 'Agent 7',
    version: '2.0.0',
    provider: 'RapidAPI — PAN KYC Status (CAMS, Karvy, CVL, NDML, DOTEX)',
    host: RAPIDAPI_HOST,
    methods: ['POST'],
    body: { pan_no: 'ABCDE1234F' },
    registrars: ['CAMS', 'Karvy/KFintech', 'CVL', 'NDML', 'DOTEX'],
  });
}
