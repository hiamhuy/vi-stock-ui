import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth-context'
import ChatWidget from '@/components/ChatWidget'
import './globals.css'

import { LanguageProvider } from '@/lib/i18n-context'
const outfit = Outfit({ 
  subsets: ['latin'], 
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit'
});


export const metadata: Metadata = {
  title: 'BR - Next Generation Trading Platform',
  description: 'Experience the most professional binary trading platform with Real-time charts, millisecond processing speed, and multi-layer security.',
  icons: {
    icon: '/favicon.ico',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" className={outfit.variable}>
      <body className={`${outfit.className} antialiased`}>
        <LanguageProvider>
          <AuthProvider>
            {children}
            <ChatWidget />
          </AuthProvider>
        </LanguageProvider>
        <Toaster position="bottom-right" theme="dark" richColors />
        <Analytics />
      </body>
    </html>
  )
}
