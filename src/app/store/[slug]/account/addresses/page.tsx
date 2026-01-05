'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStorefront } from '../../layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { MapPin, ChevronLeft, Plus, Pencil, Trash2, Star, Loader2 } from 'lucide-react';

interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  isDefault: boolean;
}

const emptyAddress: Omit<Address, 'id'> = {
  label: '',
  fullName: '',
  phone: '',
  province: '',
  district: '',
  ward: '',
  addressLine: '',
  isDefault: false,
};

export default function AddressesPage() {
  const router = useRouter();
  const { store, customer } = useStorefront();
  const { toast } = useToast();
  
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<Omit<Address, 'id'>>(emptyAddress);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!customer && store?.slug) {
      router.push(`/store/${store.slug}/login`);
    }
  }, [customer, store?.slug, router]);

  // Fetch addresses
  useEffect(() => {
    if (!store?.slug || !customer) return;

    const fetchAddresses = async () => {
      try {
        const res = await fetch(`/api/storefront/${store.slug}/customer/addresses`);
        if (res.ok) {
          const data = await res.json();
          setAddresses(data.addresses || []);
        }
      } catch (error) {
        console.error('Error fetching addresses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAddresses();
  }, [store?.slug, customer]);

  const handleOpenDialog = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        label: address.label,
        fullName: address.fullName,
        phone: address.phone,
        province: address.province,
        district: address.district,
        ward: address.ward,
        addressLine: address.addressLine,
        isDefault: address.isDefault,
      });
    } else {
      setEditingAddress(null);
      setFormData(emptyAddress);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAddress(null);
    setFormData(emptyAddress);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async () => {
    if (!store?.slug) return;

    // Validate
    if (!formData.label || !formData.fullName || !formData.phone || 
        !formData.province || !formData.district || !formData.ward || !formData.addressLine) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền đầy đủ thông tin',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const url = editingAddress 
        ? `/api/storefront/${store.slug}/customer/addresses/${editingAddress.id}`
        : `/api/storefront/${store.slug}/customer/addresses`;
      
      const res = await fetch(url, {
        method: editingAddress ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        if (editingAddress) {
          setAddresses(prev => prev.map(a => a.id === editingAddress.id ? data.address : a));
        } else {
          setAddresses(prev => [...prev, data.address]);
        }
        toast({
          title: 'Thành công',
          description: editingAddress ? 'Đã cập nhật địa chỉ' : 'Đã thêm địa chỉ mới',
        });
        handleCloseDialog();
      } else {
        const data = await res.json();
        toast({
          title: 'Lỗi',
          description: data.error || 'Không thể lưu địa chỉ',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Save address error:', error);
      toast({
        title: 'Lỗi',
        description: 'Đã xảy ra lỗi khi lưu địa chỉ',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!store?.slug) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/storefront/${store.slug}/customer/addresses/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setAddresses(prev => prev.filter(a => a.id !== id));
        toast({
          title: 'Đã xóa',
          description: 'Địa chỉ đã được xóa',
        });
      } else {
        const data = await res.json();
        toast({
          title: 'Lỗi',
          description: data.error || 'Không thể xóa địa chỉ',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Delete address error:', error);
      toast({
        title: 'Lỗi',
        description: 'Đã xảy ra lỗi khi xóa địa chỉ',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (!customer) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/store/${store?.slug}/account`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Quay lại tài khoản
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Địa chỉ giao hàng</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => handleOpenDialog()}
                  style={{ backgroundColor: store?.primaryColor }}
                  className="text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm địa chỉ
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingAddress ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}
                  </DialogTitle>
                  <DialogDescription>
                    Điền thông tin địa chỉ giao hàng của bạn
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="label">Tên địa chỉ *</Label>
                    <Input
                      id="label"
                      name="label"
                      placeholder="VD: Nhà, Văn phòng..."
                      value={formData.label}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Họ tên người nhận *</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Số điện thoại *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="province">Tỉnh/TP *</Label>
                      <Input
                        id="province"
                        name="province"
                        value={formData.province}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="district">Quận/Huyện *</Label>
                      <Input
                        id="district"
                        name="district"
                        value={formData.district}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ward">Phường/Xã *</Label>
                      <Input
                        id="ward"
                        name="ward"
                        value={formData.ward}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addressLine">Địa chỉ chi tiết *</Label>
                    <Input
                      id="addressLine"
                      name="addressLine"
                      placeholder="Số nhà, tên đường..."
                      value={formData.addressLine}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      name="isDefault"
                      checked={formData.isDefault}
                      onChange={handleChange}
                      className="rounded"
                    />
                    <Label htmlFor="isDefault" className="font-normal">
                      Đặt làm địa chỉ mặc định
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Hủy
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{ backgroundColor: store?.primaryColor }}
                    className="text-white"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      'Lưu địa chỉ'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Addresses List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-16">
            <MapPin className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Chưa có địa chỉ</h2>
            <p className="text-gray-500 mb-6">
              Thêm địa chỉ giao hàng để đặt hàng nhanh hơn
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <Card key={address.id} className={address.isDefault ? 'border-2' : ''} style={address.isDefault ? { borderColor: store?.primaryColor } : {}}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{address.label}</CardTitle>
                      {address.isDefault && (
                        <span 
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: store?.primaryColor }}
                        >
                          <Star className="h-3 w-3" />
                          Mặc định
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(address)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(address.id)}
                        disabled={deletingId === address.id}
                      >
                        {deletingId === address.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{address.fullName}</p>
                  <p className="text-sm text-gray-600">{address.phone}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {address.addressLine}, {address.ward}, {address.district}, {address.province}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
