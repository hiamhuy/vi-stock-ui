'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { motion } from 'framer-motion';
import { User as UserIcon, Mail, MapPin, IdCard, ArrowLeft, Save, ShieldCheck, Wallet, Ticket, Copy } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import Link from 'next/link';
import { removeAccents } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useTranslation } from '@/lib/i18n-context';
import { DashboardGuard } from '@/components/DashboardGuard';
import { LayoutDashboard } from 'lucide-react';

export default function ProfilePage() {
  const { user, refreshUser, isLoading, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    idNumber: '',
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        address: user.address || '',
        idNumber: user.idNumber || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/user/profile', formData);
      toast.success(t('profileUpdated'));
      await refreshUser();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !user) return null;

  return (
    <DashboardGuard>
      <div className="min-h-screen bg-black text-white flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            <div className="max-w-2xl mx-auto pt-6 md:pt-10">
              <header className="flex items-center gap-4 mb-8 md:mb-10">
                <Link href="/trade">
                  <button className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors">
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </Link>
                <h1 className="text-xl md:text-2xl font-bold uppercase tracking-tight">{t('personalInfo')}</h1>
              </header>

              <div className="grid grid-cols-1 gap-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 md:p-8"
                >
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex flex-col items-center mb-8">
                      <div className="w-16 h-16 md:w-24 md:h-24 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                        <UserIcon className="w-8 h-8 md:w-12 md:h-12" />
                      </div>
                      <p className="text-gray-500 text-xs md:text-sm">{user?.email || user?.phone}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[9px] md:text-[10px] uppercase font-black ${
                          user.kycStatus === 'verified' ? 'bg-green-900/40 text-green-500' :
                          user.kycStatus === 'pending' ? 'bg-yellow-900/40 text-yellow-500' :
                          'bg-gray-800 text-gray-500'
                        }`}>
                          {user.kycStatus === 'verified' ? t('kycVerified') : 
                           user.kycStatus === 'pending' ? t('kycPendingUser') : t('unverified')}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      {user.referralCode && (
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] text-gray-500 uppercase font-black flex items-center gap-2 tracking-widest">
                            <Ticket size={10} /> {t('invitationCode')}
                          </label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              readOnly
                              value={user.referralCode}
                              className="w-full bg-[#111] border border-gray-800 rounded-xl p-3 text-base outline-none font-mono tracking-widest text-center opacity-80 cursor-not-allowed"
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(user.referralCode || '');
                                toast.success('Đã sao chép!');
                              }}
                              className="bg-blue-600/20 hover:bg-blue-600 text-blue-500 hover:text-white px-4 rounded-xl transition-colors border border-blue-600/30 flex items-center justify-center"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase font-black flex items-center gap-2 tracking-widest">
                          <UserIcon size={10} /> {t('fullName')}
                        </label>
                        <input 
                          type="text" 
                          value={formData.fullName}
                          onChange={e => setFormData({...formData, fullName: removeAccents(e.target.value)})}
                          placeholder="Nguyen Van A"
                          className="w-full bg-[#111] border border-gray-800 rounded-xl p-3 text-sm md:text-base outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase font-black flex items-center gap-2 tracking-widest">
                          <IdCard size={10} /> {t('idNumber')}
                        </label>
                        <input 
                          type="text" 
                          value={formData.idNumber}
                          onChange={e => setFormData({...formData, idNumber: e.target.value})}
                          placeholder="0123456789"
                          className="w-full bg-[#111] border border-gray-800 rounded-xl p-3 text-sm md:text-base outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase font-black flex items-center gap-2 tracking-widest">
                          <MapPin size={10} /> {t('address')}
                        </label>
                        <input 
                          type="text" 
                          value={formData.address}
                          onChange={e => setFormData({...formData, address: removeAccents(e.target.value)})}
                          placeholder="Ha Noi, Viet Nam"
                          className="w-full bg-[#111] border border-gray-800 rounded-xl p-3 text-sm md:text-base outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-800 flex flex-col sm:flex-row justify-between gap-3 md:gap-4">
                      <Link href="/withdraw" className="w-full">
                        <button 
                          type="button"
                          className="w-full flex items-center justify-center gap-2 bg-[#111] hover:bg-[#1a1a2a] text-gray-400 px-6 py-3 rounded-xl font-bold transition-all border border-gray-800 uppercase text-[11px]"
                        >
                          <Wallet size={16} /> {t('withdraw')}
                        </button>
                      </Link>
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 uppercase text-[11px]"
                      >
                        {loading ? t('saving') : <><Save size={16} /> {t('saveChanges')}</>}
                      </button>
                    </div>
                  </form>
                </motion.div>

                <footer className="text-center pb-10">
                   <p className="text-gray-600 text-[10px] uppercase font-black tracking-[0.2em]">{t('protradeShield')}</p>
                </footer>
              </div>
            </div>
        </main>
      </div>
    </DashboardGuard>
  );
}
