'use client'

import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

import { Shift } from '@/lib/repositories/shift-repository'
import { useToast } from '@/hooks/use-toast'
import { updateShift } from '@/app/shifts/actions'
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
import { formatCurrency } from '@/lib/utils'

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

  // Watch form values for live calculation
  const watchedStartingCash = useWatch({ control: form.control, name: 'startingCash' });
  const watchedEndingCash = useWatch({ control: form.control, name: 'endingCash' });

  // Calculate expected cash and difference
  const cashCalculation = useMemo(() => {
    const startingCash = watchedStartingCash || 0;
    const endingCash = watchedEndingCash || 0;
    const cashSales = shift.cashSales || 0;
    const cashPayments = shift.cashPayments || 0;
    
    const expectedCash = startingCash + cashSales + cashPayments;
    const difference = endingCash - expectedCash;
    
    return {
      startingCash,
      cashSales,
      cashPayments,
      expectedCash,
      endingCash,
      difference,
    };
  }, [watchedStartingCash, watchedEndingCash, shift.cashSales, shift.cashPayments]);

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

              {/* Cash Calculation Preview */}
              {shift.status === 'closed' && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-3">Xem trước tính toán chênh lệch</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Tiền đầu ca</span>
                      <span>{formatCurrency(cashCalculation.startingCash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>+ Tiền mặt thu trong ca</span>
                      <span>{formatCurrency(cashCalculation.cashSales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>+ Thanh toán công nợ</span>
                      <span>{formatCurrency(cashCalculation.cashPayments)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span>= Tiền mặt dự kiến</span>
                      <span>{formatCurrency(cashCalculation.expectedCash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tiền cuối ca (Thực tế)</span>
                      <span>{formatCurrency(cashCalculation.endingCash)}</span>
                    </div>
                    <div className={`flex justify-between font-semibold border-t pt-2 ${cashCalculation.difference !== 0 ? (cashCalculation.difference > 0 ? 'text-green-600' : 'text-destructive') : ''}`}>
                      <span>Chênh lệch</span>
                      <span>{cashCalculation.difference > 0 ? '+' : ''}{formatCurrency(cashCalculation.difference)}</span>
                    </div>
                  </div>
                </div>
              )}
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
