'use client'

import { useState, useTransition } from 'react'
import { Upload } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { importProducts } from '../actions'
import { useRouter } from 'next/navigation'

export function ImportProducts() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0])
    }
  }

  const handleImport = () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "Chưa chọn file",
        description: "Vui lòng chọn một file Excel để nhập.",
      })
      return
    }

    startTransition(async () => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1]
        const result = await importProducts(base64)
        if (result.success) {
          toast({
            title: "Thành công!",
            description: `Đã nhập thành công ${result.createdCount} sản phẩm.`,
          })
          router.refresh()
          setOpen(false)
          setFile(null)
        } else {
          toast({
            variant: "destructive",
            title: "Ôi! Đã có lỗi xảy ra.",
            description: result.error,
          })
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); setFile(null); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1">
          <Upload className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Nhập file
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nhập sản phẩm từ file Excel</DialogTitle>
          <DialogDescription>
            Chọn file Excel (.xlsx) chứa dữ liệu sản phẩm để thêm hàng loạt.
            Hãy chắc chắn file của bạn có các cột: `name`, `categoryId`, `unitName`, `status`, `lowStockThreshold`.
            Giá trị `categoryId` và `unitName` phải là tên chính xác của danh mục và đơn vị đã có trong hệ thống.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="file"
            type="file"
            onChange={handleFileChange}
            accept=".xlsx, .xls"
            disabled={isPending}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Hủy</Button>
          <Button onClick={handleImport} disabled={isPending || !file}>
            {isPending ? 'Đang nhập...' : 'Nhập'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
