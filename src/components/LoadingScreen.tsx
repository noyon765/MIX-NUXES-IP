import React from 'react';
import { motion } from 'motion/react';
import { BrandMark } from './BrandMark.tsx';

interface LoadingScreenProps {
  siteName?: string;
  tagline?: string;
  logoUrl?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  siteName = 'MIX NEXUS IP',
  tagline = 'Premium Connectivity. Simplified.',
  logoUrl = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 bg-[#07090E] bg-luxury-mesh flex flex-col items-center justify-center p-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center gap-4"
      >
        <div className="p-3 rounded-2xl bg-[#0D1322] border border-violet-500/30 shadow-2xl shadow-violet-950/30">
          <BrandMark logoUrl={logoUrl} size={48} />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold tracking-tight text-white">{siteName}</p>
          <p className="text-xs text-slate-400">{tagline}</p>
        </div>
        <div className="w-40 h-1 bg-white/10 rounded-full overflow-hidden mt-2">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-600 via-indigo-400 to-violet-500 rounded-full"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};
