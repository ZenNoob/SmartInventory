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
  DollarSign,
  ChevronDown,
  Building,
  Briefcase,
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
    if (path.endsWith('/')) path = path.slice(0, -1);
    return pathname.startsWith(path);
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

  const showCatalogMenu = hasPermission('categories', 'view') || hasPermission('units', 'view') || hasPermission('customers', 'view') || hasPermission('suppliers', 'view');


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

          {showCatalogMenu && (
             <Collapsible asChild>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="w-full justify-start" isActive={isActive('/categories') || isActive('/units') || isActive('/customers') || isActive('/suppliers')} tooltip="Danh mục">
                      <div className="flex items-center gap-2 flex-1">
                        <Folder />
                        {state === 'expanded' && <span>Danh mục</span>}
                      </div>
                      {state === 'expanded' && <ChevronDown className="h-4 w-4 ml-auto shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />}
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent asChild>
                  <SidebarMenuSub>
                      {hasPermission('categories', 'view') && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/categories')}>
                            <Link href="/categories" className='flex items-center gap-2'><Folder className="h-4 w-4" />Danh mục sản phẩm</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}
                      {hasPermission('units', 'view') && (
                        <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={isActive('/units')}>
                              <Link href="/units" className='flex items-center gap-2'><Scale className="h-4 w-4" />Đơn vị tính</Link>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}
                      {hasPermission('customers', 'view') && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/customers')}>
                            <Link href="/customers" className='flex items-center gap-2'><BookUser className="h-4 w-4" />Khách hàng</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}
                      {hasPermission('suppliers', 'view') && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/suppliers')}>
                            <Link href="/suppliers" className='flex items-center gap-2'><Building className="h-4 w-4" />Nhà cung cấp</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
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
                    <SidebarMenuButton className="w-full justify-start" isActive={isActive('/reports') || isActive('/shifts')} tooltip="Báo cáo & Quản lý">
                      <div className="flex items-center gap-2 flex-1">
                        <LineChart />
                        {state === 'expanded' && <span>Báo cáo & Quản lý</span>}
                      </div>
                      {state === 'expanded' && <ChevronDown className="h-4 w-4 ml-auto shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />}
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent asChild>
                  <SidebarMenuSub>
                      {hasPermission('shifts', 'view') && (
                        <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={isActive('/shifts')}>
                                <Link href="/shifts" className='flex items-center gap-2'><Briefcase className="h-4 w-4" />Quản lý Ca</Link>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/reports/income-statement')}>
                              <Link href="/reports/income-statement" className='flex items-center gap-2'><LineChart className="h-4 w-4" />Báo cáo Thu chi</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                       <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/reports/profit')}>
                              <Link href="/reports/profit" className='flex items-center gap-2'><DollarSign className="h-4 w-4 text-green-500" />Báo cáo Lợi nhuận</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/reports/debt')}>
                              <Link href="/reports/debt" className='flex items-center gap-2'><BookUser className="h-4 w-4" />Công nợ KH</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                       <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/reports/supplier-debt')}>
                              <Link href="/reports/supplier-debt" className='flex items-center gap-2'><Truck className="h-4 w-4" />Công nợ NCC</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/reports/transactions')}>
                              <Link href="/reports/transactions" className='flex items-center gap-2'><History className="h-4 w-4" />Lịch sử Giao dịch</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/reports/supplier-debt-tracking')}>
                              <Link href="/reports/supplier-debt-tracking" className='flex items-center gap-2'><History className="h-4 w-4" />Theo dõi Công nợ NCC</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/reports/revenue')}>
                              <Link href="/reports/revenue" className='flex items-center gap-2'><FileText className="h-4 w-4" />Doanh thu</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/reports/sold-products')}>
                              <Link href="/reports/sold-products" className='flex items-center gap-2'><FileBox className="h-4 w-4" />Sản phẩm đã bán</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={isActive('/reports/purchases')}>
                                <Link href="/reports/purchases" className='flex items-center gap-2'><Truck className="h-4 w-4" />Chi tiết nhập hàng</Link>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/reports/inventory')}>
                              <Link href="/reports/inventory" className='flex items-center gap-2'><Warehouse className="h-4 w-4" />Tồn kho</Link>
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
