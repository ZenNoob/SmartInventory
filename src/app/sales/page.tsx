'use client'

import { useState, useMemo, useEffect } from "react"
import {
  File,
  ListFilter,
  MoreHorizontal,
  PlusCircle,
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
  DropdownMenuCheckboxItem,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { Customer, Sale, Product, Unit, SalesItem, Payment } from "@/lib/types"
import { collection, query, getDocs } from "firebase/firestore"
import { SaleForm } from "./components/sale-form"

export default function SalesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [allSalesItems, setAllSalesItems] = useState<SalesItem[]>([]);
  const [salesItemsLoading, setSalesItemsLoading] = useState(true);

  const firestore = useFirestore();

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


  const isLoading = salesLoading || customersLoading || productsLoading || unitsLoading || salesItemsLoading || paymentsLoading;

  const handleAddSale = () => {
    setIsFormOpen(true);
  };
  
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
      />
      <Tabs defaultValue="all">
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="paid">Đã thanh toán</TabsTrigger>
            <TabsTrigger value="pending">Đang chờ xử lý</TabsTrigger>
            <TabsTrigger value="refunded" className="hidden sm:flex">
              Đã hoàn tiền
            </TabsTrigger>
          </TabsList>
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
                <DropdownMenuCheckboxItem checked>
                  Đã thanh toán
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Đang chờ xử lý</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" className="h-8 gap-1">
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
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Đơn hàng</CardTitle>
              <CardDescription>
                Danh sách tất cả các giao dịch bán hàng.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã đơn hàng</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead className="hidden md:table-cell">Ngày</TableHead>
                    <TableHead className="text-right">Tổng cộng</TableHead>
                    <TableHead>
                      <span className="sr-only">Hành động</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={5} className="text-center h-24">Đang tải...</TableCell></TableRow>}
                  {!isLoading && sales?.map((sale) => {
                    const customer = customers?.find(c => c.id === sale.customerId);
                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.id.slice(-6).toUpperCase()}</TableCell>
                        <TableCell>{customer?.name || 'Khách lẻ'}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {new Date(sale.transactionDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(sale.totalAmount)}
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
                              <DropdownMenuItem>Xem chi tiết</DropdownMenuItem>
                              <DropdownMenuItem>In hóa đơn</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!isLoading && !sales?.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        Không có đơn hàng nào.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-muted-foreground">
                Hiển thị <strong>{sales?.length || 0}</strong> trên <strong>{sales?.length || 0}</strong>{" "}
                đơn hàng
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
