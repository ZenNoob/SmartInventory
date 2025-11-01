

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
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase'
import { collection, getDocs, query } from 'firebase/firestore'
import {
  Customer,
  Payment,
  Product,
  Sale,
  SalesItem,
  ThemeSettings,
  Unit,
} from '@/lib/types'
import { upsertSaleTransaction } from '@/app/sales/actions'
import { useToast } from '@/hooks/use-toast'
import { cn, formatCurrency } from '@/lib/utils'

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

export default function POSPage() {
  const { user } = useUser()
  const router = useRouter()
  const firestore = useFirestore()
  const { toast } = useToast()

  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    WALK_IN_CUSTOMER_ID
  )
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false)
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [customerPayment, setCustomerPayment] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  // #region Data Fetching
  const customersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'customers')) : null),
    [firestore]
  )
  const productsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'products')) : null),
    [firestore]
  )
  const unitsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'units')) : null),
    [firestore]
  )
  const salesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'sales_transactions')) : null),
    [firestore]
  )
  const paymentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'payments')) : null),
    [firestore]
  )

  const { data: customersData, isLoading: customersLoading } = useCollection<Customer>(customersQuery)
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery)
  const { data: units, isLoading: unitsLoading } = useCollection<Unit>(unitsQuery)
  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery)
  const { data: payments, isLoading: paymentsLoading } = useCollection<Payment>(paymentsQuery)

  const [allSalesItems, setAllSalesItems] = useState<SalesItem[]>([])
  const [salesItemsLoading, setSalesItemsLoading] = useState(true)
  // #endregion

  // #region Memos for data mapping
  const unitsMap = useMemo(() => new Map(units?.map((u) => [u.id, u])), [units])
  const productsMap = useMemo(() => new Map(products?.map((p) => [p.id, p])), [products])
  const productsByBarcode = useMemo(() => {
    const map = new Map<string, Product>()
    products?.forEach((p) => {
      if (p.barcode) {
        map.set(p.barcode, p)
      }
    })
    return map
  }, [products])
  const walkInCustomer: Customer = {
    id: WALK_IN_CUSTOMER_ID,
    name: 'Khách lẻ',
    customerType: 'personal',
    creditLimit: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
  }
  const customers = useMemo(() => (customersData ? [walkInCustomer, ...customersData] : [walkInCustomer]), [customersData])
  // #endregion

  // #region Sales Items Fetching Effect
  useEffect(() => {
    async function fetchAllSalesItems() {
      if (!firestore || !sales) {
        if (!salesLoading) setSalesItemsLoading(false)
        return
      }

      setSalesItemsLoading(true)
      const items: SalesItem[] = []
      try {
        for (const sale of sales) {
          const itemsCollectionRef = collection(firestore, `sales_transactions/${sale.id}/sales_items`)
          const itemsSnapshot = await getDocs(itemsCollectionRef)
          itemsSnapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() } as SalesItem)
          })
        }
        setAllSalesItems(items)
      } catch (error) {
        console.error('Error fetching sales items: ', error)
      } finally {
        setSalesItemsLoading(false)
      }
    }
    fetchAllSalesItems()
  }, [sales, firestore, salesLoading])
  // #endregion

  // #region Stock and Unit Calculation Callbacks
  const getUnitInfo = useCallback((unitId: string): { baseUnit?: Unit; conversionFactor: number; name: string } => {
    const unit = unitsMap.get(unitId)
    if (!unit) return { conversionFactor: 1, name: '' }

    if (unit.baseUnitId && unit.conversionFactor) {
      const baseUnit = unitsMap.get(unit.baseUnitId)
      return { baseUnit, conversionFactor: unit.conversionFactor, name: unit.name }
    }

    return { baseUnit: unit, conversionFactor: 1, name: unit.name }
  },[unitsMap])

  const getStockInBaseUnit = useCallback((productId: string): number => {
      const product = productsMap.get(productId)
      if (!product) return 0
      let totalImportedInBaseUnit = 0
      product.purchaseLots?.forEach((lot) => {
        const { conversionFactor } = getUnitInfo(lot.unitId)
        totalImportedInBaseUnit += lot.quantity * conversionFactor
      })

      const totalSoldInBaseUnit = allSalesItems
        .filter((item) => item.productId === productId)
        .reduce((acc, item) => acc + item.quantity, 0)

      return totalImportedInBaseUnit - totalSoldInBaseUnit
    },[allSalesItems, getUnitInfo, productsMap])
  // #endregion

  // #region Cart Management
  const addProductToCart = useCallback((product: Product) => {
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
    },[cart, getStockInBaseUnit, getUnitInfo])

  const updateCartItem = (productId: string, newQuantity: number) => {
    const newCart = cart.map((item) =>
      item.productId === productId ? { ...item, quantity: newQuantity } : item
    )
    setCart(newCart.filter((item) => item.quantity > 0)) // Remove if quantity is 0
  }

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (!barcode) return

      const product = productsByBarcode.get(barcode)

      if (product) {
        addProductToCart(product)
        setBarcode('')
      } else {
        toast({
          variant: 'destructive',
          title: 'Không tìm thấy sản phẩm',
          description: `Không có sản phẩm nào khớp với mã vạch "${barcode}".`,
        })
      }
    }
  }
  // #endregion

  // #region Financial Calculations
  const totalAmount = useMemo(() =>
      cart.reduce((acc, item) => {
        const quantityInBase = item.quantity * item.stockInfo.conversionFactor
        return acc + quantityInBase * item.price
      }, 0),
    [cart]
  )

  const changeAmount = customerPayment - totalAmount;
  // #endregion

  // #region Form Submission
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

    const saleData: Partial<Sale> = {
      customerId: selectedCustomerId,
      transactionDate: new Date().toISOString(),
      totalAmount: totalAmount,
      finalAmount: totalAmount, // Assuming no discount/VAT for POS for now
      customerPayment: customerPayment,
      previousDebt: 0, // Not tracking debt for POS for simplicity
      remainingDebt: totalAmount - customerPayment,
      status: 'printed',
    }

    const result = await upsertSaleTransaction(saleData, itemsData)
    setIsSubmitting(false)

    if (result.success && result.saleId) {
      toast({
        title: 'Thành công!',
        description: `Đã tạo đơn hàng ${result.saleId.slice(-6).toUpperCase()}.`,
      })
      // Reset state for new sale
      setCart([])
      setCustomerPayment(0)
      setSelectedCustomerId(WALK_IN_CUSTOMER_ID)
      router.push(`/sales/${result.saleId}?print=true`)
    } else {
      toast({
        variant: 'destructive',
        title: 'Ôi! Đã có lỗi xảy ra.',
        description: result.error,
      })
    }
  }

  // Auto-focus barcode input
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [cart]);


  const isLoading = customersLoading || productsLoading || unitsLoading || salesLoading || salesItemsLoading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Đang tải dữ liệu cho quầy POS...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      <header className="p-4 border-b">
        <div className="flex items-center gap-4">
          <div className="relative flex-grow max-w-sm">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              ref={barcodeInputRef}
              placeholder="Quét mã vạch..."
              className="pl-10 h-12 text-lg"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={handleBarcodeScan}
              disabled={isSubmitting}
            />
          </div>
           <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="h-12">
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
                className={cn(
                  'w-[250px] justify-between h-12',
                  !selectedCustomerId && 'text-muted-foreground'
                )}
              >
                {selectedCustomerId
                  ? customers.find((c) => c.id === selectedCustomerId)?.name
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
                    {customers.map((customer) => (
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
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button
            variant="destructive"
            className="h-12"
            onClick={() => {
              setCart([])
              setCustomerPayment(0)
            }}
            disabled={isSubmitting}
          >
            <XCircle className="mr-2 h-5 w-5" />
            Hủy
          </Button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-hidden">
        {/* Cart Items */}
        <div className="lg:col-span-2 flex flex-col h-full">
          <h2 className="text-xl font-semibold mb-4">Đơn hàng hiện tại ({cart.length})</h2>
          <ScrollArea className="flex-1 -mr-4 pr-4">
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
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium">
                          {item.productName}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.price)} /{' '}
                          {item.stockInfo.baseUnitName}
                        </TableCell>
                        <TableCell className="text-center">
                           <div className="flex items-center justify-center gap-2">
                             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateCartItem(item.productId, item.quantity - 1)}>
                               <MinusCircle className="h-5 w-5" />
                             </Button>
                             <div>
                                <span className="font-bold text-lg w-10 text-center">{item.quantity}</span>
                                <span className="text-sm text-muted-foreground ml-1">{item.saleUnitName}</span>
                             </div>
                             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateCartItem(item.productId, item.quantity + 1)}>
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
          </ScrollArea>
        </div>

        {/* Payment and Summary */}
        <div className="lg:col-span-1 bg-card border rounded-lg p-6 flex flex-col">
           <h2 className="text-xl font-semibold mb-6">Thanh toán</h2>
          <div className="flex-1 space-y-4 overflow-y-auto text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Tổng tiền hàng</p>
                <p className="font-semibold text-base">{formatCurrency(totalAmount)}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                  <p className="font-bold">Khách cần trả</p>
                  <p className="font-bold text-2xl text-primary">{formatCurrency(totalAmount)}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPayment">
                  Tiền khách đưa
                </Label>
                <Input
                  id="customerPayment"
                  type="text"
                  className="h-12 text-xl font-bold text-right"
                  value={customerPayment.toLocaleString('en-US')}
                  onChange={(e) => {
                    const val = parseInt(e.target.value.replace(/,/g, ''), 10);
                    setCustomerPayment(isNaN(val) ? 0 : val);
                  }}
                />
              </div>
              <div className="space-y-1">
                  <p className={`font-semibold ${changeAmount >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {changeAmount >= 0 ? 'Tiền thối lại' : 'Còn thiếu'}
                  </p>
                  <p className={`font-bold text-xl ${changeAmount >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCurrency(Math.abs(changeAmount))}
                  </p>
              </div>
          </div>
          <Button
            className="w-full h-16 text-xl mt-4"
            onClick={handleCreateSale}
            disabled={isSubmitting || cart.length === 0}
          >
            {isSubmitting ? 'Đang xử lý...' : 'Thanh toán'}
          </Button>
        </div>
      </main>
    </div>
  )
}
