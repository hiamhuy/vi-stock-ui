'use client';
import axios from 'axios';

import { Header } from '@/components/Header';
import { useTranslation } from '@/lib/i18n-context';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Shield, Zap, Globe, ArrowRight, Building2, Timer, TrendingUp, Wallet, ChevronRight, X, Info, Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useState, useEffect } from 'react';
import { formatCurrency, getImageUrl } from '@/lib/utils';
import { investmentApi } from '@/lib/api';

const COIN_CONFIG: Record<string, any> = {
  'BTCUSDT': { name: 'Bitcoin', symbol: 'BTC', icon: '₿', color: '#f7931a' },
  'ETHUSDT': { name: 'Ethereum', symbol: 'ETH', icon: 'Ξ', color: '#627eea' },
  'SOLUSDT': { name: 'Solana', symbol: 'SOL', icon: 'S', color: '#14f195' },
  'BNBUSDT': { name: 'BNB', symbol: 'BNB', icon: 'B', color: '#f3ba2f' },
  'XRPUSDT': { name: 'Ripple', symbol: 'XRP', icon: 'X', color: '#23292f' },
  'ADAUSDT': { name: 'Cardano', symbol: 'ADA', icon: 'A', color: '#0033ad' },
  'DOGEUSDT': { name: 'Dogecoin', symbol: 'DOGE', icon: 'D', color: '#c2a633' },
  'DOTUSDT': { name: 'Polkadot', symbol: 'DOT', icon: 'P', color: '#e6007a' },
  'LTCUSDT': { name: 'Litecoin', symbol: 'LTC', icon: 'L', color: '#345d9d' },
  'MATICUSDT': { name: 'Polygon', symbol: 'MATIC', icon: 'M', color: '#8247e5' },
};

const SYMBOLS = Object.keys(COIN_CONFIG);

