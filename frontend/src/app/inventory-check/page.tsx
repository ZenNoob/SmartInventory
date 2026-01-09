'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, XCircle, RefreshCw, AlertTriangle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"

interface InventoryCheckResult {
  productId: string;
  productName: string;
  unitName: string;
  totalPurchased: number;
  totalSold: number;
  expectedStock: number;
  actualStock: number;
  difference: number;
  isBalanced: boolean;
}

interface SaleCalculationResult {
  saleId: string;
  invoiceNumber: string;
  customerName: string;
  transactionDate: string;
  calculation: {
    storedTotalAmount: number;
    calculatedTotalAmount: number;
    isAmountCorrect: boolean;
    storedFinalAmount: number;
    expectedFinalAmount: number;
    isFinalCorrect: boolean;
    storedRemainingDebt: number;
    expectedRemainingDebt: number;
    isDebtCorrect: boolean;
  };
  isAllCorrect: boolean;
}

interface PurchaseCalculationResult {
  purchaseId: string;
  supplierName: string;
  purchaseDate: string;
  calculation: {
    storedTotalAmount: number;
    calculatedTotalAmount: number;
    isAmountCorrect: boolean;
    storedRemainingDebt: number;
    expectedRemainingDebt: number;
    isDebtCorrect: boolean;
  };
  isAllCorrect: boolean;
}

