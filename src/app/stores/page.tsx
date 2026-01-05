'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Store, Pencil, Trash2, Building2, Phone, MapPin, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useStore, type Store as StoreType } from '@/contexts/store-context';
import { Badge } from '@/components/ui/badge';

interface StoreFormData {
  name: string;
  code: string;
  address: string;
  phone: string;
  businessType: string;
}

const initialFormData: StoreFormData = {
  name: '',
  code: '',
  address: '',
  phone: '',
  businessType: '',
};

export default function StoresPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { stores, user, isLoading, refreshStores, switchStore } = useStore();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [deletingStore, setDeletingStore] = useState<StoreType | null>(null);
  const [formData, setFormData] = useState<StoreFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user is admin/owner
  const isOwner = user?.role === 'admin';

  const handleOpenDialog = (store?: StoreType) => {
    if (store) {
      setEditingStore(store);
      setFormData({
        name: store.name,
        code: store.code,
        address: store.address || '',
        phone: store.phone || '',
        businessType: store.businessType || '',
      });
    } else {
      setEditingStore(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingStore(null);
    setFormData(initialFormData);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.code) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Tên và mã cửa hàng là bắt buộc',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingStore 
        ? `/api/stores/${editingStore.id}` 
        : '/api/stores';
      
      const response = await fetch(url, {
        method: editingStore ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Đã xảy ra lỗi');
      }

      toast({
        title: 'Thành công',
        description: editingStore 
          ? 'Đã cập nhật cửa hàng' 
          : 'Đã tạo cửa hàng mới',
      });

      handleCloseDialog();
      await refreshStores();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Đã xảy ra lỗi',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStore) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/stores/${deletingStore.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Đã xảy ra lỗi');
      }

      toast({
        title: 'Thành công',
        description: 'Đã xóa cửa hàng',
      });

      setIsDeleteDialogOpen(false);
      setDeletingStore(null);
      await refreshStores();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Đã xảy ra lỗi',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectStore = (store: StoreType) => {
    switchStore(store.id);
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý cửa hàng</h1>
          <p className="text-muted-foreground">
            Quản lý danh sách các cửa hàng của bạn
          </p>
        </div>
        {isOwner && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Thêm cửa hàng
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingStore ? 'Chỉnh sửa cửa hàng' : 'Thêm cửa hàng mới'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingStore 
                      ? 'Cập nhật thông tin cửa hàng' 
                      : 'Điền thông tin để tạo cửa hàng mới'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Tên cửa hàng *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nhập tên cửa hàng"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="code">Mã cửa hàng *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="VD: CH001"
                      disabled={!!editingStore}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Địa chỉ</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Nhập địa chỉ"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Số điện thoại</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Nhập số điện thoại"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="businessType">Loại hình kinh doanh</Label>
                    <Input
                      id="businessType"
                      value={formData.businessType}
                      onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                      placeholder="VD: Bán lẻ, Siêu thị mini..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Hủy
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingStore ? 'Cập nhật' : 'Tạo mới'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>


      {stores.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Chưa có cửa hàng nào</h3>
            <p className="text-muted-foreground text-center mb-4">
              {isOwner 
                ? 'Bắt đầu bằng cách tạo cửa hàng đầu tiên của bạn'
                : 'Bạn chưa được phân quyền vào cửa hàng nào'}
            </p>
            {isOwner && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Thêm cửa hàng
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <Card 
              key={store.id} 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleSelectStore(store)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{store.name}</CardTitle>
                  </div>
                  <Badge variant="outline">{store.code}</Badge>
                </div>
                {store.businessType && (
                  <CardDescription>{store.businessType}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {store.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{store.address}</span>
                    </div>
                  )}
                  {store.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{store.phone}</span>
                    </div>
                  )}
                </div>
                {isOwner && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDialog(store);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Sửa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingStore(store);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Xóa
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa cửa hàng</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa cửa hàng "{deletingStore?.name}"? 
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
