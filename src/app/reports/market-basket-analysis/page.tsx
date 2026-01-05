
'use client'

import { useState, useMemo, useEffect } from "react"
import { Bot, Sparkles, PackagePlus } from "lucide-react"

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useStore } from "@/contexts/store-context"
import { Sale, SalesItem, Product } from "@/lib/types"
import { type MarketBasketAnalysisOutput } from "@/ai/flows/analyze-market-basket"
import { getMarketBasketAnalysis } from "@/app/actions"
import { useUserRole } from "@/hooks/use-user-role"

export default function MarketBasketAnalysisPage() {
  const [analysisResult, setAnalysisResult] = useState<MarketBasketAnalysisOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allSalesItems, setAllSalesItems] = useState<SalesItem[]>([]);
  const [salesItemsLoading, setSalesItemsLoading] = useState(true);

  const { currentStore } = useStore();
  const { permissions } = useUserRole();

  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    if (!currentStore) return;

    const fetchData = async () => {
      try {
        setSalesLoading(true);
        const salesRes = await fetch('/api/sales');
        if (salesRes.ok) {
          const data = await salesRes.json();
          setSales(data.data || []);
        }
        setSalesLoading(false);

        setProductsLoading(true);
        const productsRes = await fetch('/api/products');
        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data.data || []);
        }
        setProductsLoading(false);
      } catch (error) {
        console.error('Error fetching market basket data:', error);
        setSalesLoading(false);
        setProductsLoading(false);
      }
    };

    fetchData();
  }, [currentStore]);

  const productsMap = useMemo(() => {
    if (!products) return new Map();
    return new Map(products.map(p => [p.id, p.name]));
  }, [products]);

  useEffect(() => {
    async function fetchAllSalesItems() {
      if (salesLoading || sales.length === 0) {
        setSalesItemsLoading(false);
        return;
      }
      setSalesItemsLoading(true);
      const items: SalesItem[] = [];
      try {
        for (const sale of sales) {
          const res = await fetch(`/api/sales/${sale.id}/items`);
          if (res.ok) {
            const data = await res.json();
            if (data.data) {
              items.push(...data.data.map((item: SalesItem) => ({ ...item, salesTransactionId: sale.id })));
            }
          }
        }
        setAllSalesItems(items);
      } catch (error) {
        console.error("Error fetching sales items:", error);
      } finally {
        setSalesItemsLoading(false);
      }
    }
    fetchAllSalesItems();
  }, [sales, salesLoading]);

  const handleAnalyze = async () => {
    if (!sales || !allSalesItems.length) {
      setError("Dữ liệu bán hàng chưa sẵn sàng. Vui lòng thử lại sau.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);

    const transactionsWithProductNames = sales.map(sale => {
      const itemsForSale = allSalesItems
        .filter(item => item.salesTransactionId === sale.id)
        .map(item => productsMap.get(item.productId))
        .filter(Boolean); // Filter out undefined if product not found
      return {
        transactionId: sale.id,
        products: itemsForSale,
      };
    }).filter(t => t.products.length > 1); // Only include transactions with more than one product

    const result = await getMarketBasketAnalysis({
      salesTransactions: JSON.stringify(transactionsWithProductNames),
    });

    if (result.success && result.data) {
      setAnalysisResult(result.data);
    } else {
      setError(result.error || "Đã xảy ra lỗi không xác định khi phân tích.");
    }
    setIsAnalyzing(false);
  };

  const isLoading = salesLoading || productsLoading || salesItemsLoading;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Phân tích Rổ hàng hóa</CardTitle>
                <CardDescription>
                Dùng AI để khám phá sản phẩm nào thường được mua cùng nhau và nhận gợi ý marketing.
                </CardDescription>
            </div>
            {permissions?.ai_basket_analysis?.includes('view') && (
              <Button onClick={handleAnalyze} disabled={isLoading || isAnalyzing}>
                  {isAnalyzing ? (
                      <>
                          <Bot className="mr-2 h-4 w-4 animate-spin" />
                          Đang phân tích...
                      </>
                  ) : (
                      <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Chạy phân tích AI
                      </>
                  )}
              </Button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        {isAnalyzing && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
                <Bot className="h-12 w-12 animate-pulse" />
                <p>AI đang phân tích dữ liệu bán hàng... Quá trình này có thể mất một chút thời gian.</p>
            </div>
        )}
        {error && <div className="text-destructive text-center p-4">{error}</div>}
        {!isAnalyzing && !analysisResult && !error && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center text-muted-foreground">
                <PackagePlus className="h-12 w-12" />
                <p>Bạn muốn biết khách hàng thường mua những gì cùng nhau? <br/> Nhấn nút "Chạy phân tích AI" để khám phá.</p>
            </div>
        )}
        {analysisResult && (
            <div className="space-y-6">
                 <div className="p-4 mb-6 border bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2">Tóm tắt của AI</h4>
                    <p className="text-sm text-muted-foreground">{analysisResult.analysisSummary}</p>
                </div>
                <Tabs defaultValue="pairs">
                    <TabsList>
                        <TabsTrigger value="pairs">Cặp sản phẩm ({analysisResult.productPairs.length})</TabsTrigger>
                        <TabsTrigger value="clusters">Cụm sản phẩm ({analysisResult.productClusters.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pairs" className="mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cặp sản phẩm</TableHead>
                                    <TableHead className="text-center">Tần suất</TableHead>
                                    <TableHead>Gợi ý Marketing</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analysisResult.productPairs.map((pair, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">
                                          <div>{pair.productA_name}</div>
                                          <div className="text-muted-foreground">&</div>
                                          <div>{pair.productB_name}</div>
                                        </TableCell>
                                        <TableCell className="text-center"><Badge variant="secondary">{pair.frequency}</Badge></TableCell>
                                        <TableCell>{pair.suggestion}</TableCell>
                                    </TableRow>
                                ))}
                                {analysisResult.productPairs.length === 0 && (
                                  <TableRow>
                                      <TableCell colSpan={3} className="text-center h-24">Không tìm thấy cặp sản phẩm nào nổi bật.</TableCell>
                                  </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="clusters" className="mt-4">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cụm sản phẩm</TableHead>
                                    <TableHead className="text-center">Tần suất</TableHead>
                                    <TableHead>Gợi ý Marketing</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analysisResult.productClusters.map((cluster, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">
                                          <ul className="list-disc list-inside">
                                            {cluster.products.map(p => <li key={p}>{p}</li>)}
                                          </ul>
                                        </TableCell>
                                        <TableCell className="text-center"><Badge variant="secondary">{cluster.frequency}</Badge></TableCell>
                                        <TableCell>{cluster.suggestion}</TableCell>
                                    </TableRow>
                                ))}
                                 {analysisResult.productClusters.length === 0 && (
                                  <TableRow>
                                      <TableCell colSpan={3} className="text-center h-24">Không tìm thấy cụm sản phẩm nào nổi bật.</TableCell>
                                  </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TabsContent>
                </Tabs>
            </div>
        )}
      </CardContent>
    </Card>
  )
}
