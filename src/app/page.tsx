'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'motion/react';
import Navbar from '@/components/Navbar';
import InputForm from '@/components/InputForm';
import ResultsDashboard from '@/components/ResultsDashboard';
import KYCChecker from '@/components/KYCChecker';
import Hero from '@/components/Hero';
import FeaturesScroll from '@/components/FeaturesScroll';

interface SubmitResponse {
  success: boolean;
  results?: {
    totalInvested: number;
    estimatedReturns: number;
    finalValue: number;
    yearlyBreakdown: Array<{ year: number; invested: number; value: number; returns: number; growthPercent: number }>;
    cagr: number;
    wealthMultiplier: number;
  };
  advisorNote?: string;
  emailSent?: boolean;
  emailMessage?: string;
  error?: string;
}

/* ── Animated counter ─────────────────────────── */
function AnimatedCounter({ target, duration = 1800, prefix = '', suffix = '' }: {
  target: number; duration?: number; prefix?: string; suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString('en-IN')}{suffix}
    </span>
  );
}

/* ── Stat card for hero stats ────────────────── */
function StatItem({ value, label, prefix = '', suffix = '', delay = 0 }: {
  value: number; label: string; prefix?: string; suffix?: string; delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      className="text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="text-3xl md:text-4xl font-bold gradient-text">
        {prefix}<AnimatedCounter target={value} suffix={suffix} />{!suffix && ''}
      </p>
      <p className="text-text-muted text-sm mt-1">{label}</p>
    </motion.div>
  );
}



