'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, LayoutDashboard, History, User as UserIcon, 
  MessageSquare, Wallet, Building2, X 
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n-context';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const pathname = usePathname();

  const menuItems = [
    { id: 'trade', label: t('dashboard'), icon: LayoutDashboard, href: '/trade' },
    { id: 'investment', label: t('investment'), icon: Building2, href: '/investment' },
    { id: 'history', label: t('history'), icon: History, href: '/history' },
    { id: 'profile', label: t('profile'), icon: UserIcon, href: '/profile' },
    { id: 'support', label: t('support'), icon: MessageSquare, href: '/support' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ 
          x: isOpen || (typeof window !== 'undefined' && window.innerWidth >= 1024) ? 0 : -280 
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed lg:relative inset-y-0 left-0 w-[280px] bg-[#0a0a0a] border-r border-[#1a1a2e] z-50 lg:z-0 lg:block overflow-y-auto ${!isOpen ? 'hidden lg:block' : 'block'}`}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between lg:hidden mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 size={18} className="text-white" />
              </div>
              <span className="font-bold">BR</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 text-gray-500">
              <X size={20} />
            </button>
          </div>

          <div>
            <h3 className="text-[10px] font-black text-[#6b7280] uppercase tracking-widest mb-4">{t('categories')}</h3>
            <div className="space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.id} href={item.href}>
                    <button className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      isActive 
                        ? 'bg-blue-600/10 text-blue-500' 
                        : 'text-gray-400 hover:text-white'
                    }`}>
                      <item.icon size={18} />
                      {item.label}
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-800">
            <h3 className="text-[10px] font-black text-[#6b7280] uppercase tracking-widest mb-4">{t('account')}</h3>
            <div className="p-4 bg-gray-900/40 rounded-xl border border-gray-800">
              <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between items-center mb-3">
                <span className="text-[10px] text-gray-500 uppercase font-bold">{t('verification')}:</span>
                <span className={`text-[10px] font-black uppercase ${authUser?.kycStatus === 'verified' ? 'text-green-500' : 'text-yellow-500'}`}>
                  {authUser?.kycStatus === 'verified' ? t('verified') : t('pending')}
                </span>
              </div>
              
              <Link href="/withdraw">
                 <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-black uppercase transition-all shadow-lg shadow-blue-900/20">
                  <Wallet size={14} /> {t('withdrawNow')}
                 </button>
              </Link>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
};
