
'use client'

import { useState } from "react"
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
import { getMarketBasketAnalysis } from "@/app/actions"

type ProductPair = {
  productA_name: string;
  productB_name: string;
  frequency: number;
  support: number;
  confidence: number;
  lift: number;
  suggestion: string;
};

type ProductCluster = {
  products: string[];
  frequency: number;
  suggestion: string;
};

type AnalysisResult = {
  productPairs: ProductPair[];
  productClusters: ProductCluster[];
  analysisSummary: string;
};

export default function MarketBasketAnalysisPage() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currentStore } = useStore();

  const handleAnalyze = async () => {
    if (!currentStore) {
      setError("Vui lòng chọn cửa hàng trước khi phân tích.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);

    const result = await getMarketBasketAnalysis();

    if (result.success && result.data) {
      setAnalysisResult(result.data as AnalysisResult);
    } else {
      setError(result.error || "Đã xảy ra lỗi không xác định khi phân tích.");
    }
    setIsAnalyzing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Phân tích Rổ hàng hóa</CardTitle>
                <CardDescription>
                Khám phá sản phẩm nào thường được mua cùng nhau và nhận gợi ý marketing.
                </CardDescription>
            </div>
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? (
                    <>
                        <Bot className="mr-2 h-4 w-4 animate-spin" />
                        Đang phân tích...
                    </>
                ) : (
                    <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Chạy phân tích
                    </>
                )}
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isAnalyzing && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
                <Bot className="h-12 w-12 animate-pulse" />
                <p>Đang phân tích dữ liệu bán hàng...</p>
            </div>
        )}
        {error && <div className="text-destructive text-center p-4">{error}</div>}
        {!isAnalyzing && !analysisResult && !error && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center text-muted-foreground">
                <PackagePlus className="h-12 w-12" />
                <p>Bạn muốn biết khách hàng thường mua những gì cùng nhau? <br/> Nhấn nút "Chạy phân tích" để khám phá.</p>
            </div>
        )}
        {analysisResult && (
            <div className="space-y-6">
                 <div className="p-4 mb-6 border bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2">Tóm tắt phân tích</h4>
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
                                    <TableHead className="text-center">Độ tin cậy</TableHead>
                                    <TableHead className="text-center">Lift</TableHead>
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
                                        <TableCell className="text-center">{Math.round(pair.confidence * 100)}%</TableCell>
                                        <TableCell className="text-center">
                                          <Badge variant={pair.lift > 2 ? "default" : "outline"}>
                                            {pair.lift.toFixed(2)}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-xs">{pair.suggestion}</TableCell>
                                    </TableRow>
                                ))}
                                {analysisResult.productPairs.length === 0 && (
                                  <TableRow>
                                      <TableCell colSpan={5} className="text-center h-24">Không tìm thấy cặp sản phẩm nào nổi bật.</TableCell>
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
                                        <TableCell className="max-w-xs">{cluster.suggestion}</TableCell>
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
