

'use client'

import { useState, useMemo } from "react"
import { Search, ArrowUp, ArrowDown, File } from "lucide-react"
import * as xlsx from 'xlsx';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter as ShadcnTableFooter
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { Supplier, PurchaseOrder, SupplierPayment } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { SupplierPaymentForm } from "./components/supplier-payment-form"

export type SupplierDebtInfo = {
  supplierId: string;
  supplierName: string;
  supplierPhone?: string;
  totalPurchases: number;
  totalPayments: number;
  finalDebt: number;
}

type SortKey = 'supplierName' | 'supplierPhone' | 'totalPurchases' | 'totalPayments' | 'finalDebt';

export default function SupplierDebtReportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('finalDebt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDebtInfo | undefined>(undefined);

  const firestore = useFirestore();

  const suppliersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "suppliers")) : null, [firestore]);
  const purchasesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "purchase_orders")) : null, [firestore]);
  const paymentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "supplier_payments")) : null, [firestore]);

  const { data: suppliers, isLoading: suppliersLoading } = useCollection<Supplier>(suppliersQuery);
  const { data: purchases, isLoading: purchasesLoading } = useCollection<PurchaseOrder>(purchasesQuery);
  const { data: payments, isLoading: paymentsLoading } = useCollection<SupplierPayment>(paymentsQuery);

  const supplierDebtData = useMemo((): SupplierDebtInfo[] => {
    if (!suppliers || !purchases || !payments) return [];

    return suppliers.map(supplier => {
      const supplierPurchases = purchases.filter(p => p.supplierId === supplier.id).reduce((sum, p) => sum + p.totalAmount, 0);
      const supplierPayments = payments.filter(p => p.supplierId === supplier.id).reduce((sum, p) => sum + p.amount, 0);
      const debt = supplierPurchases - supplierPayments;
      
      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierPhone: supplier.phone,
        totalPurchases: supplierPurchases,
        totalPayments: supplierPayments,
        finalDebt: debt,
      };
    }).filter(data => data.totalPurchases > 0 || data.totalPayments > 0 || data.finalDebt !== 0);
  }, [suppliers, purchases, payments]);

  const filteredDebtData = useMemo(() => {
    let filtered = supplierDebtData;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(data => 
        data.supplierName.toLowerCase().includes(term) ||
        (data.supplierPhone && data.supplierPhone.includes(term))
      );
    }
    return filtered;
  }, [supplierDebtData, searchTerm]);

  const sortedDebtData = useMemo(() => {
    let sortableItems = [...filteredDebtData];
    if (sortKey) {
      sortableItems.sort((a, b) => {
        let valA = a[sortKey as keyof SupplierDebtInfo] || '';
        let valB = b[sortKey as keyof SupplierDebtInfo] || '';

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
  }, [filteredDebtData, sortKey, sortDirection]);
  
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleOpenPaymentForm = (supplier: SupplierDebtInfo) => {
    setSelectedSupplier(supplier);
    setIsPaymentFormOpen(true);
  }

  const SortableHeader = ({ sortKey: key, children, className }: { sortKey: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(key)} className="px-2 py-1 h-auto">
        {children}
        {sortKey === key && (
          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />
        )}
      </Button>
    </TableHead>
  );

  const isLoading = suppliersLoading || purchasesLoading || paymentsLoading;
  
  const totalRow = useMemo(() => {
    return {
      totalPurchases: sortedDebtData.reduce((acc, curr) => acc + curr.totalPurchases, 0),
      totalPayments: sortedDebtData.reduce((acc, curr) => acc + curr.totalPayments, 0),
      finalDebt: sortedDebtData.reduce((acc, curr) => acc + curr.finalDebt, 0),
    };
  }, [sortedDebtData]);

  const handleExportExcel = () => {
    const dataToExport = sortedDebtData.map((data, index) => ({
      'STT': index + 1,
      'Nhà cung cấp': data.supplierName,
      'SĐT': data.supplierPhone || 'N/A',
      'Tổng nhập': data.totalPurchases,
      'Đã trả': data.totalPayments,
      'Nợ cuối kỳ': data.finalDebt,
    }));

    const totalRowData = {
      'Nhà cung cấp': 'Tổng cộng',
      'Tổng nhập': totalRow.totalPurchases,
      'Đã trả': totalRow.totalPayments,
      'Nợ cuối kỳ': totalRow.finalDebt,
    };

    const worksheet = xlsx.utils.json_to_sheet([...dataToExport, totalRowData]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "CongNoNCC");

    worksheet['!cols'] = [ { wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 } ];
     const numberFormat = '#,##0';
     dataToExport.forEach((_, index) => {
        const rowIndex = index + 2;
        ['D', 'E', 'F'].forEach(col => {
            const cell = worksheet[`${col}${rowIndex}`];
            if(cell) cell.z = numberFormat;
        });
    });
     const totalRowIndex = dataToExport.length + 2;
      ['D', 'E', 'F'].forEach(col => {
        const cell = worksheet[`${col}${totalRowIndex}`];
        if(cell) {
          cell.z = numberFormat;
          cell.s = { font: { bold: true } };
        }
    });

    xlsx.writeFile(workbook, "bao_cao_cong_no_ncc.xlsx");
  };

  return (
    <>
      {selectedSupplier && (
        <SupplierPaymentForm
          isOpen={isPaymentFormOpen}
          onOpenChange={setIsPaymentFormOpen}
          supplier={selectedSupplier}
        />
      )}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
              <div>
                  <CardTitle>Báo cáo Công nợ Nhà cung cấp</CardTitle>
                  <CardDescription>
                  Tổng hợp công nợ phải trả cho các nhà cung cấp.
                  </CardDescription>
              </div>
              <div className="text-right">
                  <p className="text-sm text-muted-foreground">Tổng nợ phải trả</p>
                  <p className={`text-2xl font-bold ${totalRow.finalDebt > 0 ? 'text-destructive' : 'text-primary'}`}>
                      {formatCurrency(totalRow.finalDebt)}
                  </p>
              </div>
          </div>
          <div className="flex items-center gap-4 pt-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm kiếm theo tên hoặc SĐT..."
                    className="w-full rounded-lg bg-background pl-8 md:w-80"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={handleExportExcel} variant="outline" className="ml-auto">
                <File className="mr-2 h-4 w-4" />
                Xuất Excel
              </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead className="w-16">STT</TableHead>
                      <SortableHeader sortKey="supplierName">Nhà cung cấp</SortableHeader>
                      <SortableHeader sortKey="supplierPhone">Số điện thoại</SortableHeader>
                      <SortableHeader sortKey="totalPurchases" className="text-right">Tổng nhập</SortableHeader>
                      <SortableHeader sortKey="totalPayments" className="text-right">Đã trả</SortableHeader>
                      <SortableHeader sortKey="finalDebt" className="text-right">Nợ cuối kỳ</SortableHeader>
                      <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={7} className="text-center h-24">Đang tải dữ liệu...</TableCell></TableRow>}
                {!isLoading && sortedDebtData.map((data, index) => (
                  <TableRow key={data.supplierId}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{data.supplierName}</TableCell>
                    <TableCell>{data.supplierPhone}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.totalPurchases)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.totalPayments)}</TableCell>
                    <TableCell className={`text-right font-semibold ${data.finalDebt > 0 ? 'text-destructive' : ''}`}>
                      {formatCurrency(data.finalDebt)}
                    </TableCell>
                    <TableCell className="text-right">
                       {data.finalDebt > 0 && (
                          <Button variant="outline" size="sm" onClick={() => handleOpenPaymentForm(data)}>
                            Thanh toán
                          </Button>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && sortedDebtData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">Không có dữ liệu công nợ.</TableCell>
                  </TableRow>
                )}
              </TableBody>
              <ShadcnTableFooter>
                  <TableRow className="text-base font-bold">
                      <TableCell colSpan={3}>Tổng cộng</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalRow.totalPurchases)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalRow.totalPayments)}</TableCell>
                      <TableCell className={`text-right ${totalRow.finalDebt > 0 ? 'text-destructive' : ''}`}>{formatCurrency(totalRow.finalDebt)}</TableCell>
                      <TableCell></TableCell>
                  </TableRow>
              </ShadcnTableFooter>
          </Table>
        </CardContent>
        <CardFooter>
            <div className="text-xs text-muted-foreground">
              Hiển thị <strong>{sortedDebtData.length}</strong> nhà cung cấp có công nợ.
            </div>
          </CardFooter>
      </Card>
    </>
  )
}
