
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
import { Customer, Product, Unit, SalesItem, Sale, Payment, ThemeSettings } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Check, ChevronsUpDown, PlusCircle, Trash2 } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { upsertSaleTransaction } from '../actions'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  status: z.enum(['pending', 'unprinted', 'printed']),
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
  settings: ThemeSettings | null;
  sale?: Sale;
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


export function SaleForm({ isOpen, onOpenChange, customers, products, units, allSalesItems, sales, payments, settings, sale }: SaleFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [saleItemsForEdit, setSaleItemsForEdit] = useState<SalesItem[]>([]);

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
  
  const salesItemsWithoutCurrent = useMemo(() => {
    if (!sale) return allSalesItems;
    return allSalesItems.filter(item => item.salesTransactionId !== sale.id);
  }, [allSalesItems, sale]);

  const getStockInfo = useCallback((productId: string) => {
    const product = productsMap.get(productId);
    if (!product || !product.unitId) return { stock: 0, stockInBaseUnit: 0, mainUnit: undefined, baseUnit: undefined };

    const { name: mainUnitName, baseUnit: mainBaseUnit, conversionFactor: mainConversionFactor } = getUnitInfo(product.unitId);
    
    let totalImportedInBaseUnit = 0;
    product.purchaseLots?.forEach(lot => {
        const { conversionFactor } = getUnitInfo(lot.unitId);
        totalImportedInBaseUnit += lot.quantity * conversionFactor;
    });
    
    const totalSoldInBaseUnit = salesItemsWithoutCurrent
      .filter(item => item.productId === productId)
      .reduce((acc, item) => acc + item.quantity, 0);

    const stockInBaseUnit = totalImportedInBaseUnit - totalSoldInBaseUnit;
    const stockInMainUnit = stockInBaseUnit / (mainConversionFactor || 1);
    const mainUnit = unitsMap.get(product.unitId);
    const baseUnit = mainBaseUnit || mainUnit;

    return { stock: stockInMainUnit, stockInBaseUnit, mainUnit, baseUnit };
  }, [productsMap, salesItemsWithoutCurrent, getUnitInfo, unitsMap]);
  
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
  
  const otherSales = useMemo(() => {
    if (!sale) return sales;
    return sales.filter(s => s.id !== sale.id);
  }, [sales, sale]);

  const otherPayments = useMemo(() => {
    if (!sale) return payments;
    // This logic is tricky. A simple approximation is to filter out payments
    // that match the amount and date, but that's not robust.
    // For now, we'll just use all payments and accept a slight inaccuracy in previousDebt during edit.
    return payments.filter(p => p.notes !== `Thanh toán cho đơn hàng ${sale.id}`);
  }, [payments, sale]);

  const customerDebts = useMemo(() => {
    if (!customers || !otherSales || !otherPayments) return new Map<string, number>();

    const debtMap = new Map<string, number>();
    customers.forEach(customer => {
        const customerSales = otherSales.filter(s => s.customerId === customer.id).reduce((sum, s) => sum + (s.finalAmount || 0), 0);
        const customerPayments = otherPayments.filter(p => p.customerId === customer.id).reduce((sum, p) => sum + p.amount, 0);
        debtMap.set(customer.id, customerSales - customerPayments);
    });
    return debtMap;
  }, [customers, otherSales, otherPayments]);

  const refinedSaleFormSchema = useMemo(() => saleFormSchema.superRefine((data, ctx) => {
    data.items.forEach((item, index) => {
      if (!item.productId) return;
      const product = productsMap.get(item.productId);
      if (!product) return;
      const { stockInBaseUnit } = getStockInfo(item.productId);
      const { conversionFactor } = getUnitInfo(product.unitId);
      const requestedQuantityInBase = item.quantity * (conversionFactor || 1);

      if (requestedQuantityInBase > stockInBaseUnit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [`items`, index, `quantity`],
          message: `Vượt quá tồn kho`,
        });
      }
    });
  }), [getStockInfo, productsMap, getUnitInfo]);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(refinedSaleFormSchema),
    defaultValues: {
      customerId: '',
      transactionDate: new Date().toISOString().split('T')[0],
      items: [],
      discountType: 'amount',
      discountValue: 0,
      customerPayment: 0,
      status: 'unprinted',
    },
    mode: "onChange"
  });
  
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items"
  });

  useEffect(() => {
    if(isOpen && sale){
      const saleItems = allSalesItems.filter(item => item.salesTransactionId === sale.id);
      setSaleItemsForEdit(saleItems);

      const formItems = saleItems.map(item => {
        const product = productsMap.get(item.productId);
        if (!product) return null;
        const { conversionFactor } = getUnitInfo(product.unitId);
        // Convert from base unit back to sale unit for display
        return {
          productId: item.productId,
          quantity: item.quantity / (conversionFactor || 1),
          price: item.price
        }
      }).filter(Boolean) as { productId: string; quantity: number; price: number; }[];

      replace(formItems);

      form.reset({
        customerId: sale.customerId,
        transactionDate: new Date(sale.transactionDate).toISOString().split('T')[0],
        items: formItems,
        discountType: sale.discountType || 'amount',
        discountValue: sale.discountValue || 0,
        customerPayment: sale.customerPayment || 0,
        status: sale.status || 'unprinted',
      });

    } else if (isOpen && !sale) {
      form.reset({
        customerId: '',
        transactionDate: new Date().toISOString().split('T')[0],
        items: [],
        discountType: 'amount',
        discountValue: 0,
        customerPayment: 0,
        status: 'unprinted',
      })
      replace([]);
    }
  }, [isOpen, sale, allSalesItems, form, replace, productsMap, getUnitInfo])


  const watchedItems = form.watch("items");
  const discountType = form.watch('discountType');
  const discountValue = form.watch('discountValue') || 0;
  const customerPayment = form.watch('customerPayment') || 0;
  const selectedCustomerId = form.watch('customerId');

  const { trigger } = form;
  useEffect(() => {
      trigger('items');
  }, [watchedItems, trigger, salesItemsWithoutCurrent]);

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
    
  const amountAfterDiscount = totalAmount - calculatedDiscount;
  const vatRate = settings?.vatRate || 0;
  const vatAmount = (amountAfterDiscount * vatRate) / 100;
  const finalAmount = amountAfterDiscount + vatAmount;

  const previousDebt = customerDebts.get(selectedCustomerId) || 0;
  const totalPayable = finalAmount + previousDebt;
  const remainingDebt = totalPayable - (customerPayment || 0);

  const onSubmit = async (data: SaleFormValues) => {
    const itemsData = data.items.map(item => {
        const product = productsMap.get(item.productId)!;
        const { conversionFactor } = getUnitInfo(product.unitId);
        // Quantity needs to be stored in the base unit
        return {
            productId: item.productId,
            quantity: item.quantity * (conversionFactor || 1),
            price: item.price,
        };
    });

    const saleData: Partial<Sale> = {
        id: sale?.id, // Important for updates
        customerId: data.customerId,
        transactionDate: new Date(data.transactionDate).toISOString(),
        totalAmount: totalAmount,
        vatAmount: vatAmount,
        finalAmount: finalAmount,
        discount: calculatedDiscount,
        discountType: data.discountType,
        discountValue: data.discountValue,
        customerPayment: data.customerPayment,
        previousDebt: previousDebt,
        remainingDebt: remainingDebt,
        status: data.status,
    };

    const result = await upsertSaleTransaction(saleData, itemsData);

    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã ${sale ? 'cập nhật' : 'tạo'} đơn hàng thành công.`,
      });
      onOpenChange(false);
      form.reset();
      router.refresh();
      if (result.saleId && !sale) {
        router.push(`/sales/${result.saleId}`);
      }
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
      // Default price to product's sellingPrice if available, otherwise 0
      append({ 
        productId: product.id, 
        quantity: 1, 
        price: product.sellingPrice || 0 
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { onOpenChange(open); if(!open) form.reset(); }}>
      <DialogContent className="sm:max-w-7xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{sale ? 'Sửa đơn hàng' : 'Tạo đơn hàng mới'}</DialogTitle>
          <DialogDescription>
            Điền thông tin chi tiết của đơn hàng dưới đây.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid md:grid-cols-4 gap-x-8 flex-grow overflow-hidden">
            {/* Left Column */}
            <div className="md:col-span-3 flex flex-col gap-4 overflow-hidden">
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

              <Separator />

              <div className='flex-grow space-y-4 overflow-y-auto pr-6 -mr-6'>
                <h3 className="text-md font-medium">Chi tiết đơn hàng</h3>
                <div className="space-y-3">
                  {fields.map((field, index) => {
                    const product = productsMap.get(watchedItems[index]?.productId);
                    if (!product) return null;

                    const saleUnitInfo = getUnitInfo(product.unitId);
                    const baseUnit = saleUnitInfo.baseUnit || unitsMap.get(product.unitId);
                    
                    const itemValues = watchedItems[index];
                    const quantityInBaseUnit = (itemValues?.quantity || 0) * (saleUnitInfo.conversionFactor || 1);
                    const lineTotal = quantityInBaseUnit * (itemValues?.price || 0);

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
                                        <FormLabel>SL ({saleUnitInfo.name || 'ĐVT'})</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="any" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Tồn: {stockInfo.stock.toLocaleString('en-US', { maximumFractionDigits: 2 })} {stockInfo.mainUnit?.name}
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

            {/* Right Column */}
            <div className='md:col-span-1 flex flex-col justify-between border-l pl-8'>
              <div className="space-y-4">
                  <h3 className="text-md font-medium">Tóm tắt thanh toán</h3>
                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between items-center">
                            <span>Tổng tiền hàng:</span>
                            <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                        </div>
                         <FormField
                            control={form.control}
                            name="discountValue"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex justify-between items-center">
                                        <FormLabel>Giảm giá:</FormLabel>
                                        <FormattedNumberInput {...field} id="discountValue" className="w-32"/>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {vatRate > 0 && (
                        <div className="flex justify-between items-center">
                            <span>Thuế VAT ({vatRate}%):</span>
                            <span className="font-semibold">{formatCurrency(vatAmount)}</span>
                        </div>
                        )}
                        <div className="flex justify-between items-center font-bold text-lg text-primary">
                          <span>Tổng cộng:</span>
                          <span>{formatCurrency(finalAmount)}</span>
                      </div>
                    </div>
                  <Separator/>
                   <div className="space-y-4 text-sm">
                      <div className="flex justify-between items-center">
                          <Label>Nợ cũ:</Label>
                          <span className="font-semibold">{formatCurrency(previousDebt)}</span>
                      </div>
                      <div className="flex justify-between items-center font-bold">
                          <span>Tổng phải trả:</span>
                          <span>{formatCurrency(totalPayable)}</span>
                      </div>
                      <FormField
                            control={form.control}
                            name="customerPayment"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex justify-between items-center">
                                        <FormLabel>Khách thanh toán:</FormLabel>
                                        <FormattedNumberInput {...field} id="customerPayment" className="w-32"/>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                      <Separator/>
                       <div className={`flex justify-between items-center font-bold text-lg ${remainingDebt > 0 ? 'text-destructive' : 'text-green-600'}`}>
                          <span>Còn nợ lại:</span>
                          <span>{formatCurrency(remainingDebt)}</span>
                      </div>
                  </div>
                  {sale && (
                    <>
                      <Separator />
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Trạng thái</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Chọn trạng thái" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="pending">Chờ xử lý</SelectItem>
                                <SelectItem value="unprinted">Chưa in</SelectItem>
                                <SelectItem value="printed">Đã in</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
              </div>
              <DialogFooter className="pt-4 border-t mt-4 flex-col gap-2">
                <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                  {form.formState.isSubmitting ? (sale ? 'Đang cập nhật...' : 'Đang tạo...') : (sale ? 'Cập nhật đơn hàng' : 'Tạo đơn hàng')}
                </Button>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full">Hủy</Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
