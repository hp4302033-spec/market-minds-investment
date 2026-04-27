'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ── PAN format: AAAAA9999A ─────────────────────
 * Char 1-3  : Series (uppercase letters)
 * Char 4    : Entity type (P=Person, C=Company, etc.)
 * Char 5    : First letter of surname
 * Char 6-9  : Sequential number
 * Char 10   : Check digit (uppercase letter)
 ────────────────────────────────────────────────*/
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const ENTITY_TYPES: Record<string, string> = {
  P: 'Individual (Person)',
  C: 'Company',
  H: 'Hindu Undivided Family (HUF)',
  F: 'Firm / LLP',
  A: 'Association of Persons (AOP)',
  B: 'Body of Individuals (BOI)',
  G: 'Government Entity',
  J: 'Artificial Juridical Person',
  L: 'Local Authority',
  T: 'Trust',
};

type KYCStatus = 'idle' | 'loading' | 'verified' | 'pending' | 'not_found' | 'error';

interface KYCResult {
  status: 'verified' | 'pending' | 'not_found';
  pan: string;
  name: string;
  entityType: string;
  registeredOn: string;
  lastUpdated: string;
  verifiedWith: string[];
  remark: string;
}

/* ── Status config ───────────────────────────── */
const STATUS_CONFIG = {
  verified: {
    label: 'KYC Verified',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.1)',
    border: 'rgba(34,197,94,0.3)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  pending: {
    label: 'KYC Pending',
    color: '#FBBF24',
    bg: 'rgba(251,191,36,0.1)',
    border: 'rgba(251,191,36,0.3)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  not_found: {
    label: 'KYC Not Found',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.3)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
};

/* ── Loading steps animation ─────────────────── */
const STEPS = [
  'Validating PAN format...',
  'Connecting to NSDL/CDSL registry...',
  'Fetching KYC record...',
  'Verifying identity documents...',
  'Generating report...',
];

function LoadingSteps({ step }: { step: number }) {
  return (
    <div className="space-y-3">
      {STEPS.map((s, i) => (
        <motion.div
          key={i}
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.45, duration: 0.35, ease: EASE }}
        >
          <motion.div
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={
              i < step
                ? { background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.5)' }
                : i === step
                ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }
                : { background: 'rgba(248,250,252,0.05)', border: '1px solid rgba(248,250,252,0.1)' }
            }
            animate={i === step ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            {i < step ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : i === step ? (
              <motion.div
                className="w-2 h-2 rounded-full bg-brand-green"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
            ) : (
              <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(248,250,252,0.15)' }} />
            )}
          </motion.div>
          <motion.span
            className="text-sm"
            style={{ color: i < step ? '#22C55E' : i === step ? '#CBD5E1' : '#475569' }}
          >
            {s}
          </motion.span>
        </motion.div>
      ))}
    </div>
  );
}

