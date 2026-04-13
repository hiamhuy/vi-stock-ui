'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n-context';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User as UserIcon, 
  CreditCard, 
  Building2, 
  Lock, 
  CheckCircle2, 
  Timer,
  Upload,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { playNotificationSound } from '@/lib/sounds';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';


export default function KYCOnboarding() {
  const { user, logout, refreshUser } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const currentStep = user?.onboardingStep || 1;
  const kycStatus = user?.kycStatus || 'unverified';

  // Lắng nghe duyệt KYC real-time
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleKYCUpdate = (data: { status: string, message: string }) => {
      if (data.status === 'verified') {
        toast.success(data.message, { icon: <CheckCircle2 className="text-green-500" /> });
      } else {
        toast.error(data.message, { icon: <AlertCircle className="text-red-500" /> });
      }
      playNotificationSound();
      refreshUser(); // Sync local state with server
    };

    socket.on('kyc:status', handleKYCUpdate);
    return () => {
      socket.off('kyc:status', handleKYCUpdate);
    };
  }, [refreshUser]);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    address: user?.address || '',
    idNumber: user?.idNumber || '',
    bankName: user?.bankName || '',
    bankAccount: user?.bankAccount || '',
    bankBranch: user?.bankBranch || '',
    tradingPassword: '',
  });

  const [files, setFiles] = useState<{ idFront: File | null; idBack: File | null }>({
    idFront: null,
    idBack: null
  });

  const handleUpdateStep = async (step: number, data: any) => {
    setLoading(true);
    try {
      await api.patch('/user/onboarding', { step, data });
      toast.success(t('infoSaved'));
      await refreshUser(); // Update global user state
      if (step === 4) {
        toast.success(t('profileCompleteSuccess'));
        router.push('/');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleUploadKYC = async () => {
    if (!files.idFront || !files.idBack) {
      toast.error(t('selectBothSides'));
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('idFront', files.idFront);
    formData.append('idBack', files.idBack);

    try {
      await api.post('/user/kyc-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(t('kycSubmitted'));
      await refreshUser();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { title: t('stepInfo'), icon: UserIcon },
    { title: t('stepId'), icon: CreditCard },
    { title: t('stepBank'), icon: Building2 },
    { title: t('stepSecurity'), icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
      <div className="max-w-xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">{t('completeProfile')}</h1>
          <p className="text-gray-400">{t('onboardingSubtitle')}</p>
        </div>

        {/* Stepper */}
        <div className="flex justify-between mb-12 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-800 -translate-y-1/2 z-0" />
          {steps.map((step, idx) => {
            const stepNum = idx + 1;
            const isActive = currentStep === stepNum;
            const isDone = currentStep > stepNum;
            const Icon = step.icon;

            return (
              <div key={idx} className="relative z-10 flex flex-col items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 scale-110 shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 
                    isDone ? 'bg-green-600' : 'bg-gray-800'
                  }`}
                >
                  {isDone ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                </div>
                <span className={`text-[10px] mt-2 font-medium ${isActive ? 'text-blue-500' : 'text-gray-500'}`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <UserIcon className="text-blue-500" /> {t('personalInfoTitle')}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">{t('fullName')}</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#111] border border-gray-800 rounded-lg p-3 outline-none focus:border-blue-500"
                      value={formData.fullName}
                      onChange={e => setFormData({...formData, fullName: e.target.value})}
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">{t('addressLabel')}</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#111] border border-gray-800 rounded-lg p-3 outline-none focus:border-blue-500"
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      placeholder={t('addressPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">{t('idNumberLabel')}</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#111] border border-gray-800 rounded-lg p-3 outline-none focus:border-blue-500"
                      value={formData.idNumber}
                      onChange={e => setFormData({...formData, idNumber: e.target.value})}
                      placeholder="0123456789"
                    />
                  </div>
                  <button 
                    onClick={() => handleUpdateStep(1, formData)}
                    disabled={loading || !formData.fullName || !formData.address || !formData.idNumber}
                    className="w-full bg-blue-600 hover:bg-blue-700 p-4 rounded-xl font-bold flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
                  >
                    {t('nextStep')} <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <CreditCard className="text-blue-500" /> {t('verifyIDTitle')}
                </h3>
                
                {kycStatus === 'pending' ? (
                  <div className="text-center py-10">
                    <Timer size={60} className="mx-auto text-yellow-500 mb-4 animate-pulse" />
                    <h4 className="text-lg font-bold">{t('pendingApproval')}</h4>
                    <p className="text-gray-400 text-sm mt-2">{t('pendingKYCDesc')}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                     {kycStatus === 'rejected' && (
                      <div className="bg-red-900/20 border border-red-900/50 p-3 rounded-lg flex items-center gap-3 text-red-500 text-xs text-center">
                        <AlertCircle size={16} /> {t('kycRejectedDesc')}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs text-gray-500">{t('idFrontLabel')}</label>
                        <label className="relative h-40 border-2 border-dashed border-gray-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-all overflow-hidden group">
                          <input type="file" accept="image/*" className="hidden" onChange={e => setFiles({...files, idFront: e.target.files?.[0] || null})} />
                          {files.idFront ? (
                            <>
                              <img 
                                src={URL.createObjectURL(files.idFront)} 
                                className="w-full h-full object-cover" 
                                alt="Front Preview" 
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="text-[10px] text-white bg-blue-600 px-2 py-1 rounded">{t('changePhoto')}</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload size={24} className="text-gray-600" />
                              <span className="text-[10px] text-gray-500 uppercase tracking-widest">{t('selectPhoto')}</span>
                            </div>
                          )}
                        </label>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-gray-500">{t('idBackLabel')}</label>
                        <label className="relative h-40 border-2 border-dashed border-gray-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-all overflow-hidden group">
                          <input type="file" accept="image/*" className="hidden" onChange={e => setFiles({...files, idBack: e.target.files?.[0] || null})} />
                          {files.idBack ? (
                            <>
                              <img 
                                src={URL.createObjectURL(files.idBack)} 
                                className="w-full h-full object-cover" 
                                alt="Back Preview" 
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="text-[10px] text-white bg-blue-600 px-2 py-1 rounded">{t('changePhoto')}</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload size={24} className="text-gray-600" />
                              <span className="text-[10px] text-gray-500 uppercase tracking-widest">{t('selectPhoto')}</span>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                    <button 
                      onClick={handleUploadKYC}
                      disabled={loading || !files.idFront || !files.idBack}
                      className="w-full bg-blue-600 hover:bg-blue-700 p-4 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                      {t('submitForReview')} <ArrowRight size={18} />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Building2 className="text-blue-500" /> {t('bankAccountTitle')}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">{t('bankNameLabel')}</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#111] border border-gray-800 rounded-lg p-3 outline-none focus:border-blue-500"
                      value={formData.bankName}
                      onChange={e => setFormData({...formData, bankName: e.target.value})}
                      placeholder="Vietcombank"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">{t('bankAccountLabel')}</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#111] border border-gray-800 rounded-lg p-3 outline-none focus:border-blue-500"
                      value={formData.bankAccount}
                      onChange={e => setFormData({...formData, bankAccount: e.target.value})}
                      placeholder="0123456789"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">{t('bankBranchLabel')}</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#111] border border-gray-800 rounded-lg p-3 outline-none focus:border-blue-500"
                      value={formData.bankBranch}
                      onChange={e => setFormData({...formData, bankBranch: e.target.value})}
                      placeholder="Hà Nội"
                    />
                  </div>
                  <button 
                    onClick={() => handleUpdateStep(3, formData)}
                    disabled={loading || !formData.bankName || !formData.bankAccount}
                    className="w-full bg-blue-600 hover:bg-blue-700 p-4 rounded-xl font-bold flex items-center justify-center gap-2 mt-6"
                  >
                    {t('nextStep')} <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Lock className="text-blue-500" /> {t('tradingPassTitle')}
                </h3>
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 bg-blue-900/20 p-3 rounded-lg border border-blue-900/50">
                    {t('tradingPassDesc')}
                  </p>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">{t('setTradingPass')}</label>
                    <input 
                      type="password" 
                      maxLength={6}
                      className="w-full bg-[#111] border border-gray-800 rounded-lg p-3 text-2xl tracking-[1em] text-center outline-none focus:border-blue-500"
                      value={formData.tradingPassword}
                      onChange={e => setFormData({...formData, tradingPassword: e.target.value})}
                      placeholder="******"
                    />
                  </div>
                  <button 
                    onClick={() => handleUpdateStep(4, formData)}
                    disabled={loading || formData.tradingPassword.length < 4}
                    className="w-full bg-blue-600 hover:bg-blue-700 p-4 rounded-xl font-bold flex items-center justify-center gap-2 mt-6"
                  >
                    {t('completeProfileBtn')} <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout button */}
        <button 
          onClick={logout}
          className="mt-8 text-gray-600 text-sm hover:text-red-500 transition-colors block mx-auto"
        >
          {t('logoutBtn')}
        </button>
      </div>
    </div>
  );
}
