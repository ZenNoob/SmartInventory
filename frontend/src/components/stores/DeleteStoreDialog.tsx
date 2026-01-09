'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useStore, type Store } from '@/contexts/store-context';

interface DeleteStoreDialogProps {
  store: Store | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteStoreDialog({
  store,
  open,
  onOpenChange,
  onDeleted,
}: DeleteStoreDialogProps) {
  const { toast } = useToast();
  const { deleteStorePermanently, currentStore, stores } = useStore();
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset confirm name when dialog opens/closes or store changes
  useEffect(() => {
    if (open) {
      setConfirmName('');
    }
  }, [open, store]);

  const isConfirmValid = confirmName === store?.name;

  const handleDelete = async () => {
    if (!store || !isConfirmValid) return;

    setIsDeleting(true);
    const wasCurrentStore = currentStore?.id === store.id;
    const remainingStoresCount = stores.length - 1;

    try {
      await deleteStorePermanently(store.id);
      
      if (wasCurrentStore && remainingStoresCount > 0) {
        toast({ 
          title: 'Thành công', 
          description: 'Đã xóa cửa hàng vĩnh viễn. Đã tự động chuyển sang cửa hàng khác.' 
        });
      } else if (wasCurrentStore && remainingStoresCount === 0) {
        toast({ 
          title: 'Thành công', 
          description: 'Đã xóa cửa hàng vĩnh viễn. Vui lòng tạo cửa hàng mới để tiếp tục.' 
        });
      } else {
        toast({ 
          title: 'Thành công', 
          description: 'Đã xóa cửa hàng vĩnh viễn' 
        });
      }

      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi xóa cửa hàng',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmName('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Xóa cửa hàng vĩnh viễn
          </DialogTitle>
          <DialogDescription>
            Hành động này không thể hoàn tác
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Cảnh báo:</strong> Xóa cửa hàng &quot;{store?.name}&quot; sẽ xóa vĩnh viễn tất cả dữ liệu liên quan bao gồm:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Sản phẩm và danh mục</li>
                <li>Đơn hàng và lịch sử bán hàng</li>
                <li>Khách hàng và nhà cung cấp</li>
                <li>Giao dịch thu chi</li>
                <li>Cửa hàng online liên kết</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="grid gap-2">
            <Label htmlFor="confirm-name">
              Nhập <strong>{store?.name}</strong> để xác nhận xóa
            </Label>
            <Input
              id="confirm-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Nhập tên cửa hàng"
              disabled={isDeleting}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose} 
            disabled={isDeleting}
          >
            Hủy
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isDeleting || !isConfirmValid}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Xóa vĩnh viễn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
