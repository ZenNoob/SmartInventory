'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, Store, Pencil, Trash2, Building2, Phone, MapPin, Loader2,
  Globe, Package, ExternalLink, Settings, MoreHorizontal
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useStore, type Store as StoreType } from '@/contexts/store-context';
import { CreateStoreDialog } from '@/components/stores/CreateStoreDialog';
import { EditStoreDialog } from '@/components/stores/EditStoreDialog';
import { DeleteStoreDialog } from '@/components/stores/DeleteStoreDialog';
import { getOnlineStores, deleteOnlineStore, type OnlineStore } from '@/app/online-stores/actions';
import { OnlineStoreForm } from '@/app/online-stores/components/online-store-form';


export default function StoresPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { stores, user, isLoading, deactivateStore, switchStore, currentStore } = useStore();
  
  // Physical store states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPermanentDeleteDialogOpen, setIsPermanentDeleteDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [deletingStore, setDeletingStore] = useState<StoreType | null>(null);
  const [permanentDeletingStore, setPermanentDeletingStore] = useState<StoreType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Online store states
  const [onlineStores, setOnlineStores] = useState<OnlineStore[]>([]);
  const [isOnlineLoading, setIsOnlineLoading] = useState(true);
  const [isOnlineFormOpen, setIsOnlineFormOpen] = useState(false);
  const [onlineStoreToDelete, setOnlineStoreToDelete] = useState<OnlineStore | null>(null);
  const [isDeletingOnline, setIsDeletingOnline] = useState(false);

  const isOwner = user?.role === 'admin';

  // Fetch online stores
  const fetchOnlineStores = useCallback(async () => {
    setIsOnlineLoading(true);
    try {
      const result = await getOnlineStores();
      if (result.success && result.data) {
        setOnlineStores(result.data);
      }
    } catch (error) {
      console.error('Error fetching online stores:', error);
    } finally {
      setIsOnlineLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnlineStores();
  }, [fetchOnlineStores]);

  const handleOpenEditDialog = (store: StoreType) => {
    setEditingStore(store);
    setIsEditDialogOpen(true);
  };


  const handleDelete = async () => {
    if (!deletingStore) return;
    setIsDeleting(true);
    const wasCurrentStore = currentStore?.id === deletingStore.id;
    const remainingStoresCount = stores.length - 1;

    try {
      await deactivateStore(deletingStore.id);
      if (wasCurrentStore && remainingStoresCount > 0) {
        toast({ title: 'Thành công', description: 'Đã vô hiệu hóa cửa hàng. Đã tự động chuyển sang cửa hàng khác.' });
      } else if (wasCurrentStore && remainingStoresCount === 0) {
        toast({ title: 'Thành công', description: 'Đã vô hiệu hóa cửa hàng. Vui lòng tạo cửa hàng mới để tiếp tục.' });
      } else {
        toast({ title: 'Thành công', description: 'Đã vô hiệu hóa cửa hàng' });
      }
      setIsDeleteDialogOpen(false);
      setDeletingStore(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Lỗi', description: error instanceof Error ? error.message : 'Đã xảy ra lỗi' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteOnlineStore = async () => {
    if (!onlineStoreToDelete) return;
    setIsDeletingOnline(true);
    const result = await deleteOnlineStore(onlineStoreToDelete.id);
    if (result.success) {
      toast({ title: 'Thành công!', description: `Đã vô hiệu hóa cửa hàng "${onlineStoreToDelete.storeName}".` });
      fetchOnlineStores();
    } else {
      toast({ variant: 'destructive', title: 'Lỗi', description: result.error });
    }
    setIsDeletingOnline(false);
    setOnlineStoreToDelete(null);
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
          <p className="text-muted-foreground">Quản lý tất cả cửa hàng vật lý và online của bạn</p>
        </div>
      </div>

      <Tabs defaultValue="physical" className="space-y-4">
        <TabsList>
          <TabsTrigger value="physical" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Cửa hàng vật lý ({stores.length})
          </TabsTrigger>
          <TabsTrigger value="online" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Cửa hàng online ({onlineStores.length})
          </TabsTrigger>
        </TabsList>

        {/* Physical Stores Tab */}
        <TabsContent value="physical" className="space-y-4">
          <div className="flex justify-end">
            {isOwner && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Thêm cửa hàng
              </Button>
            )}
          </div>

          {stores.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Chưa có cửa hàng nào</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {isOwner ? 'Bắt đầu bằng cách tạo cửa hàng đầu tiên của bạn' : 'Bạn chưa được phân quyền vào cửa hàng nào'}
                </p>
                {isOwner && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Thêm cửa hàng
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => (
                <Card key={store.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleSelectStore(store)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Store className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{store.name}</CardTitle>
                      </div>
                      {currentStore?.id === store.id && <Badge>Đang chọn</Badge>}
                    </div>
                    {store.businessType && <CardDescription>{store.businessType}</CardDescription>}
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
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(store); }}>
                          <Pencil className="h-4 w-4 mr-1" />
                          Sửa
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingStore(store); setIsDeleteDialogOpen(true); }}>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Vô hiệu hóa
                        </Button>
                        <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); setPermanentDeletingStore(store); setIsPermanentDeleteDialogOpen(true); }}>
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
        </TabsContent>


        {/* Online Stores Tab */}
        <TabsContent value="online" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsOnlineFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Tạo cửa hàng online
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Danh sách cửa hàng online</CardTitle>
              <CardDescription>Tất cả các cửa hàng trực tuyến của bạn</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên cửa hàng</TableHead>
                    <TableHead>Cửa hàng vật lý</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-center">Sản phẩm</TableHead>
                    <TableHead className="text-center">Đơn hàng</TableHead>
                    <TableHead><span className="sr-only">Hành động</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isOnlineLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">Đang tải...</TableCell>
                    </TableRow>
                  )}
                  {!isOnlineLoading && onlineStores.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        Chưa có cửa hàng online nào. Nhấn "Tạo cửa hàng online" để bắt đầu.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isOnlineLoading && onlineStores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded flex items-center justify-center text-white font-bold" style={{ backgroundColor: store.primaryColor }}>
                            {store.storeName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{store.storeName}</div>
                            <div className="text-sm text-muted-foreground">{store.contactEmail}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={store.physicalStoreStatus === 'inactive' ? 'border-orange-500 text-orange-500' : ''}>
                          <Building2 className="h-3 w-3 mr-1" />
                          {store.physicalStoreName || 'N/A'}
                          {store.physicalStoreStatus === 'inactive' && ' (Đã vô hiệu hóa)'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded">/store/{store.slug}</code>
                          <a href={`/store/${store.slug}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={store.isActive ? "default" : "secondary"}>
                          {store.isActive ? "Hoạt động" : "Tạm ngưng"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{store.productCount || 0}</TableCell>
                      <TableCell className="text-center">{store.orderCount || 0}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <a href={`/store/${store.slug}`} target="_blank" rel="noopener noreferrer">
                                <Globe className="h-4 w-4 mr-2" />
                                Xem cửa hàng
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/online-stores/${store.id}/settings`}>
                                <Settings className="h-4 w-4 mr-2" />
                                Cài đặt
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/online-stores/${store.id}/products`}>
                                <Package className="h-4 w-4 mr-2" />
                                Sản phẩm
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setOnlineStoreToDelete(store)} className="text-destructive">
                              Vô hiệu hóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      {/* Dialogs */}
      <CreateStoreDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
      <EditStoreDialog store={editingStore} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
      <DeleteStoreDialog 
        store={permanentDeletingStore} 
        open={isPermanentDeleteDialogOpen} 
        onOpenChange={(open) => { 
          setIsPermanentDeleteDialogOpen(open); 
          if (!open) setPermanentDeletingStore(null); 
        }} 
      />
      <OnlineStoreForm isOpen={isOnlineFormOpen} onOpenChange={(open) => { setIsOnlineFormOpen(open); if (!open) fetchOnlineStores(); }} />

      {/* Delete Physical Store Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận vô hiệu hóa cửa hàng</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn vô hiệu hóa cửa hàng "{deletingStore?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Vô hiệu hóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Online Store Dialog */}
      <AlertDialog open={!!onlineStoreToDelete} onOpenChange={(open) => !open && setOnlineStoreToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vô hiệu hóa cửa hàng online?</AlertDialogTitle>
            <AlertDialogDescription>
              Cửa hàng <strong>{onlineStoreToDelete?.storeName}</strong> sẽ bị ẩn khỏi công chúng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingOnline}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOnlineStore} disabled={isDeletingOnline}>
              {isDeletingOnline ? "Đang xử lý..." : "Vô hiệu hóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
