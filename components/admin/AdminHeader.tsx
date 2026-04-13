'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { BarChart3, Home, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n-context';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { adminApi } from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import { toast } from 'sonner';
import { playNotificationSound } from '@/lib/sounds';

interface AdminHeaderProps {
  currentView?: string;
  setView?: (view: any) => void;
  pendingKYCCount?: number;
  pendingWithdrawalCount?: number;
}

export function AdminHeader({ currentView, setView, pendingKYCCount, pendingWithdrawalCount: propWithdrawalCount }: AdminHeaderProps) {
  const { user, token, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  
  const [internalKYCCount, setInternalKYCCount] = useState(0);
  const [pendingWithdrawalCount, setPendingWithdrawalCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchCount = useCallback(async () => {
    if (!token || user?.role !== 'admin') return;
    try {
      const [kycRes, withdrawRes] = await Promise.all([
        adminApi.getPendingKYC(),
        adminApi.getPendingWithdrawals(),
      ]);
      if (kycRes.data.success) {
        setInternalKYCCount(kycRes.data.data.length);
      }
      if (withdrawRes.data.success) {
        setPendingWithdrawalCount(withdrawRes.data.data.length);
      }
      setIsInitialized(true);
    } catch (error) {
       // Silent
    }
  }, [token, user]);

  useEffect(() => {
    if (token && user?.role === 'admin') {
      fetchCount();
      
      const socket = connectSocket(token);
      
      const handleNewKYC = (data: any) => {
        console.log('[AdminHeader] Real-time KYC notification:', data);
        setInternalKYCCount(prev => prev + 1);
        playNotificationSound();
        toast.info(data.message || 'Có hồ sơ KYC mới đang chờ duyệt');
      };

      const handleNewWithdrawal = (data: any) => {
        console.log('[AdminHeader] Real-time Withdrawal notification:', data);
        setPendingWithdrawalCount(prev => prev + 1);
        playNotificationSound();
        
        const identifier = data.email || data.phone || (data.fullName ? data.fullName : `ID: ${data.userId}`);
        const msg = data.message || `Yêu cầu rút tiền mới từ ${identifier}`;
        
        toast.warning(msg, {
          description: `Số tiền: $${data.amount || '0'}`,
          action: {
            label: 'Xem ngay',
            onClick: () => {
                if (pathname !== '/admin') router.push('/admin?view=withdrawals');
                else if (setView) setView('withdrawals');
            }
          }
        });
      };

      socket?.on('admin:new-kyc', handleNewKYC);
      socket?.on('admin:new-withdrawal', handleNewWithdrawal);

      return () => {
        socket?.off('admin:new-kyc', handleNewKYC);
        socket?.off('admin:new-withdrawal', handleNewWithdrawal);
      };
    }
  }, [token, user, fetchCount]);

  // Use internal count if initialized, otherwise fallback to prop
  const displayKYCCount = isInitialized ? internalKYCCount : (pendingKYCCount || 0);
  const displayWithdrawalCount = isInitialized ? pendingWithdrawalCount : (propWithdrawalCount || 0);

  // Sync prop changes if we are on the admin page to ensure immediate updates
  useEffect(() => {
    if (propWithdrawalCount !== undefined) {
      setPendingWithdrawalCount(propWithdrawalCount);
    }
    if (pendingKYCCount !== undefined) {
      setInternalKYCCount(pendingKYCCount);
    }
  }, [propWithdrawalCount, pendingKYCCount]);

  const handleNavClick = (view: string, href: string) => {
    if (pathname === '/admin' && setView) {
      setView(view);
    } else {
      router.push(`${href}?view=${view}`);
    }
  };

  const isActive = (view: string, href: string) => {
    if (pathname === href) {
        if (pathname === '/admin') return currentView === view;
        return true;
    }
    return false;
  };

  return (
    <header className="sticky top-0 min-h-[64px] border-b flex flex-col md:flex-row items-center px-4 md:px-8 z-40 bg-[#0a0a0a] border-[#1a1a2e]">
      <div className="flex w-full md:w-auto items-center justify-between py-3 md:py-0 shrink-0">
        <Link href="/admin" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #2962ff, #1565c0)' }}>
            <BarChart3 size={20} className="text-white md:hidden" />
            <BarChart3 size={24} className="text-white hidden md:block" />
          </div>
          <h1 className="text-base md:text-xl font-bold whitespace-nowrap">BR <span className="text-[#2962ff]">{t('admin')}</span></h1>
        </Link>
        
        <div className="flex md:hidden items-center gap-2">
          <LanguageSwitcher />
          <Button size="icon" variant="ghost" onClick={logout} className="text-gray-400 hover:text-red-500">
            <LogOut size={16} />
          </Button>
        </div>
      </div>
      
      <div className="flex w-full md:w-auto overflow-x-auto no-scrollbar gap-4 md:gap-6 md:ml-10 py-1 md:py-0 border-t border-[#1a1a2e] md:border-t-0">
        <button 
          onClick={() => handleNavClick('dashboard', '/admin')} 
          className={`text-xs md:text-sm font-bold transition-colors uppercase whitespace-nowrap py-3 md:py-0 ${isActive('dashboard', '/admin') ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-white'}`}>
          {t('adminDash')}
        </button>
        
        <button 
          onClick={() => handleNavClick('kyc', '/admin')} 
          className={`text-xs md:text-sm font-bold flex items-center gap-2 transition-colors uppercase whitespace-nowrap py-3 md:py-0 ${isActive('kyc', '/admin') ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-white'}`}>
          {t('kycPending')} {displayKYCCount > 0 && <span className="bg-blue-600 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.6)]">{displayKYCCount}</span>}
        </button>
        
        <button 
          onClick={() => handleNavClick('transactions', '/admin')} 
          className={`text-xs md:text-sm font-bold transition-colors uppercase whitespace-nowrap py-3 md:py-0 ${isActive('transactions', '/admin') ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-white'}`}>
          {t('history')}
        </button>

        <button 
          onClick={() => handleNavClick('withdrawals', '/admin')} 
          className={`text-xs md:text-sm font-bold flex items-center gap-2 transition-colors uppercase whitespace-nowrap py-3 md:py-0 ${isActive('withdrawals', '/admin') ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-white'}`}>
          {t('withdrawals')} {displayWithdrawalCount > 0 && <span className="bg-blue-600 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.6)]">{displayWithdrawalCount}</span>}
        </button>
        
        <Link href="/admin/support" 
          className={`text-xs md:text-sm font-bold transition-colors uppercase whitespace-nowrap py-3 md:py-0 ${pathname === '/admin/support' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-white'}`}>
          {t('support')}
        </Link>
        
        <Link href="/admin/investments" 
          className={`text-xs md:text-sm font-bold transition-colors uppercase whitespace-nowrap py-3 md:py-0 ${pathname === '/admin/investments' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-white'}`}>
          {t('investment')}
        </Link>
      </div>

      <div className="hidden md:flex flex-1" />
      <div className="hidden md:flex items-center gap-4">
        <LanguageSwitcher />
        <Link href="/">
          <Button size="sm" style={{ background: '#1a1a2e', color: '#9ca3af' }}>
            <Home size={16} className="mr-2" /> {t('dashboard')}
          </Button>
        </Link>
        <Button size="sm" variant="outline" onClick={logout} className="border-[#1a1a2e] text-[#9ca3af]">
          <LogOut size={16} className="mr-2" /> {t('logout')}
        </Button>
      </div>
    </header>
  );
}
