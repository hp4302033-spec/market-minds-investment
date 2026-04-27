'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'motion/react';
import Navbar from '@/components/Navbar';
import InputForm from '@/components/InputForm';
import ResultsDashboard from '@/components/ResultsDashboard';
import KYCChecker from '@/components/KYCChecker';

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

/* ── Feature card ─────────────────────────────── */
function FeatureCard({ icon, title, desc, index }: {
  icon: React.ReactNode; title: string; desc: string; index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      className="glass-card glass-card-hover rounded-2xl p-6 cursor-pointer"
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(0,0,0,0.5)', borderColor: 'rgba(34,197,94,0.2)' }}
    >
      <motion.div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E' }}
        whileHover={{ scale: 1.12, rotate: -6, background: 'rgba(34,197,94,0.2)' }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        {icon}
      </motion.div>
      <h3 className="font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-text-muted text-sm leading-relaxed">{desc}</p>
    </motion.div>
  );
}

const features = [
  {
    icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>),
    title: 'SIP & Lump Sum Calculator',
    desc: 'Industry-standard formulas cross-verified against leading platforms. Precise projections for both investment types.',
  },
  {
    icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>),
    title: 'AI Financial Advisor',
    desc: 'Personalized investment advice written in plain language — tailored to your risk profile, goals, and time horizon.',
  },
  {
    icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>),
    title: 'Visual Dashboard',
    desc: 'Beautiful charts show your wealth journey year by year. See exactly when your corpus hits key milestones.',
  },
  {
    icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>),
    title: 'PDF & PPT Reports',
    desc: 'Download a professional, print-ready report of your plan. Share it with family or your financial advisor.',
  },
  {
    icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>),
    title: 'Instant Email Delivery',
    desc: 'Your complete report is emailed instantly after generation — no sign-up required. Just enter your email and phone.',
  },
  {
    icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>),
    title: 'Bank-Grade Security',
    desc: 'Your personal data is encrypted and stored securely. We never share or sell your information.',
  },
  {
    icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>),
    title: 'PAN KYC Verification',
    desc: 'Instantly check your KYC status using your PAN card. Connected to NSDL & CDSL registries for real-time verification.',
  },
];

export default function HomePage() {
  const [phase, setPhase] = useState<'form' | 'results'>('form');
  const [loading, setLoading] = useState(false);
  const [resultsData, setResultsData] = useState<SubmitResponse | null>(null);
  const [formData, setFormData] = useState<{
    name: string; email: string; phone: string; investmentType: string;
    amount: number; periodYears: number; expectedReturn: number;
  } | null>(null);
  const [submitError, setSubmitError] = useState('');
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Parallax on hero orbs
  const heroRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const orbY = useTransform(scrollY, [0, 600], [0, -80]);

  const handleFormSubmit = async (data: {
    name: string; email: string; phone: string;
    investmentType: 'SIP' | 'LUMPSUM';
    amount: string; periodYears: string; expectedReturn: string;
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
      <section id="home" ref={heroRef} className="relative overflow-hidden" style={{ paddingTop: 120, paddingBottom: 80 }}>
        {/* Parallax orbs */}
        <motion.div
          className="hero-orb"
          style={{ width: 500, height: 500, background: 'rgba(34,197,94,0.08)', top: -100, left: -100, y: orbY }}
        />
        <motion.div
          className="hero-orb"
          style={{ width: 400, height: 400, background: 'rgba(59,130,246,0.06)', top: 0, right: -80 }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="hero-orb"
          style={{ width: 300, height: 300, background: 'rgba(34,197,94,0.05)', bottom: 0, left: '50%', translateX: '-50%' }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />

        <div className="relative max-w-6xl mx-auto px-6 text-center">
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-brand-green"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-brand-green text-xs font-semibold tracking-wide">AI-Powered Financial Planning</span>
          </motion.div>

          {/* Headline words animate in one at a time */}
          <div className="overflow-hidden mb-6">
            <motion.h1
              className="text-5xl sm:text-6xl md:text-7xl font-bold text-text-primary leading-tight"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              Grow Your Wealth
              <br />
              <motion.span
                className="gradient-text"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                Intelligently
              </motion.span>
            </motion.h1>
          </div>

          <motion.p
            className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            Market Minds Investment helps you plan, calculate, and visualize your financial future.
            Get personalized SIP & lump sum projections with AI-driven insights — free, instant, and secure.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <motion.a
              href="#calculator"
              className="btn-primary text-base px-8 py-4"
              style={{ textDecoration: 'none' }}
              whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(34,197,94,0.45)' }}
              whileTap={{ scale: 0.97 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Start Planning Free
            </motion.a>
            <motion.a
              href="#features"
              className="btn-secondary text-base px-8 py-4"
              style={{ textDecoration: 'none' }}
              whileHover={{ scale: 1.04, borderColor: '#22C55E', color: '#22C55E' }}
              whileTap={{ scale: 0.97 }}
            >
              Explore Features
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </motion.a>
          </motion.div>
        </div>
      </section>

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
      <section id="features" className="section-padding">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-brand-green text-xs font-semibold tracking-widest uppercase mb-3">Everything You Need</p>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">A Complete Financial Planning Suite</h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Seven intelligent agents working together to deliver the most accurate, personalized investment plan possible.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FeatureCard key={i} icon={f.icon} title={f.title} desc={f.desc} index={i} />
            ))}
          </div>
        </div>
      </section>

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
