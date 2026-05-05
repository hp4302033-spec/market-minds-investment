'use client';

import { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { CalculationResult, formatCurrency } from '@/lib/calculator';

interface ResultsData {
  name: string;
  email: string;
  phone: string;
  investmentType: string;
  amount: number;
  periodYears: number;
  expectedReturn: number;
  withdrawalAmount?: number;
  results: CalculationResult;
  advisorNote: string;
  emailSent: boolean;
  emailMessage: string;
}

interface ResultsDashboardProps {
  data: ResultsData;
  onReset: () => void;
}

const CHART_COLORS = {
  invested: '#3B82F6',
  returns: '#22C55E',
  grid: 'rgba(248,250,252,0.06)',
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ── Animation variants ─────────────────────────── */
const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

const cardHover = {
  whileHover: { y: -3, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' },
  transition: { type: 'spring' as const, stiffness: 300, damping: 20 },
};

/* ── StatCard ───────────────────────────────────── */
function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <motion.div
      className={`stat-card ${accent ? 'ring-1 ring-brand-green/30' : ''}`}
      style={accent ? { background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))' } : {}}
      variants={itemVariants}
      {...cardHover}
    >
      <p className="text-xs font-semibold text-text-muted tracking-widest uppercase mb-2">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-brand-green-light' : 'text-text-primary'}`}>{value}</p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </motion.div>
  );
}

/* ── Tooltip ──────────────────────────────────── */
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl p-3 text-sm" style={{ border: '1px solid rgba(248,250,252,0.15)' }}>
      <p className="font-semibold text-text-primary mb-2">Year {label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: i === 0 ? CHART_COLORS.invested : CHART_COLORS.returns }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

/* ── Advisor Section ───────────────────────────── */
function AdvisorSection({ note }: { note: string }) {
  const [expanded, setExpanded] = useState(false);
  const paragraphs = note.split('\n\n').filter(Boolean);
  const visible = expanded ? paragraphs : paragraphs.slice(0, 3);

  return (
    <motion.div className="glass-card rounded-2xl p-6" variants={itemVariants} {...cardHover}>
      <div className="flex items-center gap-3 mb-6">
        <motion.div
          style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '8px' }}
          animate={{ boxShadow: ['0 0 0px rgba(34,197,94,0)', '0 0 16px rgba(34,197,94,0.35)', '0 0 0px rgba(34,197,94,0)'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        </motion.div>
        <div>
          <h3 className="font-bold text-text-primary">AI Financial Advisor</h3>
          <p className="text-xs text-text-muted">Personalized analysis based on your inputs</p>
        </div>
      </div>

      <motion.div className="space-y-4">
        <AnimatePresence>
          {visible.map((para, i) => {
            const isBoldHeader = para.startsWith('**');
            const clean = para.replace(/\*\*/g, '');
            if (isBoldHeader) {
              return (
                <motion.div
                  key={`${i}-${expanded}`}
                  className="border-l-2 border-brand-green pl-4"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                >
                  <p className="font-semibold text-text-primary text-sm">{clean}</p>
                </motion.div>
              );
            }
            if (para.startsWith('•')) {
              return (
                <motion.ul
                  key={`${i}-${expanded}`}
                  className="space-y-1"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                >
                  {para.split('\n').map((line, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-brand-green mt-0.5 flex-shrink-0">•</span>
                      {line.replace(/^• /, '')}
                    </li>
                  ))}
                </motion.ul>
              );
            }
            return (
              <motion.p
                key={`${i}-${expanded}`}
                className="text-text-secondary text-sm leading-relaxed"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
              >
                {clean}
              </motion.p>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {paragraphs.length > 3 && (
        <motion.button
          className="btn-secondary mt-4 text-sm py-2 px-4"
          onClick={() => setExpanded(!expanded)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          {expanded ? 'Show Less' : `Read Full Analysis (${paragraphs.length - 3} more sections)`}
        </motion.button>
      )}
    </motion.div>
  );
}

/* ── Main Dashboard ────────────────────────────── */
export default function ResultsDashboard({ data, onReset }: ResultsDashboardProps) {
  const { results, advisorNote, emailSent, emailMessage, name, email, phone, investmentType, amount, periodYears, expectedReturn, withdrawalAmount = 0 } = data;
  const isSWP = investmentType === 'SWP';
  const [downloading, setDownloading] = useState<'pdf' | 'ppt' | null>(null);
  const [showTable, setShowTable] = useState(false);

  const pieData = isSWP
    ? [
        { name: 'Remaining', value: results.remainingCorpus ?? results.finalValue },
        { name: 'Withdrawn', value: results.totalWithdrawn ?? 0 },
      ]
    : [
        { name: 'Invested', value: results.totalInvested },
        { name: 'Returns', value: results.estimatedReturns },
      ];

  const handleDownloadPDF = async () => {
    setDownloading('pdf');
    try {
      const { generateAndDownloadPDF } = await import('@/lib/generatePDF');
      await generateAndDownloadPDF({ name, email, phone, investmentType, amount, periodYears, expectedReturn, withdrawalAmount, results, advisorNote });
    } catch (err) {
      console.error('PDF error:', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPPT = async () => {
    setDownloading('ppt');
    try {
      const { generateAndDownloadPPT } = await import('@/lib/generatePPT');
      await generateAndDownloadPPT({ name, investmentType, amount, periodYears, expectedReturn, results, advisorNote });
    } catch (err) {
      console.error('PPT error:', err);
      alert('PPT generation failed. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <motion.div
      className="max-w-5xl mx-auto space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        variants={itemVariants}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <motion.div
              className="w-2 h-2 rounded-full bg-brand-green"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-xs font-semibold text-brand-green tracking-widest uppercase">Report Generated</span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary">Your Financial Dashboard</h2>
          <p className="text-text-secondary text-sm mt-1">
            Hi {name.split(' ')[0]}! Here&apos;s your personalized{' '}
            {investmentType === 'SIP' ? 'SIP' : investmentType === 'SWP' ? 'SWP' : 'Lump Sum'} plan.
          </p>
        </div>
        <motion.button
          className="btn-secondary text-sm py-2 px-4"
          onClick={onReset}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.51" />
          </svg>
          Recalculate
        </motion.button>
      </motion.div>

      {/* Email Status */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-3 p-4 rounded-xl text-sm"
        style={emailSent
          ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }
          : { background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }
        }
      >
        {emailSent ? (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </motion.div>
            <span className="text-brand-green font-medium">{emailMessage}</span>
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-yellow-400">{emailMessage || 'Email service not configured yet. Download the PDF below.'}</span>
          </>
        )}
      </motion.div>

      {/* Key Metrics */}
      <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4" variants={containerVariants}>
        {isSWP ? (
          <>
            <StatCard
              label="Initial Corpus"
              value={formatCurrency(results.totalInvested)}
              sub="One-time corpus invested"
            />
            <StatCard
              label="Total Withdrawn"
              value={formatCurrency(results.totalWithdrawn ?? 0)}
              sub={`₹${withdrawalAmount.toLocaleString('en-IN')}/month × ${periodYears * 12} months`}
            />
            <StatCard
              label={results.corpusDepletesAtYear ? `Depleted at Year ${results.corpusDepletesAtYear}` : 'Remaining Corpus'}
              value={results.corpusDepletesAtYear ? '₹0' : formatCurrency(results.remainingCorpus ?? 0)}
              sub={results.corpusDepletesAtYear ? '⚠️ Corpus exhausted before period ends' : `${results.wealthMultiplier}x total value ratio | ${results.cagr}% p.a.`}
              accent
            />
          </>
        ) : (
          <>
            <StatCard
              label="Total Invested"
              value={formatCurrency(results.totalInvested)}
              sub={investmentType === 'SIP' ? `₹${amount.toLocaleString('en-IN')}/month × ${periodYears * 12} months` : 'One-time investment'}
            />
            <StatCard
              label="Estimated Returns"
              value={`+${formatCurrency(results.estimatedReturns)}`}
              sub={`${Math.round((results.estimatedReturns / results.totalInvested) * 100)}% profit on invested amount`}
            />
            <StatCard
              label="Final Corpus Value"
              value={formatCurrency(results.finalValue)}
              sub={`${results.wealthMultiplier}x wealth multiplier | ${results.cagr}% CAGR`}
              accent
            />
          </>
        )}
      </motion.div>

      {/* SWP depletion warning */}
      {isSWP && results.corpusDepletesAtYear && (
        <motion.div
          variants={itemVariants}
          className="flex items-start gap-3 p-4 rounded-xl text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-red-400">
            <span className="font-semibold">Corpus depletes at Year {results.corpusDepletesAtYear}.</span>{' '}
            Reduce monthly withdrawal or increase initial corpus to make your plan sustainable.
          </p>
        </motion.div>
      )}
      {isSWP && !results.corpusDepletesAtYear && (
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-3 p-4 rounded-xl text-sm"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-brand-green font-medium">Self-sustaining SWP — corpus survives the full {periodYears}-year period! 🎉</p>
        </motion.div>
      )}

      {/* Charts */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-4" variants={containerVariants}>
        {/* Area Chart */}
        <motion.div className="lg:col-span-2 glass-card rounded-2xl p-6" variants={itemVariants} {...cardHover}>
          <h3 className="font-semibold text-text-primary mb-4">
            {isSWP ? 'Corpus Depletion Over Time' : 'Corpus Growth Over Time'}
          </h3>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={results.yearlyBreakdown} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.invested} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.invested} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="returnsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.returns} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={CHART_COLORS.returns} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="year" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={v => formatCurrency(v)} tick={{ fill: '#64748B', fontSize: 10 }} tickLine={false} axisLine={false} width={75} />
                <Tooltip content={<CustomTooltip />} />
                {isSWP ? (
                  <>
                    <Area type="monotone" dataKey="value" stroke={CHART_COLORS.returns} fill="url(#returnsGrad)" strokeWidth={2.5} name="Corpus Remaining" />
                    <Area type="monotone" dataKey="returns" stroke={CHART_COLORS.invested} fill="url(#investedGrad)" strokeWidth={2} name="Cumulative Withdrawn" />
                  </>
                ) : (
                  <>
                    <Area type="monotone" dataKey="invested" stroke={CHART_COLORS.invested} fill="url(#investedGrad)" strokeWidth={2} name="Invested" />
                    <Area type="monotone" dataKey="value" stroke={CHART_COLORS.returns} fill="url(#returnsGrad)" strokeWidth={2.5} name="Portfolio Value" />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Pie Chart */}
        <motion.div className="glass-card rounded-2xl p-6" variants={itemVariants} {...cardHover}>
          <h3 className="font-semibold text-text-primary mb-4">
            {isSWP ? 'Remaining vs Withdrawn' : 'Invested vs Returns'}
          </h3>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  <Cell fill={CHART_COLORS.returns} />
                  <Cell fill={CHART_COLORS.invested} />
                </Pie>
                <Tooltip formatter={(v) => typeof v === 'number' ? formatCurrency(v) : String(v)} contentStyle={{ background: '#0F172A', border: '1px solid rgba(248,250,252,0.15)', borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={10} formatter={(v) => <span style={{ color: '#CBD5E1', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-2">
            {isSWP ? (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Remaining</span>
                  <span className="font-medium" style={{ color: CHART_COLORS.returns }}>
                    {results.totalInvested > 0 ? Math.round(((results.remainingCorpus ?? 0) / results.totalInvested) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Withdrawn</span>
                  <span className="font-medium" style={{ color: CHART_COLORS.invested }}>
                    {results.totalInvested > 0 ? Math.round(((results.totalWithdrawn ?? 0) / results.totalInvested) * 100) : 0}%
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Invested</span>
                  <span className="font-medium" style={{ color: CHART_COLORS.invested }}>{Math.round((results.totalInvested / results.finalValue) * 100)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Returns</span>
                  <span className="font-medium" style={{ color: CHART_COLORS.returns }}>{Math.round((results.estimatedReturns / results.finalValue) * 100)}%</span>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* AI Advisor */}
      <AdvisorSection note={advisorNote} />

      {/* Yearly Table */}
      <motion.div className="glass-card rounded-2xl overflow-hidden" variants={itemVariants}>
        <motion.button
          className="w-full flex items-center justify-between p-6 text-left"
          onClick={() => setShowTable(!showTable)}
          whileHover={{ backgroundColor: 'rgba(248,250,252,0.02)' }}
        >
          <div>
            <h3 className="font-semibold text-text-primary">Year-by-Year Breakdown</h3>
            <p className="text-xs text-text-muted mt-0.5">Detailed growth for each year of your investment</p>
          </div>
          <motion.div animate={{ rotate: showTable ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {showTable && (
            <motion.div
              className="overflow-x-auto"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    {isSWP ? (
                      <><th>Corpus Value</th><th>Cum. Withdrawn</th><th>Withdrawn (Year)</th></>
                    ) : (
                      <><th>Amount Invested</th><th>Portfolio Value</th><th>Total Returns</th></>
                    )}
                    <th>Annual Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {results.yearlyBreakdown.map((row, i) => {
                    const prevReturns = i > 0 ? results.yearlyBreakdown[i - 1].returns : 0;
                    const withdrawnThisYear = isSWP ? (row.returns - prevReturns) : 0;
                    return (
                      <motion.tr
                        key={row.year}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.25 }}
                      >
                        <td className="font-medium text-text-primary">Year {row.year}</td>
                        {isSWP ? (
                          <>
                            <td className="font-medium" style={{ color: row.value === 0 ? '#EF4444' : '#22C55E' }}>
                              {row.value === 0 ? 'Depleted' : formatCurrency(row.value)}
                            </td>
                            <td className="font-medium" style={{ color: '#60A5FA' }}>-{formatCurrency(row.returns)}</td>
                            <td style={{ color: '#94A3B8' }}>-{formatCurrency(withdrawnThisYear)}</td>
                          </>
                        ) : (
                          <>
                            <td>{formatCurrency(row.invested)}</td>
                            <td className="font-medium" style={{ color: '#22C55E' }}>{formatCurrency(row.value)}</td>
                            <td className="font-medium" style={{ color: '#4ADE80' }}>+{formatCurrency(row.returns)}</td>
                          </>
                        )}
                        <td>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              background: row.growthPercent >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                              color: row.growthPercent >= 0 ? '#22C55E' : '#EF4444',
                            }}
                          >
                            {row.growthPercent >= 0 ? '+' : ''}{row.growthPercent}%
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Download Buttons */}
      <motion.div className="glass-card rounded-2xl p-6" variants={itemVariants}>
        <h3 className="font-semibold text-text-primary mb-2">Download Your Report</h3>
        <p className="text-text-secondary text-sm mb-5">Get a complete copy of your financial plan with charts and advisor notes.</p>
        <div className="flex flex-wrap gap-3">
          <motion.button
            className="btn-primary"
            onClick={handleDownloadPDF}
            disabled={downloading === 'pdf'}
            whileHover={{ scale: 1.03, boxShadow: '0 0 28px rgba(34,197,94,0.4)' }}
            whileTap={{ scale: 0.97 }}
          >
            {downloading === 'pdf' ? (
              <><span className="spinner" /> Generating PDF...</>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                Download PDF Report
              </>
            )}
          </motion.button>
          <motion.button
            className="btn-secondary"
            onClick={handleDownloadPPT}
            disabled={downloading === 'ppt'}
            whileHover={{ scale: 1.03, borderColor: '#22C55E', color: '#22C55E' }}
            whileTap={{ scale: 0.97 }}
          >
            {downloading === 'ppt' ? (
              <><span className="spinner" style={{ borderTopColor: '#22C55E' }} /> Generating PPT...</>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" /><polyline points="8 21 12 17 16 21" /><line x1="12" y1="17" x2="12" y2="3" />
                </svg>
                Download PPT Presentation
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
