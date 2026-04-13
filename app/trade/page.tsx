'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TradingChart } from '@/components/trading-chart';
import { TradingPanel } from '@/components/trading-panel';
import { PriceTicker } from '@/components/price-ticker';
import Link from 'next/link';
import { BarChart3, TrendingUp, TrendingDown, Clock, Shield, Zap, ChevronRight, LayoutDashboard, History, Settings, LogOut, Wallet, User as UserIcon, MessageSquare, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n-context';
import KYCOnboarding from '@/components/kyc-onboarding';
import api from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { Header } from '@/components/Header';
import { DashboardGuard } from '@/components/DashboardGuard';

function TradeDashboardContent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useTranslation();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdData, setPwdData] = useState({ oldPassword: '', newPassword: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const s = searchParams.get('symbol');
    if (s && SUPPORTED_COINS.find(c => c.id === s)) {
      setSymbol(s);
    }
  }, [searchParams]);

  const SUPPORTED_COINS = [
    { id: 'BTCUSDT', name: 'BTC', fullName: 'Bitcoin', icon: '₿', color: '#f7931a' },
    { id: 'ETHUSDT', name: 'ETH', fullName: 'Ethereum', icon: 'Ξ', color: '#627eea' },
    { id: 'BNBUSDT', name: 'BNB', fullName: 'Binance Coin', icon: '🔶', color: '#f3ba2f' },
    { id: 'SOLUSDT', name: 'SOL', fullName: 'Solana', icon: '◎', color: '#14f195' },
    { id: 'LTCUSDT', name: 'LTC', fullName: 'Litecoin', icon: 'Ł', color: '#345d9d' },
    { id: 'ADAUSDT', name: 'ADA', fullName: 'Cardano', icon: '₳', color: '#0033ad' },
    { id: 'XRPUSDT', name: 'XRP', fullName: 'Ripple', icon: '✕', color: '#23292f' },
    { id: 'MATICUSDT', name: 'MATIC', fullName: 'Polygon', icon: 'M', color: '#8247e5' },
    { id: 'DOGEUSDT', name: 'DOGE', fullName: 'Dogecoin', icon: 'Ð', color: '#c2a633' },
    { id: 'DOTUSDT', name: 'DOT', fullName: 'Polkadot', icon: '●', color: '#e6007a' },
  ];

  // Auth guard: chuyển về login nếu chưa đăng nhập
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #2962ff, #1565c0)' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
              <LayoutDashboard size={22} className="text-white" />
            </motion.div>
          </div>
          <p className="text-sm" style={{ color: '#787b86' }}>{t('loading')}</p>
        </div>
      </div>
    );
  }


  const handleUpdatePassword = async () => {
    if (!pwdData.oldPassword || !pwdData.newPassword) return;
    setPwdLoading(true);
    try {
      await api.post('/user/change-password', pwdData);
      toast.success(t('passwordChangedSuccess'));
      setShowPasswordModal(false);
      setPwdData({ oldPassword: '', newPassword: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('passwordChangeError'));
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <DashboardGuard>
      <div className="min-h-screen bg-[#000000] text-white overflow-hidden flex flex-col">
        {/* Password Modal */}
        <AnimatePresence>
          {showPasswordModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#0a0a0a] border border-gray-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Key className="text-blue-500" /> {t('changePassword')}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-black block mb-1">{t('currentPassword')}</label>
                    <input type="password" value={pwdData.oldPassword} onChange={e => setPwdData({...pwdData, oldPassword: e.target.value})}
                      className="w-full bg-[#111] border border-gray-800 rounded-lg p-2.5 outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-black block mb-1">{t('newPassword')}</label>
                    <input type="password" value={pwdData.newPassword} onChange={e => setPwdData({...pwdData, newPassword: e.target.value})}
                      className="w-full bg-[#111] border border-gray-800 rounded-lg p-2.5 outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-2 text-sm text-gray-400 font-bold">{t('cancel')}</button>
                    <button onClick={handleUpdatePassword} disabled={pwdLoading}
                      className="flex-1 py-2 bg-blue-600 rounded-lg text-sm font-bold disabled:opacity-50">{t('update')}</button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Header */}
        <Header />

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            {/* Symbol Selector */}
            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
              {SUPPORTED_COINS.map((coin) => (
                <button
                  key={coin.id}
                  onClick={() => setSymbol(coin.id)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all shrink-0 ${
                    symbol === coin.id 
                      ? 'bg-blue-600/10 border-blue-500 text-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.2)]' 
                      : 'bg-[#0a0a0a] border-[#1a1a2e] text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold" style={{ backgroundColor: coin.color + '20', color: coin.color }}>
                    {coin.icon}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black tracking-wider leading-none mb-1">{coin.name}</p>
                    <p className="text-[10px] opacity-50 font-bold uppercase">{coin.fullName}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="lg:col-span-3 flex flex-col gap-4 md:gap-6">
                <div className="min-h-[400px] md:min-h-[500px] bg-[#0a0a0a] rounded-2xl border border-[#1a1a2e] overflow-hidden">
                  <TradingChart symbol={symbol} />
                </div>
                <TradingPanel symbol={symbol} />
              </div>
              <div className="lg:col-span-1">
                <PriceTicker activeSymbol={symbol} onSelectSymbol={setSymbol} />
              </div>
            </div>
          </main>
        </div>
      </DashboardGuard>
    );
  }

export default function TradeDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-sm" style={{ color: '#787b86' }}>Loading...</p>
      </div>
    }>
      <TradeDashboardContent />
    </Suspense>
  );
}
