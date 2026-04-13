'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n-context';
import { motion } from 'framer-motion';
import { LayoutDashboard, Wallet, History, Info, Send, AlertCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { DashboardGuard } from '@/components/DashboardGuard';
import { toast } from 'sonner';
import { userApi } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function WithdrawPage() {
  const { user, refreshUser, isLoading, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [tradingPassword, setTradingPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error(t('enterAmount'));
      return;
    }
    if (parseFloat(amount) > (user?.liveBalance || 0)) {
      toast.error(t('insufficientBalance'));
      return;
    }
    if (!tradingPassword) {
      toast.error(t('enterTradingPass'));
      return;
    }

    setLoading(true);
    try {
      await userApi.withdraw(parseFloat(amount), tradingPassword, undefined);
      toast.success(t('withdrawSuccess'));
      await refreshUser();
      router.push('/history');
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardGuard>
      <div className="min-h-screen bg-black text-white flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link href="/trade">
                    <button className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors">
                      <LayoutDashboard className="w-5 h-5" />
                    </button>
                  </Link>
                  <h1 className="text-2xl font-bold uppercase tracking-tight">{t('withdraw')}</h1>
                </div>
                <Link href="/history">
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    <History size={16} className="mr-2" /> {t('history')}
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left: Balance Info */}
                <div className="md:col-span-1 space-y-6">
                  <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6">
                    <p className="text-[10px] text-gray-500 font-black uppercase mb-2 tracking-widest">{t('availableBalance')}</p>
                    <h2 className="text-3xl font-black text-blue-500">${Number(user?.liveBalance || 0).toLocaleString()}</h2>
                    <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">{t('frozenBalance')}</span>
                        <span>$0.00</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">{t('withdrawableBalance')}</span>
                        <span className="text-green-500">${Number(user?.liveBalance || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-600/5 border border-blue-500/20 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase">
                      <Info size={14} /> {t('note')}
                    </div>
                    <ul className="text-[11px] text-gray-400 space-y-2 leading-relaxed">
                      <li>• {t('minWithdrawLimit')}</li>
                      <li>• {t('processingTime')}</li>
                      <li>• {t('withdrawFee')}</li>
                    </ul>
                  </div>
                </div>

                {/* Right: Withdrawal Form */}
                <div className="md:col-span-2">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 md:p-8"
                  >
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{t('amount')} (USD)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                          <input 
                            type="number" 
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full bg-[#111] border border-gray-800 rounded-xl py-4 pl-10 pr-4 outline-none focus:border-blue-500 transition-all font-bold text-lg"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{t('tradingPassword')}</label>
                        <input 
                          type="password" 
                          value={tradingPassword}
                          onChange={e => setTradingPassword(e.target.value)}
                          className="w-full bg-[#111] border border-gray-800 rounded-xl py-4 px-4 outline-none focus:border-blue-500 transition-all font-bold"
                          placeholder="******"
                        />
                      </div>

                      <div className="bg-blue-900/10 border border-blue-900/20 rounded-xl p-4 flex gap-3">
                        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-blue-200/70 leading-relaxed font-medium">
                          {t('withdrawInstruction')}
                        </p>
                      </div>

                      <button 
                        onClick={handleWithdraw}
                        disabled={loading || !amount || !tradingPassword}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                      >
                        {loading ? t('loading') : <><Send size={18} /> {t('confirmWithdraw')}</>}
                      </button>
                    </div>
                  </motion.div>

                  <div className="flex items-center justify-center gap-2 text-gray-700 mt-6 pb-10">
                    <AlertCircle size={12} />
                    <p className="text-[9px] md:text-[10px] uppercase font-black tracking-[0.2em]">{t('secureProcess')}</p>
                  </div>
                </div>
              </div>
            </div>
        </main>
      </div>
    </DashboardGuard>
  );
}
