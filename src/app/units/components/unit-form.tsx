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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Unit } from '@/lib/types'
import { upsertUnit } from '../actions'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

const unitFormSchema = z.object({
  name: z.string().min(1, "Tên đơn vị tính không được để trống."),
  description: z.string().optional(),
});

type UnitFormValues = z.infer<typeof unitFormSchema>;

interface UnitFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  unit?: Unit;
}

export function UnitForm({ isOpen, onOpenChange, unit }: UnitFormProps) {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: unit ? { name: unit.name, description: unit.description || '' } : { name: '', description: '' },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(
        unit 
        ? { name: unit.name, description: unit.description || '' } 
        : { name: '', description: '' }
      );
    }
  }, [unit, isOpen, form]);

  const onSubmit = async (data: UnitFormValues) => {
    const result = await upsertUnit({ ...data, id: unit?.id });
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã ${unit ? 'cập nhật' : 'tạo'} đơn vị tính thành công.`,
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
          <DialogTitle>{unit ? 'Chỉnh sửa đơn vị' : 'Thêm đơn vị mới'}</DialogTitle>
          <DialogDescription>
            {unit ? 'Cập nhật chi tiết cho đơn vị tính này.' : 'Tạo một đơn vị tính mới để sử dụng cho sản phẩm.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên đơn vị tính</FormLabel>
                  <FormControl>
                    <Input placeholder="Ví dụ: Cái, Hộp, Kg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Mô tả ngắn về đơn vị tính này." {...field} value={field.value || ''} />
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
