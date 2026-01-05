'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
  Barcode,
  Check,
  ChevronsUpDown,
  MinusCircle,
  PlusCircle,
  Search,
  Trash2,
  Undo2,
  XCircle,
  PanelLeft,
  UserPlus,
  Lock,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useReactToPrint } from 'react-to-print';

import { useStore } from '@/contexts/store-context'
import {
  Customer,
  Payment,
  Product,
  Sale,
  SalesItem,
  ThemeSettings,
  Unit,
  Shift,
} from '@/lib/types'
import { upsertSaleTransaction, updateSaleStatus } from '@/app/sales/actions'
import { 
  getProducts, 
  getProductByBarcode, 
  getCustomers, 
  getUnits, 
  getStoreSettings,
  getActiveShift,
} from './actions'
import { useToast } from '@/hooks/use-toast'
import { cn, formatCurrency } from '@/lib/utils'
import { useUserRole } from '@/hooks/use-user-role'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useSidebar } from '@/components/ui/sidebar'
import { Checkbox } from '@/components/ui/checkbox'
import { CustomerForm } from '@/app/customers/components/customer-form'
import { StartShiftDialog } from './components/start-shift-dialog'
import { ShiftControls } from './components/shift-controls'
import { ThermalReceipt } from '../sales/[id]/components/thermal-receipt'

// Extended product type with stock info from SQL Server
interface ProductWithStock extends Product {
  currentStock: number;
  averageCost: number;
  categoryName?: string;
  unitName?: string;
}

// Extended customer type with debt info
interface CustomerWithDebt extends Customer {
  currentDebt?: number;
}

type CartItem = {
  productId: string
  productName: string
  quantity: number // This is in the MAIN sale unit of the product
  price: number // This is the price per BASE unit
  saleUnitName: string
  stockInfo: {
    stockInBaseUnit: number
    baseUnitName: string
    conversionFactor: number
  }
}

const WALK_IN_CUSTOMER_ID = 'walk-in-customer'

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

