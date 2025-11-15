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
import { Input } from "@/components/ui/input"
import { Customer } from '@/lib/types'
import { upsertCustomer } from '../actions'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { Separator } from '@/components/ui/separator'

const customerFormSchema = z.object({
  name: z.string().min(1, "Tên không được để trống."),
  email: z.string().email("Email không hợp lệ.").optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  customerType: z.enum(['personal', 'business']),
  customerGroup: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  birthday: z.date().optional(),
  zalo: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankBranch: z.string().optional(),
  creditLimit: z.coerce.number().min(0, "Hạn mức tín dụng phải là số không âm."),
  status: z.enum(['active', 'inactive']),
  loyaltyPoints: z.coerce.number().optional(),
  lifetimePoints: z.coerce.number().optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean, newCustomerId?: string) => void;
  customer?: Customer;
}

export function CustomerForm({ isOpen, onOpenChange, customer }: CustomerFormProps) {
  const { toast } = useToast();
  const router = useRouter();

  const defaultValues: Partial<CustomerFormValues> = customer
    ? { 
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        customerType: customer.customerType,
        customerGroup: customer.customerGroup || '',
        gender: customer.gender,
        birthday: customer.birthday ? new Date(customer.birthday) : undefined,
        zalo: customer.zalo || '',
        bankName: customer.bankName || '',
        bankAccountNumber: customer.bankAccountNumber || '',
        bankBranch: customer.bankBranch || '',
        creditLimit: customer.creditLimit,
        status: customer.status,
        loyaltyPoints: customer.loyaltyPoints || 0,
        lifetimePoints: customer.lifetimePoints || 0,
      }
    : { 
        name: '',
        customerType: 'personal',
        creditLimit: 0,
        status: 'active',
        loyaltyPoints: 0,
        lifetimePoints: 0,
      };
  
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(
        customer
        ? { 
            name: customer.name,
            email: customer.email || '',
            phone: customer.phone || '',
            address: customer.address || '',
            customerType: customer.customerType,
            customerGroup: customer.customerGroup || '',
            gender: customer.gender,
            birthday: customer.birthday ? new Date(customer.birthday) : undefined,
            zalo: customer.zalo || '',
            bankName: customer.bankName || '',
            bankAccountNumber: customer.bankAccountNumber || '',
            bankBranch: customer.bankBranch || '',
            creditLimit: customer.creditLimit,
            status: customer.status,
            loyaltyPoints: customer.loyaltyPoints || 0,
            lifetimePoints: customer.lifetimePoints || 0,
          }
        : { 
            name: '',
            email: '',
            phone: '',
            address: '',
            customerType: 'personal',
            customerGroup: '',
            gender: undefined,
            birthday: undefined,
            zalo: '',
            bankName: '',
            bankAccountNumber: '',
            bankBranch: '',
            creditLimit: 0,
            status: 'active',
            loyaltyPoints: 0,
            lifetimePoints: 0,
          }
      );
    }
  }, [customer, isOpen, form]);

  const onSubmit = async (data: CustomerFormValues) => {
    const dataToSubmit: Partial<Customer> = {
      ...data,
      id: customer?.id,
      birthday: data.birthday ? data.birthday.toISOString() : undefined,
    }
    const result = await upsertCustomer(dataToSubmit);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã ${customer ? 'cập nhật' : 'tạo'} khách hàng thành công.`,
      });
      onOpenChange(false, result.customerId);
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
    <Dialog open={isOpen} onOpenChange={(open) => onOpenChange(open)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{customer ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}</DialogTitle>
          <DialogDescription>
            Điền vào các chi tiết dưới đây.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-rows-[1fr_auto] gap-4 max-h-[80vh] overflow-hidden">
            <div className='space-y-4 overflow-y-auto pr-6'>
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tên khách hàng</FormLabel>
                        <FormControl>
                            <Input placeholder="Nguyễn Văn A" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="customerType"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Loại khách hàng</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn loại khách hàng" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="personal">Cá nhân</SelectItem>
                                    <SelectItem value="business">Doanh nghiệp</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Trạng thái</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn trạng thái" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="active">Đang hoạt động</SelectItem>
                                    <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="customerGroup"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nhóm khách hàng</FormLabel>
                        <FormControl>
                            <Input placeholder="Vd: VIP, Thân thiết" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="example@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Điện thoại</FormLabel>
                            <FormControl>
                                <Input placeholder="0905123456" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Địa chỉ</FormLabel>
                        <FormControl>
                            <Input placeholder="123 Đường ABC, Quận 1, TP.HCM" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Giới tính</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn giới tính" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="male">Nam</SelectItem>
                                    <SelectItem value="female">Nữ</SelectItem>
                                    <SelectItem value="other">Khác</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="birthday"
                        render={({ field }) => (
                            <FormItem className="flex flex-col pt-2">
                                <FormLabel>Ngày sinh</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full pl-3 text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                        )}
                                        >
                                        {field.value ? (
                                            format(field.value, "dd/MM/yyyy")
                                        ) : (
                                            <span>Chọn một ngày</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) =>
                                        date > new Date() || date < new Date("1900-01-01")
                                        }
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="zalo"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Zalo</FormLabel>
                            <FormControl>
                                <Input placeholder="Số điện thoại Zalo" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                 </div>
                 <Separator />
                  <div>
                    <h3 className="text-md font-medium">Thông tin ngân hàng</h3>
                    <p className="text-sm text-muted-foreground mb-4">Thông tin thanh toán của khách hàng.</p>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="bankName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tên ngân hàng</FormLabel>
                            <FormControl>
                                <Input placeholder="Vd: Vietcombank" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bankAccountNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Số tài khoản</FormLabel>
                            <FormControl>
                                <Input placeholder="0123456789" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bankBranch"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Chi nhánh</FormLabel>
                            <FormControl>
                                <Input placeholder="Vd: PGD Thủ Đức" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                      />
                    </div>
                  </div>
                 <Separator />
                 <FormField
                        control={form.control}
                        name="creditLimit"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Hạn mức tín dụng</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                {customer && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-md font-medium">Khách hàng thân thiết</h3>
                      <p className="text-sm text-muted-foreground mb-4">Điều chỉnh điểm thưởng và điểm tích lũy của khách hàng.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="loyaltyPoints"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Điểm có thể tiêu</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormDescription>Số điểm khách hàng có thể dùng để giảm giá.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="lifetimePoints"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Tổng điểm tích lũy</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormDescription>Tổng điểm để xét hạng. Thay đổi điểm này có thể thay đổi hạng của khách hàng.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                      </div>
                    </div>
                  </>
                )}
            </div>

            <DialogFooter className="pt-4 border-t">
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
