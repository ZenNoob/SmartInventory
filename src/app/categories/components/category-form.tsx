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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Category } from '@/hooks/use-categories'
import { upsertCategory } from '../actions'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

const categoryFormSchema = z.object({
  name: z.string().min(1, "Tên danh mục không được để trống."),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  category?: Category;
  onSuccess?: () => void;
}

export function CategoryForm({ isOpen, onOpenChange, category, onSuccess }: CategoryFormProps) {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: category ? { name: category.name, description: category.description || '' } : { name: '', description: '' },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(
        category 
        ? { name: category.name, description: category.description || '' } 
        : { name: '', description: '' }
      );
    }
  }, [category, isOpen, form]);

  const onSubmit = async (data: CategoryFormValues) => {
    const result = await upsertCategory({ ...data, id: category?.id });
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã ${category ? 'cập nhật' : 'tạo'} danh mục thành công.`,
      });
      onOpenChange(false);
      onSuccess?.();
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}</DialogTitle>
          <DialogDescription>
            {category ? 'Cập nhật chi tiết cho danh mục này.' : 'Tạo một danh mục mới để phân loại sản phẩm.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên danh mục</FormLabel>
                  <FormControl>
                    <Input placeholder="Ví dụ: Đồ điện tử" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Mô tả ngắn về danh mục này." {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
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
