import { NextRequest, NextResponse } from 'next/server';

/* ─────────────────────────────────────────────────────────────────
 * KYC / PAN Verification API — Agent 7  (Dual Provider v2)
 *
 * Provider 1 — Sandbox.co.in (PAN validity / name / DOB)
 *   Docs: https://developer.sandbox.co.in/docs/kyc
 *   Env : SANDBOX_API_KEY, SANDBOX_API_SECRET
 *
 * Provider 2 — RapidAPI: PAN KYC Status (CAMS/Karvy/CVL/NDML/DOTEX)
 *   Host: pan-kyc-status-cams-karvy-cvl-ndml-dotex.p.rapidapi.com
 *   Endpoint: POST /fetch_kyc
 *   Env : RAPIDAPI_KYC_KEY
 *   Returns KYC registration status across all major Indian registrars
 * ─────────────────────────────────────────────────────────────────*/

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const SANDBOX_BASE = 'https://api.sandbox.co.in';
const RAPIDAPI_KYC_HOST = 'pan-kyc-status-cams-karvy-cvl-ndml-dotex.p.rapidapi.com';

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

/* ── Provider 1 — Sandbox: Step 1: Authenticate ─────────────────*/
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

/* ── Provider 1 — Sandbox: Step 2: Verify PAN ───────────────────*/
async function verifyPAN(apiKey: string, token: string, pan: string) {
  const res = await fetch(`${SANDBOX_BASE}/kyc/pan/verify`, {
    method: 'POST',
    headers: {
      'x-api-key':     apiKey,
      'Authorization': token,
      'Content-Type':  'application/json',
      'x-api-version': '1.0.0',
    },
    body: JSON.stringify({
      '@entity': 'in.co.sandbox.kyc.pan_verification.request',
      pan,
      consent: 'Y',
      reason:  'KYC verification for investment planning',
    }),
  });

  const data = await res.json();
  return { status: res.status, data };
}

/* ── Provider 2 — RapidAPI: KYC Status (CAMS/Karvy/CVL/NDML) ───*/
interface KycRegistration {
  registrar: string;
  status: string;   // 'KYC Registered' | 'Not Registered' | ...
  kycType?: string;
  application_type?: string;
}

async function fetchRapidKycStatus(
  rapidApiKey: string,
  pan: string,
): Promise<{ registrations: KycRegistration[]; rawResponse: unknown }> {
  const res = await fetch(`https://${RAPIDAPI_KYC_HOST}/fetch_kyc`, {
    method: 'POST',
    headers: {
      'x-rapidapi-key':  rapidApiKey,
      'x-rapidapi-host': RAPIDAPI_KYC_HOST,
      'Content-Type':    'application/json',
    },
    body: JSON.stringify({ pan_no: pan }),
  });

  const raw = await res.json();
  console.log(`RapidAPI KYC [${res.status}]:`, JSON.stringify(raw, null, 2));

  if (!res.ok) {
    throw new Error(`RapidAPI KYC failed (${res.status}): ${JSON.stringify(raw)}`);
  }

  // Response is usually an array of objects or { data: [...] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.result ?? []);

  const registrations: KycRegistration[] = items.map((item) => ({
    registrar:        item?.kra_name ?? item?.registrar ?? item?.agency ?? '—',
    status:           item?.kyc_status ?? item?.status ?? '—',
    kycType:          item?.kyc_type   ?? item?.kycType ?? undefined,
    application_type: item?.application_type ?? undefined,
  }));

  return { registrations, rawResponse: raw };
}

