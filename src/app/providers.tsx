'use client';

import { SidebarProvider } from '@/components/ui/sidebar';
import { StoreProvider } from '@/contexts/store-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <SidebarProvider>
        {children}
      </SidebarProvider>
    </StoreProvider>
  );
}
