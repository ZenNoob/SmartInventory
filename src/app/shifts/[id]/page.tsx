
'use client'

import { notFound, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
} from '@/firebase'
import {
  collection,
  doc,
  query,
  where,
} from 'firebase/firestore'
import type { Customer, Sale, Shift } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import {
  ChevronLeft,
  Clock,
  User,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
  Hash,
} from 'lucide-react'
import { useMemo } from 'react'

export default function ShiftDetailPage({ params }: { params: { id: string } }) {
  const firestore = useFirestore()
  const router = useRouter()
  const shiftId = params.id;

  const shiftRef = useMemoFirebase(
    () => (firestore && shiftId ? doc(firestore, 'shifts', shiftId) : null),
    [firestore, shiftId]
  )
  const { data: shift, isLoading: shiftLoading } = useDoc<Shift>(shiftRef)

  const salesQuery = useMemoFirebase(
    () =>
      firestore && shiftId
        ? query(
            collection(firestore, 'sales_transactions'),
            where('shiftId', '==', shiftId)
          )
        : null,
    [firestore, shiftId]
  )
  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery)

  const customersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'customers')) : null),
    [firestore]
  )
  const { data: customers, isLoading: customersLoading } =
    useCollection<Customer>(customersQuery)

  const customersMap = useMemo(() => {
    if (!customers) return new Map()
    return new Map(customers.map((c) => [c.id, c.name]))
  }, [customers])

  const isLoading = shiftLoading || salesLoading || customersLoading

  if (!shift && !isLoading) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/shifts">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Quay lại</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            Chi tiết Ca làm việc
          </h1>
          {shift && (
             <p className="text-sm text-muted-foreground">
                Ca của {shift.userName} - Ngày {new Date(shift.startTime).toLocaleDateString('vi-VN')}
            </p>
          )}
        </div>
      </div>

      {isLoading && <p>Đang tải chi tiết ca...</p>}

      {shift && (
        <>
           <Card>
             <CardHeader>
                <CardTitle>Báo cáo cuối ca</CardTitle>
             </CardHeader>
             <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                    <User className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <p className="text-muted-foreground">Nhân viên</p>
                        <p className="font-semibold">{shift.userName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <p className="text-muted-foreground">Thời gian</p>
                        <p className="font-semibold">{new Date(shift.startTime).toLocaleTimeString('vi-VN')} - {shift.endTime ? new Date(shift.endTime).toLocaleTimeString('vi-VN') : 'Đang hoạt động'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                    <DollarSign className="h-6 w-6 text-green-500" />
                    <div>
                        <p className="text-muted-foreground">Tiền đầu ca</p>
                        <p className="font-semibold">{formatCurrency(shift.startingCash)}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-3 rounded-lg border p-3">
                    <DollarSign className="h-6 w-6 text-blue-500" />
                    <div>
                        <p className="text-muted-foreground">Tiền cuối ca (Thực tế)</p>
                        <p className="font-semibold">{formatCurrency(shift.endingCash || 0)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    <div>
                        <p className="text-muted-foreground">Doanh thu bán hàng</p>
                        <p className="font-semibold">{formatCurrency(shift.totalRevenue)}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-3 rounded-lg border p-3">
                    <TrendingDown className="h-6 w-6 text-yellow-500" />
                    <div>
                        <p className="text-muted-foreground">Tiền mặt thu trong ca</p>
                        <p className="font-semibold">{formatCurrency(shift.cashSales || 0)}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-3 rounded-lg border p-3">
                    <Scale className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <p className="text-muted-foreground">Chênh lệch tiền mặt</p>
                        <p className={`font-semibold ${shift.cashDifference !== 0 ? 'text-destructive' : ''}`}>{formatCurrency(shift.cashDifference || 0)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                    <Hash className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <p className="text-muted-foreground">Số đơn hàng</p>
                        <p className="font-semibold">{shift.salesCount}</p>
                    </div>
                </div>
             </CardContent>
           </Card>

          <Card>
            <CardHeader>
              <CardTitle>Các giao dịch trong ca</CardTitle>
              <CardDescription>
                Danh sách tất cả các đơn hàng được thực hiện trong ca làm việc này.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã đơn hàng</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead className="text-right">Tổng tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesLoading && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        Đang tải danh sách đơn hàng...
                      </TableCell>
                    </TableRow>
                  )}
                  {!salesLoading && sales?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        Không có đơn hàng nào trong ca này.
                      </TableCell>
                    </TableRow>
                  )}
                  {sales?.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/sales/${sale.id}`}
                          className="hover:underline"
                        >
                          {sale.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {customersMap.get(sale.customerId) || 'Khách lẻ'}
                      </TableCell>
                       <TableCell>{new Date(sale.transactionDate).toLocaleTimeString('vi-VN')}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(sale.finalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
