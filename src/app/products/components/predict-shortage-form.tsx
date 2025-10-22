'use client'

import { useState } from 'react'
import { Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { getInventoryShortagePrediction } from '@/app/actions'
import { products, sales } from '@/lib/data'
import { type PredictInventoryShortageOutput } from '@/ai/flows/predict-inventory-shortage'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

export function PredictShortageForm() {
  const [open, setOpen] = useState(false)
  const [prediction, setPrediction] = useState<PredictInventoryShortageOutput | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePredict = async () => {
    setIsLoading(true)
    setError(null)
    setPrediction(null)

    const historicalSalesData = JSON.stringify(sales);
    const currentInventoryLevels = JSON.stringify(products.map(p => ({ productId: p.id, quantity: p.stock })));
    
    const result = await getInventoryShortagePrediction({
        historicalSalesData,
        currentInventoryLevels,
        upcomingSalesEvents: 'Giảm giá Black Friday vào tháng tới, dự kiến doanh số bán hàng điện tử tăng 50%.',
    })

    if (result.success && result.data) {
      setPrediction(result.data)
    } else {
      setError(result.error || 'Đã xảy ra lỗi không xác định.')
    }
    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1">
          <Bot className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Dự đoán thiếu hụt
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dự đoán thiếu hụt hàng tồn kho</DialogTitle>
          <DialogDescription>
            Sử dụng AI để dự báo tình trạng thiếu hụt sản phẩm tiềm năng dựa trên dữ liệu lịch sử.
          </DialogDescription>
        </DialogHeader>
        {!prediction && !isLoading && !error && (
            <div className="flex items-center space-x-2">
                <p>Nhấp vào nút bên dưới để bắt đầu dự đoán của AI.</p>
            </div>
        )}
        
        {isLoading && <div className="flex justify-center items-center p-8"><Bot className="h-8 w-8 animate-spin" /> <span className="ml-2">Đang phân tích dữ liệu...</span></div>}
        
        {error && <div className="text-destructive p-4 bg-destructive/10 rounded-md">{error}</div>}

        {prediction && (
            <ScrollArea className="max-h-96 p-4 border rounded-md">
                <h4 className="font-semibold mb-2">Kết quả dự đoán</h4>
                
                <div className="mb-4">
                    <h5 className="font-medium text-sm">Thiếu hụt dự đoán</h5>
                    <pre className="text-xs bg-muted p-2 rounded-md mt-1">{prediction.predictedShortages}</pre>
                </div>
                
                <Separator className="my-4" />

                <div className="mb-4">
                    <h5 className="font-medium text-sm">Mức độ tin cậy</h5>
                    <pre className="text-xs bg-muted p-2 rounded-md mt-1">{prediction.confidenceLevels}</pre>
                </div>

                <Separator className="my-4" />
                
                <div>
                    <h5 className="font-medium text-sm">Khuyến nghị</h5>
                     <pre className="text-xs bg-muted p-2 rounded-md mt-1">{prediction.recommendations}</pre>
                </div>
            </ScrollArea>
        )}
        
        <DialogFooter className="sm:justify-between">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Đóng
            </Button>
            <Button type="button" onClick={handlePredict} disabled={isLoading}>
                {isLoading ? 'Đang dự đoán...' : 'Chạy dự đoán AI'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
