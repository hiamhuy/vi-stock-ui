'use client';

import { useEffect, useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Customized,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Info, Zap } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import {
  generateCandleStickData,
  getNextCandle,
  calculateSMA,
  calculateEMA,
  OHLC,
} from '@/lib/mock-data';

interface ChartData extends OHLC {
  sma20?: number | null;
  ema20?: number | null;
}

const TIME_INTERVALS = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '7d', '1M'];

// ──────────────────────────────────────────────
// Custom candlestick layer rendered via <Customized>
// ──────────────────────────────────────────────
const CandlesticksBars = (props: any) => {
  const { formattedGraphicalItems, xAxisMap, yAxisMap, offset, chartData } = props;
  if (!xAxisMap || !yAxisMap || !chartData?.length) return null;

  const xAxis = Object.values(xAxisMap)[0] as any;
  const yAxis = Object.values(yAxisMap)[0] as any;
  if (!xAxis?.scale || !yAxis?.scale) return null;

  const xScale = xAxis.scale;
  const yScale = yAxis.scale;

  // bandwidth for band scale or derived from data length
  const bw = xScale.bandwidth ? xScale.bandwidth() : (offset.width / chartData.length);
  const candleWidth = Math.max(2, bw * 0.65);

  return (
    <g>
      {chartData.map((candle: ChartData, i: number) => {
        // x center
        const cx = (xScale(i) ?? 0) + bw / 2;
        const bullish = candle.close >= candle.open;
        const color = bullish ? '#26a69a' : '#ef5350';

        const highY = yScale(candle.high);
        const lowY = yScale(candle.low);
        const openY = yScale(candle.open);
        const closeY = yScale(candle.close);

        const bodyTop = Math.min(openY, closeY);
        const bodyH = Math.max(1, Math.abs(openY - closeY));
        const hw = candleWidth / 2;

        return (
          <g key={candle.timestamp}>
            {/* Upper wick */}
            <line x1={cx} y1={highY} x2={cx} y2={bodyTop} stroke={color} strokeWidth={1.2} />
            {/* Lower wick */}
            <line x1={cx} y1={bodyTop + bodyH} x2={cx} y2={lowY} stroke={color} strokeWidth={1.2} />
            {/* Body */}
            <rect
              x={cx - hw}
              y={bodyTop}
              width={candleWidth}
              height={bodyH}
              fill={color}
              stroke={color}
              strokeWidth={0.5}
            />
          </g>
        );
      })}
    </g>
  );
};

