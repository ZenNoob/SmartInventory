
'use client'

import { useState, useMemo, useTransition } from "react"
import Link from "next/link"
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  ArrowUp,
  ArrowDown,
  File,
  Calendar as CalendarIcon
} from "lucide-react"
import { DateRange } from "react-day-picker"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import { Button } from "@/components/ui/button"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { PurchaseOrder, Supplier } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { formatCurrency, cn } from "@/lib/utils"
import { deletePurchaseOrder, generatePurchaseOrdersExcel } from "./actions"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"

type SortKey = 'orderNumber' | 'importDate' | 'totalAmount' | 'itemCount' | 'notes' | 'supplier';

export default function PurchasesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('importDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, startExportingTransition] = useTransition();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();


  const purchasesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    
    let q = query(collection(firestore, "purchase_orders"));

    if (dateRange?.from) {
       q = query(q, where('importDate', '>=', dateRange.from.toISOString()));
    }
    if (dateRange?.to) {
       q = query(q, where('importDate', '<=', dateRange.to.toISOString()));
    }
    
    q = query(q, orderBy("importDate", "desc"));
    return q;
  }, [firestore, dateRange]);


  const { data: purchases, isLoading } = useCollection<PurchaseOrder>(purchasesQuery);
  const { data: suppliers, isLoading: suppliersLoading } = useCollection<Supplier>(useMemoFirebase(() => firestore ? query(collection(firestore, 'suppliers')) : null, [firestore]));
  
  const suppliersMap = useMemo(() => new Map(suppliers?.map(s => [s.id, s.name])), [suppliers]);

  const filteredPurchases = purchases?.filter(order => {
    const term = searchTerm.toLowerCase();
    const supplierName = suppliersMap.get(order.supplierId)?.toLowerCase() || '';
    if (!term) return true;
    return (
      order.orderNumber.toLowerCase().includes(term) ||
      (order.notes && order.notes.toLowerCase().includes(term)) ||
      supplierName.includes(term)
    );
  });
  
  const setDatePreset = (preset: 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'all') => {
    const now = new Date();
    if (preset === 'all') {
      setDateRange(undefined);
      return;
    }
    switch (preset) {
      case 'this_week':
        setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
        break;
      case 'this_month':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'this_quarter':
        setDateRange({ from: startOfQuarter(now), to: endOfQuarter(now) });
        break;
      case 'this_year':
        setDateRange({ from: startOfYear(now), to: endOfYear(now) });
        break;
    }
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedPurchases = useMemo(() => {
    let sortableItems = [...(filteredPurchases || [])];
    if (sortKey) {
      sortableItems.sort((a, b) => {
        let valA, valB;
        switch (sortKey) {
            case 'itemCount':
                valA = a.items.length;
                valB = b.items.length;
                break;
            case 'importDate':
                valA = new Date(a.importDate).getTime();
                valB = new Date(b.importDate).getTime();
                break;
            case 'notes':
                valA = a.notes || '';
                valB = b.notes || '';
                break;
            case 'supplier':
                valA = suppliersMap.get(a.supplierId) || '';
                valB = suppliersMap.get(b.supplierId) || '';
                break;
            default:
                valA = a[sortKey];
                valB = b[sortKey];
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredPurchases, sortKey, sortDirection, suppliersMap]);

  const handleDelete = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    const result = await deletePurchaseOrder(orderToDelete.id);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã xóa đơn nhập hàng "${orderToDelete.orderNumber}".`,
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
    setIsDeleting(false);
    setOrderToDelete(null);
  };
  
  const handleExport = () => {
    if (!sortedPurchases || sortedPurchases.length === 0) {
      toast({
        variant: "destructive",
        title: "Không có dữ liệu",
        description: "Không có đơn nhập hàng nào để xuất.",
      });
      return;
    }
    startExportingTransition(async () => {
      const result = await generatePurchaseOrdersExcel(sortedPurchases, suppliers || []);
      if (result.success && result.data) {
        const link = document.createElement("a");
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.data}`;
        link.download = "phieu_nhap_hang.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Thành công", description: "Đã xuất danh sách đơn nhập hàng." });
      } else {
        toast({ variant: "destructive", title: "Lỗi", description: result.error });
      }
    });
  };

  const SortableHeader = ({ sortKey: key, children, className }: { sortKey: SortKey; children: React.ReactNode, className?: string; }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(key)} className="px-2 py-1 h-auto">
        {children}
        {sortKey === key && (
          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />
        )}
      </Button>
    </TableHead>
  );

  return (
    <>
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn đơn nhập hàng{' '}
              <strong>{orderToDelete?.orderNumber}</strong> và cập nhật lại tồn kho của các sản phẩm liên quan.
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

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Đơn nhập hàng</CardTitle>
              <CardDescription>
                  Tạo và quản lý các đợt nhập hàng của bạn.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleExport} disabled={isExporting}>
                  <File className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    {isExporting ? "Đang xuất..." : "Xuất Excel"}
                  </span>
                </Button>
              <Button size="sm" className="h-8 gap-1" asChild>
                <Link href="/purchases/new">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Tạo đơn nhập
                  </span>
                </Link>
              </Button>
            </div>
          </div>
           <div className="flex flex-wrap items-center gap-4 pt-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm theo mã đơn, nhà cung cấp..."
                    className="w-full rounded-lg bg-background pl-8 md:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Popover>
                  <PopoverTrigger asChild>
                      <Button
                      variant={"outline"}
                      className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !dateRange && "text-muted-foreground"
                      )}
                      >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}</> : format(dateRange.from, "dd/MM/yyyy")) : <span>Tất cả</span>}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                          mode="range"
                          selected={dateRange}
                          onSelect={setDateRange}
                          initialFocus
                      />
                        <div className="p-2 border-t grid grid-cols-3 gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_week')}>Tuần này</Button>
                          <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_month')}>Tháng này</Button>
                          <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_quarter')}>Quý này</Button>
                          <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_year')}>Năm nay</Button>
                          <Button variant="ghost" size="sm" onClick={() => setDatePreset('all')}>Tất cả</Button>
                      </div>
                  </PopoverContent>
              </Popover>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 hidden md:table-cell">STT</TableHead>
                <SortableHeader sortKey="orderNumber">Mã đơn</SortableHeader>
                <SortableHeader sortKey="importDate">Ngày nhập</SortableHeader>
                <SortableHeader sortKey="supplier">Nhà cung cấp</SortableHeader>
                <SortableHeader sortKey="itemCount" className="text-right">Số SP</SortableHeader>
                <SortableHeader sortKey="totalAmount" className="text-right">Tổng tiền</SortableHeader>
                <SortableHeader sortKey="notes">Ghi chú</SortableHeader>
                <TableHead>
                  <span className="sr-only">Hành động</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || suppliersLoading && <TableRow><TableCell colSpan={8} className="text-center">Đang tải...</TableCell></TableRow>}
              {!isLoading && !suppliersLoading && sortedPurchases?.map((order, index) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium hidden md:table-cell">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                        <Link href={`/purchases/${order.id}`} className="hover:underline">
                            {order.orderNumber}
                        </Link>
                    </TableCell>
                    <TableCell>
                      {new Date(order.importDate).toLocaleDateString()}
                    </TableCell>
                     <TableCell>
                      {suppliersMap.get(order.supplierId) || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {order.items.length}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell>
                      {order.notes}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Chuyển đổi menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/purchases/${order.id}`}>Xem chi tiết</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                             <Link href={`/purchases/${order.id}/edit`}>Sửa</Link>
                          </DropdownMenuItem>
                           <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setOrderToDelete(order)}>Xóa</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && !suppliersLoading && sortedPurchases?.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center h-24">
                           Chưa có đơn nhập hàng nào.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>{sortedPurchases?.length || 0}</strong> trên <strong>{purchases?.length || 0}</strong> đơn nhập hàng
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
