import {
  Activity,
  ArrowUpRight,
  CircleUser,
  CreditCard,
  DollarSign,
  Menu,
  Package2,
  Search,
  Users,
} from "lucide-react"
import Image from "next/image"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
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
} from "@/components/ui/table"

import { formatCurrency, toPlainObject } from "@/lib/utils"
import { getAdminServices } from "@/lib/admin-actions"
import { Customer, Sale, Payment, Product, Unit, SalesItem, ThemeSettings } from "@/lib/types"

async function getDashboardData() {
    const { firestore } = await getAdminServices();

    const customersSnapshot = await firestore.collection('customers').get();
    const customers = customersSnapshot.docs.map(doc => toPlainObject({ id: doc.id, ...doc.data() }) as Customer);

    const salesSnapshot = await firestore.collection('sales_transactions').orderBy('transactionDate', 'desc').get();
    const sales = salesSnapshot.docs.map(doc => toPlainObject({ id: doc.id, ...doc.data() }) as Sale);

    const paymentsSnapshot = await firestore.collection('payments').get();
    const payments = paymentsSnapshot.docs.map(doc => toPlainObject({ id: doc.id, ...doc.data() }) as Payment);
    
    const productsSnapshot = await firestore.collection('products').get();
    const products = productsSnapshot.docs.map(doc => toPlainObject({ id: doc.id, ...doc.data() }) as Product);

    const unitsSnapshot = await firestore.collection('units').get();
    const units = unitsSnapshot.docs.map(doc => toPlainObject({ id: doc.id, ...doc.data() }) as Unit);

    const salesItemsPromises = sales.map(sale => 
        firestore.collection('sales_transactions').doc(sale.id).collection('sales_items').get()
    );
    const salesItemsSnapshots = await Promise.all(salesItemsPromises);
    const salesItems = salesItemsSnapshots.flatMap(snapshot => 
        snapshot.docs.map(doc => toPlainObject({ id: doc.id, ...doc.data() }) as SalesItem)
    );

    const settingsDoc = await firestore.collection('settings').doc('theme').get();
    const settings = settingsDoc.exists ? toPlainObject(settingsDoc.data()) as ThemeSettings : null;

    return { customers, sales, payments, products, units, salesItems, settings };
}


export default async function Dashboard() {
  const { customers, sales, payments, products, units, salesItems, settings } = await getDashboardData();
  
  const unitsMap = new Map(units.map(u => [u.id, u]));

  const getUnitInfo = (unitId: string) => {
    const unit = unitsMap.get(unitId);
    if (!unit) return { baseUnit: undefined, conversionFactor: 1, name: '' };
    
    if (unit.baseUnitId && unit.conversionFactor) {
      const baseUnit = unitsMap.get(unit.baseUnitId);
      return { baseUnit, conversionFactor: unit.conversionFactor, name: unit.name };
    }
    
    return { baseUnit: unit, conversionFactor: 1, name: unit.name };
  };

  const lowStockProducts = products.map(product => {
      const { unitId, purchaseLots } = product;
      if (!unitId) return null;

      const mainUnitInfo = getUnitInfo(unitId);
      
      let totalImportedInBaseUnit = 0;
      purchaseLots?.forEach(lot => {
          const lotUnitInfo = getUnitInfo(lot.unitId);
          totalImportedInBaseUnit += lot.quantity * lotUnitInfo.conversionFactor;
      });
      
      const totalSoldInBaseUnit = salesItems
        .filter(item => item.productId === product.id)
        .reduce((acc, item) => acc + item.quantity, 0);

      const stockInBaseUnit = totalImportedInBaseUnit - totalSoldInBaseUnit;
      const stockInMainUnit = stockInBaseUnit / (mainUnitInfo.conversionFactor || 1);

      const lowStockThreshold = product.lowStockThreshold ?? settings?.lowStockThreshold ?? 0;

      return {
          ...product,
          stock: stockInMainUnit,
          lowStockThreshold: lowStockThreshold,
          mainUnitName: mainUnitInfo.name,
      };
  })
  .filter(p => p !== null && p.stock <= p.lowStockThreshold)
  .sort((a, b) => a!.stock - b!.stock)
  .slice(0, 5);


  const totalRevenue = sales.reduce((acc, sale) => acc + sale.totalAmount, 0)
  const totalSales = sales.length
  
  let totalCustomerDebt = 0;
  let customersWithDebt = 0;

  customers.forEach(customer => {
    const customerSales = sales.filter(s => s.customerId === customer.id).reduce((sum, s) => sum + s.finalAmount, 0);
    const customerPayments = payments.filter(p => p.customerId === customer.id).reduce((sum, p) => sum + p.amount, 0);
    const debt = customerSales - customerPayments;
    if (debt > 0) {
      totalCustomerDebt += debt;
      customersWithDebt++;
    }
  });


  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng doanh thu
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              +20.1% so với tháng trước
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng doanh số</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{totalSales}</div>
            <p className="text-xs text-muted-foreground">
              +19% so với tháng trước
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nợ tồn đọng</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCustomerDebt)}</div>
             <p className="text-xs text-muted-foreground">
              Có {customersWithDebt} khách hàng đang nợ
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Bán hàng gần đây</CardTitle>
              <CardDescription>
                Bạn đã thực hiện {totalSales} lượt bán hàng trong tháng này.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead className="text-right">Tổng cộng</TableHead>
                  <TableHead className="text-right">Đã trả</TableHead>
                  <TableHead className="text-right">Nợ lại</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Ngày</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.slice(0, 6).map((sale) => {
                   const customer = customers.find(c => c.id === sale.customerId);
                   return (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <div className="font-medium">{customer?.name}</div>
                        <div className="hidden text-sm text-muted-foreground md:inline">
                          {customer?.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(sale.finalAmount)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(sale.customerPayment || 0)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(sale.remainingDebt || 0)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right">{new Date(sale.transactionDate).toLocaleDateString()}</TableCell>
                    </TableRow>
                   )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sản phẩm sắp hết hàng</CardTitle>
            <CardDescription>
              Các sản phẩm có lượng tồn kho thấp nhất.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8">
            {lowStockProducts.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                    Không có sản phẩm nào sắp hết hàng.
                </div>
            )}
            {lowStockProducts.map((product, index) => {
                const stockLevel = product!.stock / product!.lowStockThreshold;
                let badgeVariant: "destructive" | "secondary" = "secondary";
                if (stockLevel <= 1) {
                    badgeVariant = "destructive";
                }
              
                return (
                 <div key={product!.id} className="flex items-center gap-4">
                    <Avatar className="hidden h-9 w-9 sm:flex">
                        <AvatarImage src={`https://picsum.photos/seed/${product!.id}/36/36`} alt={product!.name} />
                        <AvatarFallback>{product!.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="grid gap-1">
                        <p className="text-sm font-medium leading-none">{product!.name}</p>
                        <p className="text-sm text-muted-foreground">
                        còn lại {product!.stock.toFixed(2)} {product!.mainUnitName}
                        </p>
                    </div>
                    <div className="ml-auto font-medium">
                        <Badge variant={badgeVariant}>{stockLevel <= 1 ? "Thấp" : "Vừa phải"}</Badge>
                    </div>
                    </div>
                )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
