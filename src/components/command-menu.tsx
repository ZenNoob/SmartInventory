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
import type { Customer, Product, Sale } from "@/lib/types"

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

  const { data: customers } = useCollection<Customer>(customersQuery);
  const { data: products } = useCollection<Product>(productsQuery);
  const { data: sales } = useCollection<Sale>(salesQuery);

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
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <span className="hidden lg:inline-flex">Tìm kiếm...</span>
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
            <CommandItem onSelect={() => runCommand(() => router.push('/products'))}>
              <Package className="mr-2 h-4 w-4" />
              <span>Sản phẩm</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/customers'))}>
              <Users className="mr-2 h-4 w-4" />
              <span>Khách hàng</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/sales'))}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              <span>Bán hàng</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/settings'))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Cài đặt</span>
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
                <CommandGroup heading="Đơn hàng">
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
        </CommandList>
      </CommandDialog>
    </>
  )
}
