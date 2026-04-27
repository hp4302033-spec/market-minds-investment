'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'Calculator', href: '#calculator' },
    { label: 'KYC', href: '#kyc' },
    { label: 'Features', href: '#features' },
    { label: 'About', href: '#about' },
  ];

  return (
    <motion.nav
      className={`navbar ${scrolled ? 'scrolled' : ''}`}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 cursor-pointer" style={{ textDecoration: 'none' }}>
        <motion.div
          style={{
            width: 36, height: 36, borderRadius: 9,
            background: 'linear-gradient(135deg, #22C55E, #16A34A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 18, color: '#fff', flexShrink: 0,
          }}
          whileHover={{ scale: 1.08, rotate: -5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >M</motion.div>
        <div>
          <p className="font-bold text-text-primary text-sm leading-tight">Market Minds</p>
          <p className="text-xs text-text-muted leading-tight">Investment</p>
        </div>
      </Link>

      {/* Desktop Links */}
      <div className="hidden md:flex items-center gap-1">
        {navLinks.map((link, i) => (
          <motion.a
            key={link.label}
            href={link.href}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary rounded-lg transition-colors duration-200 cursor-pointer"
            style={{ textDecoration: 'none' }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
            whileHover={{ y: -1 }}
          >
            {link.label}
          </motion.a>
        ))}
      </div>

      {/* Desktop CTA */}
      <div className="hidden md:flex items-center gap-3">
        <Link
          href="/admin"
          className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
          style={{ textDecoration: 'none' }}
        >
          Admin
        </Link>
        <motion.a
          href="#calculator"
          className="btn-primary text-sm py-2 px-5"
          style={{ textDecoration: 'none' }}
          whileHover={{ scale: 1.04, boxShadow: '0 0 24px rgba(34,197,94,0.45)' }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          Get Started
        </motion.a>
      </div>

      {/* Mobile menu button */}
      <motion.button
        className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
        whileTap={{ scale: 0.92 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {mobileOpen ? (
            <motion.svg key="close" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </motion.svg>
          ) : (
            <motion.svg key="menu" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="absolute top-full left-0 right-0 mt-2 glass-card rounded-2xl p-4 flex flex-col gap-1"
            initial={{ opacity: 0, y: -12, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -12, scaleY: 0.95 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ originY: 0 }}
          >
            {navLinks.map((link, i) => (
              <motion.a
                key={link.label}
                href={link.href}
                className="px-4 py-3 text-sm text-text-secondary hover:text-text-primary rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                style={{ textDecoration: 'none' }}
                onClick={() => setMobileOpen(false)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                {link.label}
              </motion.a>
            ))}
            <div className="border-t border-white/10 mt-2 pt-2">
              <a href="#calculator" className="btn-primary w-full justify-center text-sm" style={{ textDecoration: 'none' }}>
                Get Started
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
