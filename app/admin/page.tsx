'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BarChart3, Home, TrendingUp, TrendingDown, Shuffle, Users, DollarSign, LogOut, ShieldCheck, User as UserIcon, Timer, ArrowDownCircle, CheckCircle, XCircle, Building2 } from 'lucide-react';
import { adminApi, userApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { connectSocket, getSocket } from '@/lib/socket';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n-context';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { playNotificationSound } from '@/lib/sounds';
import { useSearchParams } from 'next/navigation';

interface ApiUser {
  id: number;
  email: string;
  phone: string | null;
  fullName: string | null;
  liveBalance: number;
  isActive: boolean;
  createdAt: string;
}

interface SessionStats {
  sessionId: number;
  status: string;
  timeLeft: number;
  outcomeMode: string;
  totalCallAmount: number;
  totalPutAmount: number;
  trades: any[];
}

import UserDetail from '@/components/user-detail';

function AdminDashboardContent() {
  const { user, token, isAuthenticated, isLoading, logout } = useAuth();
  const { t, language } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [view, setView] = useState<'dashboard' | 'kyc' | 'userDetail' | 'transactions' | 'withdrawals'>('dashboard');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [pendingKYC, setPendingKYC] = useState<ApiUser[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: number; amount: number; email: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [outcomeMode, setOutcomeMode] = useState<'force_up' | 'force_down' | 'random'>('random');
  const [depositUserId, setDepositUserId] = useState('');
  const [depositAmount, setDepositAmount] = useState('1000');
  const [transactionAccountFilter, setTransactionAccountFilter] = useState<'all' | 'live'>('all');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');

  const SUPPORTED_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'LTCUSDT', 'ADAUSDT', 'XRPUSDT', 'MATICUSDT', 'DOGEUSDT', 'DOTUSDT'];

  // Auth guard
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Lấy danh sách users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await adminApi.getUsers();
      setUsers(res.data.data.users);
    } catch { /* silent */ }
    finally { setLoadingUsers(false); }
  }, []);

  const fetchPendingKYC = useCallback(async () => {
    try {
      const res = await adminApi.getPendingKYC();
      setPendingKYC(res.data.data);
    } catch { /* silent */ }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await adminApi.getTransactions(undefined);
      setTransactions(res.data.data);
    } catch { /* silent */ }
  }, [transactionAccountFilter]);

  const fetchPendingWithdrawals = useCallback(async () => {
    try {
      const res = await adminApi.getPendingWithdrawals();
      setPendingWithdrawals(res.data.data);
    } catch { /* silent */ }
  }, []);

  // Lấy session stats
  const fetchSession = useCallback(async () => {
    try {
      const res = await adminApi.getSessionStats(selectedSymbol);
      if (res.data.data) {
        setSessionStats(res.data.data);
        setOutcomeMode(res.data.data.outcomeMode);
        setTimeLeft(res.data.data.timeLeft);
      }
    } catch { /* silent */ }
  }, [selectedSymbol]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return;
    
    // Luôn fetch user và session vì chúng cơ bản
    fetchUsers();
    fetchSession();

    // Fetch dữ liệu theo view hiện tại để đảm bảo tính real-time khi chuyển tab
    if (view === 'kyc') fetchPendingKYC();
    if (view === 'transactions') fetchTransactions();
    if (view === 'withdrawals') fetchPendingWithdrawals();
    if (view === 'dashboard') {
        fetchPendingKYC();
        fetchTransactions();
        fetchPendingWithdrawals();
    }
  }, [isAuthenticated, user, view, fetchUsers, fetchSession, fetchPendingKYC, fetchTransactions, fetchPendingWithdrawals]);

  // Sync view state to URL query params
  useEffect(() => {
    if (view && view !== 'userDetail') {
        const url = new URL(window.location.href);
        if (url.searchParams.get('view') !== view) {
            url.searchParams.set('view', view);
            window.history.replaceState({}, '', url.toString());
        }
    }
  }, [view]);

  // WebSocket: nhận stats realtime từ server
  useEffect(() => {
    if (!token || user?.role !== 'admin') return;

    const socket = connectSocket(token);

    const handleSessionStats = (data: SessionStats & { symbol: string }) => {
      if (data.symbol === selectedSymbol) {
        setSessionStats(data);
        setTimeLeft(data.timeLeft);
        if (data.outcomeMode) setOutcomeMode(data.outcomeMode as any);
      }
    };

    const handleSessionTick = (data: { symbol: string; timeLeft: number }) => {
      if (data.symbol === selectedSymbol) {
        setTimeLeft(data.timeLeft);
      }
    };

    const handleOutcomeChanged = (data: { symbol: string; mode: string }) => {
      if (data.symbol === selectedSymbol) {
        setOutcomeMode(data.mode as any);
      }
    };

    const handleNewKYC = (data: any) => {
      console.log('[AdminDashboard] Refreshing KYC list due to new-kyc event');
      fetchPendingKYC(); 
    };

    const handleNewTransaction = (data: any) => {
      console.log('[AdminDashboard] Refreshing transaction list');
      fetchTransactions();
    };

    const handleNewWithdrawal = (data: any) => {
      console.log('[AdminDashboard] Refreshing withdrawal list');
      fetchPendingWithdrawals();
    };

    socket?.on('admin:session-stats', handleSessionStats);
    socket?.on('session:tick', handleSessionTick);
    socket?.on('admin:outcome-changed', handleOutcomeChanged);
    socket?.on('admin:new-kyc', handleNewKYC);
    socket?.on('admin:new-transaction', handleNewTransaction);
    socket?.on('admin:new-withdrawal', handleNewWithdrawal);

    return () => {
      socket?.off('admin:session-stats', handleSessionStats);
      socket?.off('session:tick', handleSessionTick);
      socket?.off('admin:outcome-changed', handleOutcomeChanged);
      socket?.off('admin:new-kyc', handleNewKYC);
      socket?.off('admin:new-transaction', handleNewTransaction);
      socket?.off('admin:new-withdrawal', handleNewWithdrawal);
    };
  }, [token, user, fetchPendingKYC, selectedSymbol, fetchPendingWithdrawals]);

  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam && ['dashboard', 'kyc', 'transactions', 'withdrawals'].includes(viewParam)) {
      setView(viewParam as any);
    }
  }, [searchParams]);

  // Đặt chế độ outcome qua API
  const handleSetOutcome = async (mode: 'force_up' | 'force_down' | 'random') => {
    try {
      await adminApi.setOutcome(mode, selectedSymbol);
      setOutcomeMode(mode);
      const labels: Record<string, string> = { 
        force_up: `⬆ ${t('forceUp')}`, 
        force_down: `⬇ ${t('forceDown')}`, 
        random: `🎲 ${t('random')}` 
      };
      toast.success(`${t('status')}: ${labels[mode]}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi');
    }
  };

  // Nạp tiền
  const handleDeposit = async () => {
    const uid = parseInt(depositUserId);
    const amount = parseFloat(depositAmount);
    if (!uid || !amount || amount <= 0) {
      toast.error(t('enterAmount'));
      return;
    }
    try {
      await adminApi.deposit(uid, amount);
      toast.success(`Đã nạp $${amount} vào tài khoản của User #${uid}`);
      fetchUsers();
      fetchTransactions();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi nạp tiền');
    }
  };

  // Duyệt rút tiền
  const handleApproveWithdrawal = async (txnId: number) => {
    setActionLoading(txnId);
    try {
      await adminApi.approveWithdrawal(txnId);
      toast.success('Đã duyệt yêu cầu rút tiền!');
      fetchPendingWithdrawals();
      fetchTransactions();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi duyệt giao dịch');
    } finally {
      setActionLoading(null);
    }
  };

  // Mở modal từ chối
  const openRejectModal = (txn: any) => {
    setRejectTarget({ id: txn.id, amount: txn.amount, email: txn.user?.email });
    setRejectReason('');
    setRejectModalOpen(true);
  };

  // Xác nhận từ chối
  const handleRejectWithdrawal = async () => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget.id);
    try {
      await adminApi.rejectWithdrawal(rejectTarget.id, rejectReason);
      toast.success('Đã từ chối và hoàn tiền cho người dùng!');
      setRejectModalOpen(false);
      fetchPendingWithdrawals();
      fetchTransactions();
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi từ chối giao dịch');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p style={{ color: '#787b86' }}>{t('loading')}</p>
      </div>
    );
  }

  const phase = timeLeft > 30 ? 'open' : 'locked';

  if (view === 'userDetail' && selectedUserId) {
    return <UserDetail userId={selectedUserId} onBack={() => { setView('dashboard'); setSelectedUserId(null); fetchUsers(); fetchPendingKYC(); fetchTransactions(); }} />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AdminHeader 
        currentView={view} 
        setView={setView} 
        pendingKYCCount={pendingKYC.length}
        pendingWithdrawalCount={pendingWithdrawals.length}
      />

      <main className="p-4 md:p-8 space-y-6 md:space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

          {view === 'dashboard' ? (
            <>
              {/* Symbol Switcher for Dashboard */}
              <div className="flex bg-[#0a0a0a] p-1 rounded-xl border border-[#1a1a2e] w-fit mb-4">
                {SUPPORTED_SYMBOLS.map(sym => (
                  <button
                    key={sym}
                    onClick={() => setSelectedSymbol(sym)}
                    className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${
                      selectedSymbol === sym ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {sym.replace('USDT', '')}
                  </button>
                ))}
              </div>

              {/* Row 1: Outcome control + Session stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Điều khiển kết quả */}
                <div className="rounded-xl p-6 border" style={{ background: '#0a0a0a', borderColor: '#1a1a2e' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#2d0d2d' }}>
                      <TrendingUp size={18} style={{ color: '#f59e0b' }} />
                    </div>
                    <h2 className="text-base font-semibold">{t('outcomeControl')}</h2>
                  </div>

                  {/* Current mode */}
                  <div className="mb-4 p-3 rounded-lg text-center" style={{ background: '#111', border: '1px solid #1a1a2e' }}>
                    <p className="text-xs mb-1" style={{ color: '#787b86' }}>{t('outcomeMode')}</p>
                    <p className="text-lg font-bold uppercase">
                      {outcomeMode === 'force_up' && <span style={{ color: '#26a69a' }}>⬆ {t('forceUp')}</span>}
                      {outcomeMode === 'force_down' && <span style={{ color: '#ef5350' }}>⬇ {t('forceDown')}</span>}
                      {outcomeMode === 'random' && <span style={{ color: '#f59e0b' }}>🎲 {t('random')}</span>}
                    </p>
                  </div>

                  {/* Countdown */}
                  <div className="mb-4 p-3 rounded-lg flex items-center justify-between"
                    style={{ background: '#111', border: '1px solid #1a1a2e' }}>
                    <span className="text-sm font-bold uppercase" style={{ color: '#9ca3af' }}>
                      {phase === 'open' ? t('openOrder') : t('lockedOrder')}
                    </span>
                    <span className="text-2xl font-bold" style={{ color: phase === 'open' ? '#2962ff' : '#ef5350' }}>
                      {timeLeft}s
                    </span>
                  </div>

                  {/* Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => handleSetOutcome('force_up')}
                      className="py-3 rounded-lg font-bold text-[10px] uppercase transition-all flex flex-col items-center gap-1"
                      style={{
                        background: outcomeMode === 'force_up' ? '#0d2d1a' : '#111',
                        border: `2px solid ${outcomeMode === 'force_up' ? '#26a69a' : '#1a1a2e'}`,
                        color: outcomeMode === 'force_up' ? '#26a69a' : '#787b86',
                      }}>
                      <TrendingUp size={18} />{t('forceUp')}
                    </button>
                    <button onClick={() => handleSetOutcome('force_down')}
                      className="py-3 rounded-lg font-bold text-[10px] uppercase transition-all flex flex-col items-center gap-1"
                      style={{
                        background: outcomeMode === 'force_down' ? '#2d0d0d' : '#111',
                        border: `2px solid ${outcomeMode === 'force_down' ? '#ef5350' : '#1a1a2e'}`,
                        color: outcomeMode === 'force_down' ? '#ef5350' : '#787b86',
                      }}>
                      <TrendingDown size={18} />{t('forceDown')}
                    </button>
                    <button onClick={() => handleSetOutcome('random')}
                      className="py-3 rounded-lg font-bold text-[10px] uppercase transition-all flex flex-col items-center gap-1"
                      style={{
                        background: outcomeMode === 'random' ? '#2d2d0d' : '#111',
                        border: `2px solid ${outcomeMode === 'random' ? '#f59e0b' : '#1a1a2e'}`,
                        color: outcomeMode === 'random' ? '#f59e0b' : '#787b86',
                      }}>
                      <Shuffle size={18} />{t('random')}
                    </button>
                  </div>
                </div>

                {/* Session stats */}
                <div className="rounded-xl p-6 border" style={{ background: '#0a0a0a', borderColor: '#1a1a2e' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#0d1f3c' }}>
                      <DollarSign size={18} style={{ color: '#2962ff' }} />
                    </div>
                    <h2 className="text-base font-semibold">{t('currentSession')} #{sessionStats?.sessionId ?? '—'}</h2>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#0d2d1a', border: '1px solid #1a5c2d' }}>
                      <span className="text-sm text-white font-bold uppercase">▲ {t('buy')}</span>
                      <span className="text-lg font-bold" style={{ color: '#26a69a' }}>
                        ${sessionStats?.totalCallAmount?.toFixed(2) ?? '0.00'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#2d0d2d', border: '1px solid #5c1a1a' }}>
                      <span className="text-sm text-white font-bold uppercase">▼ {t('sell')}</span>
                      <span className="text-lg font-bold" style={{ color: '#ef5350' }}>
                        ${sessionStats?.totalPutAmount?.toFixed(2) ?? '0.00'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#111', border: '1px solid #1a1a2e' }}>
                      <span className="text-sm uppercase font-bold" style={{ color: '#9ca3af' }}>{t('allTrades')}</span>
                      <span className="font-bold text-white">{sessionStats?.trades?.length ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Nạp tiền */}
              <div className="rounded-xl p-4 md:p-6 border" style={{ background: '#0a0a0a', borderColor: '#1a1a2e' }}>
                <h2 className="text-xs md:text-base font-semibold mb-4 uppercase tracking-wider">💳 {t('quickDeposit')}</h2>
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                  <div className="flex gap-4 w-full md:w-auto">
                    <div className="flex-1 md:flex-none">
                      <label className="block text-[10px] mb-1 uppercase font-bold text-gray-500">{t('userId')}</label>
                      <input
                        type="number"
                        value={depositUserId}
                        onChange={e => setDepositUserId(e.target.value)}
                        placeholder={`${t('example')}: 2`}
                        className="w-full md:w-20 px-3 py-2 rounded-lg text-sm text-white outline-none"
                        style={{ background: '#111', border: '1px solid #1a1a2e' }}
                      />
                    </div>
                    <div className="flex-1 md:flex-none">
                      <label className="block text-[10px] mb-1 uppercase font-bold text-gray-500">{t('amount')} ($)</label>
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        placeholder="1000"
                        className="w-full md:w-24 px-3 py-2 rounded-lg text-sm text-white outline-none"
                        style={{ background: '#111', border: '1px solid #1a1a2e' }}
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-auto">
                    <label className="block text-[10px] mb-1 uppercase font-bold text-gray-500">{t('account')}</label>
                    <div className="flex bg-[#111] p-1 rounded-lg border border-[#1a1a2e]">
                      <button className="w-full md:w-auto px-6 py-1 rounded-md text-[10px] uppercase font-black bg-green-600 text-white">
                        {t('liveAccount')}
                      </button>
                    </div>
                  </div>
                  {depositUserId && users.find(u => u.id.toString() === depositUserId) && (
                    <div className="w-full md:flex-1 p-2 bg-blue-600/10 border border-blue-500/30 rounded-lg">
                      <p className="text-[9px] text-blue-400 uppercase font-black">{t('recipient')}:</p>
                      <p className="text-xs md:text-sm font-bold text-white leading-tight truncate">
                        {users.find(u => u.id.toString() === depositUserId)?.email}
                      </p>
                    </div>
                  )}
                  <button onClick={handleDeposit}
                    className="w-full md:w-auto px-6 py-2 rounded-lg font-semibold text-xs md:text-sm text-white h-[38px] flex items-center justify-center whitespace-nowrap uppercase"
                    style={{ background: '#26a69a' }}>
                    {t('confirm')}
                  </button>
                </div>
              </div>

              {/* Row 3: User list */}
              <div className="rounded-xl p-6 border" style={{ background: '#0a0a0a', borderColor: '#1a1a2e' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold uppercase tracking-wider">{t('userList')} ({users.length})</h2>
                </div>
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1a1a2e' }}>
                        {['ID', 'Email', t('phoneNumber'), t('profile'), t('availableBalance'), t('status'), t('action')].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase" style={{ color: '#787b86' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-gray-900/40 cursor-pointer transition-colors"
                          onClick={() => { setSelectedUserId(u.id); setView('userDetail'); }}>
                          <td className="py-3 px-3">#{u.id}</td>
                          <td className="py-3 px-3 text-white">{u.email}</td>
                          <td className="py-3 px-3 text-gray-400">{u.phone ?? '—'}</td>
                          <td className="py-3 px-3 text-gray-400">{u.fullName ?? '—'}</td>
                          <td className="py-3 px-3 font-semibold text-green-500">${formatCurrency(u.liveBalance)}</td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${u.isActive ? 'bg-green-900/20 text-green-500' : 'bg-red-900/20 text-red-500'}`}>
                              {u.isActive ? 'Active' : 'Banned'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                             <div className="flex gap-2">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setSelectedUserId(u.id); setView('userDetail'); }}
                                 className="text-blue-500 hover:underline text-xs"
                               >
                                 Chi tiết
                               </button>
                               <button 
                                 onClick={(e) => { 
                                   e.stopPropagation(); 
                                   setDepositUserId(u.id.toString()); 
                                   window.scrollTo({ top: 0, behavior: 'smooth' });
                                   toast.info(`Đã chọn người dùng: ${u.email}`);
                                 }}
                                 className="text-green-500 hover:underline text-xs"
                               >
                                 Nạp $
                               </button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : view === 'kyc' ? (
            <div className="rounded-xl p-6 border" style={{ background: '#0a0a0a', borderColor: '#1a1a2e' }}>
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 uppercase">
                 <ShieldCheck className="text-yellow-500" /> {t('kycPending')} ({pendingKYC.length})
              </h2>
              {pendingKYC.length === 0 ? (
                <div className="py-20 text-center text-gray-500">Không có hồ sơ nào đang chờ duyệt</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingKYC.map(u => (
                    <div key={u.id} 
                      onClick={() => { setSelectedUserId(u.id); setView('userDetail'); }}
                      className="bg-[#111] border border-gray-800 rounded-xl p-5 hover:border-blue-500 cursor-pointer transition-all">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                          <UserIcon size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{u.fullName || 'User #' + u.id}</p>
                          <p className="text-[10px] text-gray-500">{u.email}</p>
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 mb-4 bg-black/40 p-2 rounded">
                         <Timer size={10} className="inline mr-1" /> Cập nhật: {new Date(u.createdAt).toLocaleString()}
                      </div>
                      <button className="w-full py-2 bg-blue-600/10 text-blue-500 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-all">
                         Kiểm tra hồ sơ
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : view === ('transactions' as any) ? (
            <div className="rounded-xl p-6 border" style={{ background: '#0a0a0a', borderColor: '#1a1a2e' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2 uppercase">
                   <DollarSign className="text-green-500" /> {t('recentTrans')}
                </h2>
                
                <div className="flex bg-[#111] p-1 rounded-lg border border-[#1a1a2e]">
                  <button 
                    className={`px-3 py-1 rounded-md text-[10px] font-black bg-green-600 text-white`}
                  >
                    Tài khoản chính (Live)
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1a1a2e' }}>
                      {[t('time'), 'User', t('amount'), t('type'), t('support')].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase" style={{ color: '#787b86' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.id} className="border-b border-[#1a1a2e]/50 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 text-gray-500 text-xs">{new Date(t.createdAt).toLocaleString()}</td>
                        <td className="py-3 px-3">
                          <div className="text-white font-medium">{t.user?.email}</div>
                          <div className="text-[10px] text-gray-500">{t.user?.fullName}</div>
                        </td>
                        <td className="py-3 px-3 font-bold text-white">${parseFloat(t.amount).toLocaleString()}</td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${t.type === 'deposit' ? 'bg-green-900/20 text-green-500' : 'bg-red-900/20 text-red-500'}`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-400 text-xs truncate max-w-[150px]">{t.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          ) : view === 'withdrawals' ? (
            <div className="rounded-xl p-6 border" style={{ background: '#0a0a0a', borderColor: '#1a1a2e' }}>
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 uppercase">
                <ArrowDownCircle className="text-blue-400" />
                {t('pendingWithdrawals')}
                <span className="ml-2 bg-blue-500/10 text-blue-400 text-xs px-2 py-0.5 rounded-full">{pendingWithdrawals.length}</span>
              </h2>

              {pendingWithdrawals.length === 0 ? (
                <div className="py-20 text-center">
                  <CheckCircle className="mx-auto mb-3 text-green-500" size={40} />
                  <p className="text-gray-500">{t('noPendingWithdrawals')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingWithdrawals.map((txn: any) => (
                    <div key={txn.id} className="bg-[#111] border border-blue-500/20 rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4">
                      {/* User Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center shrink-0">
                          <UserIcon size={20} className="text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm truncate">{txn.user?.email}</p>
                          <p className="text-[10px] text-gray-500 truncate">{txn.user?.fullName || t('notUpdated')}</p>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-center md:text-left shrink-0">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">{t('withdrawalAmount')}</p>
                        <p className="text-2xl font-black text-blue-400">${parseFloat(txn.amount).toLocaleString()}</p>
                      </div>

                      {/* Bank Info */}
                      <div className="flex-1 bg-black/30 rounded-lg p-3 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Building2 size={12} className="text-blue-400" />
                          <span className="text-[10px] text-gray-500 uppercase font-bold">{t('bankInfoShort')}</span>
                        </div>
                        <p className="text-xs text-white font-semibold">{txn.user?.bankName || '—'}</p>
                        <p className="text-xs text-gray-400">{txn.user?.bankAccount || '—'}</p>
                        <p className="text-[10px] text-gray-500">{txn.user?.bankBranch || ''}</p>
                      </div>

                      {/* Time */}
                      <div className="text-[10px] text-gray-600 shrink-0">
                        <Timer size={10} className="inline mr-1" />
                        {new Date(txn.createdAt).toLocaleString()}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleApproveWithdrawal(txn.id)}
                          disabled={actionLoading === txn.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white border border-green-600/40 rounded-lg font-bold text-xs uppercase transition-all disabled:opacity-50"
                        >
                          <CheckCircle size={14} />
                          {actionLoading === txn.id ? t('processing') : t('approve')}
                        </button>
                        <button
                          onClick={() => openRejectModal(txn)}
                          disabled={actionLoading === txn.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/40 rounded-lg font-bold text-xs uppercase transition-all disabled:opacity-50"
                        >
                          <XCircle size={14} />
                          {t('reject')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </motion.div>
      </main>

      {/* Reject Modal */}
      {rejectModalOpen && rejectTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">{t('reject')}</h3>
            <p className="text-sm text-gray-400 mb-4">
              <span className="text-white font-semibold">{rejectTarget.email}</span> — 
              <span className="text-blue-400 font-bold">${parseFloat(rejectTarget.amount as any).toLocaleString()}</span>
            </p>
            <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">{t('rejectReason')}</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder={t('rejectPlaceholder')}
              rows={3}
              className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-white outline-none focus:border-red-500 transition-all resize-none mb-4"
            />
            <p className="text-[10px] text-blue-300/80 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
              ⚠ {t('refundNote')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold text-sm transition-all"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleRejectWithdrawal}
                disabled={actionLoading !== null}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all"
              >
                {actionLoading !== null ? t('processing') : t('confirmReject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p style={{ color: '#787b86' }}>Loading...</p>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
