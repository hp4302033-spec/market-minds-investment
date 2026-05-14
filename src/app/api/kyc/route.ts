import { NextRequest, NextResponse } from 'next/server';

/* ─────────────────────────────────────────────────────────────────
 * KYC / PAN Verification API — Agent 7
 * Provider  : RapidAPI — PAN KYC Status (CAMS / Karvy / CVL / NDML / DOTEX)
 * Host      : pan-kyc-status-cams-karvy-cvl-ndml-dotex.p.rapidapi.com
 * Endpoint  : POST /fetch_kyc
 * Body      : { pan_no: "<PAN>" }
 * Env       : RAPIDAPI_KYC_KEY
 * ─────────────────────────────────────────────────────────────────*/

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

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

/* ── RapidAPI call ───────────────────────────────────────────────*/
async function fetchKycStatus(rapidApiKey: string, pan: string) {
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

  return { httpStatus: res.status, raw };
}

/* ── Map RapidAPI response → our KYCResult shape ─────────────────*/
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRapidResponse(pan: string, raw: any) {
  const entityType = ENTITY_TYPES[pan[3]] || 'Individual (Person)';

  // Response can be an array of registrar entries or a wrapper object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = Array.isArray(raw)
    ? raw
    : (raw?.data ?? raw?.result ?? raw?.kyc_details ?? []);

  // Build registrations list
  const kycRegistrations = items.map((item) => ({
    registrar:        item?.kra_name        ?? item?.registrar        ?? item?.agency   ?? '—',
    status:           item?.kyc_status      ?? item?.status           ?? '—',
    kycType:          item?.kyc_type        ?? item?.kycType          ?? undefined,
    applicationStatus: item?.application_status ?? item?.applicationStatus ?? undefined,
    mode:             item?.kyc_mode        ?? item?.mode             ?? undefined,
  }));

  // Determine overall status from registrations
  const anyRegistered = kycRegistrations.some((r) => /registered/i.test(r.status));
  const anyPending    = kycRegistrations.some((r) => /pending|processing/i.test(r.status));

  let overallStatus: 'verified' | 'pending' | 'not_found';
  if (anyRegistered)   overallStatus = 'verified';
  else if (anyPending) overallStatus = 'pending';
  else                 overallStatus = 'not_found';

  // Try to pick name from response
  const name: string =
    items[0]?.name          ??
    items[0]?.pan_name      ??
    items[0]?.holder_name   ??
    '—';

  const verifiedWith: string[] = anyRegistered
    ? kycRegistrations
        .filter((r) => /registered/i.test(r.status))
        .map((r) => r.registrar)
        .filter((r) => r !== '—')
    : [];

  const remarks: Record<typeof overallStatus, string> = {
    verified:
      `PAN ${pan} is KYC verified across ${verifiedWith.length} registrar(s): ${verifiedWith.join(', ') || 'CAMS/Karvy/CVL/NDML'}. ` +
      `You are eligible to invest in Mutual Funds and all SEBI-regulated instruments.`,
    pending:
      `PAN ${pan} KYC is currently in progress at one or more registrars. ` +
      `This typically resolves within 2–5 business days. ` +
      `Please ensure your PAN is linked with Aadhaar on the Income Tax portal (incometax.gov.in).`,
    not_found:
      `PAN ${pan} is not KYC registered with any of the checked registrars (CAMS, Karvy, CVL, NDML, DOTEX). ` +
      `Please complete your KYC at your nearest mutual fund distributor or online at camsonline.com / karvymfs.com.`,
  };

  return {
    status: overallStatus,
    pan,
    name,
    entityType,
    verifiedWith,
    kycRegistrations,
    remark: remarks[overallStatus],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pan: string = (body.pan || '').toString().trim().toUpperCase();

    /* ── 1. Validate PAN format ──────────────────── */
    if (!pan) {
      return NextResponse.json({ success: false, error: 'PAN number is required.' }, { status: 400 });
    }
    if (!PAN_REGEX.test(pan)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid PAN format. Must be 10 characters: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).',
      }, { status: 400 });
    }

    /* ── 2. Check API key ────────────────────────── */
    const rapidApiKey = process.env.RAPIDAPI_KYC_KEY;
    if (!rapidApiKey) {
      return NextResponse.json({
        success: false,
        error: 'KYC service not configured. Add RAPIDAPI_KYC_KEY to your environment.',
      }, { status: 503 });
    }

    /* ── 3. Call RapidAPI ────────────────────────── */
    const { raw } = await fetchKycStatus(rapidApiKey, pan);

    /* ── 4. Map & return ─────────────────────────── */
    const result = mapRapidResponse(pan, raw);
    return NextResponse.json({ success: true, result }, { status: 200 });

  } catch (err) {
    console.error('KYC route error:', err);
    return NextResponse.json({
      success: false,
      error: 'PAN KYC verification failed. Please try again.',
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service:  'MMI KYC Verification API',
    agent:    'Agent 7',
    version:  '7.0.0',
    provider: 'RapidAPI — PAN KYC Status (CAMS / Karvy / CVL / NDML / DOTEX)',
    host:     RAPIDAPI_KYC_HOST,
    endpoint: 'POST /fetch_kyc',
    env:      ['RAPIDAPI_KYC_KEY'],
    response: {
      status:           'verified | pending | not_found',
      pan:              'string',
      name:             'string (if available from registrar)',
      entityType:       'string (derived from PAN 4th char)',
      verifiedWith:     'string[] — registrars where KYC is active',
      kycRegistrations: 'Array<{ registrar, status, kycType, mode }>',
      remark:           'string — human readable summary',
    },
  });
}
