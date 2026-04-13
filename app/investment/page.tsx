'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getImageUrl, formatCurrency } from '@/lib/utils';
import { 
  Building2, MapPin, Clock, TrendingUp, ChevronRight, 
  Search, Filter, LayoutGrid, List, Info, Wallet
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n-context';
import { Header } from '@/components/Header';
import { DashboardGuard } from '@/components/DashboardGuard';
import api from '@/lib/api';
import { toast } from 'sonner';

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

const DailyProfit = ({ investment }: { investment: any }) => {
  const [profit, setProfit] = useState<number>(() => {
    return investment.accumulatedProfit ? parseFloat(investment.accumulatedProfit) : 0;
  });

  useEffect(() => {
    if (investment.status !== 'active' || !investment.project) return;
    
    const start = new Date(investment.startDate).getTime();
    const p = parseFloat(investment.amount);
    const totalRoi = parseFloat(investment.roiPercentage) / 100;
    const d = investment.project.cycleDays || 30;
    
    const r = Math.pow(1 + totalRoi, 1 / d) - 1;

    // Tính số ngày chẵn thay vì theo giây
    const now = Date.now();
    const elapsedDays = Math.min(d, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
    
    if (elapsedDays > 0) {
      const currentBalance = p * Math.pow(1 + r, elapsedDays);
      setProfit(currentBalance - p);
    }
  }, [investment]);

  return <span className="tabular-nums font-mono text-emerald-400 font-bold" style={{ textShadow: '0 0 10px rgba(52, 211, 153, 0.4)' }}>+${profit.toFixed(2)}</span>;
};

function InvestmentListingContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [userInvestments, setUserInvestments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCapital: 0, totalProfit: 0, activeCount: 0 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Đọc query param 'tab' để chuyển tab tương ứng
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'my') {
      setActiveTab('my');
    }
  }, [searchParams]);

  // Cập nhật URL nếu người dùng chuyển tab (tùy chọn để link đẹp hơn)
  const handleTabChange = (tab: 'all' | 'my') => {
    if (tab === 'my' && !isAuthenticated) {
      toast.info(t('loginRequired' as any) || 'Vui lòng đăng nhập để xem đầu tư của bạn');
      router.push('/login');
      return;
    }
    setActiveTab(tab);
    if (tab === 'my') {
      router.replace(`${pathname}?tab=my`);
    } else {
      router.replace(pathname);
    }
  };

  // Auth guard: Removed forced redirect to allow public listing view

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'all') {
          const res = await api.get('/investment/projects');
          if (res.data.success) {
            setProjects(res.data.projects);
          } else if (Array.isArray(res.data)) {
            setProjects(res.data);
          }
        } else if (isAuthenticated) {
          const res = await api.get('/investment/my-investments');
          const data = res.data.success ? res.data.investments : res.data;
          setUserInvestments(Array.isArray(data) ? data : []);
          
          // Calculate stats
          if (Array.isArray(data)) {
            const totalC = data.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
            const totalP = data.reduce((sum, inv) => sum + parseFloat(inv.projectedProfit), 0);
            setStats({
              totalCapital: totalC,
              totalProfit: totalP,
              activeCount: data.filter(inv => inv.status === 'active').length
            });
          }
        }
      } catch (err) {
        toast.error(t('errorOccurred' as any) || 'Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, t]);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #2962ff, #1565c0)' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
              <Building2 size={22} className="text-white" />
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
          <div className="max-w-7xl mx-auto space-y-8 pb-20">
              
              {/* Page Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-500 font-black text-[10px] uppercase tracking-widest">
                    <span className="w-8 h-[2px] bg-blue-500"></span>
                    {t('realEstate')}
                  </div>
                  <h1 className="text-3xl md:text-4xl font-black">{t('investmentProject')}</h1>
                  <p className="text-gray-500 text-sm max-w-2xl">
                    {t('heroSubtitle' as any) || 'Khám phá các cơ hội đầu tư bất động sản toàn cầu với lợi nhuận cam kết và chu kỳ linh hoạt.'}
                  </p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="flex p-1 bg-[#0a0a0a] border border-gray-800 rounded-2xl w-full md:w-auto">
                    <button 
                      onClick={() => handleTabChange('all')}
                      className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-black transition-all relative ${activeTab === 'all' ? 'text-white' : 'text-gray-500 hover:text-white'}`}
                    >
                      <span className="relative z-10">{t('investmentProject')}</span>
                      {activeTab === 'all' && (
                        <motion.div layoutId="tab" className="absolute inset-0 bg-blue-600 rounded-xl" />
                      )}
                    </button>
                    {isAuthenticated && (
                      <button 
                        onClick={() => handleTabChange('my')}
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-black transition-all relative ${activeTab === 'my' ? 'text-white' : 'text-gray-500 hover:text-white'}`}
                      >
                        <span className="relative z-10">{t('myInvestments')}</span>
                        {activeTab === 'my' && (
                          <motion.div layoutId="tab" className="absolute inset-0 bg-blue-600 rounded-xl" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    {activeTab === 'all' && (
                      <div className="flex flex-1 md:flex-none bg-[#0a0a0a] border border-gray-800 rounded-xl p-1 relative">
                        <button 
                          onClick={() => setViewMode('grid')}
                          className={`flex-1 md:flex-none relative z-10 p-2 rounded-lg transition-colors duration-300 ${viewMode === 'grid' ? 'text-white' : 'text-gray-500 hover:text-white'}`}
                        >
                          <LayoutGrid size={18} className="mx-auto" />
                          {viewMode === 'grid' && (
                            <motion.div 
                              layoutId="activeView"
                              className="absolute inset-0 bg-gray-800 rounded-lg -z-10"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                        </button>
                        <button 
                          onClick={() => setViewMode('list')}
                          className={`flex-1 md:flex-none relative z-10 p-2 rounded-lg transition-colors duration-300 ${viewMode === 'list' ? 'text-white' : 'text-gray-500 hover:text-white'}`}
                        >
                          <List size={18} className="mx-auto" />
                          {viewMode === 'list' && (
                            <motion.div 
                              layoutId="activeView"
                              className="absolute inset-0 bg-gray-800 rounded-lg -z-10"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                        </button>
                      </div>
                    )}
                    {activeTab === 'all' && (
                      <button 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg ${isFilterOpen ? 'bg-blue-500 text-white shadow-blue-500/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'}`}
                      >
                        <Filter size={18} /> {t('filter')}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Filter Bar */}
              <AnimatePresence>
                {activeTab === 'all' && isFilterOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input 
                          type="text"
                          placeholder={t('searchPlaceholder' as any) || 'Tìm kiếm tên dự án hoặc vị trí...'}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-[#111] border border-gray-800 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-blue-500 transition-all font-bold text-sm"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Content */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="h-[400px] bg-[#0a0a0a] border border-gray-800 rounded-2xl animate-pulse"></div>
                  ))}
                </div>
              ) : activeTab === 'all' ? (
                <>
                  <div className={viewMode === 'grid' 
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    : "flex flex-col gap-4"
                  }>
                    <AnimatePresence>
                      {filteredProjects.map((project, index) => (
                        <motion.div
                          key={project.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={viewMode === 'grid' ? { y: -8 } : { x: 8 }}
                          className={`group bg-[#0a0a0a] border border-gray-800 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer shadow-2xl relative ${viewMode === 'list' ? 'flex flex-col md:flex-row h-auto md:h-56' : 'flex flex-col'}`}
                        >
                          <Link href={`/investment/${project.id}`} className="absolute inset-0 z-10" />
                          
                          <div className={`relative overflow-hidden ${viewMode === 'list' ? 'h-56 md:h-full w-full md:w-80 shrink-0' : 'h-48'}`}>
                            <img 
                              src={getImageUrl(project.image)} 
                              alt={project.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                            <div className="absolute top-3 right-3 px-3 py-1 bg-blue-600 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-lg">
                              {t('roi')}: {parseFloat(project.roiPercentage)}%
                            </div>
                            {viewMode === 'grid' && (
                              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white/90 text-xs font-medium">
                                <MapPin size={12} className="text-blue-500" />
                                {project.location}
                              </div>
                            )}
                          </div>

                          <div className={`p-5 flex-1 flex flex-col justify-between ${viewMode === 'list' ? 'md:py-6 md:px-8' : 'gap-4'}`}>
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <h3 className={`font-bold leading-tight group-hover:text-blue-400 transition-colors ${viewMode === 'list' ? 'text-2xl' : 'text-lg'}`}>{project.name}</h3>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  {viewMode === 'list' && (
                                    <span className="flex items-center gap-1.5 text-blue-400 font-bold uppercase tracking-widest text-[10px]">
                                      <MapPin size={12} /> {project.location}
                                    </span>
                                  )}
                                   <span className="flex items-center gap-1"><Clock size={12} /> {project.cycleDays} {t('days')}</span>
                                   <span className="flex items-center gap-1"><TrendingUp size={12} /> {t('roi')}</span>
                                </div>
                              </div>

                              <div className={`space-y-2 ${viewMode === 'list' ? 'max-w-md' : ''}`}>
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                                  <span>{t('projectProgress')}</span>
                                  <span className="text-white">{project.progress}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${project.progress}%` }}
                                    className="h-full bg-blue-600"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className={`flex flex-wrap items-end justify-between gap-3 pt-4 ${viewMode === 'list' ? 'border-t border-gray-800 mt-4' : ''}`}>
                                <div className="flex gap-6">
                                  <div className="flex flex-col gap-0.5">
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest whitespace-nowrap">{t('investmentRange')}</p>
                                    <p className="font-bold text-blue-500 text-xs md:text-sm whitespace-nowrap">
                                      ${Number(project.minInvest).toLocaleString()} - ${Number(project.maxInvest).toLocaleString()}
                                    </p>
                                  </div>
                                </div>

                                 <Link href={`/investment/${project.id}`} className="relative z-20 shrink-0">
                                  <button 
                                    className={`py-3 bg-white hover:bg-blue-600 text-black hover:text-white rounded-xl text-[11px] md:text-xs font-black uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap ${viewMode === 'list' ? 'px-8' : 'px-4'}`}
                                  >
                                    {t('projectDetail')} <ChevronRight size={14} />
                                  </button>
                                 </Link>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {filteredProjects.length === 0 && (
                    <div className="py-20 text-center space-y-4 border border-dashed border-gray-800 rounded-3xl">
                      <Search size={48} className="mx-auto text-gray-800" />
                      <div>
                        <h3 className="text-xl font-bold">{t('noResults')}</h3>
                        <p className="text-gray-500 text-sm">{t('tryAnotherSearch')}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* My Investments Tab */
                <div className="space-y-8">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#0a0a0a] border border-gray-800 p-6 rounded-3xl space-y-2 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet size={48} className="text-blue-500" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{t('totalCapital' as any) || 'Tổng vốn đầu tư'}</p>
                      <h3 className="text-3xl font-black text-white">${stats.totalCapital.toLocaleString()}</h3>
                    </div>
                    <div className="bg-[#0a0a0a] border border-gray-800 p-6 rounded-3xl space-y-2 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={48} className="text-emerald-500" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{t('projectedProfit')}</p>
                      <h3 className="text-3xl font-black text-emerald-500">+${stats.totalProfit.toLocaleString()}</h3>
                    </div>
                    <div className="bg-[#0a0a0a] border border-gray-800 p-6 rounded-3xl space-y-2 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Building2 size={48} className="text-blue-500" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{t('activeInvestments')}</p>
                      <h3 className="text-3xl font-black text-white">{stats.activeCount}</h3>
                    </div>
                  </div>

                  {/* Investments List */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold">{t('myInvestments')}</h2>
                    </div>
                    
                    {userInvestments.length === 0 ? (
                      <div className="py-20 text-center space-y-4 border border-dashed border-gray-800 rounded-3xl translate-y-0 hover:-translate-y-1 transition-all">
                        <Building2 size={48} className="mx-auto text-gray-800" />
                        <div>
                          <h3 className="text-xl font-bold">{t('noResults')}</h3>
                          <p className="text-gray-500 text-sm">{t('startTrading')}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl overflow-hidden overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-800 bg-white/5">
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">{t('investmentProject')}</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">{t('capital' as any) || 'Số tiền'}</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">{t('roi')}</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-emerald-500">{t('currentProfit' as any) || 'Lãi hiện tại'}</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">{t('projectedProfit')}</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">{t('endDate')}</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">{t('status')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userInvestments.map((inv) => (
                              <tr key={inv.id} className="border-b border-gray-800 hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                  <Link href={`/investment/${inv.projectId}`} className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gray-800 overflow-hidden shrink-0">
                                      <img src={getImageUrl(inv.project?.image)} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="font-bold group-hover:text-blue-500 transition-colors">{inv.project?.name}</span>
                                  </Link>
                                </td>
                                <td className="px-6 py-4 font-black">${parseFloat(inv.amount).toLocaleString()}</td>
                                <td className="px-6 py-4 text-blue-500 font-bold">{inv.roiPercentage}%</td>
                                <td className="px-6 py-4"><DailyProfit investment={inv} /></td>
                                <td className="px-6 py-4 text-gray-500 font-bold">+${parseFloat(inv.projectedProfit).toLocaleString()}</td>
                                <td className="px-6 py-4 text-gray-400 font-mono text-xs">{new Date(inv.endDate).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-right">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                    inv.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-500'
                                  }`}>
                                    {inv.status === 'active' ? t('running') : t('completed')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </DashboardGuard>
    );
}

export default function InvestmentListing() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-sm text-[#787b86]">Loading...</p>
      </div>
    }>
      <InvestmentListingContent />
    </Suspense>
  );
}
