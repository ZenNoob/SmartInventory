
'use client'

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  File,
  Home,
  Package,
  PanelLeft,
  Search,
  ShoppingCart,
  Users,
  LineChart,
  Settings,
  Users2,
  Folder,
  Scale,
  Truck,
  Sparkles,
  PackagePlus,
  Store,
  History,
  BookUser,
  FileText,
  Warehouse,
  FileBox,
  Wallet,
  DollarSign,
  ChevronDown,
  Building,
  Briefcase,
} from "lucide-react"

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import type { Customer, Product, PurchaseOrder, Sale, Supplier } from "@/lib/types"

export function CommandMenu() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const firestore = useFirestore();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return
        }

        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])
  
  const customersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "customers")) : null, [firestore]);
  const productsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "products")) : null, [firestore]);
  const salesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "sales_transactions")) : null, [firestore]);
  const purchasesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "purchase_orders")) : null, [firestore]);
  const suppliersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "suppliers")) : null, [firestore]);

  const { data: customers } = useCollection<Customer>(customersQuery);
  const { data: products } = useCollection<Product>(productsQuery);
  const { data: sales } = useCollection<Sale>(salesQuery);
  const { data: purchases } = useCollection<PurchaseOrder>(purchasesQuery);
  const { data: suppliers } = useCollection<Supplier>(suppliersQuery);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])


  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "relative h-8 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 mr-2" />
        <span className="hidden lg:inline-flex">Tìm kiếm & điều hướng...</span>
        <span className="inline-flex lg:hidden">Tìm kiếm...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Gõ lệnh hoặc tìm kiếm..." />
        <CommandList>
          <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>
          <CommandGroup heading="Điều hướng">
            <CommandItem onSelect={() => runCommand(() => router.push('/dashboard'))}>
              <Home className="mr-2 h-4 w-4" />
              <span>Bảng điều khiển</span>
            </CommandItem>
             <CommandItem onSelect={() => runCommand(() => router.push('/pos'))}>
              <Store className="mr-2 h-4 w-4" />
              <span>POS - Bán tại quầy</span>
            </CommandItem>
             <CommandItem onSelect={() => runCommand(() => router.push('/cash-flow'))}>
              <Wallet className="mr-2 h-4 w-4" />
              <span>Sổ quỹ</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/products'))}>
              <Package className="mr-2 h-4 w-4" />
              <span>Sản phẩm</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/suppliers'))}>
              <Building className="mr-2 h-4 w-4" />
              <span>Nhà cung cấp</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/purchases'))}>
              <Truck className="mr-2 h-4 w-4" />
              <span>Nhập hàng</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/customers'))}>
              <Users className="mr-2 h-4 w-4" />
              <span>Khách hàng</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/sales'))}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              <span>Bán hàng</span>
            </CommandItem>
             <CommandItem onSelect={() => runCommand(() => router.push('/users'))}>
              <Users2 className="mr-2 h-4 w-4" />
              <span>Người dùng</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/settings'))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Cài đặt</span>
            </CommandItem>
          </CommandGroup>
           <CommandSeparator />
           <CommandGroup heading="Báo cáo & Phân tích">
            <CommandItem onSelect={() => runCommand(() => router.push('/reports/income-statement'))}>
              <LineChart className="mr-2 h-4 w-4" />
              <span>Báo cáo Thu-Chi</span>
            </CommandItem>
             <CommandItem onSelect={() => runCommand(() => router.push('/reports/profit'))}>
              <DollarSign className="mr-2 h-4 w-4" />
              <span>Báo cáo Lợi nhuận</span>
            </CommandItem>
             <CommandItem onSelect={() => runCommand(() => router.push('/reports/debt'))}>
              <BookUser className="mr-2 h-4 w-4" />
              <span>Báo cáo Công nợ KH</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/reports/supplier-debt'))}>
              <Truck className="mr-2 h-4 w-4" />
              <span>Báo cáo Công nợ NCC</span>
            </CommandItem>
             <CommandItem onSelect={() => runCommand(() => router.push('/reports/transactions'))}>
              <History className="mr-2 h-4 w-4" />
              <span>Lịch sử Giao dịch</span>
            </CommandItem>
             <CommandItem onSelect={() => runCommand(() => router.push('/reports/supplier-debt-tracking'))}>
              <History className="mr-2 h-4 w-4" />
              <span>Đối soát Công nợ NCC</span>
            </CommandItem>
             <CommandItem onSelect={() => runCommand(() => router.push('/reports/revenue'))}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Báo cáo Doanh thu</span>
            </CommandItem>
             <CommandItem onSelect={() => runCommand(() => router.push('/reports/sold-products'))}>
              <FileBox className="mr-2 h-4 w-4" />
              <span>Báo cáo Sản phẩm đã bán</span>
            </CommandItem>
             <CommandItem onSelect={() => runCommand(() => router.push('/reports/inventory'))}>
              <Warehouse className="mr-2 h-4 w-4" />
              <span>Báo cáo Tồn kho</span>
            </CommandItem>
             <CommandItem onSelect={() => runCommand(() => router.push('/reports/customer-segments'))}>
              <Sparkles className="mr-2 h-4 w-4" />
              <span>Phân khúc Khách hàng (AI)</span>
            </CommandItem>
             <CommandItem onSelect={() => runCommand(() => router.push('/reports/market-basket-analysis'))}>
              <PackagePlus className="mr-2 h-4 w-4" />
              <span>Phân tích Rổ hàng (AI)</span>
            </CommandItem>
          </CommandGroup>
          {products && products.length > 0 && (
            <>
                <CommandSeparator />
                <CommandGroup heading="Sản phẩm">
                {products.map((product) => (
                    <CommandItem
                    key={product.id}
                    value={`Sản phẩm ${product.name}`}
                    onSelect={() => runCommand(() => router.push(`/products?q=${product.name}`))}
                    >
                    <Package className="mr-2 h-4 w-4" />
                    <span>{product.name}</span>
                    </CommandItem>
                ))}
                </CommandGroup>
            </>
          )}
          {suppliers && suppliers.length > 0 && (
            <>
                <CommandSeparator />
                <CommandGroup heading="Nhà cung cấp">
                {suppliers.map((supplier) => (
                    <CommandItem
                    key={supplier.id}
                    value={`Nhà cung cấp ${supplier.name}`}
                    onSelect={() => runCommand(() => router.push(`/suppliers?q=${supplier.name}`))}
                    >
                    <Building className="mr-2 h-4 w-4" />
                    <span>{supplier.name}</span>
                    </CommandItem>
                ))}
                </CommandGroup>
            </>
          )}
          {customers && customers.length > 0 && (
            <>
                <CommandSeparator />
                <CommandGroup heading="Khách hàng">
                {customers.map((customer) => (
                    <CommandItem
                    key={customer.id}
                    value={`Khách hàng ${customer.name} ${customer.phone}`}
                    onSelect={() => runCommand(() => router.push(`/customers/${customer.id}`))}
                    >
                    <Users className="mr-2 h-4 w-4" />
                    <span>{customer.name}</span>
                    </CommandItem>
                ))}
                </CommandGroup>
            </>
          )}
          {sales && sales.length > 0 && (
            <>
                <CommandSeparator />
                <CommandGroup heading="Đơn hàng bán">
                {sales.slice(0, 5).map((sale) => (
                    <CommandItem
                    key={sale.id}
                    value={`Đơn hàng ${sale.invoiceNumber}`}
                    onSelect={() => runCommand(() => router.push(`/sales/${sale.id}`))}
                    >
                    <File className="mr-2 h-4 w-4" />
                    <span>{sale.invoiceNumber}</span>
                    </CommandItem>
                ))}
                </CommandGroup>
            </>
          )}
           {purchases && purchases.length > 0 && (
            <>
                <CommandSeparator />
                <CommandGroup heading="Đơn hàng nhập">
                {purchases.slice(0, 5).map((purchase) => (
                    <CommandItem
                    key={purchase.id}
                    value={`Phiếu nhập ${purchase.orderNumber}`}
                    onSelect={() => runCommand(() => router.push(`/purchases/${purchase.id}`))}
                    >
                    <File className="mr-2 h-4 w-4" />
                    <span>{purchase.orderNumber}</span>
                    </CommandItem>
                ))}
                </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
