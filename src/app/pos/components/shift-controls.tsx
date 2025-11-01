
'use client'

import { useState } from 'react'
import {
  Clock,
  LogOut,
  CircleDollarSign,
  Briefcase,
  Users,
  Receipt,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Shift } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { closeShift } from '../actions'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ShiftControlsProps {
  activeShift: Shift
}

const FormattedNumberInput = ({
  value,
  onChange,
  ...props
}: {
  value: number
  onChange: (value: number) => void
  [key: string]: any
}) => {
  const [displayValue, setDisplayValue] = useState(
    value?.toLocaleString('en-US') || ''
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '')
    const numberValue = parseInt(rawValue, 10)

    if (!isNaN(numberValue)) {
      setDisplayValue(numberValue.toLocaleString('en-US'))
      onChange(numberValue)
    } else if (rawValue === '') {
      setDisplayValue('')
      onChange(0)
    }
  }

  return <Input type="text" value={displayValue} onChange={handleChange} {...props} />
}

export function ShiftControls({ activeShift }: ShiftControlsProps) {
  const [isCloseShiftDialogOpen, setIsCloseShiftDialogOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [endingCash, setEndingCash] = useState(0)
  const { toast } = useToast()
  const router = useRouter()

  const handleCloseShift = async () => {
    setIsClosing(true)
    const result = await closeShift(activeShift.id, endingCash)
    if (result.success) {
      toast({
        title: 'Đã đóng ca',
        description: 'Ca làm việc của bạn đã được đóng thành công.',
      })
      setIsCloseShiftDialogOpen(false)
      // Force a full page reload to reset the POS state
      window.location.reload()
    } else {
      toast({
        variant: 'destructive',
        title: 'Lỗi đóng ca',
        description: result.error,
      })
    }
    setIsClosing(false)
  }

  return (
    <>
      <div className="flex items-center gap-4 text-sm text-muted-foreground ml-auto">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          <span>Ca của: {activeShift.userName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>
            Bắt đầu lúc:{' '}
            {new Date(activeShift.startTime).toLocaleTimeString('vi-VN')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4" />
          <span>Tiền đầu ca: {formatCurrency(activeShift.startingCash)}</span>
        </div>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setIsCloseShiftDialogOpen(true)}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Đóng ca
        </Button>
      </div>

      <Dialog
        open={isCloseShiftDialogOpen}
        onOpenChange={setIsCloseShiftDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đóng và Bàn giao ca</DialogTitle>
            <DialogDescription>
              Kiểm tra lại doanh thu và số tiền mặt trong ngăn kéo trước khi
              đóng ca.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Vui lòng đếm số tiền mặt thực tế trong ngăn kéo và nhập vào ô dưới đây.
            </p>
            <div className="space-y-2">
              <Label htmlFor="endingCash">Tiền mặt cuối ca</Label>
              <FormattedNumberInput
                id="endingCash"
                value={endingCash}
                onChange={setEndingCash}
                className="h-12 text-lg text-right font-bold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCloseShiftDialogOpen(false)}
              disabled={isClosing}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleCloseShift}
              disabled={isClosing}
            >
              {isClosing ? 'Đang đóng...' : 'Xác nhận Đóng ca'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