export default function InventoryCheckPage() {
  const [inventoryData, setInventoryData] = useState<{
    summary: { totalProducts: number; balancedProducts: number; unbalancedProducts: number };
    products: InventoryCheckResult[];
  } | null>(null);
  
  const [salesData, setSalesData] = useState<{
    summary: { totalSales: number; correctSales: number; incorrectSales: number };
    sales: SaleCalculationResult[];
  } | null>(null);
  
  const [purchasesData, setPurchasesData] = useState<{
    summary: { totalPurchases: number; correctPurchases: number; incorrectPurchases: number };
    purchases: PurchaseCalculationResult[];
  } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');

  const fetchInventoryCheck = async () => {
    setLoading(true);
    try {
      const data = await apiClient.request<{
        success: boolean;
        summary: { totalProducts: number; balancedProducts: number; unbalancedProducts: number };
        products: InventoryCheckResult[];
      }>('/inventory-check');
      setInventoryData(data);
    } catch (error) {
      console.error('Error fetching inventory check:', error);
    }
    setLoading(false);
  };

  const fetchSalesCheck = async () => {
    setLoading(true);
    try {
      const data = await apiClient.request<{
        success: boolean;
        summary: { totalSales: number; correctSales: number; incorrectSales: number };
        sales: SaleCalculationResult[];
      }>('/inventory-check/sales-calculation');
      setSalesData(data);
    } catch (error) {
      console.error('Error fetching sales check:', error);
    }
    setLoading(false);
  };

  const fetchPurchasesCheck = async () => {
    setLoading(true);
    try {
      const data = await apiClient.request<{
        success: boolean;
        summary: { totalPurchases: number; correctPurchases: number; incorrectPurchases: number };
        purchases: PurchaseCalculationResult[];
      }>('/inventory-check/purchases-calculation');
      setPurchasesData(data);
    } catch (error) {
      console.error('Error fetching purchases check:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'inventory' && !inventoryData) {
      fetchInventoryCheck();
    } else if (activeTab === 'sales' && !salesData) {
      fetchSalesCheck();
    } else if (activeTab === 'purchases' && !purchasesData) {
      fetchPurchasesCheck();
    }
  }, [activeTab]);

  const handleRefresh = () => {
    if (activeTab === 'inventory') {
      fetchInventoryCheck();
    } else if (activeTab === 'sales') {
      fetchSalesCheck();
    } else if (activeTab === 'purchases') {
      fetchPurchasesCheck();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kiểm tra tính toán</h1>
          <p className="text-sm text-muted-foreground">
            Kiểm tra số chẵn/lẻ giữa nhập hàng, bán hàng và tồn kho
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inventory">Tồn kho</TabsTrigger>
          <TabsTrigger value="sales">Đơn bán hàng</TabsTrigger>
          <TabsTrigger value="purchases">Đơn nhập hàng</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          {inventoryData && (
            <>
              <div className="grid gap-4 md:grid-cols-3 mb-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Tổng sản phẩm</CardDescription>
                    <CardTitle className="text-2xl">{inventoryData.summary.totalProducts}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Cân bằng</CardDescription>
                    <CardTitle className="text-2xl text-green-600">
                      {inventoryData.summary.balancedProducts}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Chênh lệch</CardDescription>
                    <CardTitle className="text-2xl text-red-600">
                      {inventoryData.summary.unbalancedProducts}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Chi tiết tồn kho</CardTitle>
                  <CardDescription>
                    So sánh giữa tổng nhập - tổng bán và tồn kho thực tế
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead>ĐVT</TableHead>
                        <TableHead className="text-right">Tổng nhập</TableHead>
                        <TableHead className="text-right">Tổng bán</TableHead>
                        <TableHead className="text-right">Tồn dự kiến</TableHead>
                        <TableHead className="text-right">Tồn thực tế</TableHead>
                        <TableHead className="text-right">Chênh lệch</TableHead>
                        <TableHead className="text-center">Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryData.products.map((product) => (
                        <TableRow key={product.productId}>
                          <TableCell className="font-medium">{product.productName}</TableCell>
                          <TableCell>{product.unitName}</TableCell>
                          <TableCell className="text-right">{product.totalPurchased.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{product.totalSold.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{product.expectedStock.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{product.actualStock.toLocaleString()}</TableCell>
                          <TableCell className={`text-right ${product.difference !== 0 ? 'text-red-600 font-semibold' : ''}`}>
                            {product.difference.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            {product.isBalanced ? (
                              <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {inventoryData.products.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center h-24">
                            Không có dữ liệu
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="sales">
          {salesData && (
            <>
              <div className="grid gap-4 md:grid-cols-3 mb-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Tổng đơn bán</CardDescription>
                    <CardTitle className="text-2xl">{salesData.summary.totalSales}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Tính toán đúng</CardDescription>
                    <CardTitle className="text-2xl text-green-600">
                      {salesData.summary.correctSales}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Tính toán sai</CardDescription>
                    <CardTitle className="text-2xl text-red-600">
                      {salesData.summary.incorrectSales}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Chi tiết đơn bán hàng</CardTitle>
                  <CardDescription>
                    Kiểm tra tính toán tổng tiền, giảm giá, VAT và công nợ
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã đơn</TableHead>
                        <TableHead>Khách hàng</TableHead>
                        <TableHead>Ngày</TableHead>
                        <TableHead className="text-right">Tổng lưu</TableHead>
                        <TableHead className="text-right">Tổng tính</TableHead>
                        <TableHead className="text-right">Thành tiền lưu</TableHead>
                        <TableHead className="text-right">Thành tiền tính</TableHead>
                        <TableHead className="text-center">Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData.sales.map((sale) => (
                        <TableRow key={sale.saleId}>
                          <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
                          <TableCell>{sale.customerName}</TableCell>
                          <TableCell>{new Date(sale.transactionDate).toLocaleDateString('vi-VN')}</TableCell>
                          <TableCell className="text-right">{formatCurrency(sale.calculation.storedTotalAmount)}</TableCell>
                          <TableCell className={`text-right ${!sale.calculation.isAmountCorrect ? 'text-red-600' : ''}`}>
                            {formatCurrency(sale.calculation.calculatedTotalAmount)}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(sale.calculation.storedFinalAmount)}</TableCell>
                          <TableCell className={`text-right ${!sale.calculation.isFinalCorrect ? 'text-red-600' : ''}`}>
                            {formatCurrency(sale.calculation.expectedFinalAmount)}
                          </TableCell>
                          <TableCell className="text-center">
                            {sale.isAllCorrect ? (
                              <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-yellow-600 mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {salesData.sales.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center h-24">
                            Không có dữ liệu
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="purchases">
          {purchasesData && (
            <>
              <div className="grid gap-4 md:grid-cols-3 mb-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Tổng đơn nhập</CardDescription>
                    <CardTitle className="text-2xl">{purchasesData.summary.totalPurchases}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Tính toán đúng</CardDescription>
                    <CardTitle className="text-2xl text-green-600">
                      {purchasesData.summary.correctPurchases}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Tính toán sai</CardDescription>
                    <CardTitle className="text-2xl text-red-600">
                      {purchasesData.summary.incorrectPurchases}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Chi tiết đơn nhập hàng</CardTitle>
                  <CardDescription>
                    Kiểm tra tính toán tổng tiền và công nợ nhà cung cấp
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nhà cung cấp</TableHead>
                        <TableHead>Ngày nhập</TableHead>
                        <TableHead className="text-right">Tổng lưu</TableHead>
                        <TableHead className="text-right">Tổng tính</TableHead>
                        <TableHead className="text-right">Nợ lưu</TableHead>
                        <TableHead className="text-right">Nợ tính</TableHead>
                        <TableHead className="text-center">Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchasesData.purchases.map((purchase) => (
                        <TableRow key={purchase.purchaseId}>
                          <TableCell className="font-medium">{purchase.supplierName}</TableCell>
                          <TableCell>{new Date(purchase.purchaseDate).toLocaleDateString('vi-VN')}</TableCell>
                          <TableCell className="text-right">{formatCurrency(purchase.calculation.storedTotalAmount)}</TableCell>
                          <TableCell className={`text-right ${!purchase.calculation.isAmountCorrect ? 'text-red-600' : ''}`}>
                            {formatCurrency(purchase.calculation.calculatedTotalAmount)}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(purchase.calculation.storedRemainingDebt)}</TableCell>
                          <TableCell className={`text-right ${!purchase.calculation.isDebtCorrect ? 'text-red-600' : ''}`}>
                            {formatCurrency(purchase.calculation.expectedRemainingDebt)}
                          </TableCell>
                          <TableCell className="text-center">
                            {purchase.isAllCorrect ? (
                              <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-yellow-600 mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {purchasesData.purchases.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-24">
                            Không có dữ liệu
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