/* ── KYC Result Card ─────────────────────────── */
function KYCResultCard({ result }: { result: KYCResult }) {
  const cfg = STATUS_CONFIG[result.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      {/* Status banner */}
      <motion.div
        className="flex items-center gap-4 p-5 rounded-2xl mb-5"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 200 }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 15 }}
        >
          {cfg.icon}
        </motion.div>
        <div>
          <p className="font-bold text-lg" style={{ color: cfg.color }}>{cfg.label}</p>
          <p className="text-text-muted text-xs">PAN: {result.pan}</p>
        </div>
        {result.status === 'verified' && (
          <motion.div
            className="ml-auto px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ✓ ACTIVE
          </motion.div>
        )}
      </motion.div>

      {/* Details grid */}
      {result.status !== 'not_found' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {[
            { label: 'Registered Name', value: result.name },
            { label: 'Entity Type', value: result.entityType },
            { label: 'Registered On', value: result.registeredOn },
            { label: 'Last Updated', value: result.lastUpdated },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              className="glass-card rounded-xl p-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07, duration: 0.35, ease: EASE }}
            >
              <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">{item.label}</p>
              <p className="font-semibold text-text-primary text-sm">{item.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Verification sources */}
      {result.verifiedWith.length > 0 && (
        <motion.div
          className="mb-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <p className="text-xs text-text-muted uppercase tracking-wider mb-3">Verified With</p>
          <div className="flex flex-wrap gap-2">
            {result.verifiedWith.map((src, i) => (
              <motion.span
                key={src}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)' }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.08, type: 'spring', stiffness: 300 }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {src}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Remark */}
      <motion.div
        className="p-4 rounded-xl text-sm"
        style={{
          background: result.status === 'not_found' ? 'rgba(239,68,68,0.06)' : 'rgba(248,250,252,0.04)',
          border: `1px solid ${cfg.border}`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <p className="text-text-secondary leading-relaxed">{result.remark}</p>
      </motion.div>
    </motion.div>
  );
}

/* ── Main KYC Checker Component ──────────────── */
export default function KYCChecker() {
  const [pan, setPan] = useState('');
  const [status, setStatus] = useState<KYCStatus>('idle');
  const [loadStep, setLoadStep] = useState(0);
  const [result, setResult] = useState<KYCResult | null>(null);
  const [panError, setPanError] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  const handlePanInput = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setPan(clean);
    setPanError('');
    if (result) setResult(null);
    setStatus('idle');
  };

  const isValidPAN = PAN_REGEX.test(pan);

  const handleCheck = async () => {
    if (!isValidPAN) {
      setPanError('Enter a valid 10-character PAN (e.g. ABCDE1234F)');
      return;
    }
    setStatus('loading');
    setLoadStep(0);
    setResult(null);

    // Animate loading steps
    for (let i = 1; i <= STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      setLoadStep(i);
    }

    // Call API
    try {
      const res = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pan }),
      });
      const data = await res.json();
      setResult(data.result);
      setStatus(data.result.status);
    } catch {
      setStatus('error');
    }
  };

  const reset = () => {
    setPan('');
    setStatus('idle');
    setResult(null);
    setPanError('');
    setLoadStep(0);
  };

  const entityLabel = pan.length >= 4 ? (ENTITY_TYPES[pan[3]] || 'Unknown Entity') : null;

  return (
    <motion.div
      ref={ref}
      className="glass-card rounded-2xl p-8 max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: EASE }}
    >
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.15, duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="number-badge">7</div>
          <span className="text-xs font-semibold text-text-muted tracking-widest uppercase">KYC Verification</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-1">PAN KYC Check</h2>
            <p className="text-text-secondary text-sm leading-relaxed">
              Instantly verify your KYC status using your PAN card.
              Connected to <span className="text-brand-green font-medium">NSDL & CDSL</span> registries.
            </p>
          </div>
          <motion.div
            className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
            animate={{ boxShadow: ['0 0 0px rgba(34,197,94,0)', '0 0 20px rgba(34,197,94,0.3)', '0 0 0px rgba(34,197,94,0)'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {status === 'idle' || status === 'error' ? (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {/* PAN Input */}
            <div className="mb-5">
              <label className="form-label" htmlFor="pan-input">
                PAN Card Number
              </label>
              <div className="relative">
                <motion.input
                  id="pan-input"
                  type="text"
                  className={`input-field text-lg font-mono tracking-[0.25em] uppercase pr-12 ${panError ? 'error' : isValidPAN ? 'success' : ''}`}
                  placeholder="ABCDE1234F"
                  value={pan}
                  onChange={e => handlePanInput(e.target.value)}
                  maxLength={10}
                  whileFocus={{ scale: 1.005 }}
                  transition={{ duration: 0.15 }}
                  onKeyDown={e => e.key === 'Enter' && handleCheck()}
                />
                {/* Character counter */}
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted">
                  {pan.length}/10
                </span>
              </div>

              {/* Inline error */}
              <AnimatePresence>
                {panError && (
                  <motion.p
                    className="error-msg mt-2"
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -6, height: 0 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {panError}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Live PAN interpretation */}
              <AnimatePresence>
                {pan.length >= 4 && !panError && (
                  <motion.div
                    className="mt-3 flex flex-wrap gap-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: 'rgba(59,130,246,0.1)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.2)' }}>
                      Entity: {entityLabel}
                    </span>
                    {pan.length === 10 && isValidPAN && (
                      <motion.span
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 400 }}
                      >
                        ✓ Valid Format
                      </motion.span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* PAN Format guide */}
            <motion.div
              className="mb-6 p-4 rounded-xl"
              style={{ background: 'rgba(248,250,252,0.03)', border: '1px solid rgba(248,250,252,0.06)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-xs text-text-muted mb-2 font-medium">PAN Format Guide</p>
              <div className="flex items-center gap-1 font-mono text-sm">
                {[
                  { chars: 'AAA', label: 'Series', color: '#60A5FA' },
                  { chars: 'A', label: 'Type', color: '#A78BFA' },
                  { chars: 'A', label: 'Surname', color: '#F472B6' },
                  { chars: '9999', label: 'Number', color: '#FBBF24' },
                  { chars: 'A', label: 'Check', color: '#34D399' },
                ].map((seg, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <span className="font-bold tracking-wider" style={{ color: seg.color }}>{seg.chars}</span>
                    <span className="text-text-muted" style={{ fontSize: 9 }}>{seg.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Error state message */}
            {status === 'error' && (
              <motion.div
                className="mb-4 p-3 rounded-xl text-sm flex items-center gap-2"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Service temporarily unavailable. Please try again.
              </motion.div>
            )}

            {/* Check button */}
            <motion.button
              className="btn-primary w-full justify-center text-base"
              onClick={handleCheck}
              disabled={!isValidPAN}
              whileHover={isValidPAN ? { scale: 1.02, boxShadow: '0 0 32px rgba(34,197,94,0.45)' } : {}}
              whileTap={isValidPAN ? { scale: 0.98 } : {}}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Check KYC Status
            </motion.button>

            <p className="text-xs text-text-muted text-center mt-3">
              🔒 Your PAN data is not stored. Query is read-only.
            </p>
          </motion.div>

        ) : status === 'loading' ? (
          <motion.div
            key="loading"
            className="py-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <motion.div
                className="w-8 h-8 rounded-full border-2 border-brand-green border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
              <div>
                <p className="font-semibold text-text-primary">Checking KYC status for</p>
                <p className="font-mono text-brand-green font-bold tracking-widest">{pan}</p>
              </div>
            </div>
            <LoadingSteps step={loadStep} />
          </motion.div>

        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {result && <KYCResultCard result={result} />}
            <motion.div
              className="flex gap-3 mt-6"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.35 }}
            >
              <motion.button
                className="btn-secondary flex-1 justify-center text-sm"
                onClick={reset}
                whileHover={{ scale: 1.02, borderColor: '#22C55E', color: '#22C55E' }}
                whileTap={{ scale: 0.97 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.51" />
                </svg>
                Check Another PAN
              </motion.button>
              {result?.status !== 'verified' && (
                <motion.a
                  href="https://www.cvlkra.com/pan-kyc-status"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex-1 justify-center text-sm"
                  style={{ textDecoration: 'none' }}
                  whileHover={{ scale: 1.02, boxShadow: '0 0 24px rgba(34,197,94,0.4)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  Complete KYC →
                </motion.a>
              )}
            </motion.div>

            <p className="text-xs text-text-muted text-center mt-4">
              Results shown are for demonstration. For official status, visit{' '}
              <a href="https://www.cvlkra.com/pan-kyc-status" target="_blank" rel="noopener noreferrer"
                className="text-brand-green hover:underline">CVLKRA</a> or{' '}
              <a href="https://ekyc.ndml.in/" target="_blank" rel="noopener noreferrer"
                className="text-brand-green hover:underline">NDML</a>.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
