'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import KYCOnboarding from '@/components/kyc-onboarding';
import { motion } from 'framer-motion';
import { LayoutDashboard } from 'lucide-react';
import { useTranslation } from '@/lib/i18n-context';

interface DashboardGuardProps {
  children: ReactNode;
}

/**
 * DashboardGuard
 * Guards "system" pages. If the user is a normal user (not admin)
 * and hasn't completed the 4 onboarding steps, it renders the 
 * KYCOnboarding component instead of the page content.
 */
export function DashboardGuard({ children }: DashboardGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();

  // 1. Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #2962ff, #1565c0)' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
              <LayoutDashboard size={22} className="text-white" />
            </motion.div>
          </div>
          <p className="text-sm" style={{ color: '#787b86' }}>{t('loading')}</p>
        </div>
      </div>
    );
  }

  // 2. Authentication check
  // If not authenticated, the individual page's auth guard should handle it
  // (usually by redirecting to /login), but we return null here to be safe.
  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  // 3. Admin exemption
  // Admins bypass onboarding completely.
  if (user.role === 'admin') {
    return <>{children}</>;
  }

  // 4. Onboarding check
  // If onboardingStep < 5, force showing the KYCOnboarding component.
  if (user.onboardingStep < 5) {
    return <KYCOnboarding />;
  }

  // 5. Passed all checks
  return <>{children}</>;
}
