'use client'

import {
  MoreHorizontal,
  PlusCircle,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
  DropdownMenuSeparator,
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
import { useState } from "react"
import { useUserRole } from "@/hooks/use-user-role"
import Link from "next/link"
import { deleteUser } from "./actions"
import { useToast } from "@/hooks/use-toast"
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
  const { user: currentUser } = useUser();
  const { role, isLoading: isRoleLoading } = useUserRole();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const usersQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, "users"))
    }, [firestore]
  );
  
  const adminsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, "users"), where("role", "==", "admin"))
    }, [firestore]
  );

  const { data: users, isLoading: isUsersLoading } = useCollection<AppUser>(usersQuery);
  const { data: admins, isLoading: isAdminLoading } = useCollection<AppUser>(adminsQuery);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | undefined>(undefined);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLoading = isUsersLoading || isAdminLoading || isRoleLoading;
  
  // Allow access if the user's role is 'admin' OR if the `admins` collection is empty.
  const canAccess = role === 'admin' || (!isLoading && admins?.length === 0);
  
  const handleAddUser = () => {
    setSelectedUser(undefined);
    setIsFormOpen(true);
  }

  const handleEditUser = (user: AppUser) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  }
  
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    const result = await deleteUser(userToDelete.id!);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã xóa người dùng ${userToDelete.displayName || userToDelete.email}.`,
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
    setIsDeleting(false);
    setUserToDelete(null);
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Đang tải...</div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Truy cập bị từ chối</CardTitle>
          <CardDescription>
            Bạn không có quyền truy cập trang này.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Chỉ những người dùng có vai trò 'Quản trị viên' mới có thể quản lý người dùng.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Quay lại Bảng điều khiển</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }


  return (
    <div>
      <UserForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        user={selectedUser}
      />
       <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn tài khoản của{' '}
              <strong>{userToDelete?.displayName || userToDelete?.email}</strong> và xóa dữ liệu của họ khỏi máy chủ của chúng tôi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting}>
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            {admins?.length === 0 && (
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
                <TableHead className="w-16">STT</TableHead>
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
                  <TableCell colSpan={5} className="text-center">Đang tải...</TableCell>
                </TableRow>
              )}
              {!isLoading && users?.map((user, index) => {
                const isCurrentUser = user.id === currentUser?.uid;
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setUserToDelete(user)}
                            disabled={isCurrentUser}
                          >
                            Xóa
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
