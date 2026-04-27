'use client';

import { CalculationResult } from './calculator';

interface PDFInput {
  name: string;
  email: string;
  phone: string;
  investmentType: string;
  amount: number;
  periodYears: number;
  expectedReturn: number;
  results: CalculationResult;
  advisorNote: string;
}

type RGB = [number, number, number];

function fmtCurrency(n: number): string {
  if (n >= 10000000) return `Rs. ${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `Rs. ${(n / 100000).toFixed(2)} L`;
  return `Rs. ${n.toLocaleString('en-IN')}`;
}

export async function generateAndDownloadPDF(data: PDFInput): Promise<void> {
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 0;

  const C = {
    bg: [2, 6, 23] as RGB,
    navy: [15, 23, 42] as RGB,
    surface: [30, 41, 59] as RGB,
    green: [34, 197, 94] as RGB,
    greenDark: [22, 163, 74] as RGB,
    white: [248, 250, 252] as RGB,
    muted: [100, 116, 139] as RGB,
    text: [203, 213, 225] as RGB,
    black: [0, 0, 0] as RGB,
    purWhite: [255, 255, 255] as RGB,
  };

  const setFill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const setTxt = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);

  // ── Cover Page ──────────────────────────────────────────────────────────
  setFill(C.bg); doc.rect(0, 0, pageW, pageH, 'F');
  setFill(C.green); doc.rect(0, 0, pageW, 3, 'F');

  // Logo
  setFill(C.green); doc.roundedRect(margin, 24, 12, 12, 2, 2, 'F');
  setTxt(C.black); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('M', margin + 3.8, 32);

  setTxt(C.white); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('MARKET MINDS INVESTMENT', margin + 16, 32);

  setDraw(C.surface); doc.setLineWidth(0.5);
  doc.line(margin, 44, pageW - margin, 44);

  // Title
  y = 80;
  setTxt(C.green); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('PERSONALIZED FINANCIAL PLAN', margin, y);

  y += 12;
  setTxt(C.white); doc.setFontSize(28); doc.setFont('helvetica', 'bold');
  doc.text('Investment Report', margin, y);

  y += 8;
  setTxt(C.text); doc.setFontSize(14); doc.setFont('helvetica', 'normal');
  doc.text(data.investmentType === 'SIP' ? 'Systematic Investment Plan' : 'Lump Sum Investment', margin, y);

  // Client card
  y += 24;
  setFill(C.navy); doc.roundedRect(margin, y, contentW, 50, 3, 3, 'F');
  setDraw(C.surface); doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, 50, 3, 3, 'S');

  const infoItems = [
    ['Prepared For', data.name],
    ['Email', data.email],
    ['Mobile', data.phone],
    ['Date', new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })],
  ];
  infoItems.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + 12 + col * (contentW / 2);
    const itemY = y + 12 + row * 20;
    setTxt(C.muted); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(item[0].toUpperCase(), x, itemY);
    setTxt(C.white); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(item[1], x, itemY + 6);
  });

  // Metric cards
  y += 68;
  const metrics = [
    { label: 'Total Invested', value: fmtCurrency(data.results.totalInvested), accent: false },
    { label: 'Est. Returns', value: `+${fmtCurrency(data.results.estimatedReturns)}`, accent: false },
    { label: 'Final Corpus', value: fmtCurrency(data.results.finalValue), accent: true },
  ];
  metrics.forEach((m, i) => {
    const x = margin + i * (contentW / 3);
    const w = contentW / 3 - 4;
    setFill(m.accent ? C.greenDark : C.surface);
    doc.roundedRect(x, y, w, 28, 2, 2, 'F');
    setTxt(m.accent ? C.purWhite : C.muted);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text(m.label.toUpperCase(), x + 6, y + 8);
    setTxt(m.accent ? C.purWhite : C.green);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text(m.value, x + 6, y + 20);
  });

  // Footer pg1
  setTxt(C.muted); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text('Confidential — Market Minds Investment', margin, pageH - 12);
  doc.text('Page 1', pageW - margin - 10, pageH - 12);

  // ── Page 2: Details + Table ────────────────────────────────────────────
  doc.addPage();
  setFill(C.bg); doc.rect(0, 0, pageW, pageH, 'F');
  setFill(C.green); doc.rect(0, 0, pageW, 3, 'F');
  y = 20;

  const drawSectionHeader = (title: string) => {
    setFill(C.navy); doc.rect(margin, y, contentW, 10, 'F');
    setDraw(C.green); doc.setLineWidth(0.5);
    doc.line(margin, y, margin, y + 10);
    setTxt(C.green); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), margin + 8, y + 6.5);
    y += 16;
  };

  drawSectionHeader('Investment Parameters');

  const params: [string, string][] = [
    ['Investment Type', data.investmentType === 'SIP' ? 'Systematic Investment Plan (SIP)' : 'Lump Sum'],
    [data.investmentType === 'SIP' ? 'Monthly SIP Amount' : 'Investment Amount', fmtCurrency(data.amount)],
    ['Investment Period', `${data.periodYears} Years`],
    ['Expected Annual Return', `${data.expectedReturn}%`],
    ['CAGR', `${data.results.cagr}%`],
    ['Wealth Multiplier', `${data.results.wealthMultiplier}x`],
  ];

  params.forEach(([label, value], i) => {
    const bg: RGB = i % 2 === 0 ? C.navy : [12, 19, 37];
    setFill(bg); doc.rect(margin, y, contentW, 8, 'F');
    setTxt(C.text); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(label, margin + 6, y + 5.5);
    setTxt(C.white); doc.setFont('helvetica', 'bold');
    doc.text(value, margin + contentW - 6, y + 5.5, { align: 'right' });
    y += 8;
  });

  y += 12;
  drawSectionHeader('Year-by-Year Growth');

  // Table header
  const colWidths = [15, 45, 45, 45, 20];
  const cols = ['Year', 'Amount Invested', 'Portfolio Value', 'Total Returns', 'Growth'];
  let x = margin;
  setFill(C.greenDark); doc.rect(margin, y, contentW, 8, 'F');
  cols.forEach((col, i) => {
    setTxt(C.purWhite); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
    doc.text(col, x + 3, y + 5.5);
    x += colWidths[i];
  });
  y += 8;

  // Table rows
  data.results.yearlyBreakdown.slice(0, 25).forEach((row, i) => {
    if (y > pageH - 25) {
      doc.addPage();
      setFill(C.bg); doc.rect(0, 0, pageW, pageH, 'F');
      y = 20;
    }
    const bg: RGB = i % 2 === 0 ? C.navy : [12, 19, 37];
    setFill(bg); doc.rect(margin, y, contentW, 7, 'F');
    x = margin;
    const cells = [
      `Year ${row.year}`,
      fmtCurrency(row.invested),
      fmtCurrency(row.value),
      fmtCurrency(row.returns),
      `${row.growthPercent}%`,
    ];
    cells.forEach((cell, ci) => {
      setTxt(ci >= 2 ? C.green : C.text);
      doc.setFontSize(8); doc.setFont('helvetica', ci === 0 ? 'bold' : 'normal');
      doc.text(cell, x + 3, y + 5);
      x += colWidths[ci];
    });
    y += 7;
  });

  setTxt(C.muted); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text('Market Minds Investment — Confidential', margin, pageH - 12);
  doc.text('Page 2', pageW - margin - 10, pageH - 12);

  // ── Page 3: Advisor ────────────────────────────────────────────────────
  doc.addPage();
  setFill(C.bg); doc.rect(0, 0, pageW, pageH, 'F');
  setFill(C.green); doc.rect(0, 0, pageW, 3, 'F');
  y = 20;

  drawSectionHeader('Financial Advisor Analysis');

  const paragraphs = data.advisorNote.split('\n\n');
  paragraphs.forEach(para => {
    if (y > pageH - 30) {
      doc.addPage();
      setFill(C.bg); doc.rect(0, 0, pageW, pageH, 'F');
      y = 20;
    }
    const isBold = para.startsWith('**') || para.startsWith('Hi ');
    const cleanPara = para.replace(/\*\*/g, '');
    setTxt(isBold ? C.white : C.text);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(9.5);
    const lines = doc.splitTextToSize(cleanPara, contentW - 8);
    doc.text(lines, margin + 4, y);
    y += lines.length * 5.5 + 6;
  });

  // Disclaimer
  const discY = Math.max(y, pageH - 40);
  setFill(C.navy); doc.roundedRect(margin, discY, contentW, 20, 2, 2, 'F');
  setTxt(C.muted); doc.setFontSize(7.5); doc.setFont('helvetica', 'italic');
  const disc = 'Disclaimer: Projections are estimates. Actual returns may vary. Consult a SEBI-registered advisor before investing.';
  const dLines = doc.splitTextToSize(disc, contentW - 12);
  doc.text(dLines, margin + 6, discY + 6);

  setTxt(C.muted); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text('Market Minds Investment — Confidential', margin, pageH - 12);
  doc.text('Page 3', pageW - margin - 10, pageH - 12);

  // ── Download ────────────────────────────────────────────────────────────
  doc.save(`MMI-Plan-${data.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
}
