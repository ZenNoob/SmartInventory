'use client'

import { useEffect, useState } from 'react'
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { upsertCashTransaction, CashTransaction } from '../actions'
import { useToast } from '@/hooks/use-toast'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronsUpDown, Check } from 'lucide-react'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList, CommandGroup } from '@/components/ui/command'
import { cn } from '@/lib/utils'


const FormattedNumberInput = ({ value, onChange, ...props }: { value: number; onChange: (value: number) => void; [key: string]: any }) => {
  const [displayValue, setDisplayValue] = useState(value?.toLocaleString('en-US') || '');

  useEffect(() => {
    setDisplayValue(value?.toLocaleString('en-US') || '0');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '');
    const numberValue = parseInt(rawValue, 10);

    if (!isNaN(numberValue)) {
      setDisplayValue(numberValue.toLocaleString('en-US'));
      onChange(numberValue);
    } else if (rawValue === '') {
      setDisplayValue('');
      onChange(0);
    }
  };

  return <Input type="text" value={displayValue} onChange={handleChange} {...props} />;
};


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
  categories: string[];
}


export function CashTransactionForm({ isOpen, onOpenChange, transaction, categories }: CashTransactionFormProps) {
  const { toast } = useToast();
  const [openCategoryPopover, setOpenCategoryPopover] = useState(false);
  const [search, setSearch] = useState('');

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
            type: transaction.type,
            transactionDate: new Date(transaction.transactionDate || transaction.date).toISOString().split('T')[0],
            amount: transaction.amount,
            reason: transaction.reason || '',
            category: transaction.category || '',
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
    const result = await upsertCashTransaction({ 
      ...data, 
      id: transaction?.id 
    });
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã ${transaction ? 'cập nhật' : 'tạo'} phiếu thành công.`,
      });
      onOpenChange(false);
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
                    <FormattedNumberInput {...field} />
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
                <FormItem className="flex flex-col">
                  <FormLabel>Danh mục (Tùy chọn)</FormLabel>
                    <Popover open={openCategoryPopover} onOpenChange={setOpenCategoryPopover}>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                    "w-full justify-between",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? field.value : "Chọn hoặc tạo danh mục"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput 
                                  placeholder="Tìm hoặc tạo danh mục..."
                                  value={search}
                                  onValueChange={setSearch}
                                />
                                <CommandList>
                                <CommandEmpty>
                                    <Button
                                        variant="ghost"
                                        className="w-full"
                                        onClick={() => {
                                            field.onChange(search);
                                            setOpenCategoryPopover(false);
                                        }}
                                    >
                                        Tạo danh mục mới: "{search}"
                                    </Button>
                                </CommandEmpty>
                                <CommandGroup>
                                    {categories.map((category) => (
                                    <CommandItem
                                        value={category}
                                        key={category}
                                        onSelect={() => {
                                        field.onChange(category)
                                        setOpenCategoryPopover(false)
                                        }}
                                    >
                                        <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            category === field.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                        />
                                        {category}
                                    </CommandItem>
                                    ))}
                                </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
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
