'use client';

import * as React from 'react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useStore, type Store } from '@/contexts/store-context';

export interface CreateStoreFormData {
  name: string;
  description: string;
  address: string;
  phone: string;
}

interface CreateStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoreCreated?: (store: Store) => void;
}

const initialFormData: CreateStoreFormData = {
  name: '',
  description: '',
  address: '',
  phone: '',
};

export function CreateStoreDialog({
  open,
  onOpenChange,
  onStoreCreated,
}: CreateStoreDialogProps) {
  const { toast } = useToast();
  const { createStore } = useStore();
  const [formData, setFormData] = useState<CreateStoreFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<CreateStoreFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateStoreFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên cửa hàng là bắt buộc';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Tên cửa hàng không được quá 255 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const newStore = await createStore({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        address: formData.address.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      });

      toast({
        title: 'Thành công',
        description: 'Đã tạo cửa hàng mới',
      });

      setFormData(initialFormData);
      setErrors({});
      onOpenChange(false);
      onStoreCreated?.(newStore);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tạo cửa hàng',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Thêm cửa hàng mới</DialogTitle>
            <DialogDescription>
              Điền thông tin để tạo cửa hàng mới
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-name">Tên cửa hàng *</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                placeholder="Nhập tên cửa hàng"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'create-name-error' : undefined}
              />
              {errors.name && (
                <p id="create-name-error" className="text-sm text-destructive">
                  {errors.name}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-description">Mô tả</Label>
              <Textarea
                id="create-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Nhập mô tả cửa hàng"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-address">Địa chỉ</Label>
              <Input
                id="create-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Nhập địa chỉ"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-phone">Số điện thoại</Label>
              <Input
                id="create-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Nhập số điện thoại"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tạo mới
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
