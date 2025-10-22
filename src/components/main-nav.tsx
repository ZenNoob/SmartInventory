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

  if (pathname.startsWith('/login') || isUserLoading) {
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
          <span className="">Hàng tồn kho thông minh</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex-grow">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/dashboard')}
              tooltip="Bảng điều khiển"
            >
              <Link href="/dashboard">
                <Home />
                <span>Bảng điều khiển</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/products')}
              tooltip="Sản phẩm"
            >
              <Link href="/products">
                <Package />
                <span>Sản phẩm</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/sales')}
              tooltip="Bán hàng"
            >
              <Link href="/sales">
                <ShoppingCart />
                <span>Bán hàng</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/customers')}
              tooltip="Khách hàng"
            >
              <Link href="/customers">
                <Users />
                <span>Khách hàng</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/reports')}
              tooltip="Báo cáo"
            >
              <Link href="/reports">
                <LineChart />
                <span>Báo cáo</span>
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
              tooltip="Cài đặt"
            >
              <Link href="/settings">
                <Settings />
                <span>Cài đặt</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
