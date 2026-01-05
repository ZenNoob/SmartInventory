'use client'

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  PlusCircle,
  MoreHorizontal,
  Truck,
  MapPin,
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
import { formatCurrency } from "@/lib/utils"
import {
  getOnlineStore,
  getShippingZones,
  deleteShippingZone,
  OnlineStore,
  ShippingZone,
} from "../../actions"
import { ShippingZoneForm } from "./components/shipping-zone-form"

export default function ShippingZonesPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const [store, setStore] = useState<OnlineStore | null>(null);
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [zoneToDelete, setZoneToDelete] = useState<ShippingZone | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [storeResult, zonesResult] = await Promise.all([
        getOnlineStore(storeId),
        getShippingZones(storeId),
      ]);

      if (storeResult.success && storeResult.data) {
        setStore(storeResult.data);
      }

      if (zonesResult.success && zonesResult.data) {
        setZones(zonesResult.data);
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: zonesResult.error || "Không thể tải danh sách vùng giao hàng",
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [storeId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!zoneToDelete) return;
    setIsDeleting(true);
    const result = await deleteShippingZone(storeId, zoneToDelete.id);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: "Đã xóa vùng giao hàng",
      });
      fetchData();
    } else {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: result.error,
      });
    }
    setIsDeleting(false);
    setZoneToDelete(null);
  };

  const handleEdit = (zone: ShippingZone) => {
    setEditingZone(zone);
    setIsFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingZone(null);
      fetchData();
    }
  };

  if (isLoading) {
    return <div className="p-6">Đang tải...</div>;
  }

  return (
    <>
      <ShippingZoneForm
        isOpen={isFormOpen}
        onOpenChange={handleFormClose}
        onlineStoreId={storeId}
        zone={editingZone}
      />

      <AlertDialog open={!!zoneToDelete} onOpenChange={(open) => !open && setZoneToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa vùng giao hàng?</AlertDialogTitle>
            <AlertDialogDescription>
              Vùng giao hàng <strong>{zoneToDelete?.name}</strong> sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/online-stores">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{store?.storeName || 'Cửa hàng'}</h1>
            <p className="text-muted-foreground">Quản lý vùng giao hàng</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Thêm vùng giao hàng
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Vùng giao hàng
            </CardTitle>
            <CardDescription>
              Cấu hình phí vận chuyển theo khu vực
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên vùng</TableHead>
                  <TableHead>Tỉnh/Thành phố</TableHead>
                  <TableHead>Phí vận chuyển</TableHead>
                  <TableHead>Miễn phí từ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>
                    <span className="sr-only">Hành động</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      Chưa có vùng giao hàng nào. Nhấn "Thêm vùng giao hàng" để bắt đầu.
                    </TableCell>
                  </TableRow>
                )}
                {zones.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell className="font-medium">{zone.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {zone.provinces.slice(0, 3).map((province, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <MapPin className="h-3 w-3 mr-1" />
                            {province}
                          </Badge>
                        ))}
                        {zone.provinces.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{zone.provinces.length - 3} khác
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {zone.flatRate !== undefined && zone.flatRate !== null
                        ? formatCurrency(zone.flatRate)
                        : 'Chưa cấu hình'}
                    </TableCell>
                    <TableCell>
                      {zone.freeShippingThreshold !== undefined && zone.freeShippingThreshold !== null
                        ? formatCurrency(zone.freeShippingThreshold)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={zone.isActive ? "default" : "secondary"}>
                        {zone.isActive ? "Hoạt động" : "Tạm ngưng"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEdit(zone)}>
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setZoneToDelete(zone)}
                          >
                            Xóa
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
  );
}
