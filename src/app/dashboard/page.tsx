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
import { Customer, Sale, Payment } from "@/lib/types"

async function getDashboardData() {
    const { firestore } = await getAdminServices();

    const customersSnapshot = await firestore.collection('customers').get();
    const customers = customersSnapshot.docs.map(doc => {
      return toPlainObject({ id: doc.id, ...doc.data() }) as Customer;
    })

    const salesSnapshot = await firestore.collection('sales_transactions').orderBy('transactionDate', 'desc').limit(10).get();
    const sales = salesSnapshot.docs.map(doc => {
        return toPlainObject({ id: doc.id, ...doc.data() }) as Sale;
    });

    const paymentsSnapshot = await firestore.collection('payments').get();
    const payments = paymentsSnapshot.docs.map(doc => {
        return toPlainObject({ id: doc.id, ...doc.data() }) as Payment;
    });
    
    return { customers, sales, payments };
}


export default async function Dashboard() {
  const { customers, sales, payments } = await getDashboardData();
  const totalRevenue = sales.reduce((acc, sale) => acc + sale.totalAmount, 0)
  const totalSales = sales.length
  
  const totalCustomerDebt = customers.reduce((acc, customer) => {
      const customerSales = sales.filter(s => s.customerId === customer.id).reduce((sum, s) => sum + s.totalAmount, 0);
      const customerPayments = payments.filter(p => p.customerId === customer.id).reduce((sum, p) => sum + p.amount, 0);
      return acc + (customerSales - customerPayments);
  }, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
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
              +5 khách hàng có nợ mới
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoạt động bây giờ</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+573</div>
            <p className="text-xs text-muted-foreground">
              +201 kể từ giờ trước
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
              Các sản phẩm sắp hết hàng.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8">
            <div className="flex items-center gap-4">
              <Avatar className="hidden h-9 w-9 sm:flex">
                <AvatarImage src="https://picsum.photos/seed/avatar1/36/36" alt="Avatar" />
                <AvatarFallback>WD</AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">Bàn gỗ</p>
                <p className="text-sm text-muted-foreground">
                  còn lại 20 chiếc
                </p>
              </div>
              <div className="ml-auto font-medium">
                <Badge variant="destructive">Thấp</Badge>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <Avatar className="hidden h-9 w-9 sm:flex">
                <AvatarImage src="https://picsum.photos/seed/avatar2/36/36" alt="Avatar" />
                <AvatarFallback>LP</AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">Laptop Pro</p>
                <p className="text-sm text-muted-foreground">
                  còn lại 50 chiếc
                </p>
              </div>
              <div className="ml-auto font-medium">
                <Badge variant="secondary">Vừa phải</Badge>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Avatar className="hidden h-9 w-9 sm:flex">
                <AvatarImage src="https://picsum.photos/seed/avatar3/36/36" alt="Avatar" />
                <AvatarFallback>MM</AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">Sữa (1 Gallon)</p>
                <p className="text-sm text-muted-foreground">
                  còn lại 80 chiếc
                </p>
              </div>
               <div className="ml-auto font-medium">
                <Badge variant="secondary">Vừa phải</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
