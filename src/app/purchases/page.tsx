'use client'

import { useState, useMemo } from "react"
import Link from "next/link"
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
import { Button } from "@/components/ui/button"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { PurchaseOrder } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"

type SortKey = 'orderNumber' | 'importDate' | 'totalAmount' | 'itemCount';

export default function PurchasesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('importDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const firestore = useFirestore();

  const purchasesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "purchase_orders"), orderBy("importDate", "desc"));
  }, [firestore]);

  const { data: purchases, isLoading } = useCollection<PurchaseOrder>(purchasesQuery);

  const filteredPurchases = purchases?.filter(order => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      order.orderNumber.toLowerCase().includes(term) ||
      (order.notes && order.notes.toLowerCase().includes(term))
    );
  });

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
  }, [filteredPurchases, sortKey, sortDirection]);

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
      <div className="flex items-center gap-2 mb-4">
        <div className="grid gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Đơn nhập hàng</h1>
            <p className="text-sm text-muted-foreground">
                Tạo và quản lý các đợt nhập hàng của bạn.
            </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
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
      <Card>
        <CardHeader>
             <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm theo mã đơn, ghi chú..."
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
                <TableHead className="w-16 hidden md:table-cell">STT</TableHead>
                <SortableHeader sortKey="orderNumber">Mã đơn</SortableHeader>
                <SortableHeader sortKey="importDate">Ngày nhập</SortableHeader>
                <SortableHeader sortKey="itemCount" className="text-right">Số SP</SortableHeader>
                <SortableHeader sortKey="totalAmount" className="text-right">Tổng tiền</SortableHeader>
                <TableHead>
                  <span className="sr-only">Hành động</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center">Đang tải...</TableCell></TableRow>}
              {!isLoading && sortedPurchases?.map((order, index) => (
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
                    <TableCell className="text-right">
                      {order.items.length}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(order.totalAmount)}
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
                          {/* <DropdownMenuItem className="text-destructive">Xóa</DropdownMenuItem> */}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && sortedPurchases?.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
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
