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
import { Customer, Product, Unit, SalesItem, Sale, Payment } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Check, ChevronsUpDown, PlusCircle, Trash2 } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { upsertSaleTransaction } from '../actions'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const saleItemSchema = z.object({
  productId: z.string().min(1, "Vui lòng chọn sản phẩm."),
  quantity: z.coerce.number().min(0.01, "Số lượng phải lớn hơn 0."),
  price: z.coerce.number().min(0, "Giá phải là số không âm."),
});

const saleFormSchema = z.object({
  customerId: z.string().min(1, "Vui lòng chọn khách hàng."),
  transactionDate: z.string().min(1, "Ngày giao dịch là bắt buộc."),
  items: z.array(saleItemSchema).min(1, "Đơn hàng phải có ít nhất một sản phẩm."),
  discountType: z.enum(['percentage', 'amount']).default('amount'),
  discountValue: z.coerce.number().optional(),
  customerPayment: z.coerce.number().optional(),
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

interface SaleFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  customers: Customer[];
  products: Product[];
  units: Unit[];
  allSalesItems: SalesItem[];
  sales: Sale[];
  payments: Payment[];
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


export function SaleForm({ isOpen, onOpenChange, customers, products, units, allSalesItems, sales, payments }: SaleFormProps) {
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
    if (!product || !product.unitId) return { stock: 0, stockInBaseUnit: 0, mainUnit: undefined, baseUnit: undefined };

    const { name: mainUnitName, baseUnit: mainBaseUnit, conversionFactor: mainConversionFactor } = getUnitInfo(product.unitId);
    
    let totalImportedInBaseUnit = 0;
    product.purchaseLots?.forEach(lot => {
        const { conversionFactor } = getUnitInfo(lot.unitId);
        totalImportedInBaseUnit += lot.quantity * conversionFactor;
    });
    
    const totalSoldInBaseUnit = allSalesItems
      .filter(item => item.productId === productId)
      .reduce((acc, item) => acc + item.quantity, 0);

    const stockInBaseUnit = totalImportedInBaseUnit - totalSoldInBaseUnit;
    const stockInMainUnit = stockInBaseUnit / (mainConversionFactor || 1);
    const mainUnit = unitsMap.get(product.unitId);
    const baseUnit = mainBaseUnit || mainUnit;

    return { stock: stockInMainUnit, stockInBaseUnit, mainUnit, baseUnit };
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

  const customerDebts = useMemo(() => {
    if (!customers || !sales || !payments) return new Map<string, number>();

    const debtMap = new Map<string, number>();
    customers.forEach(customer => {
        const customerSales = sales.filter(s => s.customerId === customer.id).reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        const customerPayments = payments.filter(p => p.customerId === customer.id).reduce((sum, p) => sum + p.amount, 0);
        debtMap.set(customer.id, customerSales - customerPayments);
    });
    return debtMap;
  }, [customers, sales, payments]);

  const refinedSaleFormSchema = useMemo(() => saleFormSchema.superRefine((data, ctx) => {
    data.items.forEach((item, index) => {
      if (!item.productId) return;
      const { stock, mainUnit } = getStockInfo(item.productId);
      if (item.quantity > stock) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [`items`, index, `quantity`],
          message: `Vượt quá tồn kho (Tồn: ${stock.toFixed(2)} ${mainUnit?.name || ''})`,
        });
      }
    });
  }), [getStockInfo]);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(refinedSaleFormSchema),
    defaultValues: {
      customerId: '',
      transactionDate: new Date().toISOString().split('T')[0],
      items: [],
      discountType: 'amount',
      discountValue: 0,
      customerPayment: 0,
    },
    mode: "onChange"
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const watchedItems = form.watch("items");
  const discountType = form.watch('discountType');
  const discountValue = form.watch('discountValue') || 0;
  const customerPayment = form.watch('customerPayment') || 0;

  useEffect(() => {
    form.trigger('items');
  }, [watchedItems, form]);

  const totalAmount = watchedItems.reduce((acc, item) => {
    if (!item.productId || !item.price || !item.quantity) {
        return acc;
    }
    const product = productsMap.get(item.productId)!;
    const { conversionFactor } = getUnitInfo(product.unitId);
    const quantityInBaseUnit = (item.quantity || 0) * (conversionFactor || 1);

    return acc + quantityInBaseUnit * (item.price || 0);
  }, 0);
  
  const calculatedDiscount = discountType === 'percentage'
    ? (totalAmount * discountValue) / 100
    : discountValue;
    
  const finalAmount = totalAmount - calculatedDiscount;
  const remainingAmount = customerPayment - finalAmount;


  const onSubmit = async (data: SaleFormValues) => {
    const itemsData = data.items.map(item => {
        const product = productsMap.get(item.productId)!;
        const { conversionFactor } = getUnitInfo(product.unitId);
        return {
            productId: item.productId,
            quantity: item.quantity * (conversionFactor || 1),
            price: item.price,
        };
    });

    const saleData = {
        customerId: data.customerId,
        transactionDate: new Date(data.transactionDate).toISOString(),
        totalAmount: finalAmount,
        discount: calculatedDiscount,
        discountType: data.discountType,
        discountValue: data.discountValue,
        customerPayment: data.customerPayment,
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
      if (watchedItems.some(item => item.productId === productId)) {
        toast({
          variant: "destructive",
          title: "Sản phẩm đã tồn tại",
          description: "Sản phẩm này đã có trong đơn hàng.",
        });
        return;
      }
      append({ productId: product.id, quantity: 1, price: 0 });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { onOpenChange(open); if(!open) form.reset(); }}>
      <DialogContent className="sm:max-w-5xl grid-rows-[auto_1fr_auto] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Tạo đơn hàng mới</DialogTitle>
          <DialogDescription>
            Điền thông tin chi tiết của đơn hàng dưới đây.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 overflow-hidden">
            <div className='flex-grow space-y-4 overflow-y-auto pr-6'>
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
                                    {customers.map((customer) => {
                                      const debt = customerDebts.get(customer.id) || 0;
                                      return (
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
                                            <div className="flex justify-between w-full">
                                                <div>
                                                  <p>{customer.name}</p>
                                                  <p className="text-xs text-muted-foreground">{customer.phone}</p>
                                                </div>
                                                {debt > 0 && <p className="text-xs text-destructive">Nợ: {formatCurrency(debt)}</p>}
                                            </div>
                                        </CommandItem>
                                      )
                                    })}
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
                    const lineTotal = itemValues && itemValues.price && itemValues.quantity
                      ? ((itemValues.quantity || 0) * (saleUnitInfo.conversionFactor || 1)) * (itemValues.price || 0)
                      : 0;

                    const quantityInBaseUnit = (itemValues?.quantity || 0) * (saleUnitInfo.conversionFactor || 1);


                    const stockInfo = getStockInfo(product.id);
                    const avgCostInfo = getAverageCost(product.id);
                    
                    return (
                        <div key={field.id} className="p-3 border rounded-md relative">
                            <p className="font-medium mb-2">{product?.name || 'Sản phẩm không xác định'}</p>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                                            Tồn: {stockInfo.stock.toFixed(2)} {stockInfo.mainUnit?.name}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <div className="space-y-2">
                                  <FormLabel>SL ({baseUnit?.name || 'ĐVT cơ sở'})</FormLabel>
                                  <Input value={quantityInBaseUnit.toLocaleString()} readOnly />
                                  <FormDescription>&nbsp;</FormDescription>
                                </div>
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
                                  <FormLabel>Thành tiền</FormLabel>
                                  <Input value={formatCurrency(lineTotal)} readOnly className="font-semibold" />
                                   <FormDescription>&nbsp;</FormDescription>
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
            </div>

            <div className="shrink-0 space-y-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-right">
                <div className="col-start-2 space-y-2">
                    <div className="font-medium flex justify-end items-center gap-4">
                        <span>Tổng tiền hàng:</span>
                        <span>{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="font-medium flex justify-end items-center gap-4">
                        <FormField
                            control={form.control}
                            name="discountType"
                            render={({ field }) => (
                                <FormItem className="flex items-center gap-2 space-y-0">
                                    <FormLabel className="p-0 m-0">Giảm giá:</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex"
                                        >
                                            <FormItem className="flex items-center space-x-1 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="amount" />
                                                </FormControl>
                                                <FormLabel className="font-normal">VNĐ</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-1 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="percentage" />
                                                </FormControl>
                                                <FormLabel className="font-normal">%</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="discountValue"
                            render={({ field }) => (
                                <FormItem className="w-32">
                                    <FormControl>
                                      { discountType === 'amount' ? <FormattedNumberInput {...field} /> : <Input type="number" {...field} /> }
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                      <div className="font-medium flex justify-end items-center gap-4 text-destructive">
                        <span>Số tiền giảm:</span>
                        <span>- {formatCurrency(calculatedDiscount)}</span>
                    </div>
                </div>

                <div className="col-start-2 space-y-2 pt-2 border-t">
                    <div className="font-semibold text-lg flex justify-end items-center gap-4">
                        <span>Thanh toán:</span>
                        <span>{formatCurrency(finalAmount)}</span>
                    </div>
                    <div className="font-medium flex justify-end items-center gap-4">
                        <Label htmlFor='customerPayment' className="text-right">Tiền khách đưa:</Label>
                          <Controller
                            control={form.control}
                            name={`customerPayment`}
                            render={({ field }) => (
                                <FormattedNumberInput {...field} id="customerPayment" className="w-32"/>
                            )}
                        />
                    </div>
                      <div className={`font-medium flex justify-end items-center gap-4 ${remainingAmount < 0 ? 'text-destructive' : 'text-green-600'}`}>
                        <span>{remainingAmount < 0 ? 'Nợ mới:' : 'Tiền thừa:'}</span>
                        <span>{formatCurrency(Math.abs(remainingAmount))}</span>
                    </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Đang tạo...' : 'Tạo đơn hàng'}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

    