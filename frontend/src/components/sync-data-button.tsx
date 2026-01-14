'use client';

import { useState, useTransition } from 'react';
import { RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiClient } from '@/lib/api-client';

interface SyncResult {
  units: { added: number; existing: number };
  suppliers: { added: number; existing: number };
  customers: { added: number; existing: number };
  purchases?: { added: number };
  sales?: { added: number };
}

interface SyncDataButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onSyncComplete?: (results: SyncResult) => void;
}

export function SyncDataButton({
  variant = 'outline',
  size = 'default',
  className,
  onSyncComplete,
}: SyncDataButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, startSyncTransition] = useTransition();
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    results?: SyncResult;
    error?: string;
  } | null>(null);

  const handleSync = () => {
    setSyncResult(null);
    startSyncTransition(async () => {
      try {
        const response = await apiClient.request<{
          success: boolean;
          message: string;
          results: SyncResult;
        }>('/sync-data', { method: 'POST' });

        setSyncResult({ success: true, results: response.results });
        onSyncComplete?.(response.results);
      } catch (error: unknown) {
        console.error('Error syncing data:', error);
        setSyncResult({
          success: false,
          error: error instanceof Error ? error.message : 'Không thể đồng bộ dữ liệu',
        });
      }
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    // Reset result after dialog closes
    setTimeout(() => setSyncResult(null), 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Đồng bộ dữ liệu mẫu
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đồng bộ dữ liệu mẫu</DialogTitle>
          <DialogDescription>
            Tạo dữ liệu mẫu cho cửa hàng bao gồm đơn vị tính, nhà cung cấp và khách hàng
            phù hợp với loại hình kinh doanh của bạn.
          </DialogDescription>
        </DialogHeader>

        {!syncResult && !isSyncing && (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Hệ thống sẽ tự động bỏ qua các bản ghi đã tồn tại dựa trên tên (đơn vị tính)
              hoặc số điện thoại (khách hàng).
            </p>
          </div>
        )}

        {isSyncing && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Đang đồng bộ dữ liệu...</p>
          </div>
        )}

        {syncResult && (
          <div className="py-4">
            {syncResult.success && syncResult.results ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Đồng bộ thành công!</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>
                      Đơn vị tính: <span className="font-medium">{syncResult.results.units.added}</span> mới,{' '}
                      <span className="text-muted-foreground">{syncResult.results.units.existing} đã có</span>
                    </li>
                    <li>
                      Nhà cung cấp: <span className="font-medium">{syncResult.results.suppliers.added}</span> mới,{' '}
                      <span className="text-muted-foreground">{syncResult.results.suppliers.existing} đã có</span>
                    </li>
                    <li>
                      Khách hàng: <span className="font-medium">{syncResult.results.customers.added}</span> mới,{' '}
                      <span className="text-muted-foreground">{syncResult.results.customers.existing} đã có</span>
                    </li>
                    {syncResult.results.purchases && (
                      <li>
                        Đơn nhập hàng: <span className="font-medium">{syncResult.results.purchases.added}</span> mới
                      </li>
                    )}
                    {syncResult.results.sales && (
                      <li>
                        Đơn bán hàng: <span className="font-medium">{syncResult.results.sales.added}</span> mới
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Lỗi đồng bộ</AlertTitle>
                <AlertDescription>{syncResult.error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {syncResult ? (
            <Button onClick={handleClose}>Đóng</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isSyncing}>
                Hủy
              </Button>
              <Button onClick={handleSync} disabled={isSyncing}>
                {isSyncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  'Xác nhận đồng bộ'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
