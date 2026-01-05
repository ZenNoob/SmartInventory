'use client';

import { Store, Building2, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/contexts/store-context';
import { Skeleton } from '@/components/ui/skeleton';

interface StoreSelectorProps {
  className?: string;
}

export function StoreSelector({ className }: StoreSelectorProps) {
  const { currentStore, stores, isLoading, switchStore } = useStore();

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

  // If only one store, show it without dropdown
  if (stores.length === 1) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium">
        <Store className="h-4 w-4 text-primary" />
        <span>{stores[0].name}</span>
      </div>
    );
  }

  return (
    <Select
      value={currentStore?.id || ''}
      onValueChange={switchStore}
    >
      <SelectTrigger className={`w-[200px] ${className || ''}`}>
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-primary" />
          <SelectValue placeholder="Chọn cửa hàng" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {stores.map((store) => (
          <SelectItem key={store.id} value={store.id}>
            <div className="flex flex-col">
              <span className="font-medium">{store.name}</span>
              {store.address && (
                <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                  {store.address}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function StoreSelectorCompact() {
  const { currentStore, stores, isLoading, switchStore } = useStore();

  if (isLoading) {
    return <Skeleton className="h-8 w-[150px]" />;
  }

  if (stores.length === 0 || !currentStore) {
    return null;
  }

  if (stores.length === 1) {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <Store className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium truncate max-w-[120px]">{currentStore.name}</span>
      </div>
    );
  }

  return (
    <Select
      value={currentStore.id}
      onValueChange={switchStore}
    >
      <SelectTrigger className="h-8 w-[150px] text-sm">
        <div className="flex items-center gap-1.5">
          <Store className="h-3.5 w-3.5 text-primary" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {stores.map((store) => (
          <SelectItem key={store.id} value={store.id}>
            {store.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
