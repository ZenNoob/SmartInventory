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
import { getDebtRiskPrediction } from '@/app/actions'
import type { Customer, Sale, Payment } from '@/lib/types'
import { type PredictDebtRiskOutput } from '@/ai/flows/predict-debt-risk'
import { ScrollArea } from '@/components/ui/scroll-area'

interface PredictRiskFormProps {
  customer: Customer;
  sales: Sale[];
  payments: Payment[];
}

export function PredictRiskForm({ customer, sales, payments }: PredictRiskFormProps) {
  const [open, setOpen] = useState(false)
  const [prediction, setPrediction] = useState<PredictDebtRiskOutput | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePredict = async () => {
    setIsLoading(true)
    setError(null)
    setPrediction(null)

    const totalSales = sales.reduce((acc, sale) => acc + sale.totalAmount, 0);
    const totalPayments = payments.reduce((acc, payment) => acc + payment.amount, 0);
    const outstandingBalance = totalSales - totalPayments;
    
    const result = await getDebtRiskPrediction({
      customerName: customer.name,
      paymentHistory: JSON.stringify(payments),
      creditLimit: customer.creditLimit,
      outstandingBalance: outstandingBalance,
      recentPurchases: JSON.stringify(sales.slice(-5)),
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
        <Button size="sm" variant="outline">
          <Bot className="mr-2 h-4 w-4" /> Dự đoán rủi ro
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dự đoán rủi ro nợ cho {customer.name}</DialogTitle>
          <DialogDescription>
            Phân tích rủi ro trả nợ dựa trên dữ liệu khách hàng được hỗ trợ bởi AI.
          </DialogDescription>
        </DialogHeader>
        
        {!prediction && !isLoading && !error && (
            <div className="flex items-center space-x-2 p-4">
                <p>Nhấp vào nút bên dưới để bắt đầu dự đoán của AI.</p>
            </div>
        )}
        
        {isLoading && <div className="flex justify-center items-center p-8"><Bot className="h-8 w-8 animate-spin" /> <span className="ml-2">Đang phân tích dữ liệu...</span></div>}
        
        {error && <div className="text-destructive p-4 bg-destructive/10 rounded-md">{error}</div>}

        {prediction && (
            <ScrollArea className="max-h-80 p-4 border rounded-md">
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold">Đánh giá rủi ro</h4>
                        <p className="text-sm p-2 bg-muted rounded-md mt-1">{prediction.riskAssessment}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold">Các yếu tố góp phần</h4>
                        <p className="text-sm p-2 bg-muted rounded-md mt-1">{prediction.riskFactors}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold">Khuyến nghị</h4>
                        <p className="text-sm p-2 bg-muted rounded-md mt-1">{prediction.recommendations}</p>
                    </div>
                </div>
            </ScrollArea>
        )}
        
        <DialogFooter className="sm:justify-between mt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Đóng
            </Button>
            <Button type="button" onClick={handlePredict} disabled={isLoading}>
                {isLoading ? 'Đang chạy...' : 'Chạy lại dự đoán'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
