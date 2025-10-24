import { notFound } from "next/navigation"
import { ChevronLeft, File, Printer } from "lucide-react"

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
import { Logo } from "@/components/icons"
import { useMemo } from "react"


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
        // Firestore 'in' queries are limited to 30 elements. If you expect more, you'll need to batch the requests.
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
  
  const getUnitInfo = (unitId: string) => {
    const unit = unitsMap.get(unitId);
    if (!unit) return { baseUnit: undefined, conversionFactor: 1, name: '' };
    
    if (unit.baseUnitId && unit.conversionFactor) {
      const baseUnit = unitsMap.get(unit.baseUnitId);
      return { baseUnit, conversionFactor: unit.conversionFactor, name: unit.name };
    }
    
    return { baseUnit: unit, conversionFactor: 1, name: unit.name };
  };

  const lineItemsTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div>
        <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href="/sales">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Quay lại</span>
            </Link>
            </Button>
            <div className="ml-auto flex items-center gap-2">
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
        <Card className="p-6 sm:p-8">
            <header className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Logo className="h-16 w-16 text-primary" />
                    <div>
                        <p className="font-semibold text-lg">CƠ SỞ SẢN XUẤT VÀ KINH DOANH GIỐNG CÂY TRỒNG</p>
                        <p className="font-bold text-2xl text-primary">MINH PHÁT</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-semibold">70 Ấp 1, X. Mỹ Thạnh, H. Thủ Thừa, T. Long an</p>
                    <p>Điện thoại: 0915 582 447</p>
                </div>
            </header>

            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold tracking-wider">HÓA ĐƠN BÁN HÀNG</h1>
                <div className="flex justify-center items-center gap-4 text-sm mt-2">
                    <span>Ngày {new Date(sale.transactionDate).getDate()}</span>
                    <span>Tháng {new Date(sale.transactionDate).getMonth() + 1}</span>
                    <span>Năm {new Date(sale.transactionDate).getFullYear()}</span>
                    <span className="font-semibold">Số HĐ: {sale.id.slice(-6).toUpperCase()}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6">
                <p><span className="font-semibold">Khách hàng:</span> {customer?.name || 'Khách lẻ'}</p>
                <p><span className="font-semibold">Điện thoại:</span> {customer?.phone || 'N/A'}</p>
                <p className="col-span-2"><span className="font-semibold">Địa chỉ:</span> {customer?.address || 'N/A'}</p>
                <p className="col-span-2"><span className="font-semibold">MB Bank-Số Tài khoản:</span> 0915582447-Chủ TK: NGUYỄN THÀNH LÂM</p>
            </div>
            
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">STT</TableHead>
                        <TableHead>TÊN HÀNG</TableHead>
                        <TableHead className="text-right">BAO</TableHead>
                        <TableHead className="text-right">ĐVT</TableHead>
                        <TableHead className="text-right">SL</TableHead>
                        <TableHead className="text-right">ĐƠN GIÁ</TableHead>
                        <TableHead className="text-right">THÀNH TIỀN</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item, index) => {
                        const product = productsMap.get(item.productId);
                        if (!product) return null;
                        
                        const saleUnitInfo = getUnitInfo(product.unitId);
                        const baseUnit = saleUnitInfo.baseUnit || unitsMap.get(product.unitId);
                        
                        const quantityInSaleUnit = saleUnitInfo.conversionFactor 
                            ? item.quantity / saleUnitInfo.conversionFactor 
                            : item.quantity;
                        
                        const lineTotal = item.quantity * item.price;

                        return (
                             <TableRow key={item.id}>
                                <TableCell className="text-center">{index + 1}</TableCell>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell className="text-right">{quantityInSaleUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                                <TableCell className="text-right">{baseUnit?.name}</TableCell>
                                <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(lineTotal)}</TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={6} className="text-right font-medium">Tổng tiền hàng</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(sale.totalAmount || 0)}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={6} className="text-right font-medium">Nợ cũ</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(sale.previousDebt || 0)}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={6} className="text-right font-medium">Khách thanh toán</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(sale.customerPayment || 0)}</TableCell>
                    </TableRow>
                     <TableRow className="text-lg">
                        <TableCell colSpan={6} className="text-right font-bold">Còn Nợ lại</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(sale.remainingDebt || 0)}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
            
            <div className="mt-12 text-center text-sm">
                <p>Minh Phát chân thành cảm ơn quý khách hàng đã luôn tin tưởng và ủng hộ sản phẩm bên chúng tôi!</p>
            </div>
            
            <div className="flex justify-around mt-8 pt-8">
                <div className="text-center">
                    <p className="font-semibold">NGƯỜI GIAO HÀNG</p>
                </div>
                <div className="text-center">
                    <p className="font-semibold">NGƯỜI NHẬN HÀNG</p>
                </div>
            </div>
        </Card>
    </div>
  )
}
