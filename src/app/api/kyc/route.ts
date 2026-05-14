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
// Actual API response shape:
// {
//   cams_kra:  { kyc_status, kyc_date, kyc_mode, ... },
//   cvl_kra:   { kyc_status, kyc_date, kyc_mode, ... },
//   karvy_kra: { kyc_status, ... },
//   kfin_kra:  { kyc_status, ... },
//   ndml_kra:  { kyc_status, ... },
// }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRapidResponse(pan: string, raw: any) {
  const entityType = ENTITY_TYPES[pan[3]] || 'Individual (Person)';

  // Known registrar keys in the response
  const REGISTRAR_KEYS: Record<string, string> = {
    cams_kra:  'CAMS KRA',
    cvl_kra:   'CVL KRA',
    karvy_kra: 'Karvy KRA',
    kfin_kra:  'KFIN KRA',
    ndml_kra:  'NDML KRA',
  };

  // Status is "active/verified" if it contains these keywords
  const isActive = (status: string) =>
    /validated|registered|active|verified|valid/i.test(status) &&
    !/not\s+(available|checked|registered)/i.test(status);

  const isPending = (status: string) =>
    /pending|processing|hold/i.test(status);

  // Build registrations array from named keys
  const kycRegistrations = Object.entries(REGISTRAR_KEYS)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter(([key]) => raw?.[key] !== undefined)
    .map(([key, label]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = raw[key];
      return {
        registrar:   label,
        status:      r?.kyc_status        ?? '—',
        kycDate:     r?.kyc_date          ?? null,
        kycMode:     r?.kyc_mode          ?? null,
        statusDate:  r?.status_date       ?? null,
        modStatus:   r?.modification_status ?? null,
        remarks:     r?.kyc_remarks       ?? null,
      };
    });

  const anyVerified = kycRegistrations.some((r) => isActive(r.status));
  const anyPending  = kycRegistrations.some((r) => isPending(r.status));

  let overallStatus: 'verified' | 'pending' | 'not_found';
  if (anyVerified)    overallStatus = 'verified';
  else if (anyPending) overallStatus = 'pending';
  else                overallStatus = 'not_found';

  const verifiedWith = kycRegistrations
    .filter((r) => isActive(r.status))
    .map((r) => `${r.registrar} (${r.status})`);

  const remarks: Record<typeof overallStatus, string> = {
    verified:
      `PAN ${pan} is KYC verified. ` +
      `Active registrars: ${verifiedWith.join(', ')}.`,
    pending:
      `PAN ${pan} KYC is currently in progress at one or more registrars. ` +
      `This typically resolves within 2–5 business days.`,
    not_found:
      `PAN ${pan} is not KYC registered with any of the checked registrars (CAMS, Karvy, CVL, NDML, DOTEX). ` +
      `Please complete your KYC at your nearest mutual fund distributor or online at camsonline.com / karvymfs.com.`,
  };

  return {
    status: overallStatus,
    pan,
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
