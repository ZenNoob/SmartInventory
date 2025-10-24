'use client'

import { useState, useMemo, useTransition } from "react"
import Link from "next/link"
import {
  File,
  ListFilter,
  MoreHorizontal,
  PlusCircle,
  Search,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { Customer, Payment, Sale } from "@/lib/types"
import { CustomerForm } from "./components/customer-form"
import { deleteCustomer, updateCustomerStatus, generateCustomerTemplate } from "./actions"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"
import { ImportCustomers } from "./components/import-customers"

type CustomerTypeFilter = 'all' | 'personal' | 'business';
type GenderFilter = 'all' | 'male' | 'female' | 'other';
type SortKey = 'name' | 'status' | 'debt' | 'customerType' | 'customerGroup' | 'gender';


export default function CustomersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<CustomerTypeFilter>("all");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [groupFilter, setGroupFilter] = useState("");
  const [viewingPaymentsFor, setViewingPaymentsFor] = useState<Customer | null>(null);
  const [isUpdating, startTransition] = useTransition();
  const [isExporting, startExportingTransition] = useTransition();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');


  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "customers"));
  }, [firestore]);
  
  const salesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "sales_transactions"));
  }, [firestore]);

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "payments"));
  }, [firestore]);

  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);
  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);
  const { data: payments, isLoading: paymentsLoading } = useCollection<Payment>(paymentsQuery);


  const filteredCustomers = customers?.filter(customer => {
    // Customer Type Filter
    if (customerTypeFilter !== 'all' && customer.customerType !== customerTypeFilter) {
      return false;
    }

    // Gender Filter
    if (genderFilter !== 'all' && customer.gender !== genderFilter) {
      return false;
    }
    
    // Group Filter
    if (groupFilter && (!customer.customerGroup || !customer.customerGroup.toLowerCase().includes(groupFilter.toLowerCase()))) {
      return false;
    }

    // Search Term Filter
    const term = searchTerm.toLowerCase();
    if (term) {
       return (
        customer.name.toLowerCase().includes(term) ||
        (customer.email && customer.email.toLowerCase().includes(term)) ||
        (customer.phone && customer.phone.toLowerCase().includes(term)) ||
        (customer.address && customer.address.toLowerCase().includes(term))
      );
    }
    
    return true;
  })

  const handleAddCustomer = () => {
    setSelectedCustomer(undefined);
    setIsFormOpen(true);
  }

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  }

  const handleStatusChange = (customerId: string, status: Customer['status']) => {
    startTransition(async () => {
      const result = await updateCustomerStatus(customerId, status);
      if (result.success) {
        toast({
          title: "Thành công!",
          description: "Trạng thái khách hàng đã được cập nhật.",
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
  }

  const handleDelete = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    const result = await deleteCustomer(customerToDelete.id);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã xóa khách hàng "${customerToDelete.name}".`,
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
    setCustomerToDelete(null);
  }
  
  const customerDebts = useMemo(() => {
    if (!customers || !sales || !payments) return new Map();

    const debtMap = new Map<string, { paid: number; debt: number; payments: Payment[] }>();
    customers.forEach(customer => {
        const customerSales = sales.filter(s => s.customerId === customer.id).reduce((sum, s) => sum + (s.finalAmount || 0), 0);
        const customerPayments = payments.filter(p => p.customerId === customer.id);
        const totalPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalDebt = customerSales - totalPaid;
        debtMap.set(customer.id, { paid: totalPaid, debt: totalDebt, payments: customerPayments });
    });
    return debtMap;
  }, [customers, sales, payments]);

  const handleExportTemplate = () => {
    startExportingTransition(async () => {
      const result = await generateCustomerTemplate();
      if (result.success && result.data) {
        const link = document.createElement("a");
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.data}`;
        link.download = "customer_template.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Thành công", description: "Đã tải xuống file mẫu." });
      } else {
        toast({ variant: "destructive", title: "Lỗi", description: result.error });
      }
    });
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedCustomers = useMemo(() => {
    let sortableItems = [...(filteredCustomers || [])];
    if (sortKey) {
      sortableItems.sort((a, b) => {
        let valA: string | number | undefined, valB: string | number | undefined;

        switch (sortKey) {
          case 'name':
            valA = a.name.toLowerCase();
            valB = b.name.toLowerCase();
            break;
          case 'status':
            valA = a.status;
            valB = b.status;
            break;
          case 'debt':
            valA = customerDebts.get(a.id)?.debt || 0;
            valB = customerDebts.get(b.id)?.debt || 0;
            break;
          case 'customerType':
            valA = a.customerType;
            valB = b.customerType;
            break;
          case 'customerGroup':
            valA = a.customerGroup?.toLowerCase() || '';
            valB = b.customerGroup?.toLowerCase() || '';
            break;
          case 'gender':
            valA = a.gender || '';
            valB = b.gender || '';
            break;
          default:
            return 0;
        }
        
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredCustomers, sortKey, sortDirection, customerDebts]);

  const SortableHeader = ({ sortKey: key, children, className }: { sortKey: SortKey; children: React.ReactNode; className?: string; }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(key)} className="px-2 py-1 h-auto">
        {children}
        {sortKey === key && (
          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />
        )}
      </Button>
    </TableHead>
  );


  const isLoading = customersLoading || salesLoading || paymentsLoading;
  
  const customerPayments = viewingPaymentsFor ? customerDebts.get(viewingPaymentsFor.id)?.payments || [] : [];

  return (
    <>
      <CustomerForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        customer={selectedCustomer}
      />
      <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn khách hàng{' '}
              <strong>{customerToDelete?.name}</strong>.
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

      <Dialog open={!!viewingPaymentsFor} onOpenChange={(open) => !open && setViewingPaymentsFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lịch sử thanh toán cho: {viewingPaymentsFor?.name}</DialogTitle>
            <DialogDescription>
              Danh sách chi tiết tất cả các khoản thanh toán của khách hàng này.
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã thanh toán</TableHead>
                <TableHead>Ngày</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerPayments.length > 0 ? (
                customerPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.id.slice(-6).toUpperCase()}</TableCell>
                    <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    Không có dữ liệu thanh toán cho khách hàng này.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>


      <div className="flex items-center gap-2 mb-4">
         <div className="grid gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Khách hàng</h1>
            <p className="text-sm text-muted-foreground">
                Quản lý thông tin khách hàng của bạn.
            </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Lọc
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Lọc theo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Loại khách hàng</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={customerTypeFilter} onValueChange={(value) => setCustomerTypeFilter(value as CustomerTypeFilter)}>
                  <DropdownMenuRadioItem value="all">Tất cả</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="personal">Cá nhân</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="business">Doanh nghiệp</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Giới tính</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={genderFilter} onValueChange={(value) => setGenderFilter(value as GenderFilter)}>
                  <DropdownMenuRadioItem value="all">Tất cả</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="male">Nam</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="female">Nữ</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="other">Khác</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleExportTemplate} disabled={isExporting}>
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              {isExporting ? 'Đang xuất...' : 'Xuất Template'}
            </span>
          </Button>
          <ImportCustomers />
          <Button size="sm" className="h-8 gap-1" onClick={handleAddCustomer}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Thêm khách hàng
            </span>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
           <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm kiếm theo tên, email, sđt..."
                    className="w-full rounded-lg bg-background pl-8 md:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
               <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm theo nhóm khách hàng..."
                    className="w-full rounded-lg bg-background pl-8 md:w-64"
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                />
              </div>
           </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 hidden md:table-cell">STT</TableHead>
                <SortableHeader sortKey="name">Tên</SortableHeader>
                <SortableHeader sortKey="status">Trạng thái</SortableHeader>
                <SortableHeader sortKey="debt">Công nợ (Trả/Nợ)</SortableHeader>
                <SortableHeader sortKey="customerType" className="hidden md:table-cell">Loại</SortableHeader>
                <SortableHeader sortKey="customerGroup" className="hidden md:table-cell">Nhóm</SortableHeader>
                <SortableHeader sortKey="gender" className="hidden md:table-cell">Giới tính</SortableHeader>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Điện thoại</TableHead>
                <TableHead>
                  <span className="sr-only">Hành động</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={10} className="text-center h-24">Đang tải...</TableCell></TableRow>}
              {!isLoading && sortedCustomers?.map((customer, index) => {
                const debtInfo = customerDebts.get(customer.id);
                const hasDebt = debtInfo && debtInfo.debt > 0;
                return (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium hidden md:table-cell">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/customers/${customer.id}`} className="hover:underline">
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="p-1 h-auto" disabled={isUpdating}>
                            <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                              {customer.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Badge>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(customer.id, 'active')}
                            disabled={customer.status === 'active' || isUpdating}
                          >
                            Hoạt động
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(customer.id, 'inactive')}
                            disabled={customer.status === 'inactive' || isUpdating}
                          >
                            Không hoạt động
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                     <TableCell>
                      {debtInfo ? (
                        <div className="text-left">
                          <button 
                            className="underline cursor-pointer text-green-600" 
                            onClick={() => setViewingPaymentsFor(customer)}
                          >
                            {formatCurrency(debtInfo.paid)}
                          </button>
                          <Link href={`/customers/${customer.id}`} className={`block underline cursor-pointer ${debtInfo.debt > 0 ? "text-destructive" : ""}`}>
                            {formatCurrency(debtInfo.debt)}
                          </Link>
                        </div>
                      ) : (
                        <span>Đang tính...</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{customer.customerType === 'personal' ? 'Cá nhân' : 'Doanh nghiệp'}</Badge>
                    </TableCell>
                     <TableCell className="hidden md:table-cell">
                      {customer.customerGroup}
                    </TableCell>
                     <TableCell className="capitalize hidden md:table-cell">
                      {customer.gender === 'male' ? 'Nam' : customer.gender === 'female' ? 'Nữ' : customer.gender === 'other' ? 'Khác' : ''}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{customer.email}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {customer.phone}
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
                             <Link href={`/customers/${customer.id}`}>Xem chi tiết</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>Sửa</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setCustomerToDelete(customer)} disabled={hasDebt}>Xóa</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )})}
                {!isLoading && sortedCustomers?.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={10} className="text-center h-24">
                            Không tìm thấy khách hàng nào.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
         <CardFooter>
          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>{sortedCustomers?.length || 0}</strong> trên <strong>{customers?.length || 0}</strong> khách hàng
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
