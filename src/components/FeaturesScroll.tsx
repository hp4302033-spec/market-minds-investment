"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

interface FeatureData {
  id: number;
  title: string;
  description: string;
  iconSvg: React.ReactNode;
  colorFrom: string;
  colorTo: string;
}

const features: FeatureData[] = [
  {
    id: 1,
    title: 'SIP & Lump Sum Calculator',
    description: 'Industry-standard formulas cross-verified against leading platforms. Precise projections for both investment types.',
    colorFrom: 'from-blue-500/80',
    colorTo: 'to-purple-600/80',
    iconSvg: (<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>)
  },
  {
    id: 2,
    title: 'AI Financial Advisor',
    description: 'Personalized investment advice written in plain language — tailored to your risk profile, goals, and time horizon.',
    colorFrom: 'from-green-500/80',
    colorTo: 'to-emerald-600/80',
    iconSvg: (<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>)
  },
  {
    id: 3,
    title: 'Visual Dashboard',
    description: 'Beautiful charts show your wealth journey year by year. See exactly when your corpus hits key milestones.',
    colorFrom: 'from-purple-500/80',
    colorTo: 'to-pink-600/80',
    iconSvg: (<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>)
  },
  {
    id: 4,
    title: 'PDF & PPT Reports',
    description: 'Download a professional, print-ready report of your plan. Share it with family or your financial advisor.',
    colorFrom: 'from-orange-500/80',
    colorTo: 'to-red-600/80',
    iconSvg: (<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>)
  },
  {
    id: 5,
    title: 'Instant Email Delivery',
    description: 'Your complete report is emailed instantly after generation — no sign-up required. Just enter your email and phone.',
    colorFrom: 'from-cyan-500/80',
    colorTo: 'to-blue-600/80',
    iconSvg: (<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>)
  },
  {
    id: 6,
    title: 'Bank-Grade Security',
    description: 'Your personal data is encrypted and stored securely. We never share or sell your information.',
    colorFrom: 'from-rose-500/80',
    colorTo: 'to-orange-600/80',
    iconSvg: (<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>)
  },
  {
    id: 7,
    title: 'PAN KYC Verification',
    description: 'Instantly check your KYC status using your PAN card. Connected to NSDL & CDSL registries for real-time verification.',
    colorFrom: 'from-emerald-500/80',
    colorTo: 'to-teal-600/80',
    iconSvg: (<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>)
  },
];

const ScrollCard = ({ feature }: { feature: FeatureData }) => {
  return (
    <motion.div
      className="group relative h-[450px] w-[400px] md:w-[450px] shrink-0 overflow-hidden rounded-3xl bg-[#1E293B] border border-[rgba(248,250,252,0.08)] shadow-2xl"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className={cn("absolute inset-0 z-0 transition-transform duration-500 group-hover:scale-110 bg-gradient-to-br opacity-20", feature.colorFrom, feature.colorTo)}
      />
      
      <div className="absolute top-8 right-8 z-10 text-white/10 group-hover:text-white/20 transition-colors duration-300 transform scale-[2] origin-top-right">
        {feature.iconSvg}
      </div>

      <div className="absolute inset-0 z-20 flex flex-col justify-end p-8">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-white bg-gradient-to-br shadow-lg", feature.colorFrom, feature.colorTo)}>
            {feature.iconSvg}
        </div>
        <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">{feature.title}</h3>
        <p className="text-lg text-slate-300 leading-relaxed">{feature.description}</p>
      </div>
    </motion.div>
  );
};

export default function FeaturesScroll({ className }: { className?: string }) {
  const targetRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
  });

  const x = useTransform(scrollYProgress, [0, 1], ["2%", "-75%"]);

  return (
    <section
      ref={targetRef}
      id="features"
      className={cn("relative h-[300vh] bg-[#0F172A]", className)}
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        
        <div className="absolute left-8 md:left-24 top-24 z-30 max-w-xl pointer-events-none">
          <p className="text-brand-green text-sm font-bold tracking-widest uppercase mb-3">Core Features</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">A Complete Suite</h2>
          <p className="text-slate-400 text-lg">Scroll down to explore all 7 powerful tools designed for modern investors.</p>
        </div>

        <motion.div style={{ x }} className="flex gap-8 px-8 md:px-24 mt-24">
          {features.map((feature) => (
            <ScrollCard feature={feature} key={feature.id} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
