'use client'

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, ArrowUp, ArrowDown, MoreHorizontal } from "lucide-react"

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { Customer, Sale, Payment } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { PaymentForm } from "./components/payment-form"

export type CustomerDebtInfo = {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  totalSales: number;
  totalPayments: number;
  finalDebt: number;
}

type SortKey = 'customerName' | 'customerPhone' | 'totalSales' | 'totalPayments' | 'finalDebt';

const formatPhoneNumber = (phone?: string) => {
    if (!phone) return 'N/A';
    const cleaned = phone.replace(/\s/g, ''); // Remove existing spaces
    if (cleaned.length === 10) {
        return `${cleaned.substring(0, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7, 10)}`;
    }
    if (cleaned.length === 9) {
        return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)}`;
    }
    return phone;
};

export default function DebtReportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('finalDebt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<CustomerDebtInfo | undefined>(undefined);


  const firestore = useFirestore();

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

  const customerDebtData = useMemo((): CustomerDebtInfo[] => {
    if (!customers || !sales || !payments) return [];

    return customers.map(customer => {
      const customerSales = sales
        .filter(s => s.customerId === customer.id)
        .reduce((sum, s) => sum + (s.finalAmount || 0), 0);
      
      const customerPayments = payments
        .filter(p => p.customerId === customer.id)
        .reduce((sum, p) => sum + p.amount, 0);

      const finalDebt = customerSales - customerPayments;

      return {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        totalSales: customerSales,
        totalPayments: customerPayments,
        finalDebt: finalDebt,
      };
    }).filter(data => data.totalSales > 0 || data.totalPayments > 0 || data.finalDebt !== 0);
  }, [customers, sales, payments]);

  const filteredDebtData = useMemo(() => {
    let filtered = customerDebtData;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(data => 
        data.customerName.toLowerCase().includes(term) ||
        (data.customerPhone && data.customerPhone.includes(term))
      );
    }
    return filtered;
  }, [customerDebtData, searchTerm]);

  const sortedDebtData = useMemo(() => {
    let sortableItems = [...(filteredDebtData || [])];
    if (sortKey) {
      sortableItems.sort((a, b) => {
        let valA, valB;

        if (sortKey === 'customerPhone') {
          valA = a.customerPhone || '';
          valB = b.customerPhone || '';
        } else {
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
  }, [filteredDebtData, sortKey, sortDirection]);
  
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleOpenPaymentForm = (customer: CustomerDebtInfo) => {
    setSelectedCustomerForPayment(customer);
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

  const isLoading = customersLoading || salesLoading || paymentsLoading;
  
  const totalRow = useMemo(() => {
    return {
      totalSales: sortedDebtData.reduce((acc, curr) => acc + curr.totalSales, 0),
      totalPayments: sortedDebtData.reduce((acc, curr) => acc + curr.totalPayments, 0),
      finalDebt: sortedDebtData.reduce((acc, curr) => acc + curr.finalDebt, 0),
    };
  }, [sortedDebtData]);

  return (
    <>
      {selectedCustomerForPayment && (
        <PaymentForm
          isOpen={isPaymentFormOpen}
          onOpenChange={setIsPaymentFormOpen}
          customer={selectedCustomerForPayment}
        />
      )}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
              <div>
                  <CardTitle>Báo cáo công nợ khách hàng</CardTitle>
                  <CardDescription>
                  Tổng hợp công nợ của tất cả các khách hàng.
                  </CardDescription>
              </div>
              <div className="text-right">
                  <p className="text-sm text-muted-foreground">Tổng nợ cuối kỳ</p>
                  <p className={`text-2xl font-bold ${totalRow.finalDebt > 0 ? 'text-destructive' : 'text-primary'}`}>
                      {formatCurrency(totalRow.finalDebt)}
                  </p>
              </div>
          </div>
          <div className="relative pt-4">
              <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
              <Input
                  type="search"
                  placeholder="Tìm kiếm theo tên hoặc SĐT..."
                  className="w-full rounded-lg bg-background pl-8 md:w-1/3"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead className="w-16">STT</TableHead>
                      <SortableHeader sortKey="customerName">Tên khách hàng</SortableHeader>
                      <SortableHeader sortKey="customerPhone">Số điện thoại</SortableHeader>
                      <SortableHeader sortKey="totalSales" className="text-right">Tổng phát sinh</SortableHeader>
                      <SortableHeader sortKey="totalPayments" className="text-right">Đã trả</SortableHeader>
                      <SortableHeader sortKey="finalDebt" className="text-right">Nợ cuối kỳ</SortableHeader>
                      <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={7} className="text-center h-24">Đang tải dữ liệu...</TableCell></TableRow>}
                {!isLoading && sortedDebtData.map((data, index) => (
                  <TableRow key={data.customerId}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/customers/${data.customerId}`} className="hover:underline">
                        {data.customerName}
                      </Link>
                    </TableCell>
                    <TableCell>{formatPhoneNumber(data.customerPhone)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.totalSales)}</TableCell>
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
                      <TableCell className="text-right">{formatCurrency(totalRow.totalSales)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalRow.totalPayments)}</TableCell>
                      <TableCell className={`text-right ${totalRow.finalDebt > 0 ? 'text-destructive' : ''}`}>{formatCurrency(totalRow.finalDebt)}</TableCell>
                      <TableCell></TableCell>
                  </TableRow>
              </ShadcnTableFooter>
          </Table>
        </CardContent>
        <CardFooter>
            <div className="text-xs text-muted-foreground">
              Hiển thị <strong>{sortedDebtData.length}</strong> khách hàng có công nợ.
            </div>
          </CardFooter>
      </Card>
    </>
  )
}