/* ── Map Sandbox response → our KYCResult shape ──────────────────*/
function mapSandboxResponse(pan: string, raw: Record<string, unknown>) {
  const entityType = ENTITY_TYPES[pan[3]] || 'Individual (Person)';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = (raw?.data as any) || raw;

  const panStatus  = String(d?.pan_status || d?.status || '').toUpperCase();
  const isValid    = panStatus === 'VALID'   || panStatus === 'ACTIVE';
  const isPending  = panStatus === 'PENDING' || panStatus === 'UNDER_PROCESSING';

  let overallStatus: 'verified' | 'pending' | 'not_found';
  if (isValid)         overallStatus = 'verified';
  else if (isPending)  overallStatus = 'pending';
  else                 overallStatus = 'not_found';

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
    name:         overallStatus === 'not_found' ? '—' : (name || '—'),
    entityType:   category || entityType,
    dob:          overallStatus !== 'not_found' ? dob : '—',
    registeredOn: '—',
    lastUpdated:  '—',
    verifiedWith,
    remark:       remarks[overallStatus],
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
    const apiKey     = process.env.SANDBOX_API_KEY;
    const apiSecret  = process.env.SANDBOX_API_SECRET;
    const rapidApiKey = process.env.RAPIDAPI_KYC_KEY;

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
          kycRegistrations: [],
          remark:
            `PAN format for ${pan} is valid — entity type: ${ENTITY_TYPES[pan[3]] || 'Individual'}. ` +
            `Live verification requires Sandbox.co.in credentials. ` +
            `Sign up free at https://dashboard.sandbox.co.in/signup and add SANDBOX_API_KEY + SANDBOX_API_SECRET to your environment.`,
          panStatus: 'FORMAT_VALID',
        },
      });
    }

    /* ── 3. Run both providers in parallel ──────── */
    const [sandboxResult, rapidResult] = await Promise.allSettled([
      // Provider 1: Sandbox PAN verify (needs auth token first)
      (async () => {
        const token = await getAccessToken(apiKey, apiSecret);
        return verifyPAN(apiKey, token, pan);
      })(),

      // Provider 2: RapidAPI KYC registration status
      rapidApiKey
        ? fetchRapidKycStatus(rapidApiKey, pan)
        : Promise.reject(new Error('RAPIDAPI_KYC_KEY not configured')),
    ]);

    /* ── 4. Handle Sandbox result ───────────────── */
    if (sandboxResult.status === 'rejected') {
      console.error('Sandbox KYC error:', sandboxResult.reason);
      return NextResponse.json({
        success: false,
        error: 'KYC authentication failed. Check your Sandbox API key and secret.',
      }, { status: 403 });
    }

    const { status: httpStatus, data: rawData } = sandboxResult.value;
    console.log(`Sandbox KYC [${httpStatus}]:`, JSON.stringify(rawData, null, 2));

    if (httpStatus === 429) {
      return NextResponse.json({ success: false, error: 'Rate limit reached. Please try again in a moment.' }, { status: 429 });
    }
    if (httpStatus === 403 || httpStatus === 401) {
      return NextResponse.json({ success: false, error: 'KYC API authentication failed. Please re-check your credentials.' }, { status: 403 });
    }

    /* ── 5. Merge both results ──────────────────── */
    const sandboxMapped = mapSandboxResponse(pan, rawData as Record<string, unknown>);

    let kycRegistrations: KycRegistration[] = [];
    if (rapidResult.status === 'fulfilled') {
      kycRegistrations = rapidResult.value.registrations;
      // If any registrar shows "KYC Registered", upgrade verifiedWith list
      const anyRegistered = kycRegistrations.some(
        (r) => /registered/i.test(r.status),
      );
      if (anyRegistered && !sandboxMapped.verifiedWith.includes('CAMS / Karvy / CVL / NDML')) {
        sandboxMapped.verifiedWith.push('CAMS / Karvy / CVL / NDML');
      }
    } else {
      console.warn('RapidAPI KYC skipped:', (rapidResult as PromiseRejectedResult).reason?.message);
    }

    const result = { ...sandboxMapped, kycRegistrations };
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
    service:   'MMI KYC Verification API',
    agent:     'Agent 7',
    version:   '6.0.0',
    providers: [
      {
        name:    'Sandbox.co.in — PAN Verification',
        purpose: 'PAN validity, name, DOB from Income Tax Dept.',
        docs:    'https://developer.sandbox.co.in/docs/kyc',
        env:     ['SANDBOX_API_KEY', 'SANDBOX_API_SECRET'],
      },
      {
        name:    'RapidAPI — PAN KYC Status (CAMS/Karvy/CVL/NDML/DOTEX)',
        purpose: 'KYC registration status across all major Indian registrars',
        host:    RAPIDAPI_KYC_HOST,
        endpoint: 'POST /fetch_kyc',
        env:     ['RAPIDAPI_KYC_KEY'],
      },
    ],
    response_includes: [
      'status, pan, name, entityType, dob (from Sandbox)',
      'kycRegistrations[] (registrar, status, kycType) — from RapidAPI',
      'verifiedWith[] — combined list of verified data sources',
    ],
  });
}

