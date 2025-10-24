'use client'

import { useRef } from 'react'
import Link from "next/link"
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { ChevronLeft, File, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { Logo } from "@/components/icons"
import { formatCurrency } from "@/lib/utils"
import type { Customer, Sale, SalesItem, Product, Unit } from "@/lib/types"

interface SaleInvoiceProps {
    sale: Sale;
    items: SalesItem[];
    customer: Customer | null;
    productsMap: Map<string, Product>;
    unitsMap: Map<string, Unit>;
}

export function SaleInvoice({ sale, items, customer, productsMap, unitsMap }: SaleInvoiceProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const getUnitInfo = (unitId: string) => {
    const unit = unitsMap.get(unitId);
    if (!unit) return { baseUnit: undefined, conversionFactor: 1, name: '' };
    
    if (unit.baseUnitId && unit.conversionFactor) {
      const baseUnit = unitsMap.get(unit.baseUnitId);
      return { baseUnit, conversionFactor: unit.conversionFactor, name: unit.name };
    }
    
    return { baseUnit: unit, conversionFactor: 1, name: unit.name };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const input = invoiceRef.current;
    if (!input) {
      return;
    }

    // Hide buttons before capturing
    const buttons = input.querySelectorAll('button');
    buttons.forEach(btn => btn.style.display = 'none');
    const links = input.querySelectorAll('a');
    links.forEach(link => link.style.display = 'none');


    html2canvas(input, {
        scale: 2, // Increase scale for better resolution
        useCORS: true, 
    }).then((canvas) => {
      // Show buttons after capturing
      buttons.forEach(btn => btn.style.display = '');
      links.forEach(link => link.style.display = '');
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`HD-${sale.id.slice(-6).toUpperCase()}.pdf`);
    });
  };

  const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const remainingDebt = (totalAmount + (sale.previousDebt || 0)) - (sale.customerPayment || 0);

  return (
    <div ref={invoiceRef}>
        <div className="flex items-center gap-4 mb-4 print:hidden">
            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href="/sales">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Quay lại</span>
            </Link>
            </Button>
            <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <File className="mr-2 h-4 w-4" />
                Xuất PDF
            </Button>
            <Button size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                In hóa đơn
            </Button>
            </div>
      </div>
        <Card className="p-6 sm:p-8 shadow-none border-none sm:border-solid sm:shadow-sm">
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
                        <TableCell className="text-right font-semibold">{formatCurrency(totalAmount)}</TableCell>
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
                        <TableCell className="text-right font-bold">{formatCurrency(remainingDebt)}</TableCell>
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
