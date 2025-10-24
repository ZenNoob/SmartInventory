'use client'

import { useState, useMemo, useEffect, useTransition } from "react"
import Link from "next/link"
import {
  File,
  ListFilter,
  MoreHorizontal,
  PlusCircle,
  Search,
  Calendar as CalendarIcon,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"

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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
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
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { cn, formatCurrency } from "@/lib/utils"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { Customer, Sale, Product, Unit, SalesItem, Payment } from "@/lib/types"
import { collection, query, getDocs } from "firebase/firestore"
import { SaleForm } from "./components/sale-form"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { deleteSaleTransaction, updateSaleStatus } from "./actions"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

type SaleStatus = 'all' | 'pending' | 'unprinted' | 'printed';
type SortKey = 'invoiceNumber' | 'customer' | 'transactionDate' | 'status' | 'finalAmount';


const getStatusVariant = (status: Sale['status']): "default" | "secondary" | "outline" => {
  switch (status) {
    case 'printed': return 'default';
    case 'pending': return 'secondary';
    case 'unprinted': return 'outline';
    default: return 'outline';
  }
}

const getStatusText = (status: Sale['status']) => {
  switch (status) {
    case 'printed': return 'Đã in';
    case 'pending': return 'Chờ xử lý';
    case 'unprinted': return 'Chưa in';
    default: return 'Không xác định';
  }
}


export default function SalesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [allSalesItems, setAllSalesItems] = useState<SalesItem[]>([]);
  const [salesItemsLoading, setSalesItemsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDate, setSearchDate] = useState<Date | undefined>();
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<SaleStatus>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [isUpdatingStatus, startStatusTransition] = useTransition();
  const [sortKey, setSortKey] = useState<SortKey>('invoiceNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const salesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "sales_transactions"));
  }, [firestore]);

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "customers"));
  }, [firestore]);

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "products"));
  }, [firestore]);

  const unitsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "units"));
  }, [firestore]);
  
  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "payments"));
  }, [firestore]);

  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);
  const { data: units, isLoading: unitsLoading } = useCollection<Unit>(unitsQuery);
  const { data: payments, isLoading: paymentsLoading } = useCollection<Payment>(paymentsQuery);
  
  const customersMap = useMemo(() => {
    if (!customers) return new Map();
    return new Map(customers.map(c => [c.id, c.name]));
  }, [customers]);

  useEffect(() => {
    async function fetchAllSalesItems() {
      if (!firestore || !sales) {
        if (!salesLoading) setSalesItemsLoading(false);
        return;
      };
      
      setSalesItemsLoading(true);
      const items: SalesItem[] = [];
      try {
        for (const sale of sales) {
          const itemsCollectionRef = collection(firestore, `sales_transactions/${sale.id}/sales_items`);
          const itemsSnapshot = await getDocs(itemsCollectionRef);
          itemsSnapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() } as SalesItem);
          });
        }
        setAllSalesItems(items);
      } catch (error) {
        console.error("Error fetching sales items: ", error);
      } finally {
        setSalesItemsLoading(false);
      }
    }
    fetchAllSalesItems();
  }, [sales, firestore, salesLoading]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedSales = useMemo(() => {
    let sortableItems = sales?.filter(sale => {
      const customerName = customersMap.get(sale.customerId)?.toLowerCase() || '';
      const invoiceNumber = sale.invoiceNumber?.toLowerCase() || '';
      const term = searchTerm.toLowerCase();
      
      const termMatch = term ? (invoiceNumber.includes(term) || customerName.includes(term)) : true;
      
      const dateMatch = searchDate ? format(new Date(sale.transactionDate), 'yyyy-MM-dd') === format(searchDate, 'yyyy-MM-dd') : true;

      const statusMatch = statusFilter !== 'all' ? sale.status === statusFilter : true;

      const customerMatch = customerFilter !== 'all' ? sale.customerId === customerFilter : true;

      return termMatch && dateMatch && statusMatch && customerMatch;
    }) || [];

    sortableItems.sort((a, b) => {
      let valA: string | number, valB: string | number;

      switch (sortKey) {
        case 'invoiceNumber':
          valA = a.invoiceNumber || '';
          valB = b.invoiceNumber || '';
          break;
        case 'customer':
          valA = customersMap.get(a.customerId)?.toLowerCase() || '';
          valB = customersMap.get(b.customerId)?.toLowerCase() || '';
          break;
        case 'transactionDate':
          valA = new Date(a.transactionDate).getTime();
          valB = new Date(b.transactionDate).getTime();
          break;
        case 'finalAmount':
          valA = a.finalAmount;
          valB = b.finalAmount;
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        default:
          return 0;
      }
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sortableItems;
  }, [sales, searchTerm, searchDate, customersMap, statusFilter, customerFilter, sortKey, sortDirection]);


  const totalRevenue = useMemo(() => {
    return sortedSales?.reduce((total, sale) => total + sale.finalAmount, 0) || 0;
  }, [sortedSales]);


  const isLoading = salesLoading || customersLoading || productsLoading || unitsLoading || salesItemsLoading || paymentsLoading;

  const handleAddSale = () => {
    setSelectedSale(undefined);
    setIsFormOpen(true);
  };
  
  const handleEditSale = (sale: Sale) => {
    setSelectedSale(sale);
    setIsFormOpen(true);
  }

  const handleDelete = async () => {
    if (!saleToDelete) return;
    setIsDeleting(true);
    const result = await deleteSaleTransaction(saleToDelete.id);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã xóa đơn hàng ${saleToDelete.invoiceNumber}.`,
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
    setSaleToDelete(null);
  }
  
  const handleStatusChange = (saleId: string, status: Sale['status']) => {
    startStatusTransition(async () => {
      const result = await updateSaleStatus(saleId, status);
      if (result.success) {
        toast({
          title: "Thành công!",
          description: "Trạng thái đơn hàng đã được cập nhật.",
        });
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Ôi! Đã có lỗi xảy ra.",
          description: result.error,
        });
      }
    });
  };

  const SortableHeader = ({ sortKey: key, children, className }: { sortKey: SortKey; children: React.ReactNode, className?: string }) => (
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
      <SaleForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        customers={customers || []}
        products={products || []}
        units={units || []}
        allSalesItems={allSalesItems || []}
        sales={sales || []}
        payments={payments || []}
        sale={selectedSale}
      />
      <AlertDialog open={!!saleToDelete} onOpenChange={(open) => !open && setSaleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn đơn hàng {' '}
              <strong>{saleToDelete?.invoiceNumber}</strong>.
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
      <Tabs defaultValue="all" onValueChange={(value) => setStatusFilter(value as SaleStatus)}>
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="pending">Chờ xử lý</TabsTrigger>
            <TabsTrigger value="unprinted">Chưa in</TabsTrigger>
            <TabsTrigger value="printed">Đã in</TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1" disabled>
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Xuất
              </span>
            </Button>
            <Button size="sm" className="h-8 gap-1" onClick={handleAddSale} disabled={isLoading}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                {isLoading ? 'Đang tải...' : 'Tạo đơn hàng'}
              </span>
            </Button>
          </div>
        </div>
        <TabsContent value={statusFilter}>
          <Card>
            <CardHeader>
              <CardTitle>Đơn hàng</CardTitle>
              <CardDescription>
                Danh sách tất cả các giao dịch bán hàng.
              </CardDescription>
               <div className="flex flex-wrap items-center gap-4 mt-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Tìm theo mã đơn, tên khách hàng..."
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
                            !searchDate && "text-muted-foreground"
                        )}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {searchDate ? format(searchDate, "dd/MM/yyyy") : <span>Lọc theo ngày</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={searchDate}
                            onSelect={setSearchDate}
                            initialFocus
                        />
                    </PopoverContent>
                 </Popover>
                 {searchDate && (
                    <Button variant="ghost" onClick={() => setSearchDate(undefined)}>Xóa lọc ngày</Button>
                 )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-10 gap-1">
                      <ListFilter className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Lọc theo khách hàng
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Lọc theo khách hàng</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={customerFilter} onValueChange={setCustomerFilter}>
                      <DropdownMenuRadioItem value="all">Tất cả khách hàng</DropdownMenuRadioItem>
                      {customers?.map((customer) => (
                        <DropdownMenuRadioItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                 <div className="ml-auto text-lg font-semibold">
                    Doanh thu: <span className="text-primary">{formatCurrency(totalRevenue)}</span>
                 </div>
           </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">STT</TableHead>
                    <SortableHeader sortKey="invoiceNumber">Mã đơn hàng</SortableHeader>
                    <SortableHeader sortKey="customer">Khách hàng</SortableHeader>
                    <SortableHeader sortKey="transactionDate" className="hidden md:table-cell">Ngày</SortableHeader>
                    <SortableHeader sortKey="status">Trạng thái</SortableHeader>
                    <SortableHeader sortKey="finalAmount" className="text-right">Tổng cộng</SortableHeader>
                    <TableHead>
                      <span className="sr-only">Hành động</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={7} className="text-center h-24">Đang tải...</TableCell></TableRow>}
                  {!isLoading && sortedSales?.map((sale, index) => {
                    const customer = customers?.find(c => c.id === sale.customerId);
                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
                        <TableCell>{customer?.name || 'Khách lẻ'}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {new Date(sale.transactionDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="p-1 h-auto" disabled={isUpdatingStatus}>
                                <Badge variant={getStatusVariant(sale.status)}>
                                  {getStatusText(sale.status)}
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                </Badge>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(sale.id, 'pending')}
                                disabled={sale.status === 'pending' || isUpdatingStatus}
                              >
                                Chờ xử lý
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(sale.id, 'unprinted')}
                                disabled={sale.status === 'unprinted' || isUpdatingStatus}
                              >
                                Chưa in
                              </DropdownMenuItem>
                               <DropdownMenuItem
                                onClick={() => handleStatusChange(sale.id, 'printed')}
                                disabled={sale.status === 'printed' || isUpdatingStatus}
                              >
                                Đã in
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(sale.finalAmount)}
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
                                <Link href={`/sales/${sale.id}`}>Xem chi tiết</Link>
                              </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleEditSale(sale)}>
                                Sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(`/sales/${sale.id}?print=true`, '_blank')}>In hóa đơn</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setSaleToDelete(sale)}>
                                Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!isLoading && !sortedSales?.length && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        Không có đơn hàng nào phù hợp.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-muted-foreground">
                Hiển thị <strong>{sortedSales?.length || 0}</strong> trên <strong>{sales?.length || 0}</strong>{" "}
                đơn hàng
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
