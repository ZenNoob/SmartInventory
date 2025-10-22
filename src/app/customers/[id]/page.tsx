import { notFound } from "next/navigation"
import { ChevronLeft, PlusCircle, CreditCard, Bot } from "lucide-react"

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

import { customers, getCustomerDebt, payments, sales } from "@/lib/data"
import { formatCurrency } from "@/lib/utils"
import { PredictRiskForm } from "./components/predict-risk-form"

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = customers.find(c => c.id === params.id)

  if (!customer) {
    notFound()
  }

  const totalDebt = getCustomerDebt(customer.id)
  const customerPayments = payments.filter(p => p.customerId === customer.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const customerSales = sales.filter(s => s.customerId === customer.id);

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
        {customer.isAgent && <Badge variant="secondary">Đại lý</Badge>}
        <div className="hidden items-center gap-2 md:ml-auto md:flex">
          <Button variant="outline" size="sm">
            Sửa
          </Button>
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
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Liên hệ</CardDescription>
            <CardTitle className="text-lg">{customer.name}</CardTitle>
            <div className="text-sm text-muted-foreground">{customer.email}</div>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Khách hàng từ {new Date(customerSales[0]?.date || Date.now()).getFullYear()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Dự đoán rủi ro nợ</CardDescription>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">Đánh giá rủi ro trả nợ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
                Sử dụng AI để phân tích lịch sử thanh toán và dự đoán rủi ro vỡ nợ.
            </p>
          </CardContent>
          <CardFooter>
            <PredictRiskForm customer={customer} />
          </CardFooter>
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
                    <TableCell className="font-medium">{payment.id}</TableCell>
                    <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">Không tìm thấy thanh toán nào.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
