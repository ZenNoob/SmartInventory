import { notFound } from "next/navigation"
import { ChevronLeft, File, Printer, Mail, Phone, MapPin } from "lucide-react"

import Link from "next/link"
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
  TableFooter,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"

import { formatCurrency } from "@/lib/utils"
import { getAdminServices } from "@/lib/admin-actions"
import type { Customer, Sale, SalesItem, Product, Unit } from "@/lib/types"

async function getSaleData(saleId: string) {
    const { firestore } = await getAdminServices();

    const saleDoc = await firestore.collection('sales_transactions').doc(saleId).get();
    if (!saleDoc.exists) {
        return { sale: null, items: [], customer: null, productsMap: new Map(), unitsMap: new Map() };
    }
    const sale = { id: saleDoc.id, ...saleDoc.data() } as Sale;

    const itemsSnapshot = await firestore.collection('sales_transactions').doc(saleId).collection('sales_items').get();
    const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as SalesItem);

    let customer: Customer | null = null;
    if (sale.customerId) {
        const customerDoc = await firestore.collection('customers').doc(sale.customerId).get();
        if (customerDoc.exists) {
            customer = { id: customerDoc.id, ...customerDoc.data() } as Customer;
        }
    }

    const productIds = [...new Set(items.map(item => item.productId))];
    const productsMap = new Map<string, Product>();
    if (productIds.length > 0) {
        const productsSnapshot = await firestore.collection('products').where('id', 'in', productIds).get();
        productsSnapshot.forEach(doc => {
            productsMap.set(doc.id, { id: doc.id, ...doc.data() } as Product);
        });
    }

    const unitsSnapshot = await firestore.collection('units').get();
    const unitsMap = new Map<string, Unit>();
    unitsSnapshot.forEach(doc => {
        unitsMap.set(doc.id, { id: doc.id, ...doc.data() } as Unit);
    });

    return { sale, items, customer, productsMap, unitsMap };
}


export default async function SaleDetailPage({ params }: { params: { id: string } }) {
  const { sale, items, customer, productsMap, unitsMap } = await getSaleData(params.id);

  if (!sale) {
    notFound()
  }
  
  const getBaseUnit = (unitId: string, pUnitId: string) => {
    const productUnit = unitsMap.get(pUnitId);
    const lotUnit = unitsMap.get(unitId);
    return lotUnit?.baseUnitId ? unitsMap.get(lotUnit.baseUnitId) : productUnit;
  }

  return (
    <div className="grid gap-4 md:gap-8">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/sales">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Quay lại</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Đơn hàng {sale.id.slice(-6).toUpperCase()}
        </h1>
        <div className="hidden items-center gap-2 md:ml-auto md:flex">
          <Button variant="outline" size="sm">
            <File className="mr-2 h-4 w-4" />
            Xuất PDF
          </Button>
          <Button size="sm">
             <Printer className="mr-2 h-4 w-4" />
            In hóa đơn
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Chi tiết đơn hàng</CardTitle>
            <CardDescription>
                Ngày tạo: {new Date(sale.transactionDate).toLocaleString('vi-VN')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead className="text-right">Số lượng</TableHead>
                        <TableHead className="text-right">Đơn giá</TableHead>
                        <TableHead className="text-right">Thành tiền</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map(item => {
                        const product = productsMap.get(item.productId);
                        const baseUnit = product ? getBaseUnit(product.unitId, product.unitId) : undefined;
                        const lineTotal = item.quantity * item.price;
                        return (
                             <TableRow key={item.id}>
                                <TableCell className="font-medium">{product?.name || 'Sản phẩm đã bị xóa'}</TableCell>
                                <TableCell className="text-right">{item.quantity} {baseUnit?.name}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(lineTotal)}</TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={3} className="text-right font-medium">Tổng tiền hàng</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(items.reduce((acc, item) => acc + item.price * item.quantity, 0))}</TableCell>
                    </TableRow>
                    {sale.discount && sale.discount > 0 && (
                        <TableRow>
                            <TableCell colSpan={3} className="text-right font-medium">Giảm giá</TableCell>
                            <TableCell className="text-right text-destructive">- {formatCurrency(sale.discount)}</TableCell>
                        </TableRow>
                    )}
                    <TableRow className="text-lg">
                        <TableCell colSpan={3} className="text-right font-bold">Khách cần trả</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(sale.totalAmount)}</TableCell>
                    </TableRow>
                     {sale.customerPayment && sale.customerPayment > 0 && (
                        <>
                         <TableRow>
                            <TableCell colSpan={3} className="text-right font-medium">Tiền khách đưa</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(sale.customerPayment)}</TableCell>
                        </TableRow>
                         <TableRow>
                            <TableCell colSpan={3} className="text-right font-medium">{sale.customerPayment - sale.totalAmount < 0 ? 'Ghi nợ' : 'Tiền thừa'}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(Math.abs(sale.customerPayment - sale.totalAmount))}</TableCell>
                        </TableRow>
                        </>
                    )}
                </TableFooter>
            </Table>
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Khách hàng</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
                {customer ? (
                    <div className="grid gap-2">
                        <div className="font-semibold text-base">{customer.name}</div>
                        <Separator />
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{customer.email || 'Chưa có'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{customer.phone || 'Chưa có'}</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                            <span>{customer.address || 'Chưa có'}</span>
                        </div>
                    </div>
                ) : (
                    <p>Khách lẻ</p>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  )
}