export default function HomePage() {
  const [phase, setPhase] = useState<'form' | 'results'>('form');
  const [loading, setLoading] = useState(false);
  const [resultsData, setResultsData] = useState<SubmitResponse | null>(null);
  const [formData, setFormData] = useState<{
    name: string; email: string; phone: string; investmentType: string;
    amount: number; periodYears: number; expectedReturn: number;
    withdrawalAmount: number;
  } | null>(null);
  const [submitError, setSubmitError] = useState('');
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Parallax on hero orbs
  const heroRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const orbY = useTransform(scrollY, [0, 600], [0, -80]);

  const handleFormSubmit = async (data: {
    name: string; email: string; phone: string;
    investmentType: 'SIP' | 'LUMPSUM' | 'SWP';
    amount: string; periodYears: string; expectedReturn: string;
    withdrawalAmount: string;
  }) => {
    setLoading(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount),
          periodYears: parseInt(data.periodYears),
          expectedReturn: parseFloat(data.expectedReturn),
          withdrawalAmount: parseFloat(data.withdrawalAmount || '0'),
        }),
      });
      const json: SubmitResponse = await res.json();
      if (json.success && json.results) {
        setResultsData(json);
        setFormData({
          name: data.name, email: data.email, phone: data.phone,
          investmentType: data.investmentType,
          amount: parseFloat(data.amount),
          periodYears: parseInt(data.periodYears),
          expectedReturn: parseFloat(data.expectedReturn),
          withdrawalAmount: parseFloat(data.withdrawalAmount || '0'),
        });
        setPhase('results');
        setTimeout(() => {
          dashboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        setSubmitError(json.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPhase('form');
    setResultsData(null);
    setSubmitError('');
    setTimeout(() => {
      document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────── */}
      <Hero />

      {/* ── Stats ─────────────────────────────────────── */}
      <section id="about" className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="glass-card rounded-2xl p-10"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
              <StatItem value={10000} label="Clients Served" suffix="+" delay={0} />
              <StatItem value={500} label="Crores Planned" prefix="₹" suffix="Cr+" delay={0.1} />
              <StatItem value={98} label="Satisfaction Rate" suffix="%" delay={0.2} />
              <StatItem value={40} label="Years Max Planning" suffix=" yrs" delay={0.3} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────── */}
      <FeaturesScroll />

      {/* ── Calculator Section ─────────────────────────── */}
      <section id="calculator" className="section-padding">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55 }}
          >
            <p className="text-brand-green text-xs font-semibold tracking-widest uppercase mb-3">Free Calculator</p>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">Plan Your Investment Now</h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Fill in your details and get a complete financial plan with charts, advisor notes, and downloadable reports.
            </p>
          </motion.div>

          <AnimatePresence>
            {submitError && (
              <motion.div
                className="max-w-2xl mx-auto mb-6 p-4 rounded-xl flex items-center gap-3"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-red-400 text-sm">{submitError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {phase === 'form' ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <InputForm onSubmit={handleFormSubmit} loading={loading} />
              </motion.div>
            ) : (
              <motion.div
                key="results"
                ref={dashboardRef}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                {resultsData?.results && formData && (
                  <ResultsDashboard
                    data={{
                      name: formData.name, email: formData.email, phone: formData.phone,
                      investmentType: formData.investmentType,
                      amount: formData.amount, periodYears: formData.periodYears, expectedReturn: formData.expectedReturn,
                      withdrawalAmount: formData.withdrawalAmount,
                      results: resultsData.results,
                      advisorNote: resultsData.advisorNote || '',
                      emailSent: resultsData.emailSent || false,
                      emailMessage: resultsData.emailMessage || '',
                    }}
                    onReset={handleReset}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── KYC Verification Section ─────────────────── */}
      <section id="kyc" className="section-padding">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55 }}
          >
            <p className="text-brand-green text-xs font-semibold tracking-widest uppercase mb-3">Agent 7</p>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">PAN KYC Verification</h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Check your KYC status instantly using your PAN card number.
              Verified against <span className="text-brand-green font-medium">NSDL &amp; CDSL</span> registries.
            </p>
          </motion.div>
          <KYCChecker />
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────── */}
      <section className="section-padding">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            className="glass-card rounded-3xl p-10 md:p-14 relative overflow-hidden"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
          >
            <div className="hero-orb" style={{ width: 300, height: 300, background: 'rgba(34,197,94,0.08)', top: -80, right: -80 }} />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
                Ready to Build Your
                <span className="gradient-text"> Financial Future?</span>
              </h2>
              <p className="text-text-secondary mb-8">
                Join thousands of investors who've already planned their wealth journey with Market Minds Investment.
              </p>
              <motion.a
                href="#calculator"
                className="btn-primary text-base px-10 py-4"
                style={{ textDecoration: 'none' }}
                whileHover={{ scale: 1.06, boxShadow: '0 0 40px rgba(34,197,94,0.5)' }}
                whileTap={{ scale: 0.97 }}
              >
                Get Your Free Report
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <motion.footer
        className="border-t py-10 px-6"
        style={{ borderColor: 'rgba(248,250,252,0.08)' }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <motion.div
              className="flex items-center gap-2.5"
              whileHover={{ scale: 1.02 }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #22C55E, #16A34A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: '#fff' }}>M</div>
              <div>
                <p className="font-bold text-text-primary text-sm">Market Minds Investment</p>
                <p className="text-xs text-text-muted">Smart Financial Planning</p>
              </div>
            </motion.div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-text-muted">
              {['Home', 'Calculator', 'KYC', 'Features', 'Admin'].map(l => (
                <motion.a
                  key={l}
                  href={l === 'Admin' ? '/admin' : l === 'KYC' ? '#kyc' : `#${l.toLowerCase()}`}
                  className="hover:text-text-secondary transition-colors"
                  style={{ textDecoration: 'none' }}
                  whileHover={{ y: -1, color: '#CBD5E1' }}
                >
                  {l}
                </motion.a>
              ))}
            </div>
            <p className="text-xs text-text-muted text-center">
              © {new Date().getFullYear()} Market Minds Investment.
            </p>
          </div>
          <div className="mt-6 pt-6 text-center" style={{ borderTop: '1px solid rgba(248,250,252,0.06)' }}>
            <p className="text-xs text-text-muted max-w-2xl mx-auto">
              Disclaimer: Investment projections are estimates based on assumed returns. Actual market returns may vary significantly.
              Past performance is not indicative of future results. Please consult a SEBI-registered investment advisor before making investment decisions.
            </p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
