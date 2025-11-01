
'use client'

import { useState, useMemo } from "react"
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  ArrowUp,
  ArrowDown
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
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { Supplier, PurchaseOrder, SupplierPayment } from "@/lib/types"
import { SupplierForm } from "./components/supplier-form"
import { deleteSupplier } from "./actions"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"
import { SupplierPaymentForm } from "./components/supplier-payment-form"
import { useUserRole } from "@/hooks/use-user-role"
import Link from "next/link"

type SortKey = 'name' | 'contactPerson' | 'email' | 'phone' | 'debt';

export default function SuppliersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>(undefined);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [supplierForPayment, setSupplierForPayment] = useState<any>(null);
  
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { permissions, isLoading: isRoleLoading } = useUserRole();

  const suppliersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "suppliers")) : null, [firestore]);
  const purchasesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "purchase_orders")) : null, [firestore]);
  const paymentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "supplier_payments")) : null, [firestore]);

  const { data: suppliers, isLoading: suppliersLoading } = useCollection<Supplier>(suppliersQuery);
  const { data: purchases, isLoading: purchasesLoading } = useCollection<PurchaseOrder>(purchasesQuery);
  const { data: payments, isLoading: paymentsLoading } = useCollection<SupplierPayment>(paymentsQuery);

  const supplierDebts = useMemo(() => {
    if (!suppliers || !purchases || !payments) return new Map();
    const debtMap = new Map<string, { totalPurchases: number; totalPayments: number; debt: number }>();
    suppliers.forEach(supplier => {
        const supplierPurchases = purchases.filter(p => p.supplierId === supplier.id).reduce((sum, p) => sum + p.totalAmount, 0);
        const supplierPayments = payments.filter(p => p.supplierId === supplier.id).reduce((sum, p) => sum + p.amount, 0);
        debtMap.set(supplier.id, {
            totalPurchases: supplierPurchases,
            totalPayments: supplierPayments,
            debt: supplierPurchases - supplierPayments
        });
    });
    return debtMap;
  }, [suppliers, purchases, payments]);


  const filteredSuppliers = suppliers?.filter(supplier => {
    const term = searchTerm.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(term) ||
      (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(term)) ||
      (supplier.email && supplier.email.toLowerCase().includes(term)) ||
      (supplier.phone && supplier.phone.includes(term))
    );
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedSuppliers = useMemo(() => {
    let sortableItems = [...(filteredSuppliers || [])];
    if (sortKey) {
      sortableItems.sort((a, b) => {
        let valA, valB;
        if (sortKey === 'debt') {
          valA = supplierDebts.get(a.id)?.debt || 0;
          valB = supplierDebts.get(b.id)?.debt || 0;
        } else {
          valA = (a[sortKey] || '').toLowerCase();
          valB = (b[sortKey] || '').toLowerCase();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredSuppliers, sortKey, sortDirection, supplierDebts]);

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

  const handleAddSupplier = () => {
    setSelectedSupplier(undefined);
    setIsFormOpen(true);
  }

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsFormOpen(true);
  }

  const handleDelete = async () => {
    if (!supplierToDelete) return;
    setIsDeleting(true);
    const result = await deleteSupplier(supplierToDelete.id);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã xóa nhà cung cấp "${supplierToDelete.name}".`,
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
    setSupplierToDelete(null);
  }
  
  const isLoading = suppliersLoading || purchasesLoading || paymentsLoading || isRoleLoading;
  const currentDebtInfo = supplierForPayment ? supplierDebts.get(supplierForPayment.id) : undefined;
  
  const canView = permissions?.suppliers?.includes('view');
  const canAdd = permissions?.suppliers?.includes('add');
  const canEdit = permissions?.suppliers?.includes('edit');
  const canDelete = permissions?.suppliers?.includes('delete');
  
  if (isLoading) {
    return <p>Đang tải dữ liệu...</p>;
  }

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Truy cập bị từ chối</CardTitle>
          <CardDescription>
            Bạn không có quyền xem danh sách nhà cung cấp.
          </CardDescription>
        </CardHeader>
         <CardContent>
          <Button asChild>
            <Link href="/dashboard">Quay lại Bảng điều khiển</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }


  return (
    <>
      <SupplierForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        supplier={selectedSupplier}
      />
      {supplierForPayment && currentDebtInfo && (
        <SupplierPaymentForm
          isOpen={!!supplierForPayment}
          onOpenChange={() => setSupplierForPayment(null)}
          supplier={{
            supplierId: supplierForPayment.id,
            supplierName: supplierForPayment.name,
            finalDebt: currentDebtInfo.debt
          }}
        />
      )}
      <AlertDialog open={!!supplierToDelete} onOpenChange={(open) => !open && setSupplierToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn nhà cung cấp{' '}
              <strong>{supplierToDelete?.name}</strong>.
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

      <div className="flex items-center gap-2 mb-4">
        <div className="grid gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Nhà cung cấp</h1>
            <p className="text-sm text-muted-foreground">
                Thêm, sửa, xóa và tìm kiếm các nhà cung cấp của bạn.
            </p>
        </div>
        {canAdd && (
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" className="h-8 gap-1" onClick={handleAddSupplier}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Thêm NCC
              </span>
            </Button>
          </div>
        )}
      </div>
      <Card>
        <CardHeader>
             <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm kiếm theo tên, email, SĐT..."
                    className="w-full rounded-lg bg-background pl-8 md:w-1/3"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">STT</TableHead>
                <SortableHeader sortKey="name">Tên Nhà cung cấp</SortableHeader>
                <SortableHeader sortKey="phone">Điện thoại</SortableHeader>
                <TableHead className="text-right">Tổng nhập</TableHead>
                <TableHead className="text-right">Đã trả</TableHead>
                <SortableHeader sortKey="debt" className="text-right">Công nợ</SortableHeader>
                <TableHead>
                  <span className="sr-only">Hành động</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center">Đang tải...</TableCell></TableRow>}
              {!isLoading && sortedSuppliers?.map((supplier, index) => {
                const debtInfo = supplierDebts.get(supplier.id);
                const hasDebt = debtInfo && debtInfo.debt > 0;
                return (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {supplier.name}
                    </TableCell>
                    <TableCell>
                      {supplier.phone}
                    </TableCell>
                     <TableCell className="text-right">
                      {debtInfo ? formatCurrency(debtInfo.totalPurchases) : '...'}
                    </TableCell>
                    <TableCell className="text-right">
                      {debtInfo ? formatCurrency(debtInfo.totalPayments) : '...'}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${hasDebt ? 'text-destructive' : ''}`}>
                      <Button 
                        variant="link" 
                        onClick={() => hasDebt && setSupplierForPayment(supplier)}
                        disabled={!hasDebt}
                        className={`p-0 h-auto ${hasDebt ? 'text-destructive' : ''}`}
                      >
                         {debtInfo ? formatCurrency(debtInfo.debt) : '...'}
                      </Button>
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
                            <span className="sr-only">Menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                          {canEdit && <DropdownMenuItem onClick={() => handleEditSupplier(supplier)}>Sửa</DropdownMenuItem>}
                          {canDelete && (
                            <DropdownMenuItem className="text-destructive" onClick={() => setSupplierToDelete(supplier)}>Xóa</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )})}
                {!isLoading && sortedSuppliers?.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
                            Không tìm thấy nhà cung cấp nào.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>{sortedSuppliers?.length || 0}</strong> trên <strong>{suppliers?.length || 0}</strong> nhà cung cấp
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
