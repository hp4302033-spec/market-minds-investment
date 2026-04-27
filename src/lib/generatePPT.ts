'use client';

import { CalculationResult } from './calculator';

interface PPTInput {
  name: string;
  investmentType: string;
  amount: number;
  periodYears: number;
  expectedReturn: number;
  results: CalculationResult;
  advisorNote: string;
}

function fmtCurrency(n: number): string {
  if (n >= 10000000) return `Rs. ${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `Rs. ${(n / 100000).toFixed(2)} L`;
  return `Rs. ${n.toLocaleString('en-IN')}`;
}

export async function generateAndDownloadPPT(data: PPTInput): Promise<void> {
  const pptxgen = (await import('pptxgenjs')).default;
  const prs = new pptxgen();

  prs.layout = 'LAYOUT_WIDE';
  prs.author = 'Market Minds Investment';
  prs.company = 'Market Minds Investment';
  prs.subject = `Financial Plan — ${data.name}`;
  prs.title = 'Investment Report';

  const theme = {
    bg: '020617',
    navy: '0F172A',
    surface: '1E293B',
    green: '22C55E',
    greenDark: '16A34A',
    white: 'F8FAFC',
    text: 'CBD5E1',
    muted: '64748B',
  };

  const slideW = 13.33;
  const slideH = 7.5;

  // ── Slide 1: Cover ────────────────────────────────────────────────────
  const slide1 = prs.addSlide();
  slide1.background = { color: theme.bg };

  // Green accent bar
  slide1.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: slideW, h: 0.12, fill: { color: theme.green } });

  // Brand name
  slide1.addText('MARKET MINDS INVESTMENT', {
    x: 0.7, y: 0.4, w: 8, h: 0.35,
    fontSize: 12, bold: true, color: theme.white, fontFace: 'Arial',
  });

  // Badge
  slide1.addShape(prs.ShapeType.rect, {
    x: 0.7, y: 2.2, w: 4, h: 0.35,
    fill: { color: theme.green }, line: { color: theme.green },
  });
  slide1.addText(
    data.investmentType === 'SIP' ? 'SYSTEMATIC INVESTMENT PLAN' : 'LUMP SUM INVESTMENT',
    { x: 0.7, y: 2.2, w: 4, h: 0.35, fontSize: 9, bold: true, color: theme.bg, fontFace: 'Arial' }
  );

  // Title
  slide1.addText('Investment\nReport', {
    x: 0.7, y: 2.7, w: 9, h: 1.8,
    fontSize: 52, bold: true, color: theme.white, fontFace: 'Arial',
  });

  // Client name
  slide1.addText(`Prepared for: ${data.name}`, {
    x: 0.7, y: 5.0, w: 9, h: 0.4,
    fontSize: 16, color: theme.text, fontFace: 'Arial',
  });
  slide1.addText(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }), {
    x: 0.7, y: 5.4, w: 9, h: 0.35,
    fontSize: 12, color: theme.muted, fontFace: 'Arial',
  });

  // Decorative right element
  slide1.addShape(prs.ShapeType.rect, {
    x: 10.5, y: 1.5, w: 2.5, h: 5.5,
    fill: { color: theme.navy }, line: { color: theme.surface },
  });
  slide1.addText([
    { text: fmtCurrency(data.results.finalValue), options: { fontSize: 22, bold: true, color: theme.green, breakLine: true } },
    { text: 'Final Corpus', options: { fontSize: 10, color: theme.muted, breakLine: true } },
    { text: '\n', options: {} },
    { text: `${data.results.wealthMultiplier}x`, options: { fontSize: 28, bold: true, color: theme.white, breakLine: true } },
    { text: 'Wealth Multiplier', options: { fontSize: 10, color: theme.muted, breakLine: true } },
  ], { x: 10.55, y: 2.0, w: 2.4, h: 4.5, fontFace: 'Arial', align: 'center' });

  // ── Slide 2: Plan Summary ─────────────────────────────────────────────
  const slide2 = prs.addSlide();
  slide2.background = { color: theme.bg };
  slide2.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: slideW, h: 0.12, fill: { color: theme.green } });

  slide2.addText('PLAN SUMMARY', {
    x: 0.7, y: 0.3, w: 5, h: 0.4,
    fontSize: 11, bold: true, color: theme.green, fontFace: 'Arial',
  });
  slide2.addText('Investment Parameters & Results', {
    x: 0.7, y: 0.7, w: 8, h: 0.5,
    fontSize: 24, bold: true, color: theme.white, fontFace: 'Arial',
  });

  // Summary metrics (3 big boxes)
  const metrics = [
    { label: 'Total Invested', value: fmtCurrency(data.results.totalInvested), bg: theme.navy },
    { label: 'Estimated Returns', value: `+${fmtCurrency(data.results.estimatedReturns)}`, bg: theme.navy },
    { label: 'Final Corpus Value', value: fmtCurrency(data.results.finalValue), bg: theme.greenDark },
  ];

  metrics.forEach((m, i) => {
    const x = 0.7 + i * 4.1;
    slide2.addShape(prs.ShapeType.rect, {
      x, y: 1.4, w: 3.8, h: 1.6,
      fill: { color: m.bg }, line: { color: theme.surface },
    });
    slide2.addText(m.label, {
      x, y: 1.5, w: 3.8, h: 0.4,
      fontSize: 9, color: m.bg === theme.greenDark ? 'FFFFFF' : theme.muted,
      align: 'center', fontFace: 'Arial',
    });
    slide2.addText(m.value, {
      x, y: 1.9, w: 3.8, h: 0.8,
      fontSize: 20, bold: true, color: m.bg === theme.greenDark ? 'FFFFFF' : theme.green,
      align: 'center', fontFace: 'Arial',
    });
  });

  // Parameters table
  const params: [string, string][] = [
    ['Investment Type', data.investmentType === 'SIP' ? 'SIP (Monthly)' : 'Lump Sum'],
    [data.investmentType === 'SIP' ? 'Monthly Amount' : 'Investment', fmtCurrency(data.amount)],
    ['Period', `${data.periodYears} Years`],
    ['Expected Return', `${data.expectedReturn}% p.a.`],
    ['CAGR', `${data.results.cagr}%`],
    ['Wealth Multiplier', `${data.results.wealthMultiplier}x`],
  ];

  params.forEach(([label, value], i) => {
    const row = i % 3;
    const col = Math.floor(i / 3);
    const x = 0.7 + col * 6.2;
    const rowY = 3.2 + row * 0.65;

    slide2.addShape(prs.ShapeType.rect, {
      x, y: rowY, w: 5.8, h: 0.6,
      fill: { color: i % 2 === 0 ? theme.navy : theme.surface }, line: { color: theme.surface },
    });
    slide2.addText(label, {
      x: x + 0.2, y: rowY + 0.1, w: 3, h: 0.4,
      fontSize: 10, color: theme.muted, fontFace: 'Arial',
    });
    slide2.addText(value, {
      x: x + 2.5, y: rowY + 0.1, w: 3, h: 0.4,
      fontSize: 11, bold: true, color: theme.white, align: 'right', fontFace: 'Arial',
    });
  });

  // ── Slide 3: Yearly Growth Table ──────────────────────────────────────
  const slide3 = prs.addSlide();
  slide3.background = { color: theme.bg };
  slide3.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: slideW, h: 0.12, fill: { color: theme.green } });

  slide3.addText('YEAR-BY-YEAR GROWTH', {
    x: 0.7, y: 0.3, w: 8, h: 0.4,
    fontSize: 11, bold: true, color: theme.green, fontFace: 'Arial',
  });
  slide3.addText('Tracking Your Wealth Journey', {
    x: 0.7, y: 0.7, w: 8, h: 0.5,
    fontSize: 22, bold: true, color: theme.white, fontFace: 'Arial',
  });

  // Table data
  const tableHeaders = [['Year', 'Amount Invested', 'Portfolio Value', 'Total Returns', 'Growth %']];
  const tableRows = data.results.yearlyBreakdown.slice(0, 15).map(row => [
    `Year ${row.year}`,
    fmtCurrency(row.invested),
    fmtCurrency(row.value),
    fmtCurrency(row.returns),
    `${row.growthPercent}%`,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slide3.addTable([...tableHeaders, ...tableRows] as any, {
    x: 0.7, y: 1.5, w: 11.9, h: 5.5,
    border: { type: 'solid', color: theme.surface, pt: 0.5 },
    fontFace: 'Arial',
    fontSize: 9,
    color: theme.text,
    fill: { color: theme.navy },
    rowH: 0.32,
    colW: [1.5, 2.8, 2.8, 2.8, 2.0],
    thead: {
      bold: true,
      color: 'FFFFFF',
      fill: { color: theme.greenDark },
      fontSize: 9,
    },
  } as never);

  // ── Slide 4: Advisor Note ─────────────────────────────────────────────
  const slide4 = prs.addSlide();
  slide4.background = { color: theme.bg };
  slide4.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: slideW, h: 0.12, fill: { color: theme.green } });

  slide4.addText('EXPERT ANALYSIS', {
    x: 0.7, y: 0.3, w: 8, h: 0.4,
    fontSize: 11, bold: true, color: theme.green, fontFace: 'Arial',
  });
  slide4.addText('Personalized Financial Advisory', {
    x: 0.7, y: 0.7, w: 9, h: 0.5,
    fontSize: 22, bold: true, color: theme.white, fontFace: 'Arial',
  });

  slide4.addShape(prs.ShapeType.rect, {
    x: 0.7, y: 1.4, w: 11.9, h: 5.5,
    fill: { color: theme.navy }, line: { color: theme.surface },
  });

  const cleanNote = data.advisorNote.replace(/\*\*/g, '').substring(0, 1800) + '...';
  slide4.addText(cleanNote, {
    x: 0.9, y: 1.6, w: 11.5, h: 5.1,
    fontSize: 10, color: theme.text, fontFace: 'Arial', valign: 'top',
  });

  // Disclaimer slide
  const slide5 = prs.addSlide();
  slide5.background = { color: theme.navy };
  slide5.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: slideW, h: 0.12, fill: { color: theme.green } });
  slide5.addText('MARKET MINDS INVESTMENT', {
    x: 0, y: 2.5, w: slideW, h: 1,
    fontSize: 28, bold: true, color: theme.white, align: 'center', fontFace: 'Arial',
  });
  slide5.addText('Thank you for choosing us as your financial planning partner.', {
    x: 0, y: 3.8, w: slideW, h: 0.5,
    fontSize: 14, color: theme.text, align: 'center', fontFace: 'Arial',
  });
  slide5.addText('Disclaimer: Projections are estimates. Actual returns may vary. Consult a SEBI-registered advisor before investing.', {
    x: 1, y: 6.5, w: slideW - 2, h: 0.5,
    fontSize: 8, color: theme.muted, align: 'center', fontFace: 'Arial',
  });

  // Download
  const fileName = `MMI-Plan-${data.name.replace(/\s+/g, '-')}-${Date.now()}.pptx`;
  await prs.writeFile({ fileName });
}
