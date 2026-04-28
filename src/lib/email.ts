import nodemailer from 'nodemailer';

// Gmail SMTP transporter — uses App Password (not your real Gmail password)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export interface EmailPayload {
  to: string;
  name: string;
  investmentType: string;
  amount: number;
  periodYears: number;
  expectedReturn: number;
  totalInvested: number;
  estimatedReturns: number;
  finalValue: number;
  pdfBuffer?: Buffer;
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function buildEmailHTML(payload: EmailPayload): string {
  const { name, investmentType, amount, periodYears, expectedReturn, totalInvested, estimatedReturns, finalValue } = payload;
  const firstName = name.split(' ')[0];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your Financial Plan — Market Minds Investment</title>
</head>
<body style="margin:0;padding:0;background:#020617;font-family:'IBM Plex Sans',Arial,sans-serif;color:#F8FAFC;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:16px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#22C55E,#16A34A);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#fff;">M</div>
        <span style="font-size:18px;font-weight:700;color:#F8FAFC;">Market Minds Investment</span>
      </div>
      <h1 style="font-size:28px;font-weight:700;margin:0 0 8px;color:#F8FAFC;">Your Financial Plan is Ready!</h1>
      <p style="color:#94A3B8;margin:0;">Hi ${firstName}, here's a summary of your personalized investment plan.</p>
    </div>

    <!-- Plan Summary Card -->
    <div style="background:linear-gradient(135deg,rgba(248,250,252,0.06),rgba(248,250,252,0.02));border:1px solid rgba(248,250,252,0.12);border-radius:16px;padding:28px;margin-bottom:24px;">
      <h2 style="font-size:16px;font-weight:600;color:#22C55E;margin:0 0 20px;text-transform:uppercase;letter-spacing:0.06em;">Plan Summary</h2>
      
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;color:#94A3B8;font-size:14px;border-bottom:1px solid rgba(248,250,252,0.06);">Investment Type</td>
          <td style="padding:10px 0;color:#F8FAFC;font-size:14px;font-weight:500;text-align:right;border-bottom:1px solid rgba(248,250,252,0.06);">${investmentType === 'SIP' ? 'Systematic Investment Plan (SIP)' : 'Lump Sum Investment'}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#94A3B8;font-size:14px;border-bottom:1px solid rgba(248,250,252,0.06);">${investmentType === 'SIP' ? 'Monthly SIP Amount' : 'Investment Amount'}</td>
          <td style="padding:10px 0;color:#F8FAFC;font-size:14px;font-weight:500;text-align:right;border-bottom:1px solid rgba(248,250,252,0.06);">${formatCurrency(amount)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#94A3B8;font-size:14px;border-bottom:1px solid rgba(248,250,252,0.06);">Investment Period</td>
          <td style="padding:10px 0;color:#F8FAFC;font-size:14px;font-weight:500;text-align:right;border-bottom:1px solid rgba(248,250,252,0.06);">${periodYears} Years</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#94A3B8;font-size:14px;">Expected Annual Return</td>
          <td style="padding:10px 0;color:#F8FAFC;font-size:14px;font-weight:500;text-align:right;">${expectedReturn}%</td>
        </tr>
      </table>
    </div>

    <!-- Results -->
    <div style="display:grid;gap:12px;margin-bottom:24px;">
      <div style="background:rgba(248,250,252,0.04);border:1px solid rgba(248,250,252,0.08);border-radius:12px;padding:20px;text-align:center;">
        <p style="color:#94A3B8;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.06em;">Total Invested</p>
        <p style="color:#F8FAFC;font-size:24px;font-weight:700;margin:0;">${formatCurrency(totalInvested)}</p>
      </div>
      <div style="background:rgba(248,250,252,0.04);border:1px solid rgba(248,250,252,0.08);border-radius:12px;padding:20px;text-align:center;">
        <p style="color:#94A3B8;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.06em;">Estimated Returns</p>
        <p style="color:#22C55E;font-size:24px;font-weight:700;margin:0;">+${formatCurrency(estimatedReturns)}</p>
      </div>
      <div style="background:linear-gradient(135deg,rgba(34,197,94,0.15),rgba(34,197,94,0.05));border:1px solid rgba(34,197,94,0.25);border-radius:12px;padding:20px;text-align:center;">
        <p style="color:#22C55E;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">Final Corpus Value</p>
        <p style="color:#4ADE80;font-size:32px;font-weight:700;margin:0;">${formatCurrency(finalValue)}</p>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px;">
      <p style="color:#94A3B8;font-size:14px;margin:0 0 16px;">Your detailed report with year-by-year breakdown and charts is attached as a PDF.</p>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid rgba(248,250,252,0.08);padding-top:24px;text-align:center;">
      <p style="color:#475569;font-size:12px;margin:0 0 8px;">Market Minds Investment</p>
      <p style="color:#475569;font-size:12px;margin:0;">This is an automated email. Please do not reply to this message.</p>
      <p style="color:#475569;font-size:11px;margin:8px 0 0;">Disclaimer: Investment projections are estimates based on assumed returns. Actual returns may vary. Please consult a SEBI-registered advisor before investing.</p>
    </div>
  </div>
</body>
</html>`;
}

async function sendWithRetry(payload: EmailPayload, attempts = 3): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const attachments = payload.pdfBuffer
        ? [{
            filename: `MMI-Financial-Plan-${payload.name.replace(/\s+/g, '-')}.pdf`,
            content: payload.pdfBuffer,
          }]
        : [];

      await transporter.sendMail({
        from: `"Market Minds Investment" <${process.env.GMAIL_USER}>`,
        to: payload.to,
        subject: `Your Financial Plan is Ready — ${payload.name} | Market Minds Investment`,
        html: buildEmailHTML(payload),
        attachments,
      });

      console.log(`Email sent successfully to ${payload.to}`);
      return { success: true };

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Email attempt ${attempt} failed:`, message);
      if (attempt < attempts) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500));
        continue;
      }
      return { success: false, error: message };
    }
  }
  return { success: false, error: 'All retry attempts exhausted' };
}

export async function sendPlanEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('Gmail credentials not configured — skipping email send');
    return { success: false, error: 'Email service not configured' };
  }
  return sendWithRetry(payload);
}
