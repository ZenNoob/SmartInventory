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
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase'
import { useUserRole } from '@/hooks/use-user-role'
import { AppUser } from '@/lib/types'
import { collection, query, where } from 'firebase/firestore'

export function MainNav() {
  const pathname = usePathname()
  const { user, isUserLoading } = useUser();
  const { role, isLoading: isRoleLoading } = useUserRole();
  const { state } = useSidebar();
  const firestore = useFirestore();

  const adminsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "users"), where("role", "==", "admin"))
  }, [firestore]);

  const { data: admins, isLoading: isAdminLoading } = useCollection<AppUser>(adminsQuery);

  const isActive = (path: string) => {
    return pathname.startsWith(path)
  }

  const isLoading = isUserLoading || isAdminLoading;
  
  const canSeeUserManagement = role === 'admin' || (!isLoading && admins?.length === 0);

  if (pathname.startsWith('/login')) {
    return null;
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6 text-primary" />
          {state === 'expanded' && <span className="whitespace-nowrap">Quản lý bán hàng</span>}
        </Link>
      </SidebarHeader>
      { (isUserLoading || !user) ? (
        <SidebarContent />
      ) : (
        <>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/dashboard')}
                  tooltip="Bảng điều khiển"
                >
                  <Link href="/dashboard">
                    <Home />
                    {state === 'expanded' && <span>Bảng điều khiển</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/categories')}
                  tooltip="Danh mục"
                >
                  <Link href="/categories">
                    <Folder />
                    {state === 'expanded' && <span>Danh mục</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/units')}
                  tooltip="Đơn vị tính"
                >
                  <Link href="/units">
                    <Scale />
                    {state === 'expanded' && <span>Đơn vị tính</span>}
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
                    {state === 'expanded' && <span>Sản phẩm</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/purchases')}
                  tooltip="Nhập hàng"
                >
                  <Link href="/purchases">
                    <Truck />
                    {state === 'expanded' && <span>Nhập hàng</span>}
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
                    {state === 'expanded' && <span>Bán hàng</span>}
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
                    {state === 'expanded' && <span>Khách hàng</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <Collapsible asChild>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                     <SidebarMenuButton
                        className="w-full"
                        isActive={isActive('/reports')}
                        tooltip="Báo cáo"
                      >
                        <LineChart />
                        {state === 'expanded' && <span>Báo cáo</span>}
                      </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent asChild>
                    <SidebarMenuSub>
                        <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={isActive('/reports/debt')}>
                                <Link href="/reports/debt">Công nợ</Link>
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
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {canSeeUserManagement && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/users')}
                    tooltip="Quản lý người dùng"
                  >
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/settings')}
                  tooltip="Cài đặt"
                >
                  <Link href="/settings">
                    <Settings />
                    {state === 'expanded' && <span>Cài đặt</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </>
      )}
    </Sidebar>
  )
}
