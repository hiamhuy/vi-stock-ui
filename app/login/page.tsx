'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n-context';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Mail, Lock, User, Eye, EyeOff, Phone, ArrowLeft, Ticket } from 'lucide-react';
import Link from 'next/link';
import { removeAccents } from '@/lib/utils';
import { toast } from 'sonner';

const countryCodes = [
  { code: '+84', label: 'VN (+84)', flag: '🇻🇳', regex: /^[3|5|7|8|9]\d{8}$/ }, // 9 digits after +84, excludes leading 0
  { code: '+1', label: 'US (+1)', flag: '🇺🇸', regex: /^\d{10}$/ },
  { code: '+86', label: 'CN (+86)', flag: '🇨🇳', regex: /^\d{11}$/ },
  { code: '+81', label: 'JP (+81)', flag: '🇯🇵', regex: /^\d{10}$/ },
  { code: '+82', label: 'KR (+82)', flag: '🇰🇷', regex: /^\d{9,11}$/ },
  { code: '+44', label: 'GB (+44)', flag: '🇬🇧', regex: /^\d{10}$/ },
  { code: '+65', label: 'SG (+65)', flag: '🇸🇬', regex: /^\d{8}$/ },
  { code: '+66', label: 'TH (+66)', flag: '🇹🇭', regex: /^\d{9}$/ },
  { code: '+60', label: 'MY (+60)', flag: '🇲🇾', regex: /^\d{8,10}$/ },
  { code: '+63', label: 'PH (+63)', flag: '🇵🇭', regex: /^\d{10}$/ },
];

export default function LoginPage() {
  const { login, register } = useAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCode, setSelectedCode] = useState('+84');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\s+/g, '').replace(/^0+/, '');
      const fullPhone = selectedCode + cleanPhone;
      
      if (mode === 'login') {
        const identifier = phone.includes('@') ? { email: phone } : { phone: fullPhone };
        await login(identifier, password);
      } else {
        // Validation
        if (!phone) {
          toast.error(t('enterPhone'));
          return;
        }

        const country = countryCodes.find(c => c.code === selectedCode);
        if (country?.regex && !country.regex.test(cleanPhone)) {
          toast.error(t('invalidPhoneArea', { code: selectedCode }));
          return;
        }
        if (password.length < 6) {
          toast.error(t('passwordMinLength'));
          return;
        }
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        if (!hasNumber || !hasSpecial) {
          toast.error(t('passwordRequirements'));
          return;
        }
        if (password !== confirmPassword) {
          toast.error(t('passwordsDoNotMatch'));
          return;
        }
        if (!referralCode) {
          toast.error(t('invitationCodePlaceholder'));
          return;
        }

        await register({ 
          phone: fullPhone, 
          password, 
          fullName: removeAccents(fullName),
          referralCode: referralCode.trim().toUpperCase()
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('errorOccurred');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #0d1f3c 0%, #000000 60%)' }}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #2962ff, transparent)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #26a69a, transparent)' }} />
      </div>

      {/* Nút Về Trang Chủ */}
      <Link href="/" className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors z-20 group">
        <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        </div>
        <span className="text-sm font-medium hidden md:block">{t('home')}</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md mx-4 z-10"
      >
        {/* Card */}
        <div
          className="rounded-2xl p-6 md:p-8"
          style={{
            background: '#0a0a0a',
            border: '1px solid #1a1a2e',
            boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
          }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-6 md:mb-8">
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2962ff, #1565c0)' }}>
              <BarChart3 size={20} className="text-white md:size-22" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white">BR</h1>
          </div>

          {/* Tab toggle */}
          <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: '#111' }}>
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 py-2 rounded-md text-sm font-medium transition-all"
                style={{
                  background: mode === m ? '#2962ff' : 'transparent',
                  color: mode === m ? '#fff' : '#787b86',
                }}
              >
                {m === 'login' ? t('login') : t('register')}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  key="fullname"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-xs mb-1.5" style={{ color: '#787b86' }}>{t('fullName')}</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#787b86' }} />
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-white outline-none transition-all"
                      style={{ background: '#111', border: '1px solid #1a1a2e' }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Invitation Code (Register only) */}
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  key="referralCode"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-xs mb-1.5" style={{ color: '#787b86' }}>{t('invitationCode')}</label>
                  <div className="relative">
                    <Ticket size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#787b86' }} />
                    <input
                      type="text"
                      value={referralCode}
                      onChange={e => setReferralCode(e.target.value)}
                      placeholder={t('invitationCodePlaceholder')}
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-white outline-none transition-all"
                      style={{ background: '#111', border: '1px solid #1a1a2e' }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Phone / Email Input */}
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#787b86' }}>
                {mode === 'login' ? t('emailOrPhone') : t('phoneNumber')}
              </label>
              <div className="flex gap-2">
                {/* Premium Country Selector - Only show if not typing email */}
                {!phone.includes('@') && (
                  <div className="relative shrink-0" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="h-full flex items-center gap-2 pl-3 pr-4 py-2.5 bg-[#111] border border-[#1a1a2e] rounded-lg text-sm text-white outline-none transition-all hover:bg-[#1a1a2e]"
                    >
                      <span>{countryCodes.find(c => c.code === selectedCode)?.flag}</span>
                      <span className="font-medium">{selectedCode}</span>
                      <motion.span
                        animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                        className="text-[10px] opacity-40 ml-1"
                      >
                        ▼
                      </motion.span>
                    </button>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 5, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute z-50 left-0 top-full w-40 max-h-60 overflow-y-auto rounded-xl shadow-2xl overflow-hidden border border-[#222]"
                          style={{ 
                            background: 'rgba(10, 10, 10, 0.95)',
                            backdropFilter: 'blur(20px)',
                          }}
                        >
                          <div className="p-1 space-y-0.5">
                            {countryCodes.map((c) => (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => {
                                  setSelectedCode(c.code);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all hover:bg-white/5 ${
                                  selectedCode === c.code ? 'bg-blue-600/10 text-blue-400' : 'text-gray-400'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span>{c.flag}</span>
                                  <span>{c.code}</span>
                                </span>
                                {selectedCode === c.code && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#787b86' }}>
                    {phone.includes('@') ? <Mail size={15} /> : <Phone size={15} />}
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder={mode === 'login' ? t('emailOrPhone') : t('phonePlaceholder')}
                    required
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-white outline-none transition-all"
                    style={{ background: '#111', border: '1px solid #1a1a2e' }}
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#787b86' }}>{t('password')}</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#787b86' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg text-sm text-white outline-none"
                  style={{ background: '#111', border: '1px solid #1a1a2e' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#787b86' }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Register only) */}
            <AnimatePresence>
              {mode === 'register' && (
                <motion.div
                  key="confirmPass"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-xs mb-1.5" style={{ color: '#787b86' }}>{t('confirmPassword')}</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#787b86' }} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-white outline-none"
                      style={{ background: '#111', border: '1px solid #1a1a2e' }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 rounded-lg font-semibold text-white text-sm transition-all disabled:opacity-50"
              style={{ background: loading ? '#1a3a7a' : 'linear-gradient(135deg, #2962ff, #1565c0)' }}
            >
              {loading ? `⏳ ${t('processing')}` : mode === 'login' ? t('login') : t('createAccount')}
            </motion.button>
          </form>

          {/* Demo accounts hint removed */}
        </div>
      </motion.div>
    </div>
  );
}
