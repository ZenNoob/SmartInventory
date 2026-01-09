'use client';

import { Store, Building2, ChevronDown, Settings2 } from 'lucide-react';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useStore } from '@/contexts/store-context';
import { Skeleton } from '@/components/ui/skeleton';

interface StoreSelectorProps {
  className?: string;
}

export function StoreSelector({ className }: StoreSelectorProps) {
  const { currentStore, stores, user, isLoading, switchStore } = useStore();
  
  // Check if user is owner (admin role)
  const isOwner = user?.role === 'admin';

  if (isLoading) {
    return <Skeleton className="h-10 w-[200px]" />;
  }

  if (stores.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>Chưa có cửa hàng</span>
      </div>
    );
  }

  // If only one store and not owner, show it without dropdown
  if (stores.length === 1 && !isOwner) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium">
        <Store className="h-4 w-4 text-primary" />
        <span>{stores[0].name}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={`w-[200px] justify-between ${className || ''}`}>
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            <span className="truncate">{currentStore?.name || 'Chọn cửa hàng'}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]">
        {stores.map((store) => (
          <DropdownMenuItem
            key={store.id}
            onClick={() => switchStore(store.id)}
            className={currentStore?.id === store.id ? 'bg-accent' : ''}
          >
            <div className="flex flex-col">
              <span className="font-medium">{store.name}</span>
              {store.address && (
                <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                  {store.address}
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
        {isOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/stores" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                <span>Quản lý cửa hàng</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function StoreSelectorCompact() {
  const { currentStore, stores, user, isLoading, switchStore } = useStore();
  
  // Check if user is owner (admin role)
  const isOwner = user?.role === 'admin';

  if (isLoading) {
    return <Skeleton className="h-8 w-[150px]" />;
  }

  if (stores.length === 0 || !currentStore) {
    return null;
  }

  // If only one store and not owner, show without dropdown
  if (stores.length === 1 && !isOwner) {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <Store className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium truncate max-w-[120px]">{currentStore.name}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-[150px] justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5 text-primary" />
            <span className="truncate">{currentStore.name}</span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[150px]">
        {stores.map((store) => (
          <DropdownMenuItem
            key={store.id}
            onClick={() => switchStore(store.id)}
            className={currentStore.id === store.id ? 'bg-accent' : ''}
          >
            {store.name}
          </DropdownMenuItem>
        ))}
        {isOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/stores" className="flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5" />
                <span>Quản lý</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
