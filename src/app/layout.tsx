

import type { Metadata } from 'next'
import { PT_Sans } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/toaster'
import GlobalError from './global-error'
import { getThemeSettings } from './settings/actions'
import { Providers } from './providers'
import { MainNav } from '@/components/main-nav'
import { Header } from '@/components/header'


const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Quản lý bán hàng',
  description: 'Quản lý hàng tồn kho, bán hàng và công nợ khách hàng của bạn với thông tin chi tiết do AI hỗ trợ.',
}

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode,
  params: { id: string }
}>) {
  const themeSettings = await getThemeSettings();

  const themeStyle = themeSettings ? {
    '--background': themeSettings.background,
    '--foreground': themeSettings.foreground,
    '--primary': themeSettings.primary,
    '--primary-foreground': themeSettings.primaryForeground,
    '--accent': themeSettings.accent,
    '--accent-foreground': themeSettings.accentForeground,
  } as React.CSSProperties : {};
  
  // A bit of a hack to detect the print-only page.
  // In a larger app, a dedicated layout file for the print route would be better.
  const isPrintView = params.id && (children as React.ReactElement)?.props?.childProp?.segment === '[id]';

  if (isPrintView) {
     return (
       <html lang="vi" suppressHydrationWarning>
        <body className={cn('bg-gray-100', ptSans.variable)}>
          {children}
        </body>
      </html>
     )
  }

  // Check if this is a storefront page by looking at children segment
  const childSegment = (children as React.ReactElement)?.props?.childProp?.segment;
  const isStorefront = childSegment === 'store';

  // Storefront pages - minimal layout without admin navigation
  if (isStorefront) {
    return (
      <html lang="vi" suppressHydrationWarning>
        <body
          className={cn(
            'min-h-screen bg-background font-sans antialiased',
            ptSans.variable
          )}
        >
          {children}
          <Toaster />
        </body>
      </html>
    );
  }

  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          ptSans.variable
        )}
        style={themeStyle}
      >
        <GlobalError>
          <Providers>
             <div className="flex min-h-screen">
              <MainNav />
              <div className="flex-1 flex flex-col p-6 gap-6 min-w-0">
                <Header />
                <main className="flex-1 overflow-y-auto">{children}</main>
              </div>
            </div>
          </Providers>
        </GlobalError>
        <Toaster />
      </body>
    </html>
  );
}
