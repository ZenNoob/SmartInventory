import { notFound } from "next/navigation"
import { ChevronLeft, Phone, Mail, MapPin, Cake, User, Landmark, Trophy, Gem, Star, Shield, AlertTriangle } from "lucide-react"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

import { formatCurrency } from "@/lib/utils"
import { PredictRiskForm } from "./components/predict-risk-form"
import { getCustomer, getCustomerDebt } from "../actions"

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

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Fetch customer data from SQL Server API
  const [customerResult, debtResult] = await Promise.all([
    getCustomer(id, { includeDebt: true, includeLoyalty: true }),
    getCustomerDebt(id, true),
  ]);

  if (!customerResult.success || !customerResult.customer) {
    notFound();
  }

  const customer = customerResult.customer;
  const debtInfo = debtResult.debtInfo;
  const history = debtResult.history || [];


  // Separate sales and payments from history
  const salesHistory = history.filter(h => h.type === 'sale').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const paymentsHistory = history.filter(h => h.type === 'payment').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalDebt = debtInfo?.currentDebt || customer.currentDebt || 0;
  const isOverLimit = debtInfo?.isOverLimit || (customer.creditLimit > 0 && totalDebt > customer.creditLimit);

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
          <PredictRiskForm customer={customer} sales={salesHistory} payments={paymentsHistory} />
        </div>
      </div>

      {/* Credit Limit Warning */}
      {isOverLimit && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Cảnh báo vượt hạn mức tín dụng</AlertTitle>
          <AlertDescription>
            Khách hàng đã vượt hạn mức tín dụng. Nợ hiện tại: {formatCurrency(totalDebt)}, Hạn mức: {formatCurrency(customer.creditLimit)}
          </AlertDescription>
        </Alert>
      )}

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
            {debtInfo && (
              <div className="text-xs text-muted-foreground mt-1">
                Còn lại: {formatCurrency(debtInfo.availableCredit)}
              </div>
            )}
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
            <div className="text-xs text-muted-foreground">
              Tổng điểm: {customer.lifetimePoints?.toLocaleString() || 0} điểm
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
              <span>{customer.birthday ? new Date(customer.birthday).toLocaleDateString('vi-VN') : 'Chưa có'}</span>
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


      {/* Debt History */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử công nợ</CardTitle>
          <CardDescription>Tất cả giao dịch mua hàng và thanh toán của khách hàng.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Ngày</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
                <TableHead className="text-right">Số dư</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length > 0 ? (
                [...history].reverse().map(item => (
                  <TableRow key={`${item.type}-${item.id}`}>
                    <TableCell className="font-medium">{item.id.slice(-6).toUpperCase()}</TableCell>
                    <TableCell>{new Date(item.date).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>
                      <Badge variant={item.type === 'sale' ? 'destructive' : 'default'}>
                        {item.type === 'sale' ? 'Mua hàng' : 'Thanh toán'}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className={`text-right ${item.type === 'sale' ? 'text-destructive' : 'text-green-600'}`}>
                      {item.type === 'sale' ? '+' : '-'}{formatCurrency(Math.abs(item.amount))}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.runningBalance)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">Không có lịch sử công nợ.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment History */}
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
              {paymentsHistory.length > 0 ? (
                paymentsHistory.map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.id.slice(-6).toUpperCase()}</TableCell>
                    <TableCell>{new Date(payment.date).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>{payment.description}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(Math.abs(payment.amount))}</TableCell>
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
