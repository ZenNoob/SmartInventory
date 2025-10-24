'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth, useUser } from '@/firebase'
import { useUserRole } from '@/hooks/use-user-role'
import { useRouter } from 'next/navigation'

export function UserNav() {
  const { user } = useUser();
  const { role } = useUserRole();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    auth.signOut().then(() => {
      router.push('/login');
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.photoURL || "https://i.pravatar.cc/150?u=a042581f4e29026704d"} alt="@user" />
            <AvatarFallback>{user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.displayName || 'Người dùng'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
            {role && <p className="text-xs leading-none text-muted-foreground capitalize pt-1">{role}</p>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            Hồ sơ
          </DropdownMenuItem>
          <DropdownMenuItem>
            Thanh toán
          </DropdownMenuItem>
          <DropdownMenuItem>
            Cài đặt
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
