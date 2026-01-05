'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { startShift } from '../actions'

interface StartShiftDialogProps {
  userId: string;
  userName: string;
  onShiftStarted: () => void;
  // Legacy support for user object
  user?: { uid?: string; displayName?: string | null };
}

const FormattedNumberInput = ({
  value,
  onChange,
  ...props
}: {
  value: number
  onChange: (value: number) => void
  [key: string]: unknown
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

export function StartShiftDialog({ userId, userName, onShiftStarted, user }: StartShiftDialogProps) {
  const [startingCash, setStartingCash] = useState(0)
  const [isStarting, setIsStarting] = useState(false)
  const { toast } = useToast()

  // Support both new props and legacy user object
  const effectiveUserId = userId || user?.uid || '';
  const effectiveUserName = userName || user?.displayName || '';

  const handleStartShift = async () => {
    setIsStarting(true)
    const result = await startShift(effectiveUserId, effectiveUserName, startingCash)
    if (result.success) {
      toast({
        title: 'Đã bắt đầu ca mới',
        description: 'Bạn có thể bắt đầu bán hàng.',
      })
      onShiftStarted()
    } else {
      toast({
        variant: 'destructive',
        title: 'Lỗi bắt đầu ca',
        description: result.error,
      })
    }
    setIsStarting(false)
  }

  return (
    <Dialog open={true}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bắt đầu ca làm việc</DialogTitle>
          <DialogDescription>
            Nhập số tiền mặt ban đầu trong ngăn kéo để bắt đầu ca mới.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startingCash" className="text-right">
              Tiền đầu ca
            </Label>
            <div className="col-span-3">
              <FormattedNumberInput
                id="startingCash"
                value={startingCash}
                onChange={setStartingCash}
                className="text-right"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleStartShift} disabled={isStarting}>
            {isStarting ? 'Đang bắt đầu...' : 'Bắt đầu ca'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
