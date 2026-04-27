import { NextRequest, NextResponse } from 'next/server';

/* ─────────────────────────────────────────────────────────────────
 * KYC / PAN Status API — Agent 7
 * Provider  : Digio DigiKYC — KRA Check PAN Status API
 * Docs      : https://documentation.digio.in/digikyc/kra/api_integration/check_pan_status/
 *
 * Auth      : HTTP Basic Auth  →  Base64(client_id:client_secret)
 * Method    : POST
 * Endpoint  : {DIGIO_BASE_URL}/v2/client/kyc/pan-status
 * Body      : { "pan": "ABCDE1234F" }
 *
 * Response  : KYC Status is provided in 3 digits.
 *   - 1st digit = KRA where record exists
 *     (1=CVL, 2=NDML, 3=DOTEX, 4=CAMS, 5=Karvy)
 *   - 2nd digit = KYC status  (1=Verified, 2=Pending, 3=Rejected, 0=Not Found)
 *   - 3rd digit = KYC type    (1=Normal, 2=Simplified)
 *
 * Get credentials at: https://app.digio.in/#/register
 * Base URLs: https://documentation.digio.in/digienvironments
 *   Sandbox : https://ext.digio.in:444
 *   Prod    : https://api.digio.in
 * ─────────────────────────────────────────────────────────────────*/

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

/* KRA code → registrar name */
const KRA_NAMES: Record<string, string> = {
  '1': 'CVL (CDSL Ventures)',
  '2': 'NDML (NSDL Database)',
  '3': 'DOTEX (BSE)',
  '4': 'CAMS',
  '5': 'Karvy / KFintech',
};

/* ── Parse Digio 3-digit KYC status code ─────────────────────────*/
function parseDigioStatus(code: string | undefined): {
  kra: string;
  status: 'verified' | 'pending' | 'not_found';
  statusLabel: string;
  kycType: string;
} {
  if (!code || code.length < 2) {
    return { kra: 'Unknown', status: 'not_found', statusLabel: 'Not Found', kycType: 'N/A' };
  }
  const kraDigit  = code[0] || '0';
  const statusDigit = code[1] || '0';
  const typeDigit = code[2] || '1';

  const kra = KRA_NAMES[kraDigit] || 'Unknown Registry';
  const kycType = typeDigit === '2' ? 'Simplified KYC' : 'Normal KYC';

  let status: 'verified' | 'pending' | 'not_found';
  let statusLabel: string;
  switch (statusDigit) {
    case '1': status = 'verified';  statusLabel = 'Verified';  break;
    case '2': status = 'pending';   statusLabel = 'Pending';   break;
    case '3': status = 'not_found'; statusLabel = 'Rejected';  break;
    default:  status = 'not_found'; statusLabel = 'Not Found'; break;
  }

  return { kra, status, statusLabel, kycType };
}

