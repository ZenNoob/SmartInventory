'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { Product, PurchaseLot, Unit } from '@/lib/types'

const adjustmentFormSchema = z.object({
  mainUnitQty: z.coerce.number().min(0, "Số lượng phải là số không âm.").optional(),
  baseUnitQty: z.coerce.number().min(0, "Số lượng phải là số không âm.").optional(),
  notes: z.string().optional(),
});

type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;

interface InventoryAdjustmentFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  productInfo: {
    productId: string;
    productName: string;
    closingStock: number; // in base units
    mainUnit?: Unit;
    baseUnit?: Unit;
  }
}

export function InventoryAdjustmentForm({ isOpen, onOpenChange, productInfo }: InventoryAdjustmentFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  const productRef = useMemoFirebase(() => {
    if (!firestore || !productInfo) return null;
    return doc(firestore, 'products', productInfo.productId);
  }, [firestore, productInfo]);

  const { data: productData } = useDoc<Product>(productRef);
  
  const isComplexUnit = productInfo.mainUnit && productInfo.baseUnit && productInfo.mainUnit.id !== productInfo.baseUnit.id;
  const conversionFactor = productInfo.mainUnit?.conversionFactor || 1;

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: { mainUnitQty: 0, baseUnitQty: 0, notes: '' },
  });

  useEffect(() => {
    if (isOpen) {
      let mainQty = 0;
      let baseQty = 0;
      if(isComplexUnit) {
        mainQty = Math.floor(productInfo.closingStock / conversionFactor);
        baseQty = productInfo.closingStock % conversionFactor;
      } else {
        baseQty = productInfo.closingStock;
      }

      form.reset({
        mainUnitQty: mainQty,
        baseUnitQty: baseQty,
        notes: `Điều chỉnh tồn kho cho ${productInfo.productName}`,
      });
    }
  }, [isOpen, productInfo, form, isComplexUnit, conversionFactor]);

  const onSubmit = async (data: AdjustmentFormValues) => {
    if (!productData) {
        toast({ variant: "destructive", title: "Lỗi", description: "Không tìm thấy dữ liệu sản phẩm." });
        return;
    }
    
    const mainQty = data.mainUnitQty || 0;
    const baseQty = data.baseUnitQty || 0;
    
    const actualStockInBaseUnits = isComplexUnit
        ? (mainQty * conversionFactor) + baseQty
        : baseQty;

    const difference = actualStockInBaseUnits - productInfo.closingStock;

    if (Math.abs(difference) < 0.001) {
        toast({ title: "Thông báo", description: "Không có sự thay đổi nào về tồn kho." });
        onOpenChange(false);
        return;
    }

    const adjustmentLot: PurchaseLot = {
        importDate: new Date().toISOString(),
        quantity: difference,
        cost: 0, // Điều chỉnh không làm thay đổi giá vốn
        unitId: productData.unitId, // This should be base unit ID to be consistent
    };

    const result = await upsertProduct({
        id: productData.id,
        purchaseLots: [adjustmentLot],
    });


    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã điều chỉnh tồn kho cho sản phẩm ${productInfo.productName}.`,
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

  const { mainUnit, baseUnit } = productInfo;
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Điều chỉnh tồn kho</DialogTitle>
          <DialogDescription>
            Cập nhật số lượng tồn kho thực tế cho sản phẩm <span className="font-semibold">{productInfo.productName}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm">
            Tồn kho trên hệ thống: <span className="font-bold">{productInfo.closingStock.toLocaleString()} {baseUnit?.name}</span>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isComplexUnit && mainUnit && (
              <FormField
                control={form.control}
                name="mainUnitQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tồn kho thực tế ({mainUnit.name})</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="baseUnitQty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tồn kho thực tế ({baseUnit?.name})</FormLabel>
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
