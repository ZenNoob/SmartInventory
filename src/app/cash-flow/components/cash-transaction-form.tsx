'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CashTransaction } from '@/lib/types'
import { upsertCashTransaction } from '../actions'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const transactionFormSchema = z.object({
  type: z.enum(['thu', 'chi']),
  transactionDate: z.string().min(1, "Ngày không được để trống."),
  amount: z.coerce.number().min(1, "Số tiền phải lớn hơn 0."),
  reason: z.string().min(1, "Lý do không được để trống."),
  category: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface CashTransactionFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  transaction?: CashTransaction;
}

export function CashTransactionForm({ isOpen, onOpenChange, transaction }: CashTransactionFormProps) {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: 'chi',
      transactionDate: new Date().toISOString().split('T')[0],
      amount: 0,
      reason: '',
      category: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(
        transaction 
        ? { 
            ...transaction,
            transactionDate: new Date(transaction.transactionDate).toISOString().split('T')[0],
          } 
        : {
            type: 'chi',
            transactionDate: new Date().toISOString().split('T')[0],
            amount: 0,
            reason: '',
            category: '',
          }
      );
    }
  }, [transaction, isOpen, form]);

  const onSubmit = async (data: TransactionFormValues) => {
    const result = await upsertCashTransaction({ ...data, id: transaction?.id });
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã ${transaction ? 'cập nhật' : 'tạo'} phiếu thành công.`,
      });
      onOpenChange(false);
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{transaction ? 'Chỉnh sửa phiếu' : 'Tạo phiếu mới'}</DialogTitle>
          <DialogDescription>
            Điền thông tin chi tiết cho phiếu thu hoặc phiếu chi của bạn.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Loại phiếu</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-row space-x-4"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="chi" />
                        </FormControl>
                        <FormLabel className="font-normal">Phiếu chi</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="thu" />
                        </FormControl>
                        <FormLabel className="font-normal">Phiếu thu</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transactionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ngày giao dịch</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số tiền</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lý do / Diễn giải</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Vd: Chi tiền điện tháng 5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Danh mục (Tùy chọn)</FormLabel>
                  <FormControl>
                    <Input placeholder="Vd: Chi phí vận hành" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
