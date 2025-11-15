
import { notFound } from "next/navigation"
import { ChevronLeft, PlusCircle, CreditCard, Bot, Phone, Mail, MapPin, Cake, User, Building, Landmark, Trophy, Gem, Star, Shield } from "lucide-react"

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

import { formatCurrency, toPlainObject } from "@/lib/utils"
import { PredictRiskForm } from "./components/predict-risk-form"
import { Customer, Payment, Sale } from "@/lib/types"
import { getAdminServices } from "@/lib/admin-actions"
import { cookies } from "next/headers"
import { getAuth } from "firebase-admin/auth"

async function getCustomerData(customerId: string) {
    const { firestore } = await getAdminServices();
    
    const customerDoc = await firestore.collection('customers').doc(customerId).get();
    if (!customerDoc.exists) {
        return { customer: null, sales: [], payments: [] };
    }
    const customer = toPlainObject({ id: customerDoc.id, ...customerDoc.data() }) as Customer;


    const salesSnapshot = await firestore.collection('sales_transactions').where('customerId', '==', customerId).get();
    const sales = salesSnapshot.docs.map(doc => {
      return toPlainObject({ id: doc.id, ...doc.data() }) as Sale;
    });

    const paymentsSnapshot = await firestore.collection('payments').where('customerId', '==', customerId).get();
    const payments = paymentsSnapshot.docs.map(doc => {
      return toPlainObject({ id: doc.id, ...doc.data() }) as Payment;
    });
    
    return { customer, sales, payments };
}

const defaultPermissions = {
    admin: ['view', 'add', 'edit', 'delete'],
    accountant: ['view', 'add', 'edit'],
    salesperson: ['view', 'add'],
};


async function getUserPermissions(uid: string) {
    const { firestore } = await getAdminServices();
    const userDoc = await firestore.collection('users').doc(uid).get();
    if (!userDoc.exists) return null;
    const userData = userDoc.data() as any;
    if (userData.role !== 'custom') {
        // @ts-ignore
        return defaultPermissions[userData.role] || [];
    }
    return userData.permissions?.customers || [];
}

const getTierIcon = (tier: string | undefined) => {
  switch (tier) {
    case 'diamond': return <Gem className="h-4 w-4 text-blue-500" />;
    case 'gold': return <Trophy className="h-4 w-4 text-yellow-500" />;
    case 'silver': return <Star className="h-4 w-4 text-slate-500" />;
    case 'bronze': return <Shield className="h-4 w-4 text-orange-700" />;
    default: return null;
  }
}
const getTierName = (tier: string | undefined) => {
  switch (tier) {
    case 'diamond': return 'Kim Cương';
    case 'gold': return 'Vàng';
    case 'silver': return 'Bạc';
    case 'bronze': return 'Đồng';
    default: return 'Chưa có hạng';
  }
}

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const session = cookies().get('__session')?.value;
  if (!session) notFound();

  const { uid } = await getAuth().verifySessionCookie(session, true);
  const permissions = await getUserPermissions(uid);

  if (!permissions?.includes('view')) {
    notFound();
  }

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
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
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
        </Card>
         <Card>
          <CardHeader className="pb-2">
            <CardDescription>Khách hàng thân thiết</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {getTierIcon(customer.loyaltyTier)}
              {getTierName(customer.loyaltyTier)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Điểm tích lũy: {customer.loyaltyPoints?.toLocaleString() || 0} điểm
            </div>
          </CardContent>
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
             <div className="flex items-center gap-2 mt-2 pt-2 border-t col-span-2">
               <Landmark className="h-4 w-4 text-muted-foreground" />
              <span>{customer.bankName ? `${customer.bankName} - ${customer.bankAccountNumber}` : 'Chưa có thông tin ngân hàng'}</span>
            </div>
            {customer.bankBranch && (
              <div className="flex items-center gap-2 col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>Chi nhánh: {customer.bankBranch}</span>
              </div>
            )}
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
                <TableHead>Ghi chú</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerPayments.length > 0 ? (
                customerPayments.map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.id.slice(-6).toUpperCase()}</TableCell>
                    <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                    <TableCell>{payment.notes}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">Không tìm thấy thanh toán nào.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
