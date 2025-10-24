import { notFound } from "next/navigation"
import { ChevronLeft, PlusCircle, CreditCard, Bot, Phone, Mail, MapPin, Cake, User, Building } from "lucide-react"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { formatCurrency } from "@/lib/utils"
import { PredictRiskForm } from "./components/predict-risk-form"
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { Customer, Payment, Sale } from "@/lib/types"
import { doc, collection, query, where, getDocs } from "firebase/firestore"
import { getAdminServices } from "@/lib/admin-actions"

function toPlainObject<T>(data: any): T {
    if (data && typeof data === 'object' && data.toDate) {
        return data.toDate().toISOString();
    }
    if (Array.isArray(data)) {
        return data.map(item => toPlainObject(item)) as any;
    }
    if (data && typeof data === 'object') {
        const res: { [key: string]: any } = {};
        for (const key in data) {
            res[key] = toPlainObject(data[key]);
        }
        return res as T;
    }
    return data;
}

async function getCustomerData(customerId: string) {
    const { firestore } = await getAdminServices();
    
    const customerDoc = await firestore.collection('customers').doc(customerId).get();
    if (!customerDoc.exists) {
        return { customer: null, sales: [], payments: [] };
    }
    const customerData = customerDoc.data();
    const customer = toPlainObject({ id: customerDoc.id, ...customerData }) as Customer;


    const salesSnapshot = await firestore.collection('sales_transactions').where('customerId', '==', customerId).get();
    const sales = salesSnapshot.docs.map(doc => {
      const data = doc.data();
      return toPlainObject({ id: doc.id, ...data }) as Sale;
    });

    const paymentsSnapshot = await firestore.collection('payments').where('customerId', '==', customerId).get();
    const payments = paymentsSnapshot.docs.map(doc => {
      const data = doc.data();
      return toPlainObject({ id: doc.id, ...data }) as Payment;
    });
    
    return { customer, sales, payments };
}


export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const { customer, sales, payments } = await getCustomerData(params.id);

  if (!customer) {
    notFound()
  }

  const totalSales = sales.reduce((acc, sale) => acc + sale.totalAmount, 0);
  const totalPayments = payments.reduce((acc, payment) => acc + payment.amount, 0);
  const totalDebt = totalSales - totalPayments;
  
  const customerSales = sales.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
  const customerPayments = payments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());


  return (
    <div className="grid gap-4 md:gap-8">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/customers">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Quay lại</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          {customer.name}
        </h1>
        <Badge variant={customer.customerType === 'business' ? 'default' : 'secondary'}>
          {customer.customerType === 'business' ? 'Doanh nghiệp' : 'Cá nhân'}
        </Badge>
        <div className="hidden items-center gap-2 md:ml-auto md:flex">
          <PredictRiskForm customer={customer} sales={sales} payments={payments} />
          <Button size="sm">Ghi lại thanh toán</Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tổng nợ</CardDescription>
            <CardTitle className={`text-4xl ${totalDebt > 0 ? 'text-destructive' : 'text-primary'}`}>
              {formatCurrency(totalDebt)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Hạn mức tín dụng: {formatCurrency(customer.creditLimit)}
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" /> Ghi lại thanh toán
            </Button>
          </CardFooter>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Thông tin khách hàng</CardTitle>
            <CardDescription>
                Chi tiết liên hệ và thông tin cá nhân.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{customer.email || 'Chưa có'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{customer.phone || 'Chưa có'}</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{customer.address || 'Chưa có'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Cake className="h-4 w-4 text-muted-foreground" />
              <span>{customer.birthday ? new Date(customer.birthday).toLocaleDateString() : 'Chưa có'}</span>
            </div>
             <div className="flex items-center gap-2">
               <User className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{customer.gender === 'male' ? 'Nam' : customer.gender === 'female' ? 'Nữ' : 'Khác'}</span>
            </div>
          </CardContent>
        </Card>
        
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử thanh toán</CardTitle>
          <CardDescription>Hồ sơ tất cả các khoản thanh toán của khách hàng.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Ngày</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerPayments.length > 0 ? (
                customerPayments.map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.id.slice(-6).toUpperCase()}</TableCell>
                    <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">Không tìm thấy thanh toán nào.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
