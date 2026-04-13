import axios from 'axios';

// const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const API_BASE = 'https://api.vi-stocks.com/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Tự động gắn JWT token vào mọi request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Tự động logout khi token hết hạn
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Chỉ auto-reload nếu lỗi 401 KHÔNG phải ở trang login
    if (err.response?.status === 401 && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      document.cookie = 'token=; path=/; max-age=0';
      document.cookie = 'role=; path=/; max-age=0';
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ────────────────────────────────────────
export const authApi = {
  register: (data: { email?: string; phone?: string; password: string; fullName?: string; referralCode?: string }) => api.post('/auth/register', data),
  login: (identifier: { email?: string; phone?: string }, password: string) => api.post('/auth/login', { ...identifier, password }),
  getMe: () => api.get('/auth/me'),
};

// ── User ────────────────────────────────────────
export const userApi = {
  getProfile: () => api.get('/user/profile'),
  getBalance: () => api.get('/user/balance'),
  getTrades: (page = 1, limit = 20) =>
    api.get(`/user/trades?page=${page}&limit=${limit}`),
  getTransactions: () => api.get('/user/transactions'),
  withdraw: (amount: number, tradingPassword: string, details?: string) => api.post('/user/withdraw', { amount, tradingPassword, details }),
};

// ── Trade ───────────────────────────────────────
export const tradeApi = {
  place: (type: 'call' | 'put', amount: number, symbol = 'BTCUSDT') =>
    api.post('/trade/place', { type, amount, symbol }),
  getCurrentSession: (symbol = 'BTCUSDT') => api.get(`/trade/session?symbol=${symbol}`),
};

// ── Admin ───────────────────────────────────────
export const adminApi = {
  getUsers: () => api.get('/admin/users'),
  getUserDetail: (userId: number) => api.get(`/admin/users/${userId}`),
  deposit: (userId: number, amount: number) => api.post('/admin/deposit', { userId, amount }),
  getSessionStats: (symbol = 'BTCUSDT') => api.get(`/admin/session?symbol=${symbol}`),
  setOutcome: (mode: string, symbol = 'BTCUSDT') => api.post('/admin/outcome', { mode, symbol }),
  getPendingKYC: () => api.get('/admin/kyc/pending'),
  approveKYC: (userId: number) => api.patch(`/admin/kyc/approve/${userId}`),
  rejectKYC: (userId: number, reason: string) => api.patch(`/admin/kyc/reject/${userId}`, { reason }),
  getTransactions: (userId?: number) => {
    let url = '/admin/transactions?';
    if (userId) url += `userId=${userId}`;
    return api.get(url);
  },
  deleteUser: (userId: number) => api.delete(`/admin/users/${userId}`),
  getPendingWithdrawals: () => api.get('/admin/withdrawals/pending'),
  approveWithdrawal: (txnId: number) => api.patch(`/admin/withdrawals/approve/${txnId}`),
  rejectWithdrawal: (txnId: number, reason: string) => api.patch(`/admin/withdrawals/reject/${txnId}`, { reason }),
};

// ── Support ──────────────────────────────────────
export const supportApi = {
  getHistory: (otherUserId: number) => api.get(`/support/history/${otherUserId}`),
  getConversations: () => api.get('/support/conversations'),
  uploadImage: (formData: FormData) => api.post('/support/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// --- Investment ---
export const investmentApi = {
  getProjects: () => api.get('/investment/projects'),
  getProject: (id: string | number) => api.get(`/investment/projects/${id}`),
  invest: (projectId: number, amount: number) => api.post('/investment/invest', { projectId, amount }),
  getUserInvestments: () => api.get('/investment/my-investments'),
  uploadImage: (formData: FormData) => api.post('/investment/admin/upload-image?type=investment', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export default api;
