'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, MapPin, Clock, TrendingUp, ChevronLeft, 
  Wallet, ShieldCheck, CheckCircle2, AlertCircle, Info, CalendarClock, LayoutDashboard
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n-context';
import { Header } from '@/components/Header';
import api from '@/lib/api';
import { DashboardGuard } from '@/components/DashboardGuard';
import { toast } from 'sonner';
import { formatCurrency, getImageUrl } from '@/lib/utils';

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
}

export default function InvestmentDetail() {
  const { id } = useParams();
  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  const { t } = useTranslation();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [amount, setAmount] = useState<string>('');
  const [agreed, setAgreed] = useState(false);
  const [investing, setInvesting] = useState(false);
  
  const router = useRouter();

  // Moved auth check to investment action for a more professional public-view experience

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await api.get(`/investment/projects/${id}`);
        setProject(res.data);
        setAmount(String(res.data.minInvest)); // Default to min
      } catch (err) {
        toast.error(t('errorProjectLoad'));
        router.push('/investment');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProject();
  }, [id, router]);

  const projectedProfit = useMemo(() => {
    if (!project || !amount) return 0;
    const amt = parseFloat(amount);
    if (isNaN(amt)) return 0;
    return (amt * parseFloat(project.roiPercentage)) / 100;
  }, [project, amount]);

  const totalReturn = useMemo(() => {
    if (!amount) return 0;
    const amt = parseFloat(amount);
    if (isNaN(amt)) return 0;
    return amt + projectedProfit;
  }, [amount, projectedProfit]);

  const handleInvest = async () => {
    if (!isAuthenticated) {
      toast.info(t('loginRequired'));
      router.push('/login');
      return;
    }
    if (!project || !user) return;
    const investAmt = parseFloat(amount);
    
    if (investAmt < parseFloat(project.minInvest)) {
      return toast.error(`${t('minInvest')}: $${Number(project.minInvest).toLocaleString()}`);
    }
    if (investAmt > parseFloat(project.maxInvest)) {
      return toast.error(`${t('maxInvest')}: $${Number(project.maxInvest).toLocaleString()}`);
    }
    if (investAmt > user.liveBalance) {
      return toast.error(t('insufficientBalance'));
    }
    if (!agreed) {
      return toast.error(t('agreeTermsError'));
    }

    setInvesting(true);
    try {
      await api.post('/investment/invest', {
        projectId: project.id,
        amount: investAmt
      });
      toast.success(t('investmentSuccess'));
      await refreshUser();
      router.push('/investment');
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('investmentFailed'));
    } finally {
      setInvesting(false);
    }
  };

  if (authLoading || loading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600/20">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
              <Building2 size={22} className="text-blue-500" />
            </motion.div>
          </div>
          <p className="text-sm text-[#787b86]">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardGuard>
      <div className="min-h-screen bg-[#000000] text-white flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-8 pb-12">
              
              {/* Back Button */}
              <button 
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm font-bold bg-[#0a0a0a] px-4 py-2 rounded-xl border border-gray-800"
              >
                <ChevronLeft size={18} /> {t('back')}
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Project Details */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Hero Image */}
                  <div className="relative h-[300px] md:h-[450px] rounded-3xl overflow-hidden border border-gray-800">
                     <img 
                        src={getImageUrl(project.image)} 
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                      <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 space-y-2">
                         <div className="flex items-center gap-2 text-blue-400 text-sm font-black uppercase tracking-widest">
                           <MapPin size={16} /> {project.location}
                         </div>
                         <h1 className="text-3xl md:text-5xl font-black">{project.name}</h1>
                      </div>
                  </div>

                  {/* Description */}
                  <div className="bg-[#0a0a0a] rounded-3xl p-6 md:p-8 border border-gray-800 space-y-4">
                     <h2 className="text-xl font-bold flex items-center gap-3">
                       <Info className="text-blue-500" /> {t('projectDetail')}
                     </h2>
                     <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                       {project.description}
                     </p>
                  </div>

                  {/* Features / Specs Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-gray-800 flex flex-col gap-1 shadow-lg">
                      <Clock size={20} className="text-blue-500 mb-2" />
                      <span className="text-[10px] text-gray-500 font-bold uppercase">{t('cycle')}</span>
                      <span className="font-bold text-lg">{project.cycleDays} {t('days')}</span>
                    </div>
                    <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-gray-800 flex flex-col gap-1 shadow-lg">
                      <TrendingUp size={20} className="text-green-500 mb-2" />
                      <span className="text-[10px] text-gray-500 font-bold uppercase">{t('roi')}</span>
                      <span className="font-bold text-lg">{parseFloat(project.roiPercentage)}%</span>
                    </div>
                    <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-gray-800 flex flex-col gap-1 shadow-lg">
                      <CheckCircle2 size={20} className="text-yellow-500 mb-2" />
                      <span className="text-[10px] text-gray-500 font-bold uppercase">{t('projectProgress')}</span>
                      <span className="font-bold text-lg">{project.progress}%</span>
                    </div>
                    <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-gray-800 flex flex-col gap-1 shadow-lg">
                      <ShieldCheck size={20} className="text-emerald-500 mb-2" />
                      <span className="text-[10px] text-gray-500 font-bold uppercase">{t('insurance')}</span>
                      <span className="font-bold text-lg">100%</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Investment Form */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl p-6 md:p-8 space-y-6 sticky top-24 shadow-2xl">
                     <div className="flex justify-between items-center">
                       <h3 className="font-bold text-xl">{t('investNow')}</h3>
                       <div className="flex flex-col items-end">
                         <span className="text-[10px] text-gray-500 font-bold uppercase leading-tight">{t('availableBalance')}</span>
                         <span className="text-blue-500 font-black">
                           {isAuthenticated ? `$${Number(user?.liveBalance).toLocaleString()}` : t('loginToView' as any) || 'Đăng nhập để xem'}
                         </span>
                       </div>
                     </div>

                     {/* Amount Input */}
                     <div className="space-y-3">
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('amount')} (USD)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                          <input 
                            type="number" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-[#111] border border-gray-800 rounded-xl py-4 pl-8 pr-4 outline-none focus:border-blue-500 transition-all font-bold text-lg"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 font-bold px-1">
                          <span>Min: ${Number(project.minInvest).toLocaleString()}</span>
                          <span>Max: ${Number(project.maxInvest).toLocaleString()}</span>
                        </div>
                     </div>

                     {/* Calculations */}
                     <div className="space-y-4 p-5 bg-[#0d0d0d] rounded-2xl border border-gray-800/50">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">{t('projectedProfit')}</span>
                          <span className="text-green-500 font-bold">+$ {projectedProfit.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">{t('cycle')}</span>
                          <span className="font-bold">{project.cycleDays} {t('days')}</span>
                        </div>
                        <div className="h-px bg-gray-800 my-1"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold">{t('totalReturn')}</span>
                          <span className="text-blue-500 font-black text-xl">${totalReturn.toLocaleString()}</span>
                        </div>
                     </div>

                     {/* ROI Timeline info */}
                     <div className="flex items-start gap-3 p-4 bg-blue-600/5 rounded-2xl border border-blue-500/10 text-xs">
                        <CalendarClock size={16} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-gray-400 leading-relaxed">
                          {t('investmentNote')}
                        </p>
                     </div>

                     {/* Agreement */}
                     <div className="flex items-start gap-3 group cursor-pointer select-none" onClick={() => setAgreed(!agreed)}>
                        <div className={`mt-0.5 shrink-0 w-5 h-5 rounded border ${agreed ? 'bg-blue-600 border-blue-600' : 'border-gray-700 bg-transparent'} flex items-center justify-center transition-all`}>
                          {agreed && <CheckCircle2 size={12} className="text-white" />}
                        </div>
                        <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors leading-relaxed">
                          {t('termsAgreed')}
                        </span>
                     </div>

                     {/* Submit Button */}
                     <button 
                      disabled={!agreed || investing}
                      onClick={handleInvest}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2"
                     >
                       {investing ? t('loading') : t('confirmInvest')}
                     </button>

                     <div className="flex justify-center items-center gap-2 text-emerald-500/50 text-[10px] font-black uppercase tracking-tighter">
                        <ShieldCheck size={12} /> {t('securePayment')}
                     </div>
                  </div>
                </div>

              </div>

            </div>
          </main>
        </div>
      </DashboardGuard>
    );
  }
