import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { EtherealShadow } from './ui/etheral-shadow';
import { DottedSurface } from './ui/dotted-surface';
import logoUrl from '../assets/logo.png';
import fcShad from '../public/assets/fcshad.png';

const STATS = [
  "Jewelers lose 40% of leads to missed calls.",
  "Custom ring inquiries peak between 8 PM and 11 PM.",
  "92% of high-end clients expect instant booking confirmation.",
  "AI response times are 120x faster than traditional front desks.",
  "One missed $5k sale covers 18 months of Fourcee service."
];

export const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [stat] = useState(() => STATS[Math.floor(Math.random() * STATS.length)]);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFade(true);
      setTimeout(onComplete, 800);
    }, 3200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-navy-950 flex flex-col items-center justify-center overflow-hidden transition-opacity duration-700 ${fade ? 'opacity-0' : 'opacity-100'}`}>
      {/* Grid background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />
      {/* Ethereal glow */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <EtherealShadow 
          color="rgba(255, 255, 255, 0.06)"
          animation={{ scale: 100, speed: 20 }}
          noise={{ opacity: 0.4, scale: 1.2 }}
        />
      </div>
      {/* Surface dots rising from bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64">
        <DottedSurface isDarkMode className="h-full w-full opacity-85 [mask-image:linear-gradient(to_top,black,transparent)]" />
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center">
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{
            opacity: 1,
            scale: [0.95, 1.02, 0.98, 1],
          }}
          transition={{
            opacity: { duration: 0.6 },
            scale: {
              duration: 1,
              repeat: Infinity,
              repeatType: 'reverse',
              repeatDelay: 0.5,
            },
          }}
        >
          <img
            src={logoUrl}
            alt="Fourcee logo"
            className="w-80 h-80 md:w-[26rem] md:h-[26rem] object-contain"
          />
        </motion.div>
        <div className="max-w-xs text-center space-y-4 px-6 animate-in slide-in-from-bottom duration-700 delay-300">
          <img
            src={fcShad}
            alt="Fourcee wordmark"
            className="w-32 md:w-40 mx-auto object-contain invert"
          />
          <div className="h-[2px] w-12 bg-white/40 mx-auto" />
          <p className="text-sm font-medium text-silver-400 uppercase tracking-widest leading-relaxed">
            {stat}
          </p>
        </div>
      </div>
    </div>
  );
};
