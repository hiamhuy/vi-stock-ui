'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getSocket } from '@/lib/socket';
import { tradeApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n-context';

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
}

const INITIAL_PRICES: PriceData[] = [
  { symbol: 'BTCUSDT', price: 65000, change: 250, changePercent: 0.56, high24h: 66000, low24h: 64000 },
  { symbol: 'ETHUSDT', price: 3500, change: 45, changePercent: 1.28, high24h: 3600, low24h: 3400 },
  { symbol: 'BNBUSDT', price: 580, change: 12, changePercent: 2.15, high24h: 600, low24h: 560 },
  { symbol: 'SOLUSDT', price: 185, change: 5, changePercent: 3.45, high24h: 195, low24h: 175 },
  { symbol: 'LTCUSDT', price: 82.4, change: 2.1, changePercent: 3.16, high24h: 85, low24h: 80 },
  { symbol: 'ADAUSDT', price: 0.45, change: 0.02, changePercent: 5.84, high24h: 0.48, low24h: 0.42 },
  { symbol: 'XRPUSDT', price: 1.38, change: 0.05, changePercent: 4.60, high24h: 1.45, low24h: 1.30 },
  { symbol: 'MATICUSDT', price: 0.37, change: -0.01, changePercent: -0.29, high24h: 0.40, low24h: 0.35 },
  { symbol: 'DOGEUSDT', price: 0.094, change: 0.003, changePercent: 3.78, high24h: 0.10, low24h: 0.08 },
  { symbol: 'DOTUSDT', price: 1.32, change: 0.08, changePercent: 7.27, high24h: 1.40, low24h: 1.20 },
];