interface Project {
  id: number;
  name: string;
  description: string;
  location: string;
  image: string;
  minInvest: string;
  maxInvest: string;
  cycleDays: number;
  roiPercentage: string;
  progress: number;
  isActive: boolean;
}

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [coins, setCoins] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCoinLoading, setIsCoinLoading] = useState(true);

  // Fetch real crypto prices from Binance
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const symbolsJson = JSON.stringify(SYMBOLS);
        const response = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsJson}`);
        
        const dynamicCoins = response.data.map((item: any) => {
          const config = COIN_CONFIG[item.symbol];
          return {
            ...config,
            fullSymbol: item.symbol,
            price: parseFloat(item.lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
            change: (parseFloat(item.priceChangePercent) >= 0 ? '+' : '') + parseFloat(item.priceChangePercent).toFixed(2) + '%'
          };
        });
        
        setCoins(dynamicCoins);
      } catch (error) {
        console.error('Error fetching coin prices:', error);
      } finally {
        setIsCoinLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 15000); // 15s/lần
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await investmentApi.getProjects();
        if (response.data.success) {
          setProjects(response.data.projects.filter((p: Project) => p.isActive));
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Using standardized helpers from @/lib/utils

  return (
    <div className="min-h-screen bg-black text-white flex flex-col selection:bg-blue-500 selection:text-white">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] pointer-events-none">
            <div className="absolute top-[-100px] left-[-200px] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute top-[100px] right-[-200px] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[140px] animate-pulse delay-700" />
          </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center max-w-4xl mx-auto mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-8 uppercase tracking-widest">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  {t('heroTag')}
                </div>
                
                <h1 className="text-5xl md:text-7xl font-black mb-8 leading-[1.1] tracking-tight">
                  {t('heroTitle').split(' ').slice(0, 3).join(' ')} <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-blue-400 to-emerald-400">
                    {t('heroTitle').split(' ').slice(3).join(' ')}
                  </span>
                </h1>
                
                <p className="text-lg md:text-xl text-gray-400 mb-10 leading-relaxed font-medium">
                  {t('heroSubtitle')}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/trade?symbol=BTCUSDT">
                    <Button size="lg" className="h-14 px-8 bg-blue-600 hover:bg-blue-500 text-white text-base font-bold rounded-2xl group transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/20">
                      {isAuthenticated ? t('goToTrading') : t('startTrading')} <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  {!isAuthenticated && (
                    <Link href="/login">
                      <Button size="lg" variant="outline" className="h-14 px-8 border-gray-800 bg-white/5 hover:bg-white/10 hover:border-gray-700 text-white text-base font-bold rounded-2xl transition-all">
                        {t('registerAccount')}
                      </Button>
                    </Link>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Impactful Live Markets Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 pb-12">
              {isCoinLoading ? (
                 [...Array(10)].map((_, i) => (
                    <div key={i} className="h-40 rounded-[2.5rem] bg-white/5 animate-pulse border border-white/10" />
                 ))
              ) : (
                coins.map((coin, i) => (
                  <Link key={coin.fullSymbol} href={`/trade?symbol=${coin.fullSymbol}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ y: -8, scale: 1.02 }}
                      className="relative p-6 rounded-[2.5rem] border border-white/10 bg-[#0a0a0a] overflow-hidden group cursor-pointer shadow-2xl transition-all"
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500" style={{ background: `radial-gradient(circle at center, ${coin.color}, transparent)` }} />
                      <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold transition-all group-hover:scale-110 shadow-lg" style={{ background: `${coin.color}20`, color: coin.color }}>{coin.icon}</div>
                        <div className={`text-[11px] font-black px-3 py-1 rounded-full shadow-sm ${coin.change.startsWith('+') ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-red-500/20 text-red-400 border border-red-500/20'}`}>{coin.change}</div>
                      </div>
                      <div className="relative z-10">
                        <h3 className="text-[11px] text-gray-500 font-black uppercase tracking-[0.2em] mb-1 group-hover:text-gray-300 transition-colors">{coin.name}</h3>
                        <div className="text-2xl font-black text-white leading-none tracking-tight">${coin.price}</div>
                      </div>
                    </motion.div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>

        {/* New Investment Projects Section */}
        <section id="investment" className="py-32 bg-[#050505] relative overflow-hidden">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
           
           <div className="max-w-7xl mx-auto px-6 relative z-10">
              <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
                 <div className="max-w-2xl">
                    <h2 className="text-4xl md:text-5xl font-black mb-6 uppercase tracking-tight">
                       {t('realEstate')} <span className="text-blue-500">{t('premiumFeatures')}</span>
                    </h2>
                    <p className="text-gray-400 text-lg font-medium leading-relaxed">
                       {t('heroSubtitle')}
                    </p>
                 </div>
              </div>

              {isLoading ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                       <div key={i} className="h-[400px] rounded-[2.5rem] bg-white/5 animate-pulse border border-white/10" />
                    ))}
                 </div>
              ) : (
                 <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {projects.slice(0, 6).map((project, i) => (
                       <motion.div
                          key={project.id}
                          initial={{ opacity: 0, y: 30 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.1 }}
                          className="group bg-[#0d0d0d] rounded-[2.5rem] border border-white/10 overflow-hidden hover:border-blue-500/30 transition-all hover:shadow-2xl hover:shadow-blue-500/10"
                       >
                          <div className="relative h-64 overflow-hidden">
                             <img src={getImageUrl(project.image)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={project.name} />
                             <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full">
                                <span className="text-emerald-400 text-sm font-black tracking-widest">+{project.roiPercentage}% ROI</span>
                             </div>
                          </div>
                          
                          <div className="p-8">
                             <div className="flex items-center gap-2 mb-3">
                                <Building2 size={14} className="text-blue-500" />
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">{project.location}</span>
                             </div>
                             <h3 className="text-2xl font-black mb-4 group-hover:text-blue-500 transition-colors">{project.name}</h3>
                             
                             <div className="grid grid-cols-2 gap-6 mb-8">
                                <div>
                                   <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t('minInvest')}</p>
                                   <p className="text-lg font-black text-white">${parseFloat(project.minInvest).toLocaleString()}</p>
                                </div>
                                <div>
                                   <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t('cycle')}</p>
                                   <p className="text-lg font-black text-white">{project.cycleDays} {t('days')}</p>
                                </div>
                             </div>

                             <div className="flex gap-3 mt-auto">
                                <Link href={`/investment/${project.id}`} className="flex-1">
                                   <Button 
                                      className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 rounded-2xl transition-all hover:scale-[1.02]"
                                   >
                                      {t('projectDetail')}
                                   </Button>
                                </Link>
                             </div>
                          </div>
                       </motion.div>
                    ))}
                  </div>
                  
                  <motion.div 
                     initial={{ opacity: 0, y: 20 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true }}
                     transition={{ delay: 0.2 }}
                     className="mt-20 flex justify-center"
                  >
                     <Link href="/investment" className="z-20">
                        <Button className="px-12 h-16 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] text-sm rounded-2xl shadow-2xl shadow-blue-600/20 group transition-all">
                           {t('viewAllProjects')}
                           <ChevronRight size={20} className="ml-3 group-hover:translate-x-1 transition-transform" />
                        </Button>
                     </Link>
                    </motion.div>
                  </>
               )}
           </div>
        </section>

        {/* Stats Bar */}
        <section className="py-24 bg-zinc-950/20">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-16 px-12 rounded-[3.5rem] border border-white/10 bg-white/[0.02] backdrop-blur-3xl shadow-2xl">
              {[
                { label: t('tradeVolume'), val: '$2.5B+' },
                { label: t('users'), val: '500K+' },
                { label: t('onlineSupport'), val: '24/7' },
                { label: t('orderSpeed'), val: '0.01s' },
              ].map((s, i) => (
                <div key={i}>
                  <div className="text-3xl font-black text-white mb-2">{s.val}</div>
                  <div className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-32 bg-black relative">
          <div className="max-w-7xl mx-auto px-6 text-center mb-20">
            <h2 className="text-4xl font-black mb-6 uppercase tracking-tight">{t('premiumFeatures')}</h2>
            <div className="w-24 h-1.5 bg-gradient-to-r from-blue-600 to-emerald-500 mx-auto rounded-full" />
          </div>
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
            {[ { icon: Zap, title: t('feature1Title'), desc: t('feature1Desc') }, { icon: Shield, title: t('feature2Title'), desc: t('feature2Desc') }, { icon: Globe, title: t('feature3Title'), desc: t('feature3Desc') } ].map((f, i) => (
              <div key={i} className="p-10 rounded-[3rem] border border-white/5 bg-white/[0.02] hover:border-blue-500/20 transition-all group relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-blue-600/5 rounded-full blur-2xl group-hover:bg-blue-600/10 transition-all" />
                <div className="w-16 h-16 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 mb-8 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg"><f.icon size={32} /></div>
                <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>


      {/* Footer */}
      <footer className="py-16 border-t border-white/5 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8 text-gray-500 text-sm font-medium">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><BarChart3 size={18} className="text-white" /></div>
            <span className="font-black text-lg text-white tracking-tight">BR</span>
            <span className="ml-4 opacity-50">© 2026 BR Inc. All rights reserved.</span>
          </div>
          <div className="flex gap-10">
            <Link href="#" className="hover:text-white transition-colors">{t('terms')}</Link>
            <Link href="#" className="hover:text-white transition-colors">{t('privacy')}</Link>
            <Link href="#" className="hover:text-white transition-colors">{t('contact')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
