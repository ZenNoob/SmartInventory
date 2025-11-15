
'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

import type { Shift } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { updateShift } from '@/app/pos/actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { FormattedNumberInput } from '@/components/formatted-number-input'

const shiftFormSchema = z.object({
  startingCash: z.coerce.number().min(0, "Số tiền không được âm."),
  endingCash: z.coerce.number().min(0, "Số tiền không được âm."),
});

type ShiftFormValues = z.infer<typeof shiftFormSchema>;

interface EditShiftFormProps {
    shift: Shift;
}

export function EditShiftForm({ shift }: EditShiftFormProps) {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftFormSchema),
  });

  useEffect(() => {
    if (shift) {
      form.reset({
        startingCash: shift.startingCash,
        endingCash: shift.endingCash || 0,
      });
    }
  }, [shift, form]);

  const onSubmit = async (data: ShiftFormValues) => {
    if (!shift) return;

    const result = await updateShift(shift.id, data);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: "Đã cập nhật thông tin ca làm việc.",
      });
      router.push(`/shifts/${shift.id}`);
      router.refresh(); 
    } else {
      toast({
        variant: "destructive",
        title: "Lỗi cập nhật",
        description: result.error,
      });
    }
  };


  return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Thông tin ca</CardTitle>
              <CardDescription>
                Chỉ tiền đầu ca và cuối ca có thể được chỉnh sửa. Các số liệu khác sẽ được tự động tính toán lại.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="startingCash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiền đầu ca</FormLabel>
                    <FormControl>
                      <FormattedNumberInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endingCash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiền cuối ca (Thực tế)</FormLabel>
                    <FormControl>
                      <FormattedNumberInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <div className='p-6 flex justify-end'>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </Card>
        </form>
      </Form>
  );
}
