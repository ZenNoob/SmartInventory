'use client';

import * as React from 'react';
import { useState } from 'react';
import { Building2, Plus, Store } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateStoreDialog } from './CreateStoreDialog';
import { useStore } from '@/contexts/store-context';

interface NoStorePromptProps {
  children: React.ReactNode;
}

/**
 * Component that wraps content and shows a prompt to create a store
 * when the user has no stores. Only shows for admin/owner users.
 */
export function NoStorePrompt({ children }: NoStorePromptProps) {
  const { stores, user, isLoading } = useStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Check if user is admin/owner
  const isOwner = user?.role === 'admin';

  // Don't show prompt while loading
  if (isLoading) {
    return <>{children}</>;
  }

  // If user is not logged in, show children (will redirect to login)
  if (!user) {
    return <>{children}</>;
  }

  // If user has stores, show children normally
  if (stores.length > 0) {
    return <>{children}</>;
  }

  // User has no stores - show prompt
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Chào mừng đến với SmartInventory!</CardTitle>
          <CardDescription>
            {isOwner
              ? 'Bạn chưa có cửa hàng nào. Hãy tạo cửa hàng đầu tiên để bắt đầu quản lý kinh doanh.'
              : 'Bạn chưa được phân quyền vào cửa hàng nào. Vui lòng liên hệ quản trị viên để được cấp quyền truy cập.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {isOwner ? (
            <>
              <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Tạo cửa hàng đầu tiên
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Sau khi tạo cửa hàng, bạn có thể thêm sản phẩm, khách hàng và bắt đầu bán hàng.
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Store className="h-4 w-4" />
              <span>Đang chờ được cấp quyền truy cập...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Store Dialog */}
      <CreateStoreDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
