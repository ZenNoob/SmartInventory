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
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { upsertProduct } from '@/app/products/actions'
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase'
import { doc } from 'firebase/firestore'
import { Product, PurchaseLot } from '@/lib/types'

const adjustmentFormSchema = z.object({
  actualStock: z.coerce.number().min(0, "Tồn kho thực tế phải là số không âm."),
  notes: z.string().optional(),
});

type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;

interface InventoryAdjustmentFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  product: {
    productId: string;
    productName: string;
    unitName: string;
    closingStock: number;
  }
}

export function InventoryAdjustmentForm({ isOpen, onOpenChange, product }: InventoryAdjustmentFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  const productRef = useMemoFirebase(() => {
    if (!firestore || !product) return null;
    return doc(firestore, 'products', product.productId);
  }, [firestore, product]);

  const { data: productData } = useDoc<Product>(productRef);

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: { actualStock: product.closingStock, notes: '' },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        actualStock: product.closingStock,
        notes: `Điều chỉnh tồn kho cho ${product.productName}`,
      });
    }
  }, [isOpen, product, form]);

  const onSubmit = async (data: AdjustmentFormValues) => {
    if (!productData) {
        toast({ variant: "destructive", title: "Lỗi", description: "Không tìm thấy dữ liệu sản phẩm." });
        return;
    }

    const difference = data.actualStock - product.closingStock;

    if (difference === 0) {
        toast({ title: "Thông báo", description: "Không có sự thay đổi nào về tồn kho." });
        onOpenChange(false);
        return;
    }

    const adjustmentLot: PurchaseLot = {
        importDate: new Date().toISOString(),
        quantity: difference,
        cost: 0, // Điều chỉnh không làm thay đổi giá vốn
        unitId: productData.unitId, // Sử dụng đơn vị cơ sở
    };

    const updatedLots = [...(productData.purchaseLots || []), adjustmentLot];
    
    const result = await upsertProduct({
        id: productData.id,
        purchaseLots: updatedLots,
    });


    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã điều chỉnh tồn kho cho sản phẩm ${product.productName}.`,
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
          <DialogTitle>Điều chỉnh tồn kho</DialogTitle>
          <DialogDescription>
            Cập nhật số lượng tồn kho thực tế cho sản phẩm <span className="font-semibold">{product.productName}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm">
            Tồn kho trên hệ thống: <span className="font-bold">{product.closingStock.toLocaleString()} {product.unitName}</span>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="actualStock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tồn kho thực tế ({product.unitName})</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Lý do điều chỉnh..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu điều chỉnh'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
