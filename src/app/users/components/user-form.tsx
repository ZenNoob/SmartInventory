
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from "@/components/ui/input"
import { AppUser, Module, Permission, Permissions } from '@/lib/types'
import { upsertUser } from '../actions'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { Check, ChevronsUpDown, AlertTriangle, RefreshCw, UserPlus, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"


const permissionsSchema = z.record(z.array(z.enum(['view', 'add', 'edit', 'delete'])))

const userInfoSchemaBase = z.object({
  email: z.string().email({ message: "Email không hợp lệ." }),
  displayName: z.string().optional(),
  role: z.enum(['admin', 'accountant', 'inventory_manager', 'salesperson', 'custom']),
});

const newUserInfoSchema = userInfoSchemaBase.extend({
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự.'),
});

const updateUserInfoSchema = userInfoSchemaBase.extend({
    password: z.string().optional().refine(val => !val || val.length >= 6, {
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự.',
    }),
});

const permissionsFormSchema = z.object({
    permissions: permissionsSchema,
})


const modules: { id: Module; name: string; description: string; }[] = [
    { id: 'dashboard', name: 'Bảng điều khiển', description: 'Xem tổng quan tình hình kinh doanh, doanh thu, công nợ.' },
    { id: 'pos', name: 'POS - Bán tại quầy', description: 'Sử dụng giao diện bán hàng nhanh tại quầy.' },
    { id: 'categories', name: 'Danh mục', description: 'Quản lý các loại sản phẩm (VD: Giống, Phân bón).' },
    { id: 'units', name: 'Đơn vị tính', description: 'Quản lý các đơn vị (VD: Cái, Kg, Bao).' },
    { id: 'suppliers', name: 'Nhà cung cấp', description: 'Quản lý thông tin các nhà cung cấp hàng hóa.' },
    { id: 'products', name: 'Sản phẩm', description: 'Quản lý thông tin, giá và các lô nhập của sản phẩm.' },
    { id: 'purchases', name: 'Nhập hàng', description: 'Tạo và quản lý các phiếu nhập hàng từ nhà cung cấp.' },
    { id: 'sales', name: 'Bán hàng', description: 'Tạo và quản lý các đơn hàng bán cho khách.' },
    { id: 'customers', name: 'Khách hàng', description: 'Quản lý thông tin và công nợ của khách hàng.' },
    { id: 'cash-flow', name: 'Sổ quỹ', description: 'Quản lý các giao dịch thu, chi tiền mặt.' },
    { id: 'shifts', name: 'Quản lý Ca', description: 'Xem lại và quản lý các ca làm việc của nhân viên.' },
    { id: 'reports', name: 'Báo cáo', description: 'Xem các báo cáo chi tiết về doanh thu, công nợ, tồn kho.' },
    { id: 'ai_forecast', name: 'AI - Dự báo & Đề xuất', description: 'Sử dụng AI để dự báo doanh số và đề xuất nhập hàng.' },
    { id: 'ai_segmentation', name: 'AI - Phân khúc khách hàng', description: 'Sử dụng AI để phân nhóm khách hàng.' },
    { id: 'ai_basket_analysis', name: 'AI - Phân tích rổ hàng', description: 'Sử dụng AI để tìm các sản phẩm hay được mua cùng nhau.' },
    { id: 'users', name: 'Người dùng', description: 'Quản lý tài khoản và phân quyền người dùng hệ thống.' },
    { id: 'settings', name: 'Cài đặt', description: 'Tùy chỉnh thông tin chung và giao diện của ứng dụng.' },
]

const permissions: { id: Permission; name: string }[] = [
    { id: 'view', name: 'Xem' },
    { id: 'add', name: 'Thêm' },
    { id: 'edit', name: 'Sửa' },
    { id: 'delete', name: 'Xóa' },
]

const defaultPermissions: Record<AppUser['role'], Permissions> = {
  admin: {
    dashboard: ['view'],
    pos: ['view', 'add', 'edit', 'delete'],
    categories: ['view', 'add', 'edit', 'delete'],
    units: ['view', 'add', 'edit', 'delete'],
    suppliers: ['view', 'add', 'edit', 'delete'],
    products: ['view', 'add', 'edit', 'delete'],
    purchases: ['view', 'add', 'edit', 'delete'],
    sales: ['view', 'add', 'edit', 'delete'],
    customers: ['view', 'add', 'edit', 'delete'],
    'cash-flow': ['view', 'add', 'edit', 'delete'],
    shifts: ['view'],
    reports: ['view'],
    ai_forecast: ['view'],
    ai_segmentation: ['view'],
    ai_basket_analysis: ['view'],
    users: ['view', 'add', 'edit', 'delete'],
    settings: ['view', 'edit'],
  },
  accountant: {
    dashboard: ['view'],
    sales: ['view', 'add', 'edit'],
    customers: ['view', 'add', 'edit'],
    'cash-flow': ['view', 'add', 'edit', 'delete'],
    reports: ['view'],
  },
  inventory_manager: {
    dashboard: ['view'],
    categories: ['view', 'add', 'edit'],
    units: ['view', 'add', 'edit'],
    suppliers: ['view', 'add', 'edit', 'delete'],
    products: ['view', 'add', 'edit'],
    purchases: ['view', 'add', 'edit'],
  },
  salesperson: {
    pos: ['view', 'add'],
    customers: ['view', 'add'],
  },
  custom: {},
};


interface UserFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user?: AppUser;
  allUsers?: AppUser[];
}

