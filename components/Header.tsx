'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, Settings, LogOut, Menu, X, ChevronDown, 
  User as UserIcon, History, MessageSquare, Wallet, 
  Building2, LayoutDashboard 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const coinTicker = [
  { name: 'BTC', price: '64,231.5', change: '+1.2%' },
  { name: 'ETH', price: '3,452.1', change: '-0.5%' },
  { name: 'SOL', price: '145.6', change: '+5.4%' },
  { name: 'BNB', price: '582.3', change: '+0.8%' },
  { name: 'XRP', price: '0.62', change: '+2.1%' },
  { name: 'ADA', price: '0.45', change: '-1.2%' },
  { name: 'DOGE', price: '0.16', change: '+12.5%' },
  { name: 'DOT', price: '8.92', change: '+0.3%' },
  { name: 'LTC', price: '82.4', change: '-0.7%' },
  { name: 'MATIC', price: '0.98', change: '+1.5%' },
];

import { useTranslation } from '@/lib/i18n-context';
import LanguageSwitcher from './LanguageSwitcher';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();
  const pathname = usePathname();

  const mainNav = [
    { name: t('home'), href: '/', icon: BarChart3 },
    { name: t('trade'), href: '/trade', icon: LayoutDashboard },
    { name: t('investment'), href: '/investment', icon: Building2 },
  ];

  const dashboardNav = [
    { name: t('history'), href: '/history', icon: History },
    { name: (t('myInvestments') as any) || 'Đầu tư của tôi', href: '/investment?tab=my', icon: Building2 },
    { name: t('profile'), href: '/profile', icon: UserIcon },
    { name: t('support'), href: '/support', icon: MessageSquare },
    { name: t('withdraw'), href: '/withdraw', icon: Wallet },
  ];

  return (
    <header className="h-16 bg-[#0a0a0a] border-b border-[#1a1a2e] z-40 flex items-center px-4 md:px-6 shrink-0 gap-3 md:gap-6">
      {/* Logo & Name */}
      <Link href="/" className="flex items-center gap-2 md:gap-3 shrink-0 hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#2962ff] to-[#1565c0] rounded-lg flex items-center justify-center">
          <BarChart3 size={20} className="text-white md:hidden" />
          <BarChart3 size={24} className="text-white hidden md:block" />
        </div>
        <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">BR</h1>
      </Link>

      <LanguageSwitcher />

      <nav className="hidden lg:flex items-center gap-1 ml-4 transition-all">
        {mainNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`px-4 py-2 text-sm font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'text-blue-500 bg-blue-500/5' 
                  : 'text-[#787b86] hover:text-white hover:bg-white/5'
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2 md:gap-4 ml-auto shrink-0">
        {isAuthenticated ? (
          <>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-[#787b86] uppercase font-black tracking-widest">{user?.email || user?.phone}</p>
              <p className="text-sm font-black text-white">
                <span className="text-emerald-500">${formatCurrency(user?.liveBalance)}</span>
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden lg:flex items-center gap-2 hover:bg-white/5 border border-white/5 rounded-xl px-4 py-5 group">
                  <div className="w-6 h-6 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-500 transition-all group-hover:scale-110">
                    <UserIcon size={14} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-white">{t('dashboard')}</span>
                  <ChevronDown size={14} className="text-gray-500 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#0a0a0a] border-gray-800 p-2 rounded-2xl shadow-2xl">
                <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500">{t('account')}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-800 my-1" />
                {dashboardNav.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <DropdownMenuItem className="cursor-pointer flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                      <item.icon size={16} className="text-blue-500" />
                      {item.name}
                    </DropdownMenuItem>
                  </Link>
                ))}
                
                {user?.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator className="bg-gray-800 my-1" />
                    <Link href="/admin">
                      <DropdownMenuItem className="cursor-pointer flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black uppercase text-blue-500 hover:bg-blue-500/10 transition-all">
                        <Settings size={16} />
                        {t('admin')}
                      </DropdownMenuItem>
                    </Link>
                  </>
                )}
                
                <DropdownMenuSeparator className="bg-gray-800 my-1" />
                <DropdownMenuItem 
                  onClick={logout}
                  className="cursor-pointer flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <LogOut size={16} />
                  {t('logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Nav */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-white hover:bg-white/5">
                  <Menu size={24} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-[#0a0a0a] border-gray-800 p-0 overflow-hidden">
                <SheetHeader className="p-6 border-b border-gray-800">
                  <SheetTitle className="text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                      <BarChart3 size={18} />
                    </div>
                    BR TRADING
                  </SheetTitle>
                </SheetHeader>
                <div className="p-6 space-y-8 overflow-y-auto max-h-[calc(100vh-80px)] custom-scrollbar">
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4">{t('trade')}</h3>
                    {mainNav.map((item) => (
                      <Link key={item.href} href={item.href}>
                        <button className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-black transition-all ${
                          pathname === item.href ? 'bg-blue-600/10 text-blue-500' : 'text-gray-400 hover:text-white'
                        }`}>
                          <item.icon size={20} />
                          {item.name}
                        </button>
                      </Link>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4">{t('dashboard')}</h3>
                    {dashboardNav.map((item) => (
                      <Link key={item.href} href={item.href}>
                        <button className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-black transition-all ${
                          pathname === item.href ? 'bg-blue-600/10 text-blue-500' : 'text-gray-400 hover:text-white'
                        }`}>
                          <item.icon size={20} />
                          {item.name}
                        </button>
                      </Link>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-gray-800">
                    <Button 
                      onClick={logout}
                      variant="ghost" 
                      className="w-full justify-start gap-4 px-4 h-14 rounded-2xl text-red-500 hover:text-red-400 hover:bg-red-500/10 font-black uppercase text-sm"
                    >
                      <LogOut size={20} />
                      {t('logout')}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </>
        ) : (
          <div className="flex gap-1 md:gap-2">
            <Link href="/login">
              <Button size="sm" variant="ghost" className="text-xs md:text-sm text-gray-400 hover:text-white px-2">{t('login')}</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="bg-[#2962ff] hover:bg-[#1565c0] text-xs md:text-sm text-white font-bold px-3">{t('getStarted')}</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
