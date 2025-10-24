'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
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
import { Customer, Product, Unit, SalesItem } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Check, ChevronsUpDown, PlusCircle, Trash2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, formatCurrency } from '@/lib/utils'
import { upsertSaleTransaction } from '../actions'
import { Label } from '@/components/ui/label'

const saleItemSchema = z.object({
  productId: z.string().min(1, "Vui lòng chọn sản phẩm."),
  quantity: z.coerce.number().min(0.01, "Số lượng phải lớn hơn 0."),
  price: z.coerce.number().min(0, "Giá phải là số không âm."),
});

const saleFormSchema = z.object({
  customerId: z.string().min(1, "Vui lòng chọn khách hàng."),
  transactionDate: z.string().min(1, "Ngày giao dịch là bắt buộc."),
  items: z.array(saleItemSchema).min(1, "Đơn hàng phải có ít nhất một sản phẩm."),
  discount: z.coerce.number().optional(),
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

interface SaleFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  customers: Customer[];
  products: Product[];
  units: Unit[];
  allSalesItems: SalesItem[];
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


export function SaleForm({ isOpen, onOpenChange, customers, products, units, allSalesItems }: SaleFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);

  const unitsMap = useMemo(() => new Map(units.map(u => [u.id, u])), [units]);
  const productsMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  const getUnitInfo = useCallback((unitId: string): { baseUnit?: Unit; conversionFactor: number, name: string } => {
    const unit = unitsMap.get(unitId);
    if (!unit) return { conversionFactor: 1, name: '' };
    
    if (unit.baseUnitId && unit.conversionFactor) {
      const baseUnit = unitsMap.get(unit.baseUnitId);
      return { baseUnit, conversionFactor: unit.conversionFactor, name: unit.name };
    }
    
    return { baseUnit: unit, conversionFactor: 1, name: unit.name };
  }, [unitsMap]);

  const getStockInfo = useCallback((productId: string) => {
    const product = productsMap.get(productId);
    if (!product || !product.unitId) return { stock: 0, stockInBaseUnit: 0, mainUnit: undefined };

    const { conversionFactor: mainConversionFactor } = getUnitInfo(product.unitId);
    
    let totalImportedInBaseUnit = 0;
    product.purchaseLots?.forEach(lot => {
        const { conversionFactor } = getUnitInfo(lot.unitId);
        totalImportedInBaseUnit += lot.quantity * conversionFactor;
    });
    
    const totalSoldInBaseUnit = allSalesItems
      .filter(item => item.productId === product.id)
      .reduce((acc, item) => acc + item.quantity, 0);

    const stockInBaseUnit = totalImportedInBaseUnit - totalSoldInBaseUnit;
    const stockInMainUnit = stockInBaseUnit / (mainConversionFactor || 1);

    return { stock: stockInMainUnit, stockInBaseUnit, mainUnit: unitsMap.get(product.unitId) };
  }, [productsMap, allSalesItems, getUnitInfo, unitsMap]);

  const getAverageCost = useCallback((productId: string) => {
    const product = productsMap.get(productId);
    if (!product || !product.purchaseLots || product.purchaseLots.length === 0 || !product.unitId) return { avgCost: 0, baseUnit: undefined};

    let totalCost = 0;
    let totalQuantityInBaseUnit = 0;
    let costBaseUnit: Unit | undefined;

    product.purchaseLots.forEach(lot => {
        const { baseUnit, conversionFactor } = getUnitInfo(lot.unitId);
        const quantityInBaseUnit = lot.quantity * conversionFactor;
        totalCost += lot.cost * quantityInBaseUnit;
        totalQuantityInBaseUnit += quantityInBaseUnit;
        costBaseUnit = baseUnit || unitsMap.get(lot.unitId);
    });
    
    if (totalQuantityInBaseUnit === 0) return { avgCost: 0, baseUnit: costBaseUnit };
    
    return { avgCost: totalCost / totalQuantityInBaseUnit, baseUnit: costBaseUnit };
  }, [productsMap, getUnitInfo, unitsMap]);


  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      customerId: '',
      transactionDate: new Date().toISOString().split('T')[0],
      items: [],
      discount: 0,
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const watchedItems = form.watch("items");
  
  const totalAmount = useMemo(() => {
    return watchedItems.reduce((acc, item) => {
      const product = productsMap.get(item.productId);
      if (!product || !item.price) return acc;
      const { conversionFactor } = getUnitInfo(product.unitId);
      const quantityInBaseUnit = (item.quantity || 0) * conversionFactor;
      return acc + (quantityInBaseUnit * item.price);
    }, 0);
  }, [watchedItems, productsMap, getUnitInfo]);

  const finalAmount = totalAmount - (form.watch('discount') || 0);

  const onSubmit = async (data: SaleFormValues) => {
    const itemsData = data.items.map(item => {
        const product = productsMap.get(item.productId)!;
        const { conversionFactor } = getUnitInfo(product.unitId);
        return {
            productId: item.productId,
            // We store quantity in the base unit in Firestore
            quantity: item.quantity * conversionFactor,
            price: item.price,
        };
    });

    const saleData = {
        customerId: data.customerId,
        transactionDate: new Date(data.transactionDate).toISOString(),
        totalAmount: finalAmount,
        discount: data.discount,
    };

    const result = await upsertSaleTransaction(saleData, itemsData);

    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã tạo đơn hàng thành công.`,
      });
      onOpenChange(false);
      form.reset();
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
  };
  
  const addProductToSale = (productId: string) => {
    const product = productsMap.get(productId);
    if (product) {
      append({ productId: product.id, quantity: 1, price: 0 });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { onOpenChange(open); if(!open) form.reset(); }}>
      <DialogContent className="sm:max-w-4xl grid-rows-[auto,1fr,auto] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Tạo đơn hàng mới</DialogTitle>
          <DialogDescription>
            Điền thông tin chi tiết của đơn hàng dưới đây.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-rows-[1fr_auto] gap-4 overflow-hidden">
            <div className='space-y-4 overflow-y-auto pr-6'>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                     <FormItem className="flex flex-col">
                      <FormLabel>Khách hàng</FormLabel>
                      <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
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
                              {field.value
                                ? customers.find(
                                    (c) => c.id === field.value
                                  )?.name
                                : "Chọn khách hàng..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                           <Command>
                                <CommandInput placeholder="Tìm khách hàng theo tên hoặc SĐT..." />
                                <CommandList>
                                <CommandEmpty>Không tìm thấy khách hàng.</CommandEmpty>
                                <CommandGroup>
                                    {customers.map((customer) => (
                                    <CommandItem
                                        value={`${customer.name} ${customer.phone}`}
                                        key={customer.id}
                                        onSelect={() => {
                                            form.setValue("customerId", customer.id)
                                            setCustomerSearchOpen(false)
                                        }}
                                    >
                                        <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            customer.id === field.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                        />
                                        <div>
                                            <p>{customer.name}</p>
                                            <p className="text-xs text-muted-foreground">{customer.phone}</p>
                                        </div>
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
                <FormField
                  control={form.control}
                  name="transactionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày bán</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <h3 className="text-md font-medium mb-2">Chi tiết đơn hàng</h3>
                <div className="space-y-3">
                  {fields.map((field, index) => {
                    const product = productsMap.get(watchedItems[index]?.productId);
                    if (!product) return null;

                    const saleUnitInfo = getUnitInfo(product.unitId);
                    const baseUnit = saleUnitInfo.baseUnit || unitsMap.get(product.unitId);
                    
                    const itemValues = watchedItems[index];
                    const quantityInBaseUnit = (itemValues.quantity || 0) * saleUnitInfo.conversionFactor;
                    const lineTotal = quantityInBaseUnit * (itemValues.price || 0);

                    const stockInfo = getStockInfo(product.id);
                    const avgCostInfo = getAverageCost(product.id);
                    
                    return (
                        <div key={field.id} className="p-3 border rounded-md relative">
                            <p className="font-medium mb-2">{product?.name || 'Sản phẩm không xác định'}</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                               <FormField
                                  control={form.control}
                                  name={`items.${index}.quantity`}
                                  render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Số lượng ({saleUnitInfo.name || 'ĐVT'})</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="any" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            (Tồn: {stockInfo.stock.toFixed(2)})
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                  )}
                                />
                               <FormField
                                  control={form.control}
                                  name={`items.${index}.price`}
                                  render={({ field }) => (
                                     <FormItem>
                                        <FormLabel>Giá bán (VNĐ / {baseUnit?.name || saleUnitInfo.name})</FormLabel>
                                        <FormControl>
                                            <FormattedNumberInput {...field} />
                                        </FormControl>
                                         <FormDescription>
                                            Giá nhập TB: {formatCurrency(avgCostInfo.avgCost)}
                                        </FormDescription>
                                         <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <div className="space-y-2">
                                  <Label>Thành tiền</Label>
                                  <Input value={formatCurrency(lineTotal)} readOnly className="font-semibold" />
                                </div>
                            </div>
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
                </div>
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
                                            addProductToSale(product.id);
                                            setProductSearchOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                watchedItems.some(i => i.productId === product.id) ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {product.name}
                                    </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                 </Popover>
                 <FormMessage>{form.formState.errors.items?.message || form.formState.errors.items?.root?.message}</FormMessage>

              </div>
                <div className="mt-4 pt-4 border-t space-y-2 text-right">
                   <div className="font-medium">Tổng tiền hàng: {formatCurrency(totalAmount)}</div>
                   <div className="flex justify-end items-center gap-2">
                        <Label htmlFor='discount' className="text-right">Giảm giá:</Label>
                        <Controller
                            control={form.control}
                            name={`discount`}
                            render={({ field }) => (
                                <FormattedNumberInput {...field} className="w-32 text-right" />
                            )}
                        />
                   </div>
                   <div className="font-semibold text-lg">Thanh toán: {formatCurrency(finalAmount)}</div>
                </div>

            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Đang tạo...' : 'Tạo đơn hàng'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
