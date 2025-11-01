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
} from 'lucide-react'

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { Logo } from '@/components/icons'
import { useUser } from '@/firebase'
import { useUserRole } from '@/hooks/use-user-role'

export function MainNav() {
  const pathname = usePathname()
  const { user, isUserLoading } = useUser();
  const { permissions, isLoading: isRoleLoading } = useUserRole();
  const { state } = useSidebar();

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === path;
    return pathname.startsWith(path)
  }
  
  const hasPermission = (module: string, permission: string) => {
    // @ts-ignore
    return permissions?.[module]?.includes(permission);
  }

  const isLoading = isUserLoading || isRoleLoading;

  if (pathname.startsWith('/login')) {
    return null;
  }
  
  if (isLoading || !user) {
     return (
       <Sidebar>
        <SidebarHeader>
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Logo className="h-6 w-6 text-primary" />
            {state === 'expanded' && <span className="whitespace-nowrap">Quản lý bán hàng</span>}
          </Link>
        </SidebarHeader>
        <SidebarContent />
      </Sidebar>
     )
  }


  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6 text-primary" />
          {state === 'expanded' && <span className="whitespace-nowrap">Quản lý bán hàng</span>}
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu>
          {hasPermission('dashboard', 'view') && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/dashboard')} tooltip="Bảng điều khiển">
                <Link href="/dashboard">
                  <Home />
                  {state === 'expanded' && <span>Bảng điều khiển</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {hasPermission('pos', 'view') && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/pos')} tooltip="POS Bán tại quầy">
                <Link href="/pos">
                  <Store />
                  {state === 'expanded' && <span className='text-primary font-bold'>POS Bán tại quầy</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {hasPermission('categories', 'view') && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/categories')} tooltip="Danh mục">
                <Link href="/categories">
                  <Folder />
                  {state === 'expanded' && <span>Danh mục</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {hasPermission('units', 'view') && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/units')} tooltip="Đơn vị tính">
                <Link href="/units">
                  <Scale />
                  {state === 'expanded' && <span>Đơn vị tính</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {hasPermission('products', 'view') && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/products')} tooltip="Sản phẩm">
                <Link href="/products">
                  <Package />
                  {state === 'expanded' && <span>Sản phẩm</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {hasPermission('purchases', 'view') && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/purchases')} tooltip="Nhập hàng">
                <Link href="/purchases">
                  <Truck />
                  {state === 'expanded' && <span>Nhập hàng</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {hasPermission('sales', 'view') && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/sales')} tooltip="Bán hàng">
                <Link href="/sales">
                  <ShoppingCart />
                  {state === 'expanded' && <span>Bán hàng</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {hasPermission('customers', 'view') && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/customers')} tooltip="Khách hàng">
                <Link href="/customers">
                  <BookUser />
                  {state === 'expanded' && <span>Khách hàng</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {hasPermission('cash-flow', 'view') && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/cash-flow')} tooltip="Sổ quỹ">
                <Link href="/cash-flow">
                  <Wallet />
                  {state === 'expanded' && <span>Sổ quỹ</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          
          {hasPermission('reports', 'view') && (
            <Collapsible asChild>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="w-full" isActive={isActive('/reports')} tooltip="Báo cáo">
                      <LineChart />
                      {state === 'expanded' && <span>Báo cáo</span>}
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent asChild>
                  <SidebarMenuSub>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/reports/income-statement')}>
                              <Link href="/reports/income-statement">Báo cáo Thu chi</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/reports/debt')}>
                              <Link href="/reports/debt">Công nợ</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/reports/transactions')}>
                              <Link href="/reports/transactions" className='flex items-center gap-2'><History className="h-4 w-4" />Lịch sử giao dịch</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/reports/revenue')}>
                              <Link href="/reports/revenue">Doanh thu</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/reports/sold-products')}>
                              <Link href="/reports/sold-products">Sản phẩm đã bán</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={isActive('/reports/purchases')}>
                                <Link href="/reports/purchases">Chi tiết nhập hàng</Link>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/reports/inventory')}>
                              <Link href="/reports/inventory">Tồn kho</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/reports/customer-segments')}>
                              <Link href="/reports/customer-segments" className='flex items-center gap-2'><Sparkles className="h-4 w-4 text-yellow-500" />Phân khúc KH</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/reports/market-basket-analysis')}>
                              <Link href="/reports/market-basket-analysis" className='flex items-center gap-2'><PackagePlus className="h-4 w-4 text-yellow-500" />Phân tích rổ hàng</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )}

          {hasPermission('users', 'view') && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/users')} tooltip="Quản lý người dùng">
                <Link href="/users">
                  <Users2 />
                  {state === 'expanded' && <span>Quản lý người dùng</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
         {hasPermission('settings', 'view') && (
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive('/settings')} tooltip="Cài đặt">
              <Link href="/settings">
                <Settings />
                {state === 'expanded' && <span>Cài đặt</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
         )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
