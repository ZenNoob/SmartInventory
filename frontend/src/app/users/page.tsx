'use client'

import {
  MoreHorizontal,
  PlusCircle,
  Search,
  ListFilter,
  Store,
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
import { Input } from "@/components/ui/input"
import { UserForm } from "./components/user-form"
import { useState, useMemo, useEffect, useCallback } from "react"
import { useUserRole } from "@/hooks/use-user-role"
import Link from "next/link"
import { deleteUser, getUsers } from "./actions"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import type { Permissions } from "@/lib/types"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface UserStoreAssignment {
  storeId: string;
  storeName: string;
  storeCode: string;
  role?: string;
  permissions?: Permissions;
}

interface UserWithStores {
  id: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'accountant' | 'inventory_manager' | 'salesperson' | 'custom';
  permissions?: Permissions;
  status: 'active' | 'inactive';
  stores: UserStoreAssignment[];
  createdAt: string;
  updatedAt: string;
}

function getRoleVietnamese(role: string) {
  switch (role) {
    case 'admin':
      return 'Quản trị viên';
    case 'accountant':
      return 'Kế toán';
    case 'inventory_manager':
      return 'Quản lý kho';
    case 'salesperson':
      return 'Nhân viên bán hàng';
    case 'custom':
      return 'Tùy chỉnh';
    default:
      return role;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge variant="default">Hoạt động</Badge>;
    case 'inactive':
      return <Badge variant="secondary">Ngừng hoạt động</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function UsersPage() {
  const { permissions, role: currentUserRole, isLoading: isRoleLoading, userId: currentUserId } = useUserRole();
  const { toast } = useToast();
  const router = useRouter();

  const [users, setUsers] = useState<UserWithStores[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithStores | undefined>(undefined);
  const [userToDelete, setUserToDelete] = useState<UserWithStores | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserWithStores['role'] | 'all'>('all');

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const result = await getUsers();
    if (result.success && result.users) {
      setUsers(result.users);
    } else {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: result.error || "Không thể tải danh sách người dùng",
      });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    if (!isRoleLoading) {
      fetchUsers();
    }
  }, [isRoleLoading, fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users?.filter(user => {
      // Hide other admin accounts if the current user is not an admin
      if (user.role === 'admin' && currentUserRole !== 'admin') {
        return false;
      }

      const term = searchTerm.toLowerCase();
      const roleMatch = roleFilter === 'all' || user.role === roleFilter;
      const searchMatch = term === '' ||
        user.email.toLowerCase().includes(term) ||
        (user.displayName && user.displayName.toLowerCase().includes(term));
      return roleMatch && searchMatch;
    });
  }, [users, searchTerm, roleFilter, currentUserRole]);

  const canAccess = permissions?.users?.includes('view');
  const canAdd = permissions?.users?.includes('add');
  const canEdit = permissions?.users?.includes('edit');
  const canDelete = permissions?.users?.includes('delete');

  const handleAddUser = () => {
    setSelectedUser(undefined);
    setIsFormOpen(true);
  }

  const handleEditUser = (user: UserWithStores) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    const result = await deleteUser(userToDelete.id);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã xóa người dùng ${userToDelete.displayName || userToDelete.email}.`,
      });
      fetchUsers();
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

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      fetchUsers();
    }
  };

  if (isLoading || isRoleLoading) {
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
          <p>Chỉ những người dùng có quyền 'Xem người dùng' mới có thể truy cập trang này.</p>
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
        onOpenChange={handleFormClose}
        user={selectedUser}
        allUsers={users}
        onUserUpdated={fetchUsers}
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

      <Card>
        <CardHeader>
          <CardTitle>Người dùng</CardTitle>
          <CardDescription>
            Quản lý người dùng trong hệ thống của bạn.
          </CardDescription>
          <div className="flex items-center gap-4 pt-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm theo tên, email..."
                className="w-full rounded-lg bg-background pl-8 md:w-80"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Lọc vai trò
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Lọc theo vai trò</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={roleFilter} onValueChange={(value) => setRoleFilter(value as UserWithStores['role'] | 'all')}>
                  <DropdownMenuRadioItem value="all">Tất cả</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="admin">Quản trị viên</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="accountant">Kế toán</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="inventory_manager">Quản lý kho</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="salesperson">Nhân viên bán hàng</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="custom">Tùy chỉnh</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="ml-auto flex items-center gap-2">
              {canAdd && (
                <Button size="sm" className="h-10 gap-1" onClick={handleAddUser}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Thêm người dùng
                  </span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">STT</TableHead>
                <TableHead>Tên hiển thị</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Cửa hàng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>
                  <span className="sr-only">Hành động</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Đang tải...</TableCell>
                </TableRow>
              )}
              {!isLoading && filteredUsers?.map((user, index) => {
                const isCurrentUser = user.id === currentUserId;
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
                      {user.stores && user.stores.length > 0 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 cursor-pointer">
                                <Store className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{user.stores.length} cửa hàng</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                {user.stores.map((store) => (
                                  <div key={store.storeId} className="text-sm">
                                    {store.storeName} ({store.storeCode})
                                  </div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground text-sm">Chưa gán</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(user.status)}
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
                          {canEdit && <DropdownMenuItem onClick={() => handleEditUser(user)}>Sửa</DropdownMenuItem>}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setUserToDelete(user)}
                                disabled={isCurrentUser}
                              >
                                Xóa
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && filteredUsers?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Không tìm thấy người dùng nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>{filteredUsers?.length || 0}</strong> trên <strong>{users?.length || 0}</strong> người dùng
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