/* ── Map Digio API response → our KYCResult shape ────────────────*/
function mapDigioResponse(pan: string, raw: Record<string, unknown>) {
  const entityType = ENTITY_TYPES[pan[3]] || 'Individual (Person)';

  // Digio response fields (typical):
  // { kyc_status: "110", name: "RAHUL SHARMA", dob: "01-01-1990", ... }
  const kycStatusCode = (raw['kyc_status'] as string) || (raw['kycStatus'] as string) || '';
  const { kra, status, kycType } = parseDigioStatus(kycStatusCode);

  const name: string =
    (raw['name'] as string) ||
    (raw['applicant_name'] as string) ||
    (raw['pan_name'] as string) ||
    '—';

  const dob: string =
    (raw['dob'] as string) ||
    (raw['date_of_birth'] as string) ||
    '—';

  const registeredOn: string =
    (raw['kyc_date'] as string) ||
    (raw['reg_date'] as string) ||
    (raw['registration_date'] as string) ||
    '—';

  const lastUpdated: string =
    (raw['updated_date'] as string) ||
    (raw['last_updated'] as string) ||
    registeredOn;

  const verifiedWith: string[] = status === 'verified' ? [kra, 'Income Tax Department'] : [];

  const remarks: Record<typeof status, string> = {
    verified:
      `PAN ${pan} is KYC verified with ${kra}. The KYC type is ${kycType}. ` +
      `You are fully eligible to invest in Mutual Funds, Stocks, Bonds, and all SEBI-regulated financial instruments without any additional KYC requirements.`,
    pending:
      `KYC for PAN ${pan} is currently pending with ${kra}. ` +
      `Your KYC application has been received but verification is in progress. This typically takes 2–5 business days. ` +
      `Please ensure your PAN is linked with Aadhaar on the Income Tax portal (incometax.gov.in).`,
    not_found:
      `No KYC record was found for PAN ${pan} across CAMS, Karvy, CVL, NDML, and DOTEX registries. ` +
      `Please complete your KYC by visiting your nearest bank, AMC office, or using an online KYC portal ` +
      `with your Aadhaar and PAN card.`,
  };

  return {
    status,
    pan,
    name: status === 'not_found' ? '—' : (name || '—'),
    entityType,
    dob: status !== 'not_found' ? dob : '—',
    registeredOn: status !== 'not_found' ? registeredOn : '—',
    lastUpdated: status !== 'not_found' ? lastUpdated : '—',
    verifiedWith,
    remark: remarks[status],
    kycStatusCode: kycStatusCode || 'N/A',
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

    /* ── 2. Get Digio credentials ───────────────── */
    const clientId     = process.env.DIGIO_CLIENT_ID;
    const clientSecret = process.env.DIGIO_CLIENT_SECRET;
    const baseUrl      = process.env.DIGIO_BASE_URL || 'https://ext.digio.in:444'; // sandbox default

    if (!clientId || !clientSecret) {
      console.warn('Digio credentials not configured — returning format validation only');
      // Graceful degradation: return format-only result so UI still works
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
            `PAN format for ${pan} is valid (${ENTITY_TYPES[pan[3]] || 'Individual'}). ` +
            `Live KYC status check requires Digio API credentials. ` +
            `Register at https://app.digio.in/#/register to enable real-time verification.`,
          kycStatusCode: 'N/A',
          note: 'Configure DIGIO_CLIENT_ID and DIGIO_CLIENT_SECRET for live KYC checks.',
        },
      });
    }

    /* ── 3. Build Basic Auth header ─────────────── */
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    /* ── 4. Call Digio KRA Check PAN Status API ─── */
    const apiResponse = await fetch(`${baseUrl}/v2/client/kyc/pan-status`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ pan }),
    });

    const rawData = await apiResponse.json().catch(() => ({}));
    console.log(`Digio KYC response [${apiResponse.status}]:`, JSON.stringify(rawData, null, 2));

    if (!apiResponse.ok) {
      const errMsg = (rawData as Record<string, string>)?.message || `Error ${apiResponse.status}`;
      if (apiResponse.status === 401 || apiResponse.status === 403) {
        return NextResponse.json({
          success: false, error: 'KYC service authentication failed. Check Digio credentials.',
        }, { status: 403 });
      }
      if (apiResponse.status === 429) {
        return NextResponse.json({
          success: false, error: 'KYC service rate limit reached. Please try again in a moment.',
        }, { status: 429 });
      }
      return NextResponse.json({
        success: false, error: `KYC service error: ${errMsg}`,
      }, { status: 502 });
    }

    /* ── 5. Map response → our shape ─────────────── */
    const result = mapDigioResponse(pan, rawData as Record<string, unknown>);
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
    service: 'MMI KYC Verification API',
    agent: 'Agent 7',
    version: '4.0.0',
    provider: 'Digio DigiKYC — KRA Check PAN Status',
    docs: 'https://documentation.digio.in/digikyc/kra/api_integration/check_pan_status/',
    endpoint: 'POST /v2/client/kyc/pan-status',
    auth: 'Basic Auth (DIGIO_CLIENT_ID:DIGIO_CLIENT_SECRET)',
    sandbox: 'https://ext.digio.in:444',
    production: 'https://api.digio.in',
    status_code_format: '3 digits: [KRA][KYC Status][KYC Type]',
    kra_codes: KRA_NAMES,
  });
}
