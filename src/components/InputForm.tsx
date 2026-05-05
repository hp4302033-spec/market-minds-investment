'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface FormData {
  name: string;
  email: string;
  phone: string;
  investmentType: 'SIP' | 'LUMPSUM' | 'SWP';
  amount: string;
  periodYears: string;
  expectedReturn: string;
  withdrawalAmount: string; // SWP only
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  amount?: string;
  periodYears?: string;
  expectedReturn?: string;
  withdrawalAmount?: string;
}

interface InputFormProps {
  onSubmit: (data: FormData) => void;
  loading: boolean;
}

const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const phoneRegex = /^[6-9]\d{9}$/;

const formFieldVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: EASE },
  }),
};

const INVESTMENT_TYPES = [
  { key: 'SIP',     label: 'SIP',      sub: '— Monthly',   desc: 'Invest a fixed amount every month — great for building wealth gradually.' },
  { key: 'LUMPSUM', label: 'Lump Sum', sub: '— One-time',  desc: 'Invest a large amount at once — ideal when you have a lump sum available.' },
  { key: 'SWP',     label: 'SWP',      sub: '— Withdraw',  desc: 'Withdraw a fixed amount monthly from your corpus — ideal for steady retirement income.' },
] as const;

export default function InputForm({ onSubmit, loading }: InputFormProps) {
  const [form, setForm] = useState<FormData>({
    name: '', email: '', phone: '',
    investmentType: 'SIP',
    amount: '', periodYears: '', expectedReturn: '',
    withdrawalAmount: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = useCallback((data: FormData): FormErrors => {
    const e: FormErrors = {};
    if (!data.name.trim() || data.name.trim().length < 2) e.name = 'Enter your full name (min 2 characters)';
    if (!data.email.trim() || !emailRegex.test(data.email.trim())) e.email = 'Enter a valid email address';
    const phone = data.phone.replace(/\s/g, '');
    if (!phone || !phoneRegex.test(phone)) e.phone = 'Enter a valid 10-digit Indian mobile number';

    const amt = parseFloat(data.amount);
    if (!data.amount || isNaN(amt) || amt < 500) {
      e.amount = data.investmentType === 'SIP'
        ? 'Minimum monthly SIP is ₹500'
        : data.investmentType === 'SWP'
        ? 'Minimum initial corpus is ₹500'
        : 'Minimum investment is ₹500';
    }

    const yr = parseInt(data.periodYears);
    if (!data.periodYears || isNaN(yr) || yr < 1 || yr > 40) e.periodYears = 'Period must be between 1 and 40 years';
    const ret = parseFloat(data.expectedReturn);
    if (!data.expectedReturn || isNaN(ret) || ret < 1 || ret > 50) e.expectedReturn = 'Expected return must be between 1% and 50%';

    if (data.investmentType === 'SWP') {
      const w = parseFloat(data.withdrawalAmount);
      if (!data.withdrawalAmount || isNaN(w) || w < 500) {
        e.withdrawalAmount = 'Minimum monthly withdrawal is ₹500';
      } else if (!isNaN(amt) && w > amt) {
        e.withdrawalAmount = 'Monthly withdrawal cannot exceed initial corpus';
      }
    }
    return e;
  }, []);

  const handleChange = (field: keyof FormData, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    if (touched[field]) setErrors(validate(updated));
  };

  const handleTypeSwitch = (type: 'SIP' | 'LUMPSUM' | 'SWP') => {
    const updated = { ...form, investmentType: type, amount: '', withdrawalAmount: '' };
    setForm(updated);
    setTouched(prev => ({ ...prev, amount: false, withdrawalAmount: false }));
    setErrors(prev => ({ ...prev, amount: undefined, withdrawalAmount: undefined }));
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(validate(form));
  };

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10));
  };

  const handleAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange('amount', e.target.value.replace(/[^0-9.]/g, ''));
  };

  const handleWithdrawalInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange('withdrawalAmount', e.target.value.replace(/[^0-9.]/g, ''));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched: Record<string, boolean> = {};
    Object.keys(form).forEach(k => (allTouched[k] = true));
    setTouched(allTouched);
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) onSubmit(form);
  };

  const isEmailValid = form.email && emailRegex.test(form.email.trim());
  const isPhoneValid = form.phone && phoneRegex.test(form.phone.replace(/\s/g, ''));
  const canSubmit = Object.keys(validate(form)).length === 0;
  const isSWP = form.investmentType === 'SWP';

  const FieldError = ({ field }: { field: keyof FormErrors }) => (
    <AnimatePresence>
      {touched[field] && errors[field] && (
        <motion.p
          className="error-msg"
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {errors[field]}
        </motion.p>
      )}
    </AnimatePresence>
  );

  const FieldSuccess = ({ show }: { show: boolean }) => (
    <AnimatePresence>
      {show && (
        <motion.span
          style={{ position: 'absolute', right: 12, top: '50%', translateY: '-50%' }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </motion.span>
      )}
    </AnimatePresence>
  );

  return (
    <motion.div
      id="calculator"
      className="glass-card rounded-2xl p-8 max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.15, duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="number-badge">1</div>
          <span className="text-xs font-semibold text-text-muted tracking-widest uppercase">Investment Calculator</span>
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Plan Your Financial Future</h2>
        <p className="text-text-secondary text-sm">
          Enter your details to generate a personalized investment report.{' '}
          <span className="text-brand-green font-medium">Email &amp; phone are required</span> for report delivery.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Personal Info */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-text-muted tracking-widest uppercase mb-4">Personal Information</p>

          <motion.div className="mb-4" custom={0} variants={formFieldVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <label className="form-label" htmlFor="name">Full Name *</label>
            <motion.input
              id="name" type="text"
              className={`input-field ${touched.name && errors.name ? 'error' : touched.name && !errors.name ? 'success' : ''}`}
              placeholder="e.g. Rahul Sharma"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              autoComplete="name"
              whileFocus={{ scale: 1.005 }} transition={{ duration: 0.15 }}
            />
            <FieldError field="name" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div custom={1} variants={formFieldVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <label className="form-label" htmlFor="email">
                Email Address *{' '}
                <span className="text-brand-green text-xs">(required for report)</span>
              </label>
              <div className="relative">
                <motion.input
                  id="email" type="email"
                  className={`input-field pr-10 ${touched.email && errors.email ? 'error' : isEmailValid ? 'success' : ''}`}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  autoComplete="email"
                  whileFocus={{ scale: 1.005 }} transition={{ duration: 0.15 }}
                />
                <FieldSuccess show={!!isEmailValid} />
              </div>
              <FieldError field="email" />
            </motion.div>

            <motion.div custom={2} variants={formFieldVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <label className="form-label" htmlFor="phone">
                Mobile Number *{' '}
                <span className="text-brand-green text-xs">(10 digits)</span>
              </label>
              <div className="relative">
                <motion.input
                  id="phone" type="tel"
                  className={`input-field pr-10 ${touched.phone && errors.phone ? 'error' : isPhoneValid ? 'success' : ''}`}
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={handlePhoneInput}
                  onBlur={() => handleBlur('phone')}
                  maxLength={10} inputMode="numeric" autoComplete="tel"
                  whileFocus={{ scale: 1.005 }} transition={{ duration: 0.15 }}
                />
                <FieldSuccess show={!!isPhoneValid} />
              </div>
              <FieldError field="phone" />
              {form.phone && (
                <motion.p className="text-xs text-text-muted mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                  {form.phone.length}/10 digits
                </motion.p>
              )}
            </motion.div>
          </div>
        </div>

        {/* Investment Details */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-text-muted tracking-widest uppercase mb-4">Investment Details</p>

          {/* Investment Type Toggle — 3 options */}
          <motion.div className="mb-4" custom={3} variants={formFieldVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <label className="form-label">Investment Type *</label>
            <div className="toggle-group" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              {INVESTMENT_TYPES.map(({ key, label, sub }) => (
                <motion.button
                  key={key}
                  type="button"
                  className={`toggle-option ${form.investmentType === key ? 'active' : ''}`}
                  onClick={() => handleTypeSwitch(key)}
                  whileHover={{ opacity: 0.85 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                >
                  <span>
                    <span className="font-semibold">{label}</span>
                    <span className="hidden sm:inline text-xs opacity-75 ml-1">{sub}</span>
                  </span>
                </motion.button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={form.investmentType}
                className="text-xs text-text-muted mt-2"
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
              >
                {INVESTMENT_TYPES.find(t => t.key === form.investmentType)?.desc}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          <div className={`grid gap-4 ${isSWP ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
            {/* Amount */}
            <motion.div custom={4} variants={formFieldVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <label className="form-label" htmlFor="amount">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={form.investmentType}
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.18 }}
                  >
                    {form.investmentType === 'SIP' ? 'Monthly SIP (₹)' : form.investmentType === 'SWP' ? 'Initial Corpus (₹)' : 'Investment Amount (₹)'} *
                  </motion.span>
                </AnimatePresence>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-medium">₹</span>
                <motion.input
                  id="amount" type="text" inputMode="numeric"
                  className={`input-field pl-7 ${touched.amount && errors.amount ? 'error' : touched.amount && !errors.amount ? 'success' : ''}`}
                  placeholder={form.investmentType === 'SIP' ? '5,000' : '10,00,000'}
                  value={form.amount}
                  onChange={handleAmountInput}
                  onBlur={() => handleBlur('amount')}
                  whileFocus={{ scale: 1.005 }} transition={{ duration: 0.15 }}
                />
              </div>
              <FieldError field="amount" />
            </motion.div>

            {/* SWP — Monthly Withdrawal */}
            <AnimatePresence>
              {isSWP && (
                <motion.div
                  custom={5}
                  initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <label className="form-label" htmlFor="withdrawalAmount">
                    Monthly Withdrawal (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-medium">₹</span>
                    <motion.input
                      id="withdrawalAmount" type="text" inputMode="numeric"
                      className={`input-field pl-7 ${touched.withdrawalAmount && errors.withdrawalAmount ? 'error' : touched.withdrawalAmount && !errors.withdrawalAmount ? 'success' : ''}`}
                      placeholder="25,000"
                      value={form.withdrawalAmount}
                      onChange={handleWithdrawalInput}
                      onBlur={() => handleBlur('withdrawalAmount')}
                      whileFocus={{ scale: 1.005 }} transition={{ duration: 0.15 }}
                    />
                  </div>
                  <FieldError field="withdrawalAmount" />
                  {form.withdrawalAmount && form.amount && !errors.withdrawalAmount && (
                    <motion.p className="text-xs text-text-muted mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      Annual withdrawal: ₹{(parseFloat(form.withdrawalAmount) * 12).toLocaleString('en-IN')}
                      {' '}({((parseFloat(form.withdrawalAmount) * 12 / parseFloat(form.amount)) * 100).toFixed(1)}% of corpus)
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Period */}
            <motion.div custom={isSWP ? 6 : 5} variants={formFieldVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <label className="form-label" htmlFor="period">Investment Period (Years) *</label>
              <div className="relative">
                <motion.input
                  id="period" type="number" min={1} max={40}
                  className={`input-field ${touched.periodYears && errors.periodYears ? 'error' : touched.periodYears && !errors.periodYears ? 'success' : ''}`}
                  placeholder="10"
                  value={form.periodYears}
                  onChange={e => handleChange('periodYears', e.target.value)}
                  onBlur={() => handleBlur('periodYears')}
                  whileFocus={{ scale: 1.005 }} transition={{ duration: 0.15 }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">yrs</span>
              </div>
              <FieldError field="periodYears" />
            </motion.div>

            {/* Expected Return */}
            {!isSWP && (
              <motion.div custom={6} variants={formFieldVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <label className="form-label" htmlFor="return">Expected Return (% p.a.) *</label>
                <div className="relative">
                  <motion.input
                    id="return" type="number" step={0.5} min={1} max={50}
                    className={`input-field pr-8 ${touched.expectedReturn && errors.expectedReturn ? 'error' : touched.expectedReturn && !errors.expectedReturn ? 'success' : ''}`}
                    placeholder="12"
                    value={form.expectedReturn}
                    onChange={e => handleChange('expectedReturn', e.target.value)}
                    onBlur={() => handleBlur('expectedReturn')}
                    whileFocus={{ scale: 1.005 }} transition={{ duration: 0.15 }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">%</span>
                </div>
                <FieldError field="expectedReturn" />
                <AnimatePresence>
                  {form.expectedReturn && !errors.expectedReturn && (
                    <motion.p className="text-xs text-text-muted mt-1" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      Risk:{' '}
                      <span className={parseFloat(form.expectedReturn) <= 8 ? 'text-blue-400' : parseFloat(form.expectedReturn) <= 14 ? 'text-yellow-400' : 'text-red-400'}>
                        {parseFloat(form.expectedReturn) <= 8 ? 'Low' : parseFloat(form.expectedReturn) <= 14 ? 'Moderate' : 'High'}
                      </span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

          {/* Expected Return for SWP — full width row */}
          {isSWP && (
            <motion.div
              className="mt-4"
              custom={7} variants={formFieldVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
            >
              <label className="form-label" htmlFor="return-swp">Expected Return (% p.a.) *</label>
              <div className="relative max-w-xs">
                <motion.input
                  id="return-swp" type="number" step={0.5} min={1} max={50}
                  className={`input-field pr-8 ${touched.expectedReturn && errors.expectedReturn ? 'error' : touched.expectedReturn && !errors.expectedReturn ? 'success' : ''}`}
                  placeholder="10"
                  value={form.expectedReturn}
                  onChange={e => handleChange('expectedReturn', e.target.value)}
                  onBlur={() => handleBlur('expectedReturn')}
                  whileFocus={{ scale: 1.005 }} transition={{ duration: 0.15 }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">%</span>
              </div>
              <FieldError field="expectedReturn" />
            </motion.div>
          )}
        </div>

        {/* Gate message */}
        <AnimatePresence>
          {(!isEmailValid || !isPhoneValid) && (
            <motion.div
              className="flex items-center gap-3 p-4 rounded-xl mb-6"
              style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-sm text-red-400">
                {!isEmailValid && !isPhoneValid
                  ? 'Valid email and 10-digit phone number are required to generate your report.'
                  : !isEmailValid
                  ? 'A valid email address is required to deliver your report.'
                  : 'A valid 10-digit phone number is required to generate your report.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          type="submit"
          className="btn-primary w-full justify-center text-base"
          disabled={loading || !canSubmit}
          whileHover={!loading && canSubmit ? { scale: 1.02, boxShadow: '0 0 32px rgba(34,197,94,0.45)' } : {}}
          whileTap={!loading && canSubmit ? { scale: 0.98 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Generating Your Report...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Generate Financial Report
            </>
          )}
        </motion.button>

        <motion.p
          className="text-xs text-text-muted text-center mt-3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        >
          Your data is secure and will never be shared with third parties.
        </motion.p>
      </form>
    </motion.div>
  );
}
