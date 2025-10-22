'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Package,
  ShoppingCart,
  Users,
  LineChart,
  Settings,
} from 'lucide-react'

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Logo } from '@/components/icons'
import { useUser } from '@/firebase'

export function MainNav() {
  const pathname = usePathname()
  const { user, isUserLoading } = useUser();

  const isActive = (path: string) => {
    return pathname === path
  }

  if (pathname === '/login' || isUserLoading) {
    return null;
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6 text-primary" />
          <span className="">Smart Inventory</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex-grow">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/dashboard')}
              tooltip="Dashboard"
            >
              <Link href="/dashboard">
                <Home />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/products')}
              tooltip="Products"
            >
              <Link href="/products">
                <Package />
                <span>Products</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/sales')}
              tooltip="Sales"
            >
              <Link href="/sales">
                <ShoppingCart />
                <span>Sales</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/customers')}
              tooltip="Customers"
            >
              <Link href="/customers">
                <Users />
                <span>Customers</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/reports')}
              tooltip="Reports"
            >
              <Link href="/reports">
                <LineChart />
                <span>Reports</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <Separator className="my-2" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/settings')}
              tooltip="Settings"
            >
              <Link href="/settings">
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
