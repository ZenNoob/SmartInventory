'use client';

import { SidebarProvider } from '@/components/ui/sidebar';
import { StoreProvider } from '@/contexts/store-context';
import { RouteGuard } from '@/components/route-guard';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <SidebarProvider>
        <RouteGuard>
          {children}
        </RouteGuard>
      </SidebarProvider>
    </StoreProvider>
  );
}
