'use client'

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  PlusCircle,
  MoreHorizontal,
  Globe,
  Package,
  ShoppingCart,
  ExternalLink,
  Settings,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { getOnlineStores, deleteOnlineStore, permanentDeleteOnlineStore, OnlineStore } from "./actions"
import { OnlineStoreForm } from "./components/online-store-form"

export default function OnlineStoresPage() {
  const [stores, setStores] = useState<OnlineStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<OnlineStore | null>(null);
  const [storeToPermDelete, setStoreToPermDelete] = useState<OnlineStore | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchStores = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getOnlineStores();
      if (result.success && result.data) {
        setStores(result.data);
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: result.error || "Không thể tải danh sách cửa hàng online",
        });
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleDelete = async () => {
    if (!storeToDelete) return;
    setIsDeleting(true);
    const result = await deleteOnlineStore(storeToDelete.id);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã vô hiệu hóa cửa hàng "${storeToDelete.storeName}".`,
      });
      fetchStores();
    } else {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: result.error,
      });
    }
    setIsDeleting(false);
    setStoreToDelete(null);
  };

  const handlePermanentDelete = async () => {
    if (!storeToPermDelete) return;
    setIsDeleting(true);
    const result = await permanentDeleteOnlineStore(storeToPermDelete.id);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã xóa vĩnh viễn cửa hàng "${storeToPermDelete.storeName}".`,
      });
      fetchStores();
    } else {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: result.error,
      });
    }
    setIsDeleting(false);
    setStoreToPermDelete(null);
  };

  const activeStores = stores.filter(s => s.isActive).length;
  const totalProducts = stores.reduce((sum, s) => sum + (s.productCount || 0), 0);
  const totalOrders = stores.reduce((sum, s) => sum + (s.orderCount || 0), 0);

  return (
    <>
      <OnlineStoreForm
        isOpen={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) fetchStores();
        }}
      />

      <AlertDialog open={!!storeToDelete} onOpenChange={(open) => !open && setStoreToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vô hiệu hóa cửa hàng online?</AlertDialogTitle>
            <AlertDialogDescription>
              Cửa hàng <strong>{storeToDelete?.storeName}</strong> sẽ bị ẩn khỏi công chúng. 
              Dữ liệu sẽ được giữ lại và bạn có thể kích hoạt lại sau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Đang xử lý..." : "Vô hiệu hóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!storeToPermDelete} onOpenChange={(open) => !open && setStoreToPermDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Xóa vĩnh viễn cửa hàng?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa vĩnh viễn cửa hàng <strong>{storeToPermDelete?.storeName}</strong>?
              <br /><br />
              <span className="text-destructive font-medium">
                Hành động này không thể hoàn tác. Tất cả dữ liệu bao gồm sản phẩm, đơn hàng, và cài đặt sẽ bị xóa vĩnh viễn.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePermanentDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Đang xóa..." : "Xóa vĩnh viễn"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cửa hàng Online</h1>
            <p className="text-muted-foreground">Quản lý các cửa hàng trực tuyến của bạn</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Tạo cửa hàng mới
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cửa hàng hoạt động</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeStores}</div>
              <p className="text-xs text-muted-foreground">
                trên tổng {stores.length} cửa hàng
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sản phẩm online</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                đang được bán trực tuyến
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đơn hàng online</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                tổng số đơn hàng
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Store List */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách cửa hàng</CardTitle>
            <CardDescription>
              Tất cả các cửa hàng online của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên cửa hàng</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-center">Sản phẩm</TableHead>
                  <TableHead className="text-center">Đơn hàng</TableHead>
                  <TableHead>
                    <span className="sr-only">Hành động</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      Đang tải...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && stores.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      Chưa có cửa hàng online nào. Nhấn "Tạo cửa hàng mới" để bắt đầu.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {store.logo ? (
                          <img 
                            src={store.logo} 
                            alt={store.storeName} 
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div 
                            className="h-10 w-10 rounded flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: store.primaryColor }}
                          >
                            {store.storeName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{store.storeName}</div>
                          <div className="text-sm text-muted-foreground">{store.contactEmail}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          /store/{store.slug}
                        </code>
                        <a 
                          href={`/store/${store.slug}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                          title="Xem cửa hàng"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={store.isActive ? "default" : "secondary"}>
                        {store.isActive ? "Hoạt động" : "Tạm ngưng"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {store.productCount || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {store.orderCount || 0}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Menu</span>
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
                          <DropdownMenuItem asChild>
                            <Link href={`/online-stores/${store.id}/orders`}>
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Đơn hàng
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setStoreToDelete(store)}
                          >
                            Vô hiệu hóa
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setStoreToPermDelete(store)}
                          >
                            Xóa vĩnh viễn
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
      </div>
    </>
  )
}
