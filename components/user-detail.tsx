'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User as UserIcon, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Wallet, 
  History as HistoryIcon,
  CreditCard,
  Building2,
  Lock,
  Mail,
  MapPin,
  IdCard,
  Eye,
  EyeOff,
  Trash2,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';

interface UserDetailProps {
  userId: number;
  onBack: () => void;
}

export default function UserDetail({ userId, onBack }: UserDetailProps) {
  const [data, setData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [showTradePass, setShowTradePass] = useState(false);
  const [accountFilter, setAccountFilter] = useState<'all' | 'live'>('all');

  useEffect(() => {
    fetchDetail();
  }, [userId, accountFilter]);

  const fetchDetail = async () => {
    try {
      const [resDetail, resTrans] = await Promise.all([
        adminApi.getUserDetail(userId),
        adminApi.getTransactions(userId)
      ]);
      setData(resDetail.data.data);
      setTransactions(resTrans.data.data);
    } catch (err: any) {
      toast.error('Lỗi tải chi tiết user');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await adminApi.approveKYC(userId);
      toast.success('Đã duyệt định danh!');
      fetchDetail();
    } catch (err) {
      toast.error('Lỗi khi duyệt');
    }
  };

  const handleReject = async () => {
    const reason = prompt('Lý do từ chối:');
    if (!reason) return;
    try {
      await adminApi.rejectKYC(userId, reason);
      toast.success('Đã từ chối định danh');
      fetchDetail();
    } catch (err) {
      toast.error('Lỗi khi từ chối');
    }
  };

  const handleDelete = async () => {
    const confirm = window.confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN người dùng ${profile.email}? \nHành động này KHÔNG THỂ hoàn tác và tất cả dữ liệu liên quan sẽ bị xóa sạch.`);
    if (!confirm) return;

    try {
      const res = await adminApi.deleteUser(userId);
      if (res.data.success) {
        toast.success(res.data.message);
        onBack(); // Quay lại danh sách sau khi xóa thành công
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa người dùng');
    }
  };

  if (loading) return <div className="p-10 text-center">Đang tải...</div>;
  if (!data) return <div className="p-10 text-center">Không thấy dữ liệu</div>;

  const { profile, stats } = data;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
        <ArrowLeft size={20} /> Quay lại danh sách
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                <UserIcon size={40} />
              </div>
              <h2 className="text-xl font-bold">{profile.fullName || 'Chưa đặt tên'}</h2>
              <p className="text-gray-500 text-sm">{profile.email}</p>
              {profile.phone && (
                 <div className="flex items-center gap-1.5 text-blue-400 text-xs mt-1">
                   <Phone size={10} />
                   <span>{profile.phone}</span>
                 </div>
               )}
              
              <div className="mt-4 flex gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold ${
                  profile.kycStatus === 'verified' ? 'bg-green-900/40 text-green-500' :
                  profile.kycStatus === 'pending' ? 'bg-yellow-900/40 text-yellow-500' :
                  'bg-gray-800 text-gray-500'
                }`}>
                  {profile.kycStatus === 'verified' ? 'Đã duyệt' : 
                   profile.kycStatus === 'pending' ? 'Chờ duyệt' : 'Chưa định danh'}
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-900/40 text-blue-500 text-[10px] uppercase font-bold">
                  BƯỚC {profile.onboardingStep}
                </span>
              </div>
            </div>

            <div className="mt-8 space-y-4">
               {/* Sensitive Info */}
               <div className="p-3 bg-red-900/10 border border-red-900/20 rounded-lg">
                <label className="text-[10px] text-red-500 uppercase font-bold flex items-center gap-1 mb-2">
                  <Lock size={12} /> Thông tin nhạy cảm
                </label>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Mật khẩu Login:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white">{showPass ? profile.rawPassword : '••••••••'}</span>
                      <button onClick={() => setShowPass(!showPass)} className="text-gray-500 hover:text-white">
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Mật khẩu Trade:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white">{showTradePass ? profile.tradingPassword : '••••••••'}</span>
                      <button onClick={() => setShowTradePass(!showTradePass)} className="text-gray-500 hover:text-white">
                        {showTradePass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Wallet className="text-gray-500" size={16} />
                <span className="text-gray-400">Balance:</span>
                <span className="ml-auto font-bold text-green-500">${parseFloat(profile.liveBalance).toLocaleString()}</span>
              </div>

              <div className="pt-4 border-t border-gray-800">
                <button 
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white transition-all font-bold text-xs uppercase"
                >
                  <Trash2 size={16} /> Xóa người dùng vĩnh viễn
                </button>
              </div>
            </div>
          </div>

          {/* User History Stats */}
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-gray-500">Thống kê lệnh đánh</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-green-900/10 p-4 rounded-xl border border-green-900/20">
                <p className="text-[10px] text-green-500 uppercase font-bold mb-1">Tổng Thắng</p>
                <p className="text-xl font-bold text-green-500">${parseFloat(stats.totalProfit || 0).toLocaleString()}</p>
              </div>
              <div className="bg-red-900/10 p-4 rounded-xl border border-red-900/20">
                <p className="text-[10px] text-red-500 uppercase font-bold mb-1">Tổng Thua</p>
                <p className="text-xl font-bold text-red-500">${parseFloat(stats.totalLoss || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-900/20 rounded-lg text-center border border-gray-800/50">
               <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Tổng số lệnh</p>
               <p className="text-lg font-bold text-white">{stats.totalTrades || 0}</p>
            </div>
          </div>
        </div>

        {/* KYC Details & Transactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* KYC */}
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <IdCard className="text-blue-500" /> Hồ sơ định danh
              </h3>
              {profile.kycStatus === 'pending' && (
                <div className="flex gap-3">
                  <button onClick={handleReject} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-bold transition-all">
                    <XCircle size={16} /> Từ chối
                  </button>
                  <button onClick={handleApprove} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-bold transition-all">
                    <CheckCircle2 size={16} /> Phê duyệt
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold">Số CCCD</label>
                  <p className="text-white font-medium">{profile.idNumber || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold">Địa chỉ</label>
                  <p className="text-white font-medium">{profile.address || 'N/A'}</p>
                </div>
                <div>
                   <label className="text-[10px] text-gray-500 uppercase font-bold">Ngân hàng</label>
                   <p className="text-white font-medium">{profile.bankName || 'N/A'}</p>
                   <p className="text-sm text-gray-400">{profile.bankAccount} - {profile.bankBranch}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold block mb-2">Ảnh mặt trước</label>
                  {profile.idFrontPhoto ? (
                    <img 
                      src={`${process.env.NEXT_PUBLIC_API_URL?.replace(/(https?:\/\/[^/]+)\/api/, "$1")}${profile.idFrontPhoto}`} 
                      className="w-full h-24 object-cover rounded-lg border border-gray-800 hover:scale-[3] transition-transform cursor-zoom-in z-50 origin-right" 
                      alt="Front ID" 
                    />
                  ) : <div className="w-full h-24 bg-gray-900 rounded-lg flex items-center justify-center text-gray-600 text-[10px]">No Image</div>}
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold block mb-2">Ảnh mặt sau</label>
                  {profile.idBackPhoto ? (
                    <img 
                      src={`${process.env.NEXT_PUBLIC_API_URL?.replace(/(https?:\/\/[^/]+)\/api/, "$1")}${profile.idBackPhoto}`} 
                      className="w-full h-24 object-cover rounded-lg border border-gray-800 hover:scale-[3] transition-transform cursor-zoom-in z-50 origin-right" 
                      alt="Back ID" 
                    />
                  ) : <div className="w-full h-24 bg-gray-900 rounded-lg flex items-center justify-center text-gray-600 text-[10px]">No Image</div>}
                </div>
              </div>
            </div>
          </div>

          {/* User Transactions */}
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <HistoryIcon className="text-green-500" /> Lịch sử nạp / rút
              </h3>
              
              <div className="flex bg-[#111] p-1 rounded-lg border border-gray-800">
                <button 
                  className={`px-3 py-1 rounded-md text-[10px] font-bold bg-green-600 text-white`}
                >
                  Tài khoản chính (Live)
                </button>
              </div>
            </div>
            
            {transactions.length === 0 ? (
               <div className="text-center py-10 text-gray-500 text-sm">Chưa có giao dịch nào</div>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4 md:-mx-0 md:px-0">
                <table className="w-full text-xs min-w-[500px]">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500 uppercase text-[10px]">
                      <th className="text-left py-3 px-2">Thời gian</th>
                      <th className="text-left py-3 px-2">Loại</th>
                      <th className="text-right py-3 px-2">Số tiền</th>
                      <th className="text-left py-3 px-2">Nội dung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.id} className="border-b border-gray-900 hover:bg-white/[0.02]">
                        <td className="py-3 px-2 text-gray-400">{new Date(t.createdAt).toLocaleString()}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${t.type === 'deposit' ? 'bg-green-900/20 text-green-500' : 'bg-red-900/20 text-red-500'}`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-white">
                          ${t.amount ? Number(t.amount).toLocaleString() : '0'}
                        </td>
                        <td className="py-3 px-2 text-gray-500 max-w-[150px] truncate" title={t.description}>{t.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
