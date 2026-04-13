'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/lib/i18n-context';
import { Language } from '@/lib/translations';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const langs = [
    { code: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
    { code: 'en', flag: '🇺🇸', label: 'English' },
    { code: 'cn', flag: '🇨🇳', label: '简体中文' },
    { code: 'jp', flag: '🇯🇵', label: '日本語' },
    { code: 'kr', flag: '🇰🇷', label: '한국어' },
    { code: 'th', flag: '🇹🇭', label: 'ไทย' },
    { code: 'id', flag: '🇮🇩', label: 'Bahasa' },
    { code: 'ru', flag: '🇷🇺', label: 'Русский' },
    { code: 'es', flag: '🇪🇸', label: 'Español' },
    { code: 'fr', flag: '🇫🇷', label: 'Français' },
  ];

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = langs.find(l => l.code === language) || langs[0];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Globe Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-xl transition-all border border-[#1a1a2e] hover:bg-[#111] bg-[#0d0d0d] shadow-lg shadow-black/20"
      >
        <Globe size={18} className="text-blue-500" />
        <span className="text-[13px] font-black text-gray-400 uppercase tracking-widest">{currentLang.code}</span>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 mt-2 w-72 bg-[#0a0a0a] border border-[#1a1a2e] rounded-2xl shadow-2xl z-[100] p-2 grid grid-cols-2 gap-1 overflow-hidden"
          >
            <div className="absolute inset-0 bg-blue-600/5 pointer-events-none" />
            {langs.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLanguage(l.code as Language);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative group ${
                  language === l.code 
                  ? 'bg-blue-600/10 text-blue-500' 
                  : 'text-gray-500 hover:bg-[#111] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base grayscale group-hover:grayscale-0 transition-all">{l.flag}</span>
                  <span>{l.label}</span>
                </div>
                {language === l.code && (
                  <motion.div layoutId="active-lang">
                    <Check size={14} className="text-blue-500" />
                  </motion.div>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
