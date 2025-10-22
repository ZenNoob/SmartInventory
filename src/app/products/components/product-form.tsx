'use client'

import { useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
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
import { Product, Category, PurchaseLot } from '@/lib/types'
import { upsertProduct } from '../actions'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { PlusCircle, Trash2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

const purchaseLotSchema = z.object({
    importDate: z.string().min(1, "Ngày nhập không được để trống."),
    quantity: z.coerce.number().min(0, "Số lượng phải là số dương."),
    cost: z.coerce.number().min(0, "Giá phải là số dương."),
    unit: z.string().min(1, "Đơn vị tính không được để trống."),
});

const productFormSchema = z.object({
  name: z.string().min(1, "Tên sản phẩm không được để trống."),
  categoryId: z.string().min(1, "Danh mục là bắt buộc."),
  status: z.enum(['active', 'draft', 'archived']),
  purchaseLots: z.array(purchaseLotSchema).optional(),
});


type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  product?: Product;
  categories: Category[];
}

export function ProductForm({ isOpen, onOpenChange, product, categories }: ProductFormProps) {
  const { toast } = useToast();
  const router = useRouter();

  const defaultValues: Partial<ProductFormValues> = product
    ? { 
        name: product.name, 
        categoryId: product.categoryId,
        status: product.status,
        purchaseLots: product.purchaseLots || []
      }
    : { 
        name: '', 
        categoryId: '',
        status: 'draft',
        purchaseLots: []
      };
  
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "purchaseLots",
  });

  useEffect(() => {
    if (isOpen) {
      if (product) {
        // Editing existing product
        form.reset({
          name: product.name,
          categoryId: product.categoryId,
          status: product.status,
          purchaseLots: product.purchaseLots || [] // Ensure it's an array
        });
      } else {
        // Creating a new product, start with one empty lot
        form.reset({
          name: '',
          categoryId: '',
          status: 'draft',
          purchaseLots: [{ importDate: new Date().toISOString().split('T')[0], quantity: 0, cost: 0, unit: 'cái' }]
        });
      }
    }
  }, [product, isOpen, form]);


  const onSubmit = async (data: ProductFormValues) => {
    const result = await upsertProduct({ ...data, id: product?.id });
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã ${product ? 'cập nhật' : 'tạo'} sản phẩm thành công.`,
      });
      onOpenChange(false);
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</DialogTitle>
          <DialogDescription>
            {product ? 'Cập nhật chi tiết cho sản phẩm này.' : 'Tạo một sản phẩm mới trong kho của bạn.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[60vh] p-4 -mx-4">
              <div className='space-y-4 px-2'>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên sản phẩm</FormLabel>
                      <FormControl>
                        <Input placeholder="Ví dụ: Laptop Pro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Danh mục</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn một danh mục" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
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
                            <SelectItem value="draft">Bản nháp</SelectItem>
                            <SelectItem value="active">Hoạt động</SelectItem>
                            <SelectItem value="archived">Lưu trữ</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>


                <Separator className='my-6'/>
                
                <div>
                    <h3 className="text-lg font-medium">Các đợt nhập hàng</h3>
                    <p className="text-sm text-muted-foreground">
                        Thêm hoặc xóa các đợt nhập hàng cho sản phẩm này.
                    </p>
                </div>
              
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border rounded-md relative">
                       <FormField
                          control={form.control}
                          name={`purchaseLots.${index}.importDate`}
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Ngày nhập</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`purchaseLots.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Số lượng</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name={`purchaseLots.${index}.cost`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Giá</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name={`purchaseLots.${index}.unit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Đơn vị</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => append({ importDate: new Date().toISOString().split('T')[0], quantity: 0, cost: 0, unit: 'cái' })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Thêm đợt nhập
                  </Button>
                </div>
              </div>
            </ScrollArea>
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
