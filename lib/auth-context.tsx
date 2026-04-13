'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, userApi } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useTranslation } from '@/lib/i18n-context';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { playNotificationSound } from '@/lib/sounds';

interface User {
  id: number;
  email: string;
  fullName: string | null;
  role: 'user' | 'admin';
  liveBalance: number;
  phone?: string;
  // --- KYC & Onboarding ---
  onboardingStep: number;
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  address?: string;
  idNumber?: string;
  bankName?: string;
  bankAccount?: string;
  bankBranch?: string;
  tradingPassword?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: { email?: string; phone?: string }, password: string) => Promise<void>;
  register: (data: { email?: string; phone?: string; password: string; fullName?: string; referralCode?: string }) => Promise<void>;
  logout: () => void;
  refreshBalance: () => Promise<void>;
  updateBalance: (liveBalance: number) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  // Khởi tạo: đọc token từ localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedToken !== 'undefined' && savedUser && savedUser !== 'undefined') {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Kết nối socket
        const socket = connectSocket(savedToken);

        if (socket) {
          // Lắng nghe lỗi xác thực từ socket để logout
          socket.on('connect_error', (err) => {
            if (err.message === 'Token không hợp lệ' || err.message === 'Không có token') {
              logout();
            }
          });

          // Lắng nghe balance update từ admin
          socket.on('balance:updated', (data: { liveBalance: number; message: string }) => {
            updateBalance(data.liveBalance);
            toast.info(data.message);
            playNotificationSound();
          });

          socket.on('kyc:status', (data: { status: any; message: string }) => {
            setUser(prev => prev ? { ...prev, kycStatus: data.status } : null);
            toast.success(data.message);
            playNotificationSound();
          });

          socket.on('withdrawal:approved', (data: { message: string }) => {
            refreshUser();
            toast.success(data.message);
            playNotificationSound();
          });

          socket.on('withdrawal:rejected', (data: { message: string }) => {
            refreshUser();
            toast.error(data.message);
            playNotificationSound();
          });

          socket.on('support:new-message', (data: any) => {
            // Chỉ báo thông báo nếu không ở trang chat để tránh lặp
            const isChatPage = pathname.includes('/support');
            if (!isChatPage) {
              toast.info(`${t('newChatMessage')}: ${data.message || t('sentAnImage')}`, {
                description: `${t('fromLabel')}: ${data.sender?.fullName || data.sender?.email}`,
                action: {
                  label: t('viewNow'),
                  onClick: () => {
                    if (user?.role === 'admin') router.push('/admin/support');
                    else router.push('/support');
                  }
                }
              });
              playNotificationSound();
            }
          });
        }
      } catch {
        localStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  // Tự động làm mới dữ liệu người dùng khi đã có token
  useEffect(() => {
    if (token) {
      refreshUser();
    }
  }, [token]);

  const setAuthData = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    // Sync to cookies for Next.js middleware
    document.cookie = `token=${newToken}; path=/; max-age=${7 * 24 * 3600}`;
    document.cookie = `role=${newUser.role}; path=/; max-age=${7 * 24 * 3600}`;
    setToken(newToken);
    setUser(newUser);
    connectSocket(newToken);
  };

  const login = async (identifier: { email?: string; phone?: string }, password: string) => {
    const res = await authApi.login(identifier, password);
    const { token: t_token, user: u } = res.data.data;

    setAuthData(t_token, u);

    // Setup socket connection
    connectSocket(t_token);

    toast.success(t('welcomeUser', { name: u.fullName || u.email }));

    if (u.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/');
    }
  };

  const register = async (data: { email?: string; phone?: string; password: string; fullName?: string; referralCode?: string }) => {
    const res = await authApi.register(data);
    const { token: t_token, user: u } = res.data.data;
    setAuthData(t_token, u);
    toast.success(t('registerSuccess'));
    router.push('/onboarding');
  };

  const logout = useCallback(() => {
    disconnectSocket();
    localStorage.clear();
    // Clear cookies
    document.cookie = 'token=; path=/; max-age=0';
    document.cookie = 'role=; path=/; max-age=0';
    setUser(null);
    setToken(null);
    router.push('/login');
  }, [router]);

  const refreshBalance = useCallback(async () => {
    if (!token) return;
    try {
      const res = await userApi.getBalance();
      const { liveBalance } = res.data.data;
      setUser((prev) => prev ? { ...prev, liveBalance } : prev);
      localStorage.setItem('user', JSON.stringify({ ...user, liveBalance }));
    } catch { /* silent */ }
  }, [token, user]);

  const updateBalance = useCallback((liveBalance: number) => {
    // Safety check: Don't update if the balance is invalid
    if (liveBalance === undefined || liveBalance === null || isNaN(liveBalance)) {
      console.warn('[AuthContext] Attempted to update balance with invalid value:', liveBalance);
      return;
    }

    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, liveBalance };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await userApi.getProfile();
      if (res.data.success) {
        const updatedUser = res.data.data;
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error('Lỗi refresh user:', err);
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{
      user, token, isLoading,
      isAuthenticated: !!user,
      login, register, logout,
      refreshBalance, updateBalance, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng bên trong AuthProvider');
  return ctx;
};
