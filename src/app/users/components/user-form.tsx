'use client'

import { useEffect } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from "@/components/ui/input"
import { AppUser, Module, Permission, Permissions } from '@/lib/types'
import { upsertUser } from '../actions'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Separator } from '@/components/ui/separator'

const permissionsSchema = z.record(z.array(z.enum(['view', 'add', 'edit', 'delete'])))

const userFormSchemaBase = z.object({
  email: z.string().email({ message: "Email không hợp lệ." }),
  displayName: z.string().optional(),
  role: z.enum(['admin', 'accountant', 'inventory_manager', 'custom']),
  password: z.string().optional(),
  permissions: permissionsSchema.optional(),
});


const modules: { id: Module; name: string; description: string; }[] = [
    { id: 'dashboard', name: 'Bảng điều khiển', description: 'Xem tổng quan tình hình kinh doanh, doanh thu, công nợ.' },
    { id: 'pos', name: 'POS - Bán tại quầy', description: 'Sử dụng giao diện bán hàng nhanh tại quầy.' },
    { id: 'categories', name: 'Danh mục', description: 'Quản lý các loại sản phẩm (VD: Giống, Phân bón).' },
    { id: 'units', name: 'Đơn vị tính', description: 'Quản lý các đơn vị (VD: Cái, Kg, Bao).' },
    { id: 'products', name: 'Sản phẩm', description: 'Quản lý thông tin, giá và các lô nhập của sản phẩm.' },
    { id: 'purchases', name: 'Nhập hàng', description: 'Tạo và quản lý các phiếu nhập hàng từ nhà cung cấp.' },
    { id: 'sales', name: 'Bán hàng', description: 'Tạo và quản lý các đơn hàng bán cho khách.' },
    { id: 'customers', name: 'Khách hàng', description: 'Quản lý thông tin và công nợ của khách hàng.' },
    { id: 'reports', name: 'Báo cáo', description: 'Xem các báo cáo chi tiết về doanh thu, công nợ, tồn kho.' },
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
    products: ['view', 'add', 'edit', 'delete'],
    purchases: ['view', 'add', 'edit', 'delete'],
    sales: ['view', 'add', 'edit', 'delete'],
    customers: ['view', 'add', 'edit', 'delete'],
    reports: ['view'],
    users: ['view', 'add', 'edit', 'delete'],
    settings: ['view', 'edit'],
  },
  accountant: {
    dashboard: ['view'],
    sales: ['view', 'add', 'edit'],
    customers: ['view', 'add', 'edit'],
    reports: ['view'],
  },
  inventory_manager: {
    dashboard: ['view'],
    categories: ['view', 'add', 'edit'],
    units: ['view', 'add', 'edit'],
    products: ['view', 'add', 'edit'],
    purchases: ['view', 'add', 'edit'],
  },
  custom: {},
};


interface UserFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user?: AppUser;
}

export function UserForm({ isOpen, onOpenChange, user }: UserFormProps) {
  const { toast } = useToast();
  const router = useRouter();

  const userFormSchema = userFormSchemaBase.superRefine((data, ctx) => {
    if (!user && !data.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Mật khẩu là bắt buộc cho người dùng mới.',
      });
    }
    if (!user && data.password && data.password.length < 6) {
       ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Mật khẩu phải có ít nhất 6 ký tự.',
      });
    }
  });

  type UserFormValues = z.infer<typeof userFormSchema>;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
        email: '',
        displayName: '',
        role: 'custom',
        permissions: {},
    }
  });
  
  const role = form.watch('role');

  useEffect(() => {
    if(isOpen) {
      if (user) {
        form.reset({
          email: user.email,
          displayName: user.displayName || '',
          role: user.role,
          permissions: user.permissions || defaultPermissions[user.role] || {},
        });
      } else {
        form.reset({
          email: '',
          displayName: '',
          role: 'custom',
          password: '',
          permissions: {},
        });
      }
    }
  }, [user, isOpen, form]);

  useEffect(() => {
    if (role && role !== 'custom') {
      form.setValue('permissions', defaultPermissions[role]);
    }
  }, [role, form]);


  const onSubmit = async (data: UserFormValues) => {
    const result = await upsertUser({ ...data, id: user?.id });
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã ${user ? 'cập nhật' : 'tạo'} người dùng thành công.`,
      });
      onOpenChange(false);
      form.reset();
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{user ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}</DialogTitle>
          <DialogDescription>
            {user ? 'Cập nhật chi tiết cho người dùng này.' : 'Tạo tài khoản mới, gán vai trò và phân quyền chi tiết.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-6 max-h-[calc(80vh-150px)]">
                <div className="space-y-4">
                     <FormField
                      control={form.control}
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
                     {!user && (
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mật khẩu</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
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
                      control={form.control}
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
                              <SelectItem value="custom">Tùy chỉnh</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                <div className="space-y-4">
                    <h3 className="font-medium">Phân quyền chi tiết</h3>
                    <div className="space-y-2">
                        {modules.map((module) => (
                           <FormField
                            key={module.id}
                            control={form.control}
                            name={`permissions.${module.id}`}
                            render={() => (
                                <FormItem className="flex flex-col items-start justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5 mb-2">
                                        <FormLabel>{module.name}</FormLabel>
                                        <FormDescription>{module.description}</FormDescription>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        {permissions.map((permission) => (
                                             <FormField
                                                key={permission.id}
                                                control={form.control}
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
                                                            const isCustomRole = form.getValues('role') === 'custom';
                                                            if (!isCustomRole) {
                                                                form.setValue('role', 'custom');
                                                            }
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
                    </div>
                </div>
            </div>
            <DialogFooter className='pt-4'>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
