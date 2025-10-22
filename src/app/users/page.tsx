'use client'

import {
  MoreHorizontal,
  PlusCircle,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { AppUser } from "@/lib/types"
import { UserForm } from "./components/user-form"
import { useState, useEffect } from "react"
import { useUserRole } from "@/hooks/use-user-role"
import { useRouter } from "next/navigation"

function getRoleVietnamese(role: string) {
  switch (role) {
    case 'admin':
      return 'Quản trị viên';
    case 'accountant':
      return 'Kế toán';
    case 'inventory_manager':
      return 'Quản lý kho';
    default:
      return role;
  }
}

export default function UsersPage() {
  const { user } = useUser();
  const { role, isLoading: isRoleLoading } = useUserRole();
  const router = useRouter();
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, "users"))
    }, [firestore]
  );
  
  const adminsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      // This query specifically checks for users with the 'admin' role.
      return query(collection(firestore, "users"), where("role", "==", "admin"))
    }, [firestore]
  );

  const { data: users, isLoading: isUsersLoading } = useCollection<AppUser>(usersQuery);
  const { data: admins, isLoading: isAdminLoading } = useCollection<AppUser>(adminsQuery);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | undefined>(undefined);

  const isLoading = isUsersLoading || isAdminLoading || isRoleLoading;
  
  // This is the bootstrap logic.
  // Allow access if the user's role is 'admin' OR if the `admins` collection is empty.
  const canAccess = role === 'admin' || (!isLoading && admins?.length === 0);
  
  useEffect(() => {
    // Only redirect if loading is complete and access is definitively denied.
    if (!isLoading && !canAccess) {
      router.push('/dashboard');
    }
  }, [isLoading, canAccess, router]);

  // While roles and admin status are loading, show a loading state.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Đang tải...</div>
      </div>
    );
  }

  // If loading is finished and the user still can't access, show a redirecting message.
  // This prevents the page from flashing content before redirecting.
  if (!canAccess) {
     return (
      <div className="flex items-center justify-center h-screen">
        <div>Đang chuyển hướng...</div>
      </div>
    );
  }
  
  const handleAddUser = () => {
    setSelectedUser(undefined);
    setIsFormOpen(true);
  }

  const handleEditUser = (user: AppUser) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  }

  return (
    <div>
      <UserForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        user={selectedUser}
      />
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-2xl font-semibold">Quản lý người dùng</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" onClick={handleAddUser}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Thêm người dùng
            </span>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Người dùng</CardTitle>
          <CardDescription>
            Danh sách tất cả người dùng trong hệ thống của bạn.
            {admins?.length === 0 && !isLoading && (
               <p className="text-destructive text-sm mt-2">
                 Chưa có quản trị viên nào. Hãy thêm một người dùng có vai trò 'Quản trị viên' để bảo mật trang này.
               </p>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên hiển thị</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>
                  <span className="sr-only">Hành động</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Đang tải...</TableCell>
                </TableRow>
              )}
              {!isLoading && users?.map((user) => {
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.displayName || 'N/A'}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getRoleVietnamese(user.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Chuyển đổi menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            Sửa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>1-{users?.length || 0}</strong> trên <strong>{users?.length || 0}</strong> người dùng
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
