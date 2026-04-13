'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BarChart3, ArrowLeft, History, TrendingUp, TrendingDown, Clock, Filter } from 'lucide-react';
import { userApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n-context';
import { DashboardGuard } from '@/components/DashboardGuard';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { LayoutDashboard } from 'lucide-react';

interface Trade {
  id: number;
  type: 'call' | 'put';
  amount: string;
  accountType: 'demo' | 'live';
  result: 'win' | 'lose' | 'pending';
  profit: string;
  createdAt: string;
  session?: {
    outcome: 'up' | 'down' | null;
  };
}

interface Transaction {
  id: number;
  amount: string;
  type: 'deposit' | 'withdrawal' | 'bonus';
  accountType: 'demo' | 'live';
  description: string;
  status: string;
  createdAt: string;
}

export default function HistoryPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t, language } = useTranslation();
  const [tab, setTab] = useState<'trades' | 'transactions'>('trades');
  const [trades, setTrades] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return; // Ensure user is authenticated before fetching
    setLoading(true);
    try {
      const [tradesRes, transRes] = await Promise.all([
        userApi.getTrades(1, 100), // Fetch all trades
        userApi.getTransactions() // Fetch transactions
      ]);
      setTrades(tradesRes.data.data.trades);
      setTransactions(transRes.data.data);
    } catch (error) {
      toast.error('Không thể tải dữ liệu lịch sử');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]); // Dependencies for useCallback

  useEffect(() => {
    fetchData();
  }, [fetchData]); // useEffect depends on fetchData


  return (
    <DashboardGuard>
      <div className="min-h-screen bg-[#000000] text-white flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            <div className="max-w-5xl mx-auto space-y-8">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link href="/trade">
                    <Button variant="outline" size="sm" className="border-[#1a1a2e] text-[#9ca3af] hover:text-white">
                      <ArrowLeft size={16} className="mr-2" /> {t('back' as any) || 'Back'}
                    </Button>
                  </Link>
                  <div className="flex items-center gap-3">
                    <History size={24} className="text-[#2962ff]" />
                    <h1 className="text-2xl font-bold">{t('history')}</h1>
                  </div>
                </div>
              </div>

              {/* Tabs & Filters */}
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1a1a2e] gap-4">
                <div className="flex gap-4">
                  <button 
                    onClick={() => setTab('trades')}
                    className={`pb-3 px-2 text-sm font-bold transition-all uppercase ${tab === 'trades' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
                  >
                    {t('history')}
                  </button>
                  <button 
                    onClick={() => setTab('transactions')}
                    className={`pb-3 px-2 text-sm font-bold transition-all uppercase ${tab === 'transactions' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
                  >
                    {t('withdraw')}
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-4">
                {loading ? (
                   <div className="text-center py-20">{t('loading')}</div>
                ) : (tab === 'trades' ? (
                  trades.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-[#1a1a2e] rounded-2xl">
                      <Clock size={40} className="mx-auto mb-4 text-[#1a1a2e]" />
                      <p style={{ color: '#787b86' }}>Bạn chưa có thực hiện lệnh nào</p>
                    </div>
                  ) : (
                    <div className="bg-[#0a0a0a] rounded-2xl border border-[#1a1a2e] overflow-hidden shadow-2xl">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[600px]">
                          <thead>
                            <tr className="border-b border-[#1a1a2e]" style={{ background: '#0d0d0d' }}>
                              <th className="text-left py-4 px-6 font-semibold text-[#787b86]">{t('time')}</th>
                              <th className="text-left py-4 px-6 font-semibold text-[#787b86]">{t('type')}</th>
                              <th className="text-right py-4 px-6 font-semibold text-[#787b86]">{t('amount')}</th>
                              <th className="text-right py-4 px-6 font-semibold text-[#787b86]">{t('result')}</th>
                              <th className="text-right py-4 px-6 font-semibold text-[#787b86]">{t('profit')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trades.map((trade, idx) => (
                              <motion.tr
                                key={trade.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                className="border-b border-[#0d0d0d] hover:bg-[#0b1217] transition-colors"
                              >
                                <td className="py-4 px-6 text-[#9ca3af] whitespace-nowrap">
                                  {new Date(trade.createdAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}
                                </td>
                                <td className="py-4 px-6">
                                  <span className={`flex items-center gap-1.5 font-bold ${trade.type === 'call' ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                                    {trade.type === 'call' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    {trade.type === 'call' ? t('buy') : t('sell')}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-right font-medium">${parseFloat(trade.amount).toFixed(2)}</td>
                                <td className="py-4 px-6 text-right">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    trade.result === 'win' ? 'bg-[#26a69a24] text-[#26a69a]' : 
                                    trade.result === 'lose' ? 'bg-[#ef535024] text-[#ef5350]' : 
                                    'bg-[#1a1a2e] text-[#787b86]'
                                  }`}>
                                    {trade.result === 'win' ? t('win') : trade.result === 'lose' ? t('lose') : t('pendingLabel')}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-right font-bold" style={{ color: trade.result === 'win' ? '#26a69a' : trade.result === 'lose' ? '#ef5350' : '#787b86' }}>
                                  {trade.result === 'win' ? `+$${parseFloat(trade.profit).toFixed(2)}` : 
                                   trade.result === 'lose' ? `-$${parseFloat(trade.amount).toFixed(2)}` : '—'}
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                ) : (
                  transactions.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-[#1a1a2e] rounded-2xl">
                      <Clock size={40} className="mx-auto mb-4 text-[#1a1a2e]" />
                      <p style={{ color: '#787b86' }}>Bạn chưa có giao dịch nạp/rút tiền nào</p>
                    </div>
                  ) : (
                    <div className="bg-[#0a0a0a] rounded-2xl border border-[#1a1a2e] overflow-hidden shadow-2xl">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[600px]">
                          <thead>
                            <tr className="border-b border-[#1a1a2e]" style={{ background: '#0d0d0d' }}>
                              <th className="text-left py-4 px-6 font-semibold text-[#787b86]">{t('time')}</th>
                              <th className="text-left py-4 px-6 font-semibold text-[#787b86]">{t('type')}</th>
                              <th className="text-right py-4 px-6 font-semibold text-[#787b86]">{t('amount')}</th>
                              <th className="text-left py-4 px-6 font-semibold text-[#787b86]">{t('result')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transactions.map((txn, idx) => (
                              <motion.tr
                                key={txn.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                className="border-b border-[#0d0d0d] hover:bg-[#0b1217] transition-colors"
                              >
                                <td className="py-4 px-6 text-[#9ca3af] whitespace-nowrap">
                                  {new Date(txn.createdAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}
                                </td>
                                <td className="py-4 px-6">
                                   <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-black ${txn.type === 'deposit' ? 'bg-green-900/20 text-green-500' : 'bg-red-900/20 text-red-500'}`}>
                                    {txn.type === 'deposit' ? 'Nạp tiền' : txn.type === 'withdrawal' ? 'Rút tiền' : txn.type}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-right font-bold text-white">
                                  ${txn.amount ? Number(txn.amount).toLocaleString() : '0'}
                                </td>
                                <td className="py-4 px-6">
                                  {txn.type === 'withdrawal' ? (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      txn.status === 'success' ? 'bg-green-900/20 text-green-500' : 
                                      txn.status === 'failed' ? 'bg-red-900/20 text-red-500' : 
                                      'bg-orange-900/20 text-orange-400'
                                    }`}>
                                      {txn.status === 'success' ? t('success') : txn.status === 'failed' ? t('failed') : t('pendingLabel')}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-900/20 text-green-500">
                                      {t('success')}
                                    </span>
                                  )}
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </main>
        </div>
      </DashboardGuard>
    );
  }
