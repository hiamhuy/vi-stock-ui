'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { tradeApi, userApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getSocket } from '@/lib/socket';
import { useTranslation } from '@/lib/i18n-context';
import { formatCurrency } from '@/lib/utils';

interface SessionInfo {
  sessionId: number;
  status: 'open' | 'locked';
  timeLeft: number;
  phase: string;
  totalCallAmount: number;
  totalPutAmount: number;
  payoutRate: number | string;
  myTrades?: any[];
}

interface TradeRecord {
  type: string;
  amount: number;
  time: number;
  result?: 'win' | 'lose' | 'pending';
  profit?: number;
}

export function TradingPanel({ symbol = 'BTCUSDT' }: { symbol?: string }) {
  const { user, updateBalance, refreshBalance } = useAuth();
  const { t, language } = useTranslation();
  const [investmentAmount, setInvestmentAmount] = useState('50');
  // We only use 'live' account type now
  const [accountType] = useState<'live'>('live');
  const [isTrading, setIsTrading] = useState(false);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);

  const quickAmounts = [10, 50, 100, 500];

  // Lắng nghe WebSocket events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onTick = (data: SessionInfo & { symbol: string }) => {
      if (data.symbol === symbol) {
        setSession(data);
        setTimeLeft(data.timeLeft);
        setIsTrading(data.status === 'locked' || data.timeLeft < 60);
      }
    };

    const onLocked = (data: { symbol: string }) => {
      if (data.symbol === symbol) {
        setIsTrading(true);
        toast.info(t('sessionLocked', { symbol }));
      }
    };

    const onResult = (data: any) => {
      if (data.symbol && data.symbol !== symbol) return;

      if (data.result === 'win') {
        toast.success(data.message, { duration: 5000 });
      } else {
        toast.error(data.message, { duration: 5000 });
      }

      if (data.newBalance !== undefined && data.newBalance !== null && !isNaN(data.newBalance)) {
        updateBalance(data.newBalance);
      }

      setTrades(prev => {
        const index = prev.findIndex(t => t.result === 'pending');
        if (index === -1) return prev;
        const newTrades = [...prev];
        newTrades[index] = { ...newTrades[index], result: data.result, profit: data.profit };
        return newTrades;
      });
    };

    const onNewSession = (data: { symbol: string; sessionId: number; timeLeft: number; payoutRate: number | string }) => {
      if (data.symbol === symbol) {
        setTimeLeft(data.timeLeft);
        setIsTrading(false);
        setSession(prev => prev ? { ...prev, ...data } : null);
      }
    };

    socket.on('session:tick', onTick);
    socket.on('session:locked', onLocked);
    socket.on('trade:result', onResult);
    socket.on('session:new', onNewSession);

    return () => {
      socket.off('session:tick', onTick);
      socket.off('session:locked', onLocked);
      socket.off('trade:result', onResult);
      socket.off('session:new', onNewSession);
    };
  }, [user, updateBalance, symbol]);

  // Lấy session hiện tại khi load hoặc đổi symbol
  useEffect(() => {
    tradeApi.getCurrentSession(symbol).then(res => {
      if (res.data.data) {
        setSession(res.data.data);
        setTimeLeft(res.data.data.timeLeft);
        if (res.data.data.status === 'locked') setIsTrading(true);
      } else {
        setSession(null);
      }
    }).catch(() => {});

    // Lịch sử lệnh
    userApi.getTrades(1, 10).then(res => {
      const mapped = res.data.data.trades.map((t: any) => ({
        type: t.type.toUpperCase(),
        amount: parseFloat(t.amount),
        time: new Date(t.createdAt).getTime(),
        result: t.result,
        profit: parseFloat(t.profit),
      }));
      setTrades(mapped);
    }).catch(() => {});
  }, []);

  const handleTrade = async (type: 'call' | 'put') => {
    const amount = parseFloat(investmentAmount) || 0;
    if (amount <= 0) {
      toast.error(t('invalidAmount'));
      return;
    }

    const balance = user?.liveBalance ?? 0;
    if (amount > balance) {
      toast.error(t('insufficientBalance'));
      return;
    }

    if (session?.status === 'locked') {
      toast.error(t('sessionLockedNoOrder'));
      return;
    }

    try {
      const res = await tradeApi.place(type, amount, symbol);
      const { newBalance } = res.data.data;

      const newTrade: TradeRecord = {
        type: type === 'call' ? t('buy') : t('sell'),
        amount,
        time: Date.now(),
        result: 'pending'
      };
      setTrades(prev => [newTrade, ...prev]);

      // Cập nhật balance ngay lập tức (luôn live)
      updateBalance(newBalance);

      toast.success(t('orderPlaced', { type: type === 'call' ? `▲ ${t('buy')}` : `▼ ${t('sell')}`, amount }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('orderError'));
    }
  };

  // Circular timer
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (timeLeft / 60) * circumference;
  const phase = (session?.timeLeft ?? timeLeft) > 30 ? 'open' : 'locked';

  return (
    <div className="bg-[#0a0a0a] rounded-lg p-6 border border-[#1a1a2e]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">{t('tradeOptions')}</h3>
        {/* {session?.payoutRate && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            key={session.payoutRate}
            className="flex flex-col items-end"
          >
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-0.5">{t('profit')}</span>
            <span className="text-xl font-black text-[#26a69a] animate-pulse">
              +{Math.round(parseFloat(session.payoutRate.toString()) * 100)}%
            </span>
          </motion.div>
        )} */}
      </div>

      {/* Account type selections removed for Live-only experience */}

      {/* Balance display */}
      <div className="mb-4 p-3 rounded-lg flex items-center justify-between" style={{ background: '#111', border: '1px solid #1a1a2e' }}>
        <div>
          <p className="text-xs mb-1" style={{ color: '#787b86' }}>
            {t('availableBalance')}
          </p>
          <p className="text-xl font-bold text-white">
            ${formatCurrency(user?.liveBalance)}
          </p>
        </div>
        <div className="px-2 py-1 bg-green-600/10 border border-green-600/30 rounded text-[10px] font-bold text-green-500 uppercase">
          {t('liveAccount')}
        </div>
      </div>

      {/* Investment Input */}
      <div className="mb-5">
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#9ca3af' }}>
          {t('investmentAmount')}
        </label>
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <Input
              type="number"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(e.target.value)}
              placeholder="0.00"
              className="bg-[#111] border-[#1a1a2e] text-white pl-7 py-5 md:py-6 text-lg font-bold"
              disabled={isTrading && phase === 'locked'}
            />
          </div>
          <div className="flex items-center px-3 bg-[#111] border border-[#1a1a2e] rounded-lg text-[#6b7280] text-[10px] font-black uppercase">
            USD
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 md:gap-2">
          {quickAmounts.map(amount => (
            <Button
              key={amount}
              onClick={() => setInvestmentAmount(amount.toString())}
              disabled={isTrading && phase === 'locked'}
              variant={investmentAmount === amount.toString() ? 'default' : 'outline'}
              className={`h-8 md:h-10 text-[10px] md:text-sm font-black transition-all ${
                investmentAmount === amount.toString()
                  ? 'bg-[#2962ff] text-white border-[#2962ff] shadow-lg shadow-blue-600/20'
                  : 'bg-[#111] text-[#9ca3af] border-[#1a1a2e] hover:text-white'
              }`}
            >
              ${amount}
            </Button>
          ))}
        </div>
      </div>

      {/* Session countdown */}
      <div className="mb-5 flex flex-col items-center">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#1a1a2e" strokeWidth="4" />
            <motion.circle
              cx="50" cy="50" r="45" fill="none"
              stroke={phase === 'open' ? '#2962ff' : '#ef5350'}
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transition={{ type: 'linear', duration: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{timeLeft}</p>
              <p className="text-xs mt-0.5" style={{ color: phase === 'open' ? '#2962ff' : '#ef5350' }}>
                {phase === 'open' ? t('openOrder') : t('lockedOrder')}
              </p>
            </div>
          </div>
        </div>

        {/* Session stats & Sentiment Bar */}
        {session && (
          <div className="w-full mt-4 flex flex-col gap-2 px-2">
            <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-tighter">
              <span style={{ color: '#26a69a' }}>▲ {t('buy')}: {Math.round((parseFloat(session.totalCallAmount.toString()) / (parseFloat(session.totalCallAmount.toString()) + parseFloat(session.totalPutAmount.toString()) || 1)) * 100)}%</span>
              <span style={{ color: '#ef5350' }}>{Math.round((parseFloat(session.totalPutAmount.toString()) / (parseFloat(session.totalCallAmount.toString()) + parseFloat(session.totalPutAmount.toString()) || 1)) * 100)}% {t('sell')} ▼</span>
            </div>
            
            <div className="h-1.5 w-full bg-[#111] rounded-full overflow-hidden flex border border-[#1a1a2e]/50">
              <motion.div 
                initial={{ width: '50%' }}
                animate={{ width: `${(parseFloat(session.totalCallAmount.toString()) / (parseFloat(session.totalCallAmount.toString()) + parseFloat(session.totalPutAmount.toString()) || 1)) * 100}%` }}
                className="h-full bg-[#26a69a] shadow-[0_0_10px_rgba(38,166,154,0.3)] transition-all duration-500"
              />
              <motion.div 
                initial={{ width: '50%' }}
                animate={{ width: `${(parseFloat(session.totalPutAmount.toString()) / (parseFloat(session.totalCallAmount.toString()) + parseFloat(session.totalPutAmount.toString()) || 1)) * 100}%` }}
                className="h-full bg-[#ef5350] shadow-[0_0_10px_rgba(239,83,80,0.3)] transition-all duration-500"
              />
            </div>
            
            <div className="flex justify-between items-center text-[9px] text-gray-600 font-bold">
              <span>${formatCurrency(session.totalCallAmount)}</span>
              <span>${formatCurrency(session.totalPutAmount)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Trade Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleTrade('call')}
          disabled={phase === 'locked'}
          className="h-12 rounded-lg font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed border-2 uppercase text-xs"
          style={{
            background: phase === 'locked' ? '#333' : '#26a69a',
            borderColor: phase === 'locked' ? '#333' : '#26a69a',
          }}
        >
          ▲ {t('buy')} (CALL)
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleTrade('put')}
          disabled={phase === 'locked'}
          className="h-12 rounded-lg font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed border-2 uppercase text-xs"
          style={{
            background: phase === 'locked' ? '#333' : '#ef5350',
            borderColor: phase === 'locked' ? '#333' : '#ef5350',
          }}
        >
          ▼ {t('sell')} (PUT)
        </motion.button>
      </div>

      {/* Recent Trades */}
      <div className="rounded-lg p-4" style={{ background: '#0d0d0d', border: '1px solid #1a1a2e' }}>
        <h4 className="text-sm font-medium mb-3" style={{ color: '#9ca3af' }}>{t('tradeHistory')}</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {trades.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: '#576070' }}>{t('noTrades')}</p>
          ) : (
            trades.slice(0, 10).map((trade, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-2 rounded text-xs border"
                style={{
                  background: trade.result === 'win' ? '#0d2d1a' : trade.result === 'lose' ? '#2d0d0d' : '#111',
                  borderColor: trade.result === 'win' ? '#1a5c2d' : trade.result === 'lose' ? '#5c1a1a' : '#1a1a2e',
                }}
              >
                <span className="font-bold flex items-center gap-1" style={{ color: trade.type === 'MUA' || trade.type === 'CALL' ? '#26a69a' : '#ef5350' }}>
                  {trade.type === 'MUA' || trade.type === 'CALL' ? '▲' : '▼'} {trade.type}
                </span>
                <span style={{ color: '#9ca3af' }}>${trade.amount}</span>
                <span style={{ color: trade.result === 'win' ? '#26a69a' : trade.result === 'lose' ? '#ef5350' : '#787b86' }}>
                  {trade.result === 'win' ? `+$${trade.profit}` : trade.result === 'lose' ? `-$${trade.amount}` : '⏳'}
                </span>
                <span style={{ color: '#576070' }}>{new Date(trade.time).toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
