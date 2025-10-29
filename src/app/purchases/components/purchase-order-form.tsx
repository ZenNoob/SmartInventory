'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from "@/components/ui/input"
import { Product, Unit, PurchaseOrderItem, PurchaseOrder, SalesItem } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Check, ChevronsUpDown, PlusCircle, Trash2, ChevronLeft } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { createPurchaseOrder, updatePurchaseOrder } from '../actions'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, "Vui lòng chọn sản phẩm."),
  productName: z.string().optional(),
  quantity: z.coerce.number().min(0.01, "Số lượng phải lớn hơn 0."),
  cost: z.coerce.number().min(0, "Giá phải là số không âm."),
  unitId: z.string().min(1, "Đơn vị tính không được để trống."),
});

const purchaseOrderSchema = z.object({
  importDate: z.string().min(1, "Ngày nhập là bắt buộc."),
  items: z.array(purchaseOrderItemSchema).min(1, "Đơn nhập phải có ít nhất một sản phẩm."),
  notes: z.string().optional(),
});

type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;

interface PurchaseOrderFormProps {
  products: Product[];
  units: Unit[];
  allSalesItems: SalesItem[];
  purchaseOrder?: PurchaseOrder;
}

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


export function PurchaseOrderForm({ products, units, allSalesItems, purchaseOrder }: PurchaseOrderFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const isEditMode = !!purchaseOrder;

  const unitsMap = useMemo(() => new Map(units.map(u => [u.id, u])), [units]);
  const productsMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: isEditMode ? {
        importDate: new Date(purchaseOrder.importDate).toISOString().split('T')[0],
        notes: purchaseOrder.notes || '',
        items: purchaseOrder.items || []
    } : {
      importDate: new Date().toISOString().split('T')[0],
      items: [],
      notes: '',
    },
  });
  
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items"
  });

  useEffect(() => {
    if(isEditMode && purchaseOrder) {
      form.reset({
        importDate: new Date(purchaseOrder.importDate).toISOString().split('T')[0],
        notes: purchaseOrder.notes || '',
        items: purchaseOrder.items || []
      })
    }
  }, [purchaseOrder, isEditMode, form])
  
  const getUnitInfo = useCallback((unitId: string): { baseUnit?: Unit; conversionFactor: number, name: string } => {
    const unit = unitsMap.get(unitId);
    if (!unit) return { conversionFactor: 1, name: '' };
    
    if (unit.baseUnitId && unit.conversionFactor) {
      const baseUnit = unitsMap.get(unit.baseUnitId);
      return { baseUnit, conversionFactor: unit.conversionFactor, name: unit.name };
    }
    
    return { baseUnit: unit, conversionFactor: 1, name: unit.name };
  }, [unitsMap]);

  const getAverageCost = useCallback((product: Product) => {
    if (!product.purchaseLots || product.purchaseLots.length === 0 || !product.unitId) return { avgCost: 0, baseUnit: undefined};

    let totalCost = 0;
    let totalQuantityInBaseUnit = 0;
    let costBaseUnit: Unit | undefined;

    product.purchaseLots.forEach(lot => {
        const { baseUnit, conversionFactor } = getUnitInfo(lot.unitId);
        const quantityInBaseUnit = lot.quantity * conversionFactor;
        totalCost += lot.cost * quantityInBaseUnit;
        totalQuantityInBaseUnit += quantityInBaseUnit;
        if (baseUnit) {
          costBaseUnit = baseUnit;
        } else if(unitsMap.has(lot.unitId)) {
          costBaseUnit = unitsMap.get(lot.unitId);
        }
    });
    
    if (totalQuantityInBaseUnit === 0) return { avgCost: 0, baseUnit: costBaseUnit };
    
    return { avgCost: totalCost / totalQuantityInBaseUnit, baseUnit: costBaseUnit };
  }, [getUnitInfo, unitsMap]);


  const watchedItems = form.watch("items");
  
  const totalAmount = useMemo(() => {
    return watchedItems.reduce((acc, item) => {
      if (!item.productId || item.cost === undefined || item.quantity === undefined) {
          return acc;
      }
      const { conversionFactor } = getUnitInfo(item.unitId);
      const quantityInBaseUnit = (item.quantity || 0) * (conversionFactor || 1);

      return acc + quantityInBaseUnit * (item.cost || 0);
    }, 0);
  }, [watchedItems, getUnitInfo]);


  const onSubmit = async (data: PurchaseOrderFormValues) => {
    const itemsData: PurchaseOrderItem[] = data.items.map(item => ({
        id: item.productId, // This is not correct but we need something here. Will be replaced by server
        purchaseOrderId: purchaseOrder?.id || '', // same here
        productId: item.productId,
        productName: productsMap.get(item.productId)?.name,
        quantity: item.quantity,
        cost: item.cost,
        unitId: item.unitId
    }));
    
    const orderData = {
        importDate: data.importDate,
        notes: data.notes,
        totalAmount: totalAmount,
    };
    
    const result = isEditMode
      ? await updatePurchaseOrder(purchaseOrder.id, orderData, itemsData)
      : await createPurchaseOrder(orderData, itemsData);


    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã ${isEditMode ? 'cập nhật' : 'tạo'} đơn nhập hàng thành công.`,
      });
      router.push('/purchases');
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
  };
  
  const addProductToOrder = (productId: string) => {
    const product = productsMap.get(productId);
    if (product) {
      if (watchedItems.some(item => item.productId === productId)) {
        toast({
          variant: "destructive",
          title: "Sản phẩm đã tồn tại",
          description: "Sản phẩm này đã có trong đơn hàng.",
        });
        return;
      }
      append({ 
        productId: product.id, 
        productName: product.name,
        quantity: 1, 
        cost: 0,
        unitId: product.unitId
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                <Link href="/purchases">
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Quay lại</span>
                </Link>
            </Button>
            <div className="flex-1">
                <h1 className="text-2xl font-semibold tracking-tight">
                    {isEditMode ? 'Chỉnh sửa đơn nhập hàng' : 'Tạo đơn nhập hàng mới'}
                </h1>
                <p className="text-sm text-muted-foreground">
                    Điền thông tin để tạo một đợt nhập hàng mới cho nhiều sản phẩm.
                </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
                 <Button type="button" variant="outline" onClick={() => router.push('/purchases')}>
                    Hủy
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Đang lưu...' : (isEditMode ? 'Cập nhật đơn' : 'Lưu đơn nhập')}
                </Button>
            </div>
        </div>
        
        <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-3 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Chi tiết đơn nhập</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {fields.map((field, index) => {
                            const product = productsMap.get(watchedItems[index]?.productId);
                            if (!product) return null;

                            const itemUnitInfo = getUnitInfo(product.unitId);
                            const baseUnit = itemUnitInfo.baseUnit || unitsMap.get(product.unitId);
                            
                            const avgCostInfo = getAverageCost(product);
                            
                            const item = watchedItems[index];
                            const lineTotal = (item?.quantity || 0) * (itemUnitInfo.conversionFactor || 1) * (item?.cost || 0);

                            return (
                                <div key={field.id} className="p-4 border rounded-md relative space-y-3">
                                    <p className="font-semibold">{product.name}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        
                                        <div className="space-y-2">
                                          <FormLabel>Đơn vị tính</FormLabel>
                                          <Input value={itemUnitInfo.name} readOnly disabled />
                                          {itemUnitInfo.conversionFactor && itemUnitInfo.conversionFactor > 1 && (
                                            <FormDescription>Quy cách: 1 {itemUnitInfo.name} = {itemUnitInfo.conversionFactor} {itemUnitInfo.baseUnit?.name}</FormDescription>
                                          )}
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.quantity`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Số lượng ({itemUnitInfo.name})</FormLabel>
                                                    <FormControl><Input type="number" step="any" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.cost`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Giá nhập / {baseUnit?.name}</FormLabel>
                                                    <FormControl><FormattedNumberInput {...field} /></FormControl>
                                                    <FormDescription>
                                                      Giá nhập TB: {formatCurrency(avgCostInfo.avgCost)}
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <p className="text-right text-sm font-medium">Thành tiền: {formatCurrency(lineTotal)}</p>
                                     <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1 right-1 h-6 w-6"
                                        onClick={() => remove(index)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            )
                        })}
                        <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                            <PopoverTrigger asChild>
                                <Button type="button" variant="outline" size="sm" className="mt-2">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Thêm sản phẩm
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Tìm kiếm sản phẩm..." />
                                    <CommandList>
                                        <CommandEmpty>Không tìm thấy sản phẩm.</CommandEmpty>
                                        <CommandGroup>
                                            {products.map((product) => (
                                            <CommandItem
                                                key={product.id}
                                                value={product.name}
                                                onSelect={() => {
                                                    addProductToOrder(product.id);
                                                    setProductSearchOpen(false);
                                                }}
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", watchedItems.some(i => i.productId === product.id) ? "opacity-100" : "opacity-0")} />
                                                {product.name}
                                            </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                         <FormMessage>{form.formState.errors.items?.message || form.formState.errors.items?.root?.message}</FormMessage>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Thông tin chung</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <FormField
                            control={form.control}
                            name="importDate"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Ngày nhập hàng</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
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
                                    <Input placeholder="Thêm ghi chú..." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                         />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Thanh toán</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between font-bold text-lg">
                            <span>Tổng cộng</span>
                            <span>{formatCurrency(totalAmount)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      </form>
    </Form>
  )
}