// ──────────────────────────────────────────────
// Custom tooltip
// ──────────────────────────────────────────────
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as ChartData | undefined;
  if (!d) return null;
  const bullish = d.close >= d.open;

  return (
    <div
      style={{
        background: '#131722',
        border: '1px solid #2a2e39',
        borderRadius: 6,
        padding: '10px 14px',
        fontSize: 12,
        color: '#d1d4dc',
        minWidth: 160,
        pointerEvents: 'none',
      }}
    >
      <p style={{ color: '#9ca3af', marginBottom: 6 }}>
        {bullish ? '🟢' : '🔴'} {new Date(d.timestamp).toLocaleTimeString()}
      </p>
      <p style={{ margin: '2px 0' }}>Open: <b style={{ color: '#d1d4dc' }}>${d.open.toFixed(2)}</b></p>
      <p style={{ margin: '2px 0' }}>High: <b style={{ color: '#26a69a' }}>${d.high.toFixed(2)}</b></p>
      <p style={{ margin: '2px 0' }}>Low: <b style={{ color: '#ef5350' }}>${d.low.toFixed(2)}</b></p>
      <p style={{ margin: '2px 0' }}>Close: <b style={{ color: bullish ? '#26a69a' : '#ef5350' }}>${d.close.toFixed(2)}</b></p>
      {d.sma20 != null && (
        <p style={{ margin: '4px 0 2px' }}>SMA 20: <b style={{ color: '#eab308' }}>{d.sma20.toFixed(2)}</b></p>
      )}
      {d.ema20 != null && (
        <p style={{ margin: '2px 0' }}>EMA 20: <b style={{ color: '#a855f7' }}>{d.ema20.toFixed(2)}</b></p>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────
export function TradingChart({ symbol = 'BTCUSDT' }: { symbol?: string }) {
  const [allData, setAllData] = useState<ChartData[]>([]);
  const [displayData, setDisplayData] = useState<ChartData[]>([]);
  const [latestPrice, setLatestPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [selectedInterval, setSelectedInterval] = useState('1m');
  const [hoveredCandle, setHoveredCandle] = useState<ChartData | null>(null);
  const [liveCandle, setLiveCandle] = useState<ChartData | null>(null);
  const [sessionResult, setSessionResult] = useState<{ outcome: 'up' | 'down'; message: string } | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('session:result', (data: { symbol: string; outcome: 'up' | 'down'; message: string }) => {
      if (data.symbol === symbol) {
        setSessionResult(data);
        setTimeout(() => setSessionResult(null), 5000);
      }
    });

    return () => {
      socket.off('session:result');
    };
  }, [symbol]);

  const buildChartData = (raw: OHLC[]): ChartData[] => {
    const smaData = calculateSMA(raw, 20);
    const emaData = calculateEMA(raw, 20);
    return raw.map((candle, i) => ({
      ...candle,
      sma20: smaData[i],
      ema20: emaData[i],
    }));
  };

  useEffect(() => {
    const initial = generateCandleStickData(symbol, selectedInterval);
    const chartData = buildChartData(initial);
    setAllData(chartData);
    setDisplayData(chartData.slice(-50));
    const last = chartData[chartData.length - 1];
    setLatestPrice(last.close);
    setLiveCandle(last);
  }, [symbol, selectedInterval]);

  useEffect(() => {
    if (allData.length === 0) return;
    const iv = setInterval(() => {
      setAllData(prev => {
        const newCandle = getNextCandle(prev[prev.length - 1], symbol, selectedInterval);
        const updated = [...prev, newCandle];
        if (updated.length > 200) updated.shift();
        const chartData = buildChartData(updated);
        const last = chartData[chartData.length - 1];
        setLatestPrice(last.close);
        setPriceChange(last.close - last.open);
        setLiveCandle(last);
        setDisplayData(chartData.slice(-50));
        return chartData;
      });
    }, 2000);
    return () => clearInterval(iv);
  }, [allData.length, symbol, selectedInterval]);

  const bullish = priceChange >= 0;
  const displayCandle = hoveredCandle ?? liveCandle;

  const yMin = displayData.length ? Math.min(...displayData.map(d => d.low)) : 0;
  const yMax = displayData.length ? Math.max(...displayData.map(d => d.high)) : 0;
  const yPad = (yMax - yMin) * 0.05;

  const xTickFormatter = (ts: number) => {
    const date = new Date(ts);
    if (['1d', '7d', '1M'].includes(selectedInterval)) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Index-based x axis so recharts uses bandScale → easier to compute candleX
  const indexedData = displayData.map((d, i) => ({ ...d, _idx: i }));

  return (
    <div
      className="col-span-2 rounded-lg overflow-hidden"
      style={{ background: '#000000', border: '1px solid #1a1a2e' }}
    >
      {/* ── Top bar ── */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ background: '#0d0d0d', borderColor: '#1a1a2e' }}
      >
        <div className="flex items-center gap-1">
          {/* candlestick icon */}
          <button
            className="px-2 py-1 rounded text-[#787b86] hover:text-white transition-colors"
            title="Candlestick"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="1" y="4" width="3" height="6" />
              <line x1="2.5" y1="2" x2="2.5" y2="4" stroke="currentColor" strokeWidth="1.4" />
              <line x1="2.5" y1="10" x2="2.5" y2="12" stroke="currentColor" strokeWidth="1.4" />
              <rect x="8" y="3" width="3" height="7" />
              <line x1="9.5" y1="1" x2="9.5" y2="3" stroke="currentColor" strokeWidth="1.4" />
              <line x1="9.5" y1="10" x2="9.5" y2="13" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
          <div className="w-px h-4 mx-1" style={{ background: '#1a1a2e' }} />
          {TIME_INTERVALS.map(iv => (
            <button
              key={iv}
              onClick={() => setSelectedInterval(iv)}
              className="px-2 py-0.5 rounded text-xs font-medium transition-all"
              style={{
                background: selectedInterval === iv ? '#2962ff' : 'transparent',
                color: selectedInterval === iv ? '#ffffff' : '#787b86',
              }}
            >
              {iv}
            </button>
          ))}
        </div>

        {/* Live price pill */}
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold"
          style={{
            background: bullish ? '#0d2d1a' : '#2d0d0d',
            color: bullish ? '#26a69a' : '#ef5350',
            border: `1px solid ${bullish ? '#1a5c2d' : '#5c1a1a'}`,
          }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse inline-block"
            style={{ background: bullish ? '#26a69a' : '#ef5350' }}
          />
          ${latestPrice.toFixed(2)}
        </div>
      </div>

      {/* ── OHLC info bar ── */}
      <div
        className="flex items-center flex-wrap gap-4 px-4 py-1.5 text-xs border-b"
        style={{ background: '#000', borderColor: '#111' }}
      >
        <span style={{ color: '#aaa', fontWeight: 700 }}>{symbol.replace('USDT', '/USDT')}</span>
        {displayCandle && (
          <>
            <span style={{ color: '#d1d4dc' }}>
              O: <span style={{ color: displayCandle.close >= displayCandle.open ? '#26a69a' : '#ef5350' }}>
                {displayCandle.open.toFixed(2)}
              </span>
            </span>
            <span style={{ color: '#d1d4dc' }}>H: <span style={{ color: '#26a69a' }}>{displayCandle.high.toFixed(2)}</span></span>
            <span style={{ color: '#d1d4dc' }}>L: <span style={{ color: '#ef5350' }}>{displayCandle.low.toFixed(2)}</span></span>
            <span style={{ color: '#d1d4dc' }}>
              C: <span style={{ color: displayCandle.close >= displayCandle.open ? '#26a69a' : '#ef5350' }}>
                {displayCandle.close.toFixed(2)}
              </span>
            </span>
          </>
        )}
        <span style={{ color: '#eab308', fontWeight: 600 }}>
          ● SMA 20: {displayCandle?.sma20 != null ? displayCandle.sma20.toFixed(3) : '—'}
        </span>
        <span style={{ color: '#a855f7', fontWeight: 600 }}>
          ● EMA 20: {displayCandle?.ema20 != null ? displayCandle.ema20.toFixed(3) : '—'}
        </span>
      </div>

      {/* ── Main chart ── */}
      <div style={{ background: '#000000' }}>
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart
            data={indexedData}
            margin={{ top: 14, right: 70, left: 0, bottom: 10 }}
            onMouseMove={(e: any) => {
              if (e?.activePayload?.[0]) setHoveredCandle(e.activePayload[0].payload);
            }}
            onMouseLeave={() => setHoveredCandle(null)}
          >
            <CartesianGrid strokeDasharray="1 3" stroke="#111827" opacity={0.8} />

            <XAxis
              dataKey="_idx"
              type="number"
              domain={[0, indexedData.length - 1]}
              tickFormatter={(idx: number) => {
                const d = indexedData[idx];
                return d ? xTickFormatter(d.timestamp) : '';
              }}
              stroke="#1a1a2e"
              tick={{ fill: '#576070', fontSize: 10 }}
              axisLine={{ stroke: '#1a1a2e' }}
              tickLine={false}
              interval={Math.floor(indexedData.length / 8)}
              scale="linear"
            />

            <YAxis
              domain={[yMin - yPad, yMax + yPad]}
              orientation="right"
              stroke="#1a1a2e"
              tick={{ fill: '#576070', fontSize: 10 }}
              axisLine={{ stroke: '#1a1a2e' }}
              tickLine={false}
              tickFormatter={(v: number) => v.toFixed(0)}
              width={70}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#2a2e39', strokeWidth: 1, strokeDasharray: '4 2' }}
            />

            {/* Candlestick custom layer */}
            <Customized component={(p: any) => <CandlesticksBars {...p} chartData={displayData} />} />

            {/* SMA line */}
            <Line
              type="monotone"
              dataKey="sma20"
              stroke="#eab308"
              dot={false}
              isAnimationActive={false}
              strokeWidth={1.8}
              connectNulls={false}
              legendType="none"
            />

            {/* EMA line */}
            <Line
              type="monotone"
              dataKey="ema20"
              stroke="#a855f7"
              dot={false}
              isAnimationActive={false}
              strokeWidth={1.8}
              connectNulls={false}
              legendType="none"
            />

            {/* Invisible bar to force band-like spacing for candlesticks */}
            <Bar
              dataKey="high"
              fill="transparent"
              stroke="transparent"
              isAnimationActive={false}
              legendType="none"
              opacity={0}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Result Overlay Premium */}
        <AnimatePresence>
          {sessionResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
            >
              {/* Glow Effect */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 0.2 }}
                exit={{ scale: 2, opacity: 0 }}
                className={`absolute w-64 h-64 rounded-full blur-[100px] ${
                  sessionResult.outcome === 'up' ? 'bg-[#26a69a]' : 'bg-[#ef5350]'
                }`}
              />
              
              <motion.div
                initial={{ scale: 0.7, y: 50, rotateX: 45 }}
                animate={{ scale: 1, y: 0, rotateX: 0 }}
                exit={{ scale: 1.2, y: -50, opacity: 0 }}
                transition={{ type: "spring", damping: 15 }}
                className="relative overflow-hidden group"
              >
                {/* Main Card */}
                <div 
                  className={`px-10 py-6 rounded-[2rem] border-2 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl flex flex-col items-center gap-2`}
                  style={{
                    background: sessionResult.outcome === 'up' ? 'linear-gradient(135deg, rgba(38,166,154,0.15), rgba(0,0,0,0.8))' : 'linear-gradient(135deg, rgba(239,83,80,0.15), rgba(0,0,0,0.8))',
                    borderColor: sessionResult.outcome === 'up' ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
                  }}
                >
                  <motion.div 
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                      sessionResult.outcome === 'up' ? 'bg-[#26a69a] shadow-[#26a69a]/20' : 'bg-[#ef5350] shadow-[#ef5350]/20'
                    }`}
                  >
                    {sessionResult.outcome === 'up' ? (
                      <TrendingUp size={32} className="text-white" />
                    ) : (
                      <TrendingDown size={32} className="text-white" />
                    )}
                  </motion.div>

                  <div className="text-center mt-2">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-1">Thị trường đóng cửa</h4>
                    <h2 
                      className={`text-5xl font-black italic tracking-tighter ${
                        sessionResult.outcome === 'up' ? 'text-[#26a69a]' : 'text-[#ef5350]'
                      }`}
                      style={{ textShadow: `0 0 20px ${sessionResult.outcome === 'up' ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)'}` }}
                    >
                      {sessionResult.outcome === 'up' ? 'NẾN TĂNG' : 'NẾN GIẢM'}
                    </h2>
                  </div>

                  {/* Animated Border Line */}
                  <div className="w-full h-0.5 bg-gray-800 mt-4 overflow-hidden rounded-full">
                    <motion.div 
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ duration: 5, ease: "linear" }}
                      className={`w-full h-full ${sessionResult.outcome === 'up' ? 'bg-green-500' : 'bg-red-500'}`}
                    />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Volume chart ── */}
      <div style={{ background: '#000000', borderTop: '1px solid #0d1117' }}>
        <ResponsiveContainer width="100%" height={55}>
          <ComposedChart
            data={indexedData}
            margin={{ top: 2, right: 70, left: 0, bottom: 2 }}
          >
            <XAxis dataKey="_idx" type="number" domain={[0, indexedData.length - 1]} hide />
            <YAxis hide />
            <Bar
              dataKey="volume"
              isAnimationActive={false}
              legendType="none"
              radius={[1, 1, 0, 0]}
            >
              {indexedData.map((candle, index) => (
                <Cell
                  key={`vol-${index}`}
                  fill={candle.close >= candle.open ? '#26a69a' : '#ef5350'}
                  opacity={0.45}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Bottom stats ── */}
      <div
        className="grid grid-cols-3 gap-3 px-4 py-3"
        style={{ background: '#000', borderTop: '1px solid #0d1117' }}
      >
        {[
          { label: 'Cao 24h', value: displayData.length ? `$${Math.max(...displayData.map(d => d.high)).toFixed(2)}` : '—' },
          { label: 'Thấp 24h', value: displayData.length ? `$${Math.min(...displayData.map(d => d.low)).toFixed(2)}` : '—' },
          {
            label: 'Khối Lượng',
            value: displayData.length
              ? `${(displayData[displayData.length - 1]?.volume / 1_000_000).toFixed(2)}M`
              : '—',
          },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded p-3"
            style={{ background: '#0a0a0a', border: '1px solid #1a1a2e' }}
          >
            <p className="text-xs mb-1" style={{ color: '#576070' }}>{stat.label}</p>
            <p className="text-sm font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