export function UserForm({ isOpen, onOpenChange, user, allUsers }: UserFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [copyUserPopoverOpen, setCopyUserPopoverOpen] = useState(false);

  const isEditMode = !!user;

  const infoForm = useForm<z.infer<typeof userInfoSchemaBase> & { password?: string }>({
    resolver: zodResolver(isEditMode ? updateUserInfoSchema : newUserInfoSchema),
    defaultValues: {
        email: '',
        displayName: '',
        role: 'custom',
        password: '',
    }
  });

  const permissionsForm = useForm<z.infer<typeof permissionsFormSchema>>({
      resolver: zodResolver(permissionsFormSchema),
      defaultValues: {
          permissions: {}
      }
  });
  
  const role = infoForm.watch('role');

  useEffect(() => {
    if(isOpen) {
      if (user) {
        infoForm.reset({
          email: user.email,
          displayName: user.displayName || '',
          role: user.role,
          password: '',
        });
        permissionsForm.reset({
            permissions: user.permissions || defaultPermissions[user.role] || {}
        });
      } else {
        infoForm.reset({
          email: '',
          displayName: '',
          role: 'custom',
          password: '',
        });
        permissionsForm.reset({
            permissions: {}
        });
      }
    }
  }, [user, isOpen, infoForm, permissionsForm]);

  const handleApplyDefaultPermissions = () => {
    if (role && role !== 'custom') {
      permissionsForm.setValue('permissions', defaultPermissions[role], { shouldValidate: true, shouldDirty: true });
       toast({
        title: "Đã áp dụng",
        description: `Đã áp dụng bộ quyền mặc định cho vai trò "${getRoleVietnamese(role)}".`,
      });
    }
  };


  const onInfoSubmit = async (data: z.infer<typeof userInfoSchemaBase> & { password?: string }) => {
    const result = await upsertUser({ ...data, id: user?.id });
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã ${user ? 'cập nhật' : 'tạo'} thông tin người dùng.`,
      });
      if (!user) { // If creating new user, close dialog
          onOpenChange(false);
          infoForm.reset();
      }
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
  };
  
  const onPermissionsSubmit = async (data: z.infer<typeof permissionsFormSchema>) => {
    const result = await upsertUser({ id: user?.id, permissions: data.permissions });
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã cập nhật phân quyền.`,
      });
      router.refresh();
      permissionsForm.reset(data, { keepValues: true }); // Reset form state after successful submission
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
  }
  
  const handleCopyPermissions = (sourceUserId: string) => {
    const sourceUser = allUsers?.find(u => u.id === sourceUserId);
    if (sourceUser?.permissions) {
        permissionsForm.setValue('permissions', sourceUser.permissions, { shouldValidate: true, shouldDirty: true });
        toast({
            title: "Đã sao chép",
            description: `Đã sao chép quyền từ người dùng ${sourceUser.displayName || sourceUser.email}.`
        });
    }
    setCopyUserPopoverOpen(false);
  }
  
  const getRoleVietnamese = (role: string) => {
    switch (role) {
      case 'admin': return 'Quản trị viên';
      case 'accountant': return 'Kế toán';
      case 'inventory_manager': return 'Quản lý kho';
      case 'salesperson': return 'Nhân viên bán hàng';
      case 'custom': return 'Tùy chỉnh';
      default: return role;
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{user ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}</DialogTitle>
          <DialogDescription>
            {user ? 'Cập nhật chi tiết cho người dùng này.' : 'Tạo tài khoản mới, gán vai trò và phân quyền chi tiết.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-6 max-h-[calc(80vh-100px)]">
            <Form {...infoForm}>
                <form onSubmit={infoForm.handleSubmit(onInfoSubmit)} className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Thông tin tài khoản</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                            control={infoForm.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="example@email.com" {...field} disabled={!!user} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                                control={infoForm.control}
                                name="password"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mật khẩu</FormLabel>
                                    <FormControl>
                                    <Input type="password" placeholder={user ? "Để trống nếu không muốn đổi" : "••••••••"} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                            control={infoForm.control}
                            name="displayName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Tên hiển thị</FormLabel>
                                <FormControl>
                                    <Input placeholder="John Doe" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={infoForm.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Vai trò</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn một vai trò" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        <SelectItem value="admin">Quản trị viên</SelectItem>
                                        <SelectItem value="accountant">Kế toán</SelectItem>
                                        <SelectItem value="inventory_manager">Quản lý kho</SelectItem>
                                        <SelectItem value="salesperson">Nhân viên bán hàng</SelectItem>
                                        <SelectItem value="custom">Tùy chỉnh</SelectItem>
                                        </SelectContent>
                                    </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </CardContent>
                        <div className="p-6 pt-0">
                            <Button type="submit" className="w-full" disabled={infoForm.formState.isSubmitting}>
                                {infoForm.formState.isSubmitting ? 'Đang lưu...' : (isEditMode ? 'Lưu thay đổi thông tin' : 'Tạo người dùng')}
                            </Button>
                        </div>
                    </Card>
                </form>
            </Form>
            
            {isEditMode && (
                 <Form {...permissionsForm}>
                    <form onSubmit={permissionsForm.handleSubmit(onPermissionsSubmit)} className="space-y-4">
                        <Card>
                             <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Phân quyền chi tiết</CardTitle>
                                    <Popover open={copyUserPopoverOpen} onOpenChange={setCopyUserPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button type="button" variant="outline" size="sm"><Copy className="h-4 w-4 mr-2" />Sao chép</Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0">
                                            <Command>
                                                <CommandInput placeholder="Tìm người dùng để sao chép..." />
                                                <CommandList>
                                                    <CommandEmpty>Không tìm thấy.</CommandEmpty>
                                                    <CommandGroup>
                                                        {allUsers?.filter(u => u.id !== user.id).map((sourceUser) => (
                                                            <CommandItem
                                                                key={sourceUser.id}
                                                                value={`${sourceUser.displayName} ${sourceUser.email}`}
                                                                onSelect={() => handleCopyPermissions(sourceUser.id!)}
                                                            >
                                                                {sourceUser.displayName || sourceUser.email}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                 <CardDescription>
                                    {role !== 'custom' && (
                                        <Button size="sm" variant="link" type="button" onClick={handleApplyDefaultPermissions} className="p-0 h-auto mt-2 text-xs">
                                            <RefreshCw className="h-3 w-3 mr-1" />
                                            Áp dụng lại quyền mặc định cho vai trò "{getRoleVietnamese(role)}"
                                        </Button>
                                    )}
                                 </CardDescription>
                             </CardHeader>
                             <CardContent className="space-y-2">
                                {modules.map((module) => (
                                <FormField
                                    key={module.id}
                                    control={permissionsForm.control}
                                    name={`permissions.${module.id}`}
                                    render={() => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                            <div className="space-y-0.5">
                                                <FormLabel>{module.name}</FormLabel>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                {permissions.map((permission) => (
                                                    <FormField
                                                        key={permission.id}
                                                        control={permissionsForm.control}
                                                        name={`permissions.${module.id}`}
                                                        render={({ field }) => {
                                                            return (
                                                            <FormItem
                                                                key={permission.id}
                                                                className="flex flex-row items-center space-x-2 space-y-0"
                                                            >
                                                                <FormControl>
                                                                <Checkbox
                                                                    checked={field.value?.includes(permission.id)}
                                                                    onCheckedChange={(checked) => {
                                                                    return checked
                                                                        ? field.onChange([...(field.value || []), permission.id])
                                                                        : field.onChange(
                                                                            field.value?.filter(
                                                                            (value) => value !== permission.id
                                                                            )
                                                                        )
                                                                    }}
                                                                />
                                                                </FormControl>
                                                                <FormLabel className="text-sm font-normal">
                                                                {permission.name}
                                                                </FormLabel>
                                                            </FormItem>
                                                            )
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                ))}
                             </CardContent>
                             <div className="p-6 pt-0">
                                <Button type="submit" className="w-full" disabled={permissionsForm.formState.isSubmitting}>
                                    {permissionsForm.formState.isSubmitting ? 'Đang lưu...' : 'Lưu phân quyền'}
                                </Button>
                             </div>
                        </Card>
                    </form>
                 </Form>
            )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
