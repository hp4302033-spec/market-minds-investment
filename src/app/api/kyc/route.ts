import { NextRequest, NextResponse } from 'next/server';

/* ─────────────────────────────────────────────────────────────────
 * KYC / PAN Verification API — Agent 7
 * Provider  : Sandbox.co.in — KYC PAN Verification
 * Docs      : https://developer.sandbox.co.in/docs/kyc
 *
 * Flow (2 steps):
 *   Step 1 → POST /authenticate
 *             Headers: x-api-key, x-api-secret, x-api-version: 1.0.0
 *             Response: { access_token: "..." }   (valid 24h)
 *
 *   Step 2 → POST /kyc/pan/verify
 *             Headers: x-api-key, Authorization: <access_token>
 *             Body: { "@entity": "...", pan, consent: "Y", reason: "..." }
 *             Response: { data: { name, pan_status, category, ... } }
 *
 * Signup free at: https://dashboard.sandbox.co.in/signup
 * Test env : https://api.sandbox.co.in  (test mode with same URL)
 * ─────────────────────────────────────────────────────────────────*/

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const SANDBOX_BASE = 'https://api.sandbox.co.in';

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

/* ── Step 1: Authenticate and get access token ───────────────────*/
async function getAccessToken(apiKey: string, apiSecret: string): Promise<string> {
  const res = await fetch(`${SANDBOX_BASE}/authenticate`, {
    method: 'POST',
    headers: {
      'x-api-key':     apiKey,
      'x-api-secret':  apiSecret,
      'x-api-version': '1.0.0',
      'Content-Type':  'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sandbox auth failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const token = data?.access_token || data?.data?.access_token;
  if (!token) throw new Error('No access_token in Sandbox auth response');
  return token;
}

/* ── Step 2: Verify PAN ──────────────────────────────────────────*/
async function verifyPAN(apiKey: string, token: string, pan: string) {
  const res = await fetch(`${SANDBOX_BASE}/kyc/pan/verify`, {
    method: 'POST',
    headers: {
      'x-api-key':    apiKey,
      'Authorization': token,   // No "Bearer" prefix — raw token
      'Content-Type': 'application/json',
      'x-api-version': '1.0.0',
    },
    body: JSON.stringify({
      '@entity':       'in.co.sandbox.kyc.pan_verification.request',
      pan,
      consent:         'Y',
      reason:          'KYC verification for investment planning',
    }),
  });

  const data = await res.json();
  return { status: res.status, data };
}

/* ── Map Sandbox response → our KYCResult shape ──────────────────*/
function mapSandboxResponse(pan: string, raw: Record<string, unknown>) {
  const entityType = ENTITY_TYPES[pan[3]] || 'Individual (Person)';

  // Sandbox returns data inside data.data or directly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = (raw?.data as any) || raw;

  // pan_status: "VALID" / "INVALID" / "PENDING"
  const panStatus = String(d?.pan_status || d?.status || '').toUpperCase();
  const isValid  = panStatus === 'VALID'   || panStatus === 'ACTIVE';
  const isPending = panStatus === 'PENDING' || panStatus === 'UNDER_PROCESSING';

  let overallStatus: 'verified' | 'pending' | 'not_found';
  if (isValid)    overallStatus = 'verified';
  else if (isPending) overallStatus = 'pending';
  else            overallStatus = 'not_found';

  const name: string =
    d?.name_as_per_pan ||
    d?.registered_name ||
    d?.name ||
    '—';

  const category: string = d?.pan_type || d?.category || entityType;
  const dob:      string = d?.date_of_birth || d?.dob || '—';

  const verifiedWith: string[] = overallStatus === 'verified'
    ? ['Income Tax Department', 'NSDL / UTI Infrastructure']
    : [];

  const remarks: Record<typeof overallStatus, string> = {
    verified:
      `PAN ${pan} has been successfully verified with the Income Tax Department. ` +
      `The registered name is "${name}". ` +
      `You are fully eligible to invest in Mutual Funds, Stocks, Bonds, and all SEBI-regulated instruments.`,
    pending:
      `PAN ${pan} exists but its verification is currently in progress. ` +
      `Please ensure your PAN is linked with Aadhaar on the Income Tax portal (incometax.gov.in). ` +
      `This typically resolves within 2–5 business days.`,
    not_found:
      `PAN ${pan} could not be verified. It may be invalid, deactivated, or not yet registered. ` +
      `Please verify your PAN card details and try again, or visit the Income Tax e-filing portal (incometax.gov.in).`,
  };

  return {
    status: overallStatus,
    pan,
    name: overallStatus === 'not_found' ? '—' : (name || '—'),
    entityType: category || entityType,
    dob: overallStatus !== 'not_found' ? dob : '—',
    registeredOn: '—',  // Sandbox doesn't return reg date
    lastUpdated: '—',
    verifiedWith,
    remark: remarks[overallStatus],
    panStatus,
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

    /* ── 2. Check credentials ───────────────────── */
    const apiKey    = process.env.SANDBOX_API_KEY;
    const apiSecret = process.env.SANDBOX_API_SECRET;

    if (!apiKey || !apiSecret) {
      // Graceful degradation — PAN format valid, show setup note
      return NextResponse.json({
        success: true,
        result: {
          status: 'pending',
          pan,
          name: '—',
          entityType: ENTITY_TYPES[pan[3]] || 'Individual (Person)',
          dob: '—',
          registeredOn: '—',
          lastUpdated: '—',
          verifiedWith: [],
          remark:
            `PAN format for ${pan} is valid — entity type: ${ENTITY_TYPES[pan[3]] || 'Individual'}. ` +
            `Live verification requires Sandbox.co.in credentials. ` +
            `Sign up free at https://dashboard.sandbox.co.in/signup and add SANDBOX_API_KEY + SANDBOX_API_SECRET to your environment.`,
          panStatus: 'FORMAT_VALID',
        },
      });
    }

    /* ── 3. Get access token ────────────────────── */
    let token: string;
    try {
      token = await getAccessToken(apiKey, apiSecret);
    } catch (authErr) {
      console.error('Sandbox auth error:', authErr);
      return NextResponse.json({
        success: false,
        error: 'KYC authentication failed. Check your Sandbox API key and secret.',
      }, { status: 403 });
    }

    /* ── 4. Verify PAN ──────────────────────────── */
    const { status: httpStatus, data: rawData } = await verifyPAN(apiKey, token, pan);
    console.log(`Sandbox KYC [${httpStatus}]:`, JSON.stringify(rawData, null, 2));

    if (httpStatus === 429) {
      return NextResponse.json({
        success: false,
        error: 'Rate limit reached. Please try again in a moment.',
      }, { status: 429 });
    }
    if (httpStatus === 403 || httpStatus === 401) {
      return NextResponse.json({
        success: false,
        error: 'KYC API authentication failed. Please re-check your credentials.',
      }, { status: 403 });
    }

    /* ── 5. Map → our result shape ──────────────── */
    const result = mapSandboxResponse(pan, rawData as Record<string, unknown>);
    return NextResponse.json({ success: true, result }, { status: 200 });

  } catch (err) {
    console.error('KYC route error:', err);
    return NextResponse.json({
      success: false,
      error: 'PAN verification failed. Please try again.',
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'MMI KYC Verification API',
    agent: 'Agent 7',
    version: '5.0.0',
    provider: 'Sandbox.co.in — PAN Verification',
    docs: 'https://developer.sandbox.co.in/docs/kyc',
    signup: 'https://dashboard.sandbox.co.in/signup',
    flow: [
      'Step 1: POST /authenticate → get access_token',
      'Step 2: POST /kyc/pan/verify → verify PAN',
    ],
    env_required: ['SANDBOX_API_KEY', 'SANDBOX_API_SECRET'],
  });
}