export default function POSPage() {
  const { user, isLoading: isStoreLoading } = useStore()
  const router = useRouter()
  const { toast } = useToast()
  const { toggleSidebar } = useSidebar();
  const { permissions, isLoading: isRoleLoading } = useUserRole();

  // Data state
  const [products, setProducts] = useState<ProductWithStock[]>([])
  const [customers, setCustomers] = useState<CustomerWithDebt[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [settings, setSettings] = useState<ThemeSettings | null>(null)
  const [activeShift, setActiveShift] = useState<Shift | null>(null)
  
  // Loading states
  const [productsLoading, setProductsLoading] = useState(true)
  const [customersLoading, setCustomersLoading] = useState(true)
  const [unitsLoading, setUnitsLoading] = useState(true)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [shiftsLoading, setShiftsLoading] = useState(true)

  // Cart and UI state
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(WALK_IN_CUSTOMER_ID)
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false)
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [customerPayment, setCustomerPayment] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('amount');
  const [discountValue, setDiscountValue] = useState(0);
  const [pointsUsed, setPointsUsed] = useState(0);
  const [paymentSuggestions, setPaymentSuggestions] = useState<number[]>([]);
  const [isChangeReturned, setIsChangeReturned] = useState(true);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);

  // Fetch products from SQL Server
  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const result = await getProducts({ pageSize: 1000 }); // Get all active products
      if (result.success && result.data) {
        setProducts(result.data as ProductWithStock[]);
      } else {
        toast({
          variant: 'destructive',
          title: 'Lỗi tải sản phẩm',
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  }, [toast]);

  // Fetch customers from SQL Server
  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const result = await getCustomers({ pageSize: 1000 });
      if (result.success && result.data) {
        setCustomers(result.data as CustomerWithDebt[]);
      } else {
        toast({
          variant: 'destructive',
          title: 'Lỗi tải khách hàng',
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setCustomersLoading(false);
    }
  }, [toast]);

  // Fetch units from SQL Server
  const fetchUnits = useCallback(async () => {
    setUnitsLoading(true);
    try {
      const result = await getUnits();
      if (result.success && result.data) {
        setUnits(result.data as Unit[]);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setUnitsLoading(false);
    }
  }, []);

  // Fetch store settings from SQL Server
  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const result = await getStoreSettings();
      if (result.success && result.settings) {
        setSettings(result.settings as ThemeSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  // Fetch active shift from SQL Server
  const fetchActiveShift = useCallback(async () => {
    if (!user?.id) return;
    setShiftsLoading(true);
    try {
      const result = await getActiveShift(user.id);
      if (result.success && result.shift) {
        setActiveShift(result.shift as Shift);
      } else {
        setActiveShift(null);
      }
    } catch (error) {
      console.error('Error fetching active shift:', error);
      setActiveShift(null);
    } finally {
      setShiftsLoading(false);
    }
  }, [user?.id]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchCustomers();
      fetchUnits();
      fetchSettings();
      fetchActiveShift();
    }
  }, [user, fetchProducts, fetchCustomers, fetchUnits, fetchSettings, fetchActiveShift]);

  // Memos for data mapping
  const unitsMap = useMemo(() => new Map(units?.map((u) => [u.id, u])), [units])
  const productsMap = useMemo(() => new Map(products?.map((p) => [p.id, p])), [products])
  const productsByBarcode = useMemo(() => {
    const map = new Map<string, ProductWithStock>()
    products?.forEach((p) => {
      if (p.barcode) {
        map.set(p.barcode, p)
      }
    })
    return map
  }, [products])
  
  const walkInCustomer: CustomerWithDebt = {
    id: WALK_IN_CUSTOMER_ID,
    name: 'Khách lẻ',
    customerType: 'personal',
    creditLimit: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
    currentDebt: 0,
  }
  
  const allCustomers = useMemo(() => (customers ? [walkInCustomer, ...customers] : [walkInCustomer]), [customers])
  const selectedCustomer = useMemo(() => allCustomers.find(c => c.id === selectedCustomerId), [allCustomers, selectedCustomerId]);

  // Unit info helper
  const getUnitInfo = useCallback((unitId: string): { baseUnit?: Unit; conversionFactor: number; name: string } => {
    const unit = unitsMap.get(unitId)
    if (!unit) return { conversionFactor: 1, name: '' }

    if (unit.baseUnitId && unit.conversionFactor) {
      const baseUnit = unitsMap.get(unit.baseUnitId)
      return { baseUnit, conversionFactor: unit.conversionFactor, name: unit.name }
    }

    return { baseUnit: unit, conversionFactor: 1, name: unit.name }
  }, [unitsMap])

  // Get stock from SQL Server (already calculated in ProductWithStock)
  const getStockInBaseUnit = useCallback((productId: string): number => {
    const product = productsMap.get(productId)
    if (!product) return 0
    return (product as ProductWithStock).currentStock || 0
  }, [productsMap])

  // Cart Management
  const addProductToCart = useCallback((product: ProductWithStock) => {
    const existingItemIndex = cart.findIndex((item) => item.productId === product.id)
    const { name: saleUnitName, baseUnit, conversionFactor } = getUnitInfo(product.unitId)

    if (existingItemIndex > -1) {
      const newCart = [...cart]
      newCart[existingItemIndex].quantity += 1
      setCart(newCart)
    } else {
      const stockInBaseUnit = getStockInBaseUnit(product.id)
      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          price: product.sellingPrice || 0,
          saleUnitName: saleUnitName,
          stockInfo: {
            stockInBaseUnit: stockInBaseUnit,
            baseUnitName: baseUnit?.name || 'N/A',
            conversionFactor: conversionFactor,
          },
        },
      ])
    }
  }, [cart, getStockInBaseUnit, getUnitInfo])

  const updateCartItem = (productId: string, newQuantity: number) => {
    const newCart = cart.map((item) =>
      item.productId === productId ? { ...item, quantity: newQuantity } : item
    )
    setCart(newCart.filter((item) => item.quantity > 0))
  }

  // Barcode scanning with SQL Server lookup
  const handleBarcodeScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (!barcode) return

      // First try local lookup
      const localProduct = productsByBarcode.get(barcode)
      if (localProduct) {
        addProductToCart(localProduct)
        setBarcode('')
        return
      }

      // If not found locally, try SQL Server API
      const result = await getProductByBarcode(barcode)
      if (result.success && result.product) {
        const product = result.product as ProductWithStock
        // Add to local products cache
        setProducts(prev => {
          const exists = prev.some(p => p.id === product.id)
          if (!exists) return [...prev, product]
          return prev
        })
        addProductToCart(product)
        setBarcode('')
      } else {
        toast({
          variant: 'destructive',
          title: 'Không tìm thấy sản phẩm',
          description: result.error || `Không có sản phẩm nào khớp với mã vạch "${barcode}".`,
        })
      }
    }
  }

  // Financial Calculations
  const totalAmount = useMemo(() =>
    cart.reduce((acc, item) => {
      const quantityInBase = item.quantity * item.stockInfo.conversionFactor
      return acc + quantityInBase * item.price
    }, 0),
  [cart])

  const { tierDiscountPercentage, tierDiscountAmount } = useMemo(() => {
    if (!selectedCustomer || !settings?.loyalty?.enabled) {
      return { tierDiscountPercentage: 0, tierDiscountAmount: 0 };
    }
    const customerTier = settings.loyalty.tiers.find(t => t.name === selectedCustomer.loyaltyTier);
    if (!customerTier || !customerTier.discountPercentage) {
      return { tierDiscountPercentage: 0, tierDiscountAmount: 0 };
    }
    return {
      tierDiscountPercentage: customerTier.discountPercentage,
      tierDiscountAmount: (totalAmount * customerTier.discountPercentage) / 100,
    };
  }, [selectedCustomer, totalAmount, settings]);

  const calculatedDiscount = useMemo(() => 
    discountType === 'percentage' ? (totalAmount * discountValue) / 100 : discountValue,
    [totalAmount, discountType, discountValue]
  );
  
  const pointsToVndRate = settings?.loyalty?.pointsToVndRate || 0;
  const pointsDiscount = pointsUsed * pointsToVndRate;

  const totalDiscount = tierDiscountAmount + calculatedDiscount + pointsDiscount;
  const amountAfterDiscount = totalAmount - totalDiscount;

  const vatRate = settings?.vatRate || 0;
  const vatAmount = (amountAfterDiscount * vatRate) / 100;
  const finalAmount = amountAfterDiscount + vatAmount;

  // Previous debt from SQL Server (stored in customer.currentDebt)
  const previousDebt = useMemo(() => {
    if (!selectedCustomerId || selectedCustomerId === WALK_IN_CUSTOMER_ID) return 0;
    return selectedCustomer?.currentDebt || 0;
  }, [selectedCustomerId, selectedCustomer]);

  const totalPayable = finalAmount + previousDebt;
  const remainingDebt = totalPayable - customerPayment;
  const changeAmount = customerPayment - finalAmount;

  // Auto-fill customer payment
  useEffect(() => {
    if (finalAmount > 0) {
      setCustomerPayment(finalAmount);
    } else {
      setCustomerPayment(0);
    }
  }, [finalAmount]);

  // Form Submission - Create sale via SQL Server API
  const handleCreateSale = async () => {
    if (cart.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Đơn hàng trống',
        description: 'Vui lòng thêm sản phẩm vào đơn hàng.',
      })
      return
    }

    setIsSubmitting(true)
    const itemsData = cart.map((item) => ({
      productId: item.productId,
      quantity: item.quantity * item.stockInfo.conversionFactor, // Store in base unit
      price: item.price,
    }))

    const saleData: Partial<Sale> & { isChangeReturned?: boolean } = {
      customerId: selectedCustomerId === WALK_IN_CUSTOMER_ID ? undefined : selectedCustomerId,
      shiftId: activeShift?.id,
      transactionDate: new Date().toISOString(),
      totalAmount: totalAmount,
      discount: calculatedDiscount,
      discountType,
      discountValue,
      tierDiscountPercentage,
      tierDiscountAmount,
      pointsUsed,
      pointsDiscount,
      vatAmount: vatAmount,
      finalAmount: finalAmount,
      customerPayment: customerPayment,
      previousDebt: previousDebt, 
      remainingDebt: remainingDebt,
      status: settings?.invoiceFormat === 'none' ? 'printed' : 'unprinted',
      isChangeReturned: isChangeReturned,
    }

    const result = await upsertSaleTransaction(saleData, itemsData)

    if (result.success && result.saleData) {
      toast({
        title: 'Thành công!',
        description: `Đã tạo đơn hàng ${result.saleData.invoiceNumber}.`,
      });

      // Open new window for printing if enabled
      if (settings?.invoiceFormat && settings.invoiceFormat !== 'none') {
        const printWindow = window.open(`/sales/${result.saleData.id}?print=true`, '_blank', 'width=800,height=600');
        if (!printWindow) {
          toast({
            variant: "destructive",
            title: "Lỗi in",
            description: "Không thể mở cửa sổ in. Vui lòng kiểm tra cài đặt chặn pop-up của trình duyệt.",
          })
        }
      }

      // Reset state for new sale
      setCart([])
      setCustomerPayment(0)
      setSelectedCustomerId(WALK_IN_CUSTOMER_ID)
      setDiscountValue(0)
      setDiscountType('amount')
      setPointsUsed(0);
      
      // Refresh data to get updated stock and customer debt
      fetchProducts();
      fetchCustomers();
      fetchActiveShift();

    } else {
      toast({
        variant: 'destructive',
        title: 'Ôi! Đã có lỗi xảy ra.',
        description: result.error,
      })
    }
    setIsSubmitting(false)
  }

  // Auto-focus barcode input
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [cart]);

  // Redirect if not logged in
  useEffect(() => {
    if (!isStoreLoading && !user) {
      router.push('/login');
    }
  }, [isStoreLoading, user, router]);

  const handleCustomerPaymentChange = (value: number) => {
    setCustomerPayment(value);
    if (value > 0) {
      const s = value.toString();
      const suggestions = [
        parseInt(s + '000'),
        parseInt(s.slice(0, -1) + '0000'),
        parseInt(s.slice(0, -2) + '00000'),
      ].filter(n => n > value && n.toString().length <= 9);

      const finalAmountStr = Math.ceil(finalAmount).toString();
      const len = finalAmountStr.length;
      const powerOf10 = Math.pow(10, len - 1);
      const firstDigit = parseInt(finalAmountStr[0]);
      
      const nextRoundUp = (firstDigit + 1) * powerOf10;
      if (nextRoundUp > value) suggestions.push(nextRoundUp);

      setPaymentSuggestions([...new Set(suggestions)].sort((a,b) => a - b));
    } else {
      setPaymentSuggestions([]);
    }
  };
  
  const handleNewCustomerCreated = (newCustomerId?: string) => {
    setIsCustomerFormOpen(false);
    fetchCustomers(); // Refresh customers list
    if(newCustomerId){
      setSelectedCustomerId(newCustomerId);
    }
  }

  const handleShiftStarted = () => {
    fetchActiveShift();
  }

  const handleShiftClosed = () => {
    setActiveShift(null);
    router.push('/login');
  }

  const isLoading = customersLoading || productsLoading || unitsLoading || settingsLoading || shiftsLoading || isStoreLoading || isRoleLoading;
  
  if (isLoading || (!user && !isStoreLoading)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Đang tải dữ liệu cho quầy POS...</p>
      </div>
    );
  }

  if (!activeShift) {
    return <StartShiftDialog userId={user!.id} userName={user!.displayName || user!.email} onShiftStarted={handleShiftStarted} />;
  }

  const isLocked = !activeShift;

  const canViewCustomers = permissions?.customers?.includes('view');
  const canAddCustomers = permissions?.customers?.includes('add');

  return (
    <>
    {canAddCustomers && (
      <CustomerForm 
        isOpen={isCustomerFormOpen} 
        onOpenChange={handleNewCustomerCreated} 
      />
    )}
    <div className="flex flex-col h-[calc(100vh-5rem)] -m-6 bg-muted/30">
      <header className="p-4 border-b bg-background flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className='shrink-0'>
              <PanelLeft />
          </Button>
          <div className="relative flex-grow max-w-sm">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              ref={barcodeInputRef}
              placeholder="Quét mã vạch..."
              className="pl-10 h-12 text-lg"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={handleBarcodeScan}
              disabled={isSubmitting || isLocked}
            />
          </div>
           <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="h-12" disabled={isLocked}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Thêm thủ công
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                 <Command>
                    <CommandInput placeholder="Tìm kiếm sản phẩm..." />
                    <CommandList>
                        <CommandEmpty>Không tìm thấy sản phẩm.</CommandEmpty>
                        <CommandGroup>
                            {products?.map((product) => (
                            <CommandItem
                                key={product.id}
                                value={product.name}
                                onSelect={() => {
                                    addProductToCart(product);
                                    setProductSearchOpen(false);
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        cart.some(i => i.productId === product.id) ? "opacity-100" : "opacity-0"
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
          <Popover
            open={customerSearchOpen}
            onOpenChange={setCustomerSearchOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                disabled={isLocked || !canViewCustomers}
                className={cn(
                  'w-[250px] justify-between h-12',
                  !selectedCustomerId && 'text-muted-foreground'
                )}
              >
                {selectedCustomerId
                  ? allCustomers.find((c) => c.id === selectedCustomerId)?.name
                  : 'Chọn khách hàng...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Tìm khách hàng..." />
                <CommandList>
                  <CommandEmpty>Không tìm thấy khách hàng.</CommandEmpty>
                  <CommandGroup>
                    {allCustomers.map((customer) => {
                      const debt = customer.currentDebt || 0;
                      return (
                      <CommandItem
                        value={`${customer.name} ${customer.phone}`}
                        key={customer.id}
                        onSelect={() => {
                          setSelectedCustomerId(customer.id)
                          setCustomerSearchOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            customer.id === selectedCustomerId
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                        <div>
                          <p>{customer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {customer.phone}
                          </p>
                           {debt > 0 && (
                            <p className="text-xs text-destructive">Nợ: {formatCurrency(debt)}</p>
                           )}
                        </div>
                      </CommandItem>
                      )
                    })}
                  </CommandGroup>
                  {canAddCustomers && (
                    <>
                      <CommandSeparator />
                      <CommandItem
                          onSelect={() => {
                            setCustomerSearchOpen(false);
                            setIsCustomerFormOpen(true);
                          }}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Thêm khách hàng mới
                        </CommandItem>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
           {activeShift && <ShiftControls activeShift={activeShift} onShiftClosed={handleShiftClosed} />}
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-hidden">
        {/* Cart Items */}
        <div className="lg:col-span-2 flex flex-col h-full relative">
          {isLocked && (
             <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-10">
                <Lock className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold text-muted-foreground">Giao diện bán hàng đã khóa</p>
                <p className="text-sm text-muted-foreground">Vui lòng bắt đầu ca làm việc để mở khóa.</p>
            </div>
          )}
          <h2 className="text-xl font-semibold mb-4">Đơn hàng hiện tại ({cart.length})</h2>
          <div className="flex-1 overflow-y-auto -mr-4 pr-4 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">STT</TableHead>
                  <TableHead className="w-[35%]">Sản phẩm</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-center w-48">Số lượng</TableHead>
                  <TableHead className="text-right">Thành tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center h-48 text-muted-foreground"
                    >
                      Quét mã vạch hoặc tìm kiếm để thêm sản phẩm vào đơn
                      hàng.
                    </TableCell>
                  </TableRow>
                ) : (
                  cart.map((item, index) => {
                    const lineTotal = item.quantity * item.stockInfo.conversionFactor * item.price;
                    const showConversion = item.saleUnitName !== item.stockInfo.baseUnitName;
                    return (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium text-center">{index + 1}</TableCell>
                        <TableCell className="font-medium">
                          {item.productName}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.price)} /{' '}
                          {item.stockInfo.baseUnitName}
                        </TableCell>
                        <TableCell className="text-center">
                           <div className="flex items-center justify-center gap-1">
                             <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => updateCartItem(item.productId, item.quantity - 1)}>
                               <MinusCircle className="h-5 w-5" />
                             </Button>
                             <div className='relative w-full'>
                               <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => {
                                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                      updateCartItem(item.productId, isNaN(val) ? 0 : val);
                                  }}
                                  className="w-full text-center font-bold text-lg h-10 px-1"
                               />
                               <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{item.saleUnitName}</span>
                             </div>
                             <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => updateCartItem(item.productId, item.quantity + 1)}>
                               <PlusCircle className="h-5 w-5" />
                             </Button>
                           </div>
                          {showConversion && (
                            <p className="text-xs text-muted-foreground mt-1">
                              (1 {item.saleUnitName} = {item.stockInfo.conversionFactor} {item.stockInfo.baseUnitName})
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-lg">
                          {formatCurrency(lineTotal)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Payment and Summary */}
        <div className="lg:col-span-1 bg-card border rounded-lg p-6 flex flex-col">
           <h2 className="text-xl font-semibold mb-6">Thanh toán</h2>
          <div className="flex-1 space-y-2 overflow-y-auto text-sm pr-2 -mr-4">
              <div className="flex justify-between items-center">
                <Label>Tổng tiền hàng</Label>
                <p className="font-semibold text-base">{formatCurrency(totalAmount)}</p>
              </div>

              {tierDiscountAmount > 0 && (
                <div className="flex justify-between items-center text-primary">
                  <Label>Ưu đãi hạng {selectedCustomer?.loyaltyTier && settings?.loyalty?.tiers.find(t => t.name === selectedCustomer.loyaltyTier)?.vietnameseName} ({tierDiscountPercentage}%)</Label>
                  <p className="font-semibold">-{formatCurrency(tierDiscountAmount)}</p>
                </div>
              )}

              <div className="space-y-2 pt-2">
                 <Label>Giảm giá</Label>
                  <div className="flex gap-4">
                     <RadioGroup value={discountType} onValueChange={(value) => setDiscountType(value as 'percentage' | 'amount')} className="flex items-center">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="amount" id="d_amount" />
                        <Label htmlFor="d_amount">VNĐ</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="percentage" id="d_percent" />
                        <Label htmlFor="d_percent">%</Label>
                      </div>
                    </RadioGroup>
                    <FormattedNumberInput
                      value={discountValue}
                      onChange={setDiscountValue}
                      className="h-9 text-right"
                    />
                  </div>
              </div>
              
              {calculatedDiscount > 0 && (
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Số tiền giảm:</span>
                    <span className="font-semibold">-{formatCurrency(calculatedDiscount)}</span>
                </div>
              )}
              
              {selectedCustomer && selectedCustomer.id !== 'walk-in-customer' && settings?.loyalty?.enabled && (
                <div className="space-y-2 pt-2">
                    <Label htmlFor="pointsUsed">Sử dụng điểm ({selectedCustomer.loyaltyPoints || 0} điểm khả dụng)</Label>
                    <div className="flex items-center gap-2">
                      <FormattedNumberInput
                          id="pointsUsed"
                          value={pointsUsed}
                          onChange={setPointsUsed}
                          className="h-9 text-right"
                          max={selectedCustomer.loyaltyPoints || 0}
                      />
                    </div>
                    {pointsDiscount > 0 && (
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Giảm giá điểm thưởng ({pointsUsed} điểm):</span>
                            <span className="font-semibold">-{formatCurrency(pointsDiscount)}</span>
                        </div>
                    )}
                </div>
              )}

              {totalDiscount > 0 && (
                <div className="flex justify-between items-center font-semibold text-primary mt-2">
                  <Label>Tổng giảm giá</Label>
                  <p>-{formatCurrency(totalDiscount)}</p>
                </div>
              )}
              
              {vatRate > 0 && (
                <div className="flex justify-between items-center">
                    <Label>Thuế VAT ({vatRate}%):</Label>
                    <span className="font-semibold">{formatCurrency(vatAmount)}</span>
                </div>
              )}
              
              <Separator className="my-2" />

              <div className="flex justify-between items-center">
                  <Label className="font-bold">Khách cần trả</Label>
                  <p className="font-bold text-base text-primary">{formatCurrency(finalAmount)}</p>
              </div>

               {previousDebt > 0 && (
                <div className="flex justify-between items-center text-sm text-destructive">
                  <Label>Nợ cũ</Label>
                  <p className="font-semibold">{formatCurrency(previousDebt)}</p>
                </div>
              )}

              <div className="flex justify-between items-center font-bold text-base">
                <Label>Tổng phải trả</Label>
                <p className="">{formatCurrency(totalPayable)}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPayment">
                  Tiền khách đưa
                </Label>
                 <FormattedNumberInput
                  id="customerPayment"
                  value={customerPayment}
                  onChange={handleCustomerPaymentChange}
                  className="h-12 text-xl font-bold text-right"
                />
              </div>
               {paymentSuggestions.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {paymentSuggestions.map((s) => {
                       const numString = s.toLocaleString('en-US');
                       const len = numString.length;
                       let textSize = 'text-sm';
                       if (len > 11) textSize = 'text-[10px]';
                       else if (len > 7) textSize = 'text-xs';
                      
                      return (
                        <Button
                          key={s}
                          variant="outline"
                          size="sm"
                          onClick={() => handleCustomerPaymentChange(s)}
                          className={cn('h-auto py-1 px-2 flex-grow', textSize)}
                        >
                          {numString}
                        </Button>
                      )
                    })}
                  </div>
                )}
              <div className="flex justify-between items-center">
                  <Label className={`font-semibold ${remainingDebt <= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {remainingDebt <= 0 ? 'Tiền thối lại' : 'Còn thiếu'}
                  </Label>
                  <p className={`font-bold text-base ${remainingDebt <= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCurrency(Math.abs(remainingDebt))}
                  </p>
              </div>
              {changeAmount > 0 && (
                 <div className="flex items-center justify-end space-x-2 pt-2">
                    <Checkbox
                        id="isChangeReturned"
                        checked={isChangeReturned}
                        onCheckedChange={(checked) => setIsChangeReturned(Boolean(checked))}
                    />
                    <Label htmlFor="isChangeReturned" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Đã thối tiền
                    </Label>
                </div>
              )}
          </div>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    className="w-full h-14"
                    onClick={() => {
                    setCart([])
                    setCustomerPayment(0)
                    setDiscountValue(0)
                    setPointsUsed(0);
                    }}
                    disabled={isSubmitting || isLocked}
                >
                    <XCircle className="mr-2 h-5 w-5" />
                    Hủy
                </Button>
                <Button
                    className="w-full h-14 text-lg"
                    onClick={handleCreateSale}
                    disabled={isSubmitting || cart.length === 0 || isLocked}
                >
                    Thanh toán
                </Button>
            </div>
        </div>
      </main>
    </div>
    </>
  )
}
