'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Plus, Edit, Trash2, Users, DollarSign, 
  Clock, TrendingUp, MapPin, X, Save, AlertCircle, LayoutDashboard, Search
} from 'lucide-react';
import { adminApi, investmentApi } from '@/lib/api';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n-context';
import { toast } from 'sonner';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useRef } from 'react';
import { Loader2, Upload } from 'lucide-react';

interface Project {
  id: number;
  name: string;
  description: string;
  location: string;
  image: string;
  minInvest: number | string;
  maxInvest: number | string;
  cycleDays: number;
  roiPercentage: number | string;
  progress: number;
  isActive: boolean;
}

interface UserInvestment {
  id: number;
  userId: number;
  amount: string;
  startDate: string;
  endDate: string;
  projectedProfit: string;
  status: string;
  project?: Project;
  user?: {
    email: string;
    fullName: string;
  };
}

export default function AdminInvestments() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [investments, setInvestments] = useState<UserInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    description: '',
    location: '',
    image: '',
    minInvest: 500,
    maxInvest: 50000,
    cycleDays: 30,
    roiPercentage: 10,
    progress: 0,
    isActive: true
  });

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const uploadData = new FormData();
    uploadData.append('image', file);

    try {
      const res = await investmentApi.uploadImage(uploadData);
      if (res.data.success) {
        setFormData(prev => ({ ...prev, image: res.data.imageUrl }));
        toast.success(t('uploadSuccess'));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('uploadError'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Auth guard
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, invRes] = await Promise.all([
        investmentApi.getProjects(),
        api.get('/investment/admin/all-investments')
      ]);
      if (projRes.data.success) {
        setProjects(projRes.data.projects || []);
      }
      setInvestments(invRes.data || []);
    } catch (error) {
      toast.error(t('errorOccurred'));
      setProjects([]);
      setInvestments([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchData();
    }
  }, [isAuthenticated, user, fetchData]);

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData(project);
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        description: '',
        location: '',
        image: '',
        minInvest: 500,
        maxInvest: 50000,
        cycleDays: 30,
        roiPercentage: 10,
        progress: 0,
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProject) {
        await api.put(`/investment/admin/projects/${editingProject.id}`, formData);
        toast.success(t('saveSuccess'));
      } else {
        await api.post('/investment/admin/projects', formData);
        toast.success(t('saveSuccess'));
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(t('saveError'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('deleteConfirm'))) return;
    try {
      await api.delete(`/investment/admin/projects/${id}`);
      toast.success(t('saveSuccess'));
      fetchData();
    } catch (error) {
      toast.error(t('errorOccurred'));
    }
  };

  if (isLoading || !isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AdminHeader />
      
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Building2 className="text-blue-500" /> {t('adminInvestTitle')}
              </h1>
              <p className="text-sm text-gray-500 uppercase font-black tracking-tighter">{t('adminInvestSubtitle')}</p>
            </div>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-black transition-all shadow-lg shadow-blue-900/20 uppercase"
          >
            <Plus size={18} /> {t('addProject')}
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-gray-800 space-y-2">
            <p className="text-[10px] text-gray-500 font-black uppercase">{t('totalProjects')}</p>
            <p className="text-3xl font-black text-white">{projects?.length || 0}</p>
          </div>
          <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-gray-800 space-y-2">
            <p className="text-[10px] text-gray-500 font-black uppercase">{t('totalCapital')}</p>
            <p className="text-3xl font-black text-green-500">
              ${investments.reduce((acc, inv) => acc + parseFloat(inv.amount), 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-gray-800 space-y-2">
            <p className="text-[10px] text-gray-500 font-black uppercase">{t('investorCount')}</p>
            <p className="text-3xl font-black text-blue-500">
              {new Set(investments.map(i => i.userId)).size}
            </p>
          </div>
          <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-gray-800 space-y-2">
            <p className="text-[10px] text-gray-500 font-black uppercase">{t('expectedPayout')}</p>
            <p className="text-3xl font-black text-red-500">
              ${investments.filter(i => i.status === 'active').reduce((acc, inv) => acc + parseFloat(inv.projectedProfit), 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Projects Table */}
        <div className="bg-[#0a0a0a] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0d0d0d]">
             <h2 className="font-bold uppercase tracking-widest text-xs">{t('activeProjectsList')}</h2>
             <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" placeholder={t('searchProject')} className="bg-black border border-gray-800 rounded-lg py-1.5 pl-9 pr-4 text-xs outline-none focus:border-blue-500" />
             </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-black/50 text-[10px] uppercase font-black text-gray-500 border-b border-gray-800">
                  <th className="p-4">{t('investmentProject')}</th>
                  <th className="p-4 text-center">{t('roi')}</th>
                  <th className="p-4 text-center">{t('cycle')}</th>
                  <th className="p-4 text-right">{t('investAmount')}</th>
                  <th className="p-4 text-center">{t('projectProgress')}</th>
                  <th className="p-4 text-right">{t('action')}</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(project => (
                  <tr key={project.id} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-gray-800">
                           <img src={project.image.startsWith('/') ? `${(process.env.NEXT_PUBLIC_API_URL || 'https://api.vi-stocks.com').replace('/api', '')}${project.image}` : project.image} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div>
                          <p className="font-bold group-hover:text-blue-500 transition-colors">{project.name}</p>
                          <p className="text-[10px] text-gray-500 flex items-center gap-1"><MapPin size={10} /> {project.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold text-green-500">{project.roiPercentage}%</td>
                    <td className="p-4 text-center text-gray-400">{project.cycleDays} {t('days')}</td>
                    <td className="p-4 text-right">
                       <p className="text-[10px] text-gray-500">Min: ${Number(project.minInvest).toLocaleString()}</p>
                       <p className="font-bold">${Number(project.maxInvest).toLocaleString()}</p>
                    </td>
                    <td className="p-4">
                       <div className="w-24 mx-auto space-y-1">
                          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-600" style={{ width: `${project.progress}%` }}></div>
                          </div>
                          <p className="text-[9px] text-center font-black text-gray-500">{project.progress}%</p>
                       </div>
                    </td>
                    <td className="p-4 text-right">
                       <div className="flex justify-end gap-2">
                          <button onClick={() => handleOpenModal(project)} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"><Edit size={16} /></button>
                          <button onClick={() => handleDelete(project.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16} /></button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Investments Monitoring */}
        <div className="bg-[#0a0a0a] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-gray-800 bg-[#0d0d0d]">
             <h2 className="font-bold uppercase tracking-widest text-xs">{t('moneyFlow')} ({investments.length})</h2>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-black/50 text-[10px] uppercase font-black text-gray-500 border-b border-gray-800">
                    <th className="p-4">{t('investor')}</th>
                    <th className="p-4">{t('investmentProject')}</th>
                    <th className="p-4 text-right">{t('capital')}</th>
                    <th className="p-4 text-right">{t('profit')}</th>
                    <th className="p-4 text-center">{t('term')}</th>
                    <th className="p-4 text-center">{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {investments.map(inv => (
                    <tr key={inv.id} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                       <td className="p-4">
                          <p className="font-bold text-white">{inv.user?.email}</p>
                          <p className="text-[10px] text-gray-500">{inv.user?.fullName}</p>
                       </td>
                       <td className="p-4">
                          <p className="font-medium text-blue-400">{inv.project?.name}</p>
                       </td>
                       <td className="p-4 text-right font-bold text-white">
                          ${parseFloat(inv.amount).toLocaleString()}
                       </td>
                       <td className="p-4 text-right font-bold text-green-500">
                          +${parseFloat(inv.projectedProfit).toLocaleString()}
                       </td>
                       <td className="p-4 text-center whitespace-nowrap">
                          <div className="text-[10px] text-gray-500">{t('endDate')}:</div>
                          <div className="font-bold text-xs">{new Date(inv.endDate).toLocaleDateString()}</div>
                       </td>
                       <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            inv.status === 'active' ? 'bg-blue-900/30 text-blue-400' : 'bg-green-900/30 text-green-500'
                          }`}>
                            {inv.status === 'active' ? t('running') : t('completed')}
                          </span>
                       </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>

      </div>

      {/* MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative bg-[#0a0a0a] border border-gray-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl scrollbar-hide"
            >
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                  <h3 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                    {editingProject ? <Edit className="text-blue-500" /> : <Plus className="text-green-500" />}
                    {editingProject ? t('updateProject') : t('addProject')}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('projectName')}</label>
                      <input 
                        required 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500" 
                        placeholder="VD: Căn hộ cao cấp..." 
                      />
                   </div>
                   <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('location')}</label>
                      <input 
                        required 
                        value={formData.location} 
                        onChange={e => setFormData({...formData, location: e.target.value})} 
                        className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500" 
                        placeholder="VD: Dubai, UAE..." 
                      />
                   </div>
                   <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('investmentAmount')}</label>
                      <div className="flex flex-col md:flex-row gap-4 items-start">
                         <div className="relative group shrink-0">
                            <div className="w-32 h-32 rounded-2xl bg-gray-900 border-2 border-dashed border-gray-800 overflow-hidden flex items-center justify-center transition-all group-hover:border-blue-500/50">
                               {formData.image ? (
                                  <img src={formData.image.startsWith('/') ? `${(process.env.NEXT_PUBLIC_API_URL || 'https://api.vi-stocks.com').replace('/api', '')}${formData.image}` : formData.image} className="w-full h-full object-cover" alt="" />
                               ) : (
                                  <Building2 size={32} className="text-gray-700" />
                               )}
                               {isUploading && (
                                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                     <Loader2 size={24} className="animate-spin text-blue-500" />
                                  </div>
                               )}
                            </div>
                         </div>
                         <div className="flex-1 space-y-3 w-full">
                            <div className="flex gap-2">
                               <input 
                                  type="text"
                                  value={formData.image} 
                                  onChange={e => setFormData({...formData, image: e.target.value})} 
                                  className="flex-1 bg-[#111] border border-gray-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500" 
                                  placeholder="Nhập URL hoặc tải ảnh lên..." 
                                />
                                <input 
                                   type="file"
                                   ref={fileInputRef}
                                   className="hidden"
                                   accept="image/*"
                                   onChange={handleFileChange}
                                />
                                <button 
                                   type="button"
                                   onClick={() => fileInputRef.current?.click()}
                                   disabled={isUploading}
                                   className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                >
                                   <Upload size={14} /> {isUploading ? t('uploading') : t('uploadImage')}
                                </button>
                            </div>
                            <p className="text-[9px] text-gray-500 italic">Khuyến nghị ảnh tỷ lệ 16:9, kích thước tối thiểu 1280x720px.</p>
                         </div>
                      </div>
                   </div>
                   <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('description')}</label>
                      <textarea 
                        rows={4}
                        required 
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                        className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500 resize-none" 
                        placeholder="Nội dung mô tả chi tiết về dự án đầu tư..." 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('minInvest')} ($)</label>
                      <input 
                        type="number" 
                        required 
                        value={formData.minInvest} 
                        onChange={e => setFormData({...formData, minInvest: e.target.value})} 
                        className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold text-blue-500" 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('maxInvest')} ($)</label>
                      <input 
                        type="number" 
                        required 
                        value={formData.maxInvest} 
                        onChange={e => setFormData({...formData, maxInvest: e.target.value})} 
                        className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold" 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('cycle')} ({t('days')})</label>
                      <input 
                        type="number" 
                        required 
                        value={formData.cycleDays} 
                        onChange={e => setFormData({...formData, cycleDays: Number(e.target.value)})} 
                        className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500" 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('roi')} (%)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required 
                        value={formData.roiPercentage} 
                        onChange={e => setFormData({...formData, roiPercentage: e.target.value})} 
                        className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-2 outline-none focus:border-blue-500 font-bold text-green-500" 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('projectProgress')} (%)</label>
                      <input 
                        type="number" 
                        required 
                        value={formData.progress} 
                        onChange={e => setFormData({...formData, progress: Number(e.target.value)})} 
                        className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500" 
                      />
                   </div>

                   <div className="flex items-end gap-3 pt-4 md:col-span-1">
                      <button 
                        type="submit" 
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2"
                      >
                         <Save size={18} /> {t('saveProject')}
                      </button>
                   </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChevronLeft(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}
