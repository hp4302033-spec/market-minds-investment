import { NextRequest, NextResponse } from 'next/server';

/* ────────────────────────────────────────────────────────────────
 * KYC / PAN Validation API — Agent 7
 * Provider : RapidAPI — India PAN Validator
 * Host     : india-pan-validator.p.rapidapi.com
 * Method   : GET /validate?pan=<PAN>
 * ────────────────────────────────────────────────────────────────*/

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const RAPIDAPI_HOST = process.env.RAPIDAPI_KYC_HOST || 'india-pan-validator.p.rapidapi.com';

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

/* ── Map raw API response → our KYCResult shape ──────────────────*/
function mapApiResponse(pan: string, raw: Record<string, unknown>) {
  const entityType = ENTITY_TYPES[pan[3]] || 'Individual (Person)';

  // India PAN Validator — typical response fields:
  // { valid: true/false, pan: "...", name: "...", type: "...", ... }
  const isValid: boolean =
    raw['valid'] === true ||
    raw['isValid'] === true ||
    String(raw['status']).toUpperCase() === 'VALID' ||
    String(raw['kyc_status']).toUpperCase() === 'Y';

  const isInvalid: boolean =
    raw['valid'] === false ||
    raw['isValid'] === false ||
    String(raw['status']).toUpperCase() === 'INVALID';

  let overallStatus: 'verified' | 'pending' | 'not_found';
  if (isValid)   overallStatus = 'verified';
  else if (isInvalid) overallStatus = 'not_found';
  else           overallStatus = 'pending';

  // Extract name from various possible field names
  const name: string =
    (raw['name'] as string) ||
    (raw['applicant_name'] as string) ||
    (raw['holder_name'] as string) ||
    (raw['pan_name'] as string) ||
    '—';

  // Extract dates
  const registeredOn: string =
    (raw['reg_date'] as string) ||
    (raw['registration_date'] as string) ||
    (raw['issue_date'] as string) ||
    '—';

  const lastUpdated: string =
    (raw['updated_date'] as string) ||
    (raw['last_updated'] as string) ||
    registeredOn;

  // Verification sources
  const verifiedWith: string[] = isValid
    ? ['Income Tax Department', 'NSDL']
    : [];

  const remarks: Record<typeof overallStatus, string> = {
    verified:
      `PAN ${pan} has been successfully validated by the Income Tax Department. ` +
      `The PAN is active and linked to a registered ${entityType.toLowerCase()}. ` +
      `You are eligible to invest in Mutual Funds, Stocks, Bonds, and other SEBI-regulated instruments.`,
    pending:
      `PAN ${pan} was found but its KYC verification status could not be confirmed at this time. ` +
      `Please ensure your PAN is linked with Aadhaar on the Income Tax portal (incometax.gov.in). ` +
      `For full KYC, visit your nearest bank branch or use an online KYC portal.`,
    not_found:
      `PAN ${pan} could not be validated. This may mean the PAN does not exist, has been deactivated, ` +
      `or the format is incorrect. Please verify your PAN card details and try again. ` +
      `For official verification, visit the Income Tax e-filing portal (incometax.gov.in).`,
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
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pan: string = (body.pan || '').toString().trim().toUpperCase();

    /* ── 1. Validate PAN format ─────────────────── */
    if (!pan) {
      return NextResponse.json({ success: false, error: 'PAN number is required.' }, { status: 400 });
    }
    if (!PAN_REGEX.test(pan)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid PAN format. Must be 10 characters: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).',
      }, { status: 400 });
    }

    /* ── 2. Check API key ───────────────────────── */
    const apiKey = process.env.RAPIDAPI_KYC_KEY;
    if (!apiKey) {
      console.error('RAPIDAPI_KYC_KEY not set');
      return NextResponse.json({ success: false, error: 'KYC service not configured.' }, { status: 503 });
    }

    /* ── 3. Call India PAN Validator API ───────── */
    // GET /validate with pan as query param
    const url = `https://${RAPIDAPI_HOST}/validate?pan=${encodeURIComponent(pan)}`;

    const apiResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': RAPIDAPI_HOST,
        'Content-Type': 'application/json',
      },
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error(`PAN Validator API error ${apiResponse.status}:`, errText);

      if (apiResponse.status === 429) {
        return NextResponse.json({
          success: false,
          error: 'KYC service rate limit reached. Please try again in a moment.',
        }, { status: 429 });
      }
      if (apiResponse.status === 403) {
        return NextResponse.json({
          success: false,
          error: 'KYC service authentication failed. Please check API key.',
        }, { status: 403 });
      }

      return NextResponse.json({
        success: false,
        error: `KYC service error (${apiResponse.status}). Please try again.`,
      }, { status: 502 });
    }

    const rawData = await apiResponse.json();
    console.log('PAN Validator raw response:', JSON.stringify(rawData, null, 2));

    /* ── 4. Map response → our shape ─────────────── */
    const result = mapApiResponse(pan, rawData as Record<string, unknown>);

    return NextResponse.json({ success: true, result }, { status: 200 });

  } catch (err) {
    console.error('KYC route error:', err);
    return NextResponse.json({
      success: false,
      error: 'PAN verification failed. Please check your connection and try again.',
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'MMI PAN Validation API',
    agent: 'Agent 7',
    version: '3.0.0',
    provider: 'RapidAPI — India PAN Validator',
    host: RAPIDAPI_HOST,
    endpoint: 'GET /validate?pan=<PAN_NUMBER>',
    methods: ['POST'],
    example_body: { pan: 'ABCDE1234F' },
  });
}