export function PriceTicker({ activeSymbol = 'BTCUSDT', onSelectSymbol }: { activeSymbol?: string; onSelectSymbol?: (s: string) => void }) {
  const { t } = useTranslation();
  const [prices, setPrices] = useState<PriceData[]>(INITIAL_PRICES);
  const [sessionInfo, setSessionInfo] = useState<{
    timeLeft: number;
    status: string;
    totalCallAmount: number;
    totalPutAmount: number;
    symbol?: string;
  } | null>(null);
  const [lastOutcome, setLastOutcome] = useState<{ outcome: 'up' | 'down'; symbol: string } | null>(null);

  // Sync session info with current symbol
  useEffect(() => {
    // Reset session info while loading new symbol for clear UX
    setSessionInfo(null);
    
    tradeApi.getCurrentSession(activeSymbol).then(res => {
      if (res.data?.data) {
        setSessionInfo({
          ...res.data.data,
          symbol: activeSymbol
        });
      }
    }).catch(() => {});
  }, [activeSymbol]);

  // Simulate price movement + listen to WebSocket
  useEffect(() => {
    // Price simulation (realtime-feel)
    const priceInterval = setInterval(() => {
      setPrices(prev => prev.map(p => {
        let volatility = 0.001;
        if (p.symbol === 'BTCUSDT') volatility = 0.0005;
        if (p.symbol === 'SOLUSDT') volatility = 0.002;

        const delta = (Math.random() - 0.5) * p.price * volatility;
        const newPrice = Math.max(p.price + delta, 0.01);
        
        // Find original base price for change calculation
        const basePrice = INITIAL_PRICES.find(ip => ip.symbol === p.symbol)?.price || p.price;
        const change = newPrice - basePrice;
        
        return {
          ...p,
          price: newPrice,
          change,
          changePercent: (change / basePrice) * 100,
          high24h: Math.max(p.high24h, newPrice),
          low24h: Math.min(p.low24h, newPrice),
        };
      }));
    }, 1500);

    // WebSocket: session info realtime
    const socket = getSocket();
    if (socket) {
      const onTick = (data: any) => {
        if (data.symbol === activeSymbol) {
          setSessionInfo({
            timeLeft: data.timeLeft,
            status: data.status,
            totalCallAmount: data.totalCallAmount,
            totalPutAmount: data.totalPutAmount,
            symbol: data.symbol,
          });
        }
      };

      const onResult = (data: { symbol: string; outcome: 'up' | 'down' }) => {
        if (data.symbol === activeSymbol) {
          setLastOutcome(data);
          setTimeout(() => setLastOutcome(null), 4000);
        }
      };

      socket.on('session:tick', onTick);
      socket.on('session:result', onResult);

      return () => {
        clearInterval(priceInterval);
        socket.off('session:tick', onTick);
        socket.off('session:result', onResult);
      };
    }

    return () => clearInterval(priceInterval);
  }, [activeSymbol]);

  return (
    <div className="rounded-2xl p-5 border space-y-4" style={{ background: '#0a0a0a', borderColor: '#1a1a2e' }}>
      <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: '#576070' }}>{t('priceTable')}</h3>

      <div className="space-y-2">
        {prices.map((price, idx) => (
          <motion.div
            key={price.symbol}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => onSelectSymbol?.(price.symbol)}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
              activeSymbol === price.symbol 
                ? 'bg-blue-600/5 border-blue-500/50 shadow-[0_0_15px_rgba(37,99,235,0.1)]' 
                : 'bg-[#0d0d0d] border-[#1a1a2e] hover:border-gray-700'
            }`}
          >
            <div>
              <p className={`text-sm font-bold ${activeSymbol === price.symbol ? 'text-blue-500' : 'text-white'}`}>
                {price.symbol.replace('USDT', '')}
                <span className="text-[10px] text-gray-600 font-normal ml-1">/USDT</span>
              </p>
              <p className="text-[9px] font-bold uppercase tracking-tighter" style={{ color: '#576070' }}>SPOT</p>
            </div>
            <div className="text-right">
              <motion.p
                key={price.price.toFixed(2)}
                className="text-sm font-bold text-white tabular-nums"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.2 }}
              >
                ${price.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </motion.p>
              <p className={`text-[10px] font-black ${price.changePercent >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                {price.changePercent >= 0 ? '+' : ''}{price.changePercent.toFixed(2)}%
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Session info box */}
      {sessionInfo && (
        <div className="mt-4 rounded-xl p-4 border" style={{ background: '#0d0d0d', border: '1px solid #1a1a2e' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{t('session')} {activeSymbol}</p>
            </div>
            <span
              className="text-sm font-black tabular-nums"
              style={{ color: sessionInfo.timeLeft > 30 ? '#2962ff' : '#ef5350' }}
            >
              {sessionInfo.timeLeft}s
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(38,166,154,0.05)', border: '1px solid rgba(38,166,154,0.1)' }}>
              <p className="text-[9px] font-black uppercase" style={{ color: '#26a69a' }}>{t('buy')}</p>
              <p className="text-xs font-bold mt-0.5 text-white">${formatCurrency(sessionInfo.totalCallAmount)}</p>
            </div>
            <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(239,83,80,0.05)', border: '1px solid rgba(239,83,80,0.1)' }}>
              <p className="text-[9px] font-black uppercase" style={{ color: '#ef5350' }}>{t('sell')}</p>
              <p className="text-xs font-bold mt-0.5 text-white">${formatCurrency(sessionInfo.totalPutAmount)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Result flash */}
      {lastOutcome && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          className="rounded-xl p-3 text-center border-2"
          style={{
            background: lastOutcome.outcome === 'up' ? 'rgba(38,166,154,0.1)' : 'rgba(239,83,80,0.1)',
            borderColor: lastOutcome.outcome === 'up' ? '#26a69a' : '#ef5350',
          }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-0.5">{lastOutcome.symbol}</p>
          <p className="text-sm font-black" style={{ color: lastOutcome.outcome === 'up' ? '#26a69a' : '#ef5350' }}>
            {lastOutcome.outcome === 'up' ? t('resultUp') : t('resultDown')}
          </p>
        </motion.div>
      )}
    </div>
  );
}

