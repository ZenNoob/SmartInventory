'use client'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"
import { updateOnlineProduct, OnlineProduct } from "../../../actions"

const formSchema = z.object({
  seoSlug: z.string()
    .min(3, "Slug phải có ít nhất 3 ký tự")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ được chứa chữ thường, số và dấu gạch ngang"),
  isPublished: z.boolean(),
  onlinePrice: z.number().optional(),
  onlineDescription: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  displayOrder: z.number(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditProductDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onlineStoreId: string;
  product: OnlineProduct | null;
}

export function EditProductDialog({ isOpen, onOpenChange, onlineStoreId, product }: EditProductDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      seoSlug: "",
      isPublished: true,
      onlinePrice: undefined,
      onlineDescription: "",
      seoTitle: "",
      seoDescription: "",
      displayOrder: 0,
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        seoSlug: product.seoSlug,
        isPublished: product.isPublished,
        onlinePrice: product.onlinePrice || undefined,
        onlineDescription: product.onlineDescription || "",
        seoTitle: product.seoTitle || "",
        seoDescription: product.seoDescription || "",
        displayOrder: product.displayOrder,
      });
    }
  }, [product, form]);

  const onSubmit = async (values: FormValues) => {
    if (!product) return;

    setIsSubmitting(true);
    try {
      const result = await updateOnlineProduct(onlineStoreId, product.id, {
        seoSlug: values.seoSlug,
        isPublished: values.isPublished,
        onlinePrice: values.onlinePrice,
        onlineDescription: values.onlineDescription || undefined,
        seoTitle: values.seoTitle || undefined,
        seoDescription: values.seoDescription || undefined,
        displayOrder: values.displayOrder,
      });

      if (result.success) {
        toast({
          title: "Thành công!",
          description: "Đã cập nhật sản phẩm.",
        });
        onOpenChange(false);
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Đã xảy ra lỗi khi cập nhật sản phẩm",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa sản phẩm online</DialogTitle>
          <DialogDescription>
            {product.productName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="seoSlug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO Slug *</FormLabel>
                  <FormControl>
                    <Input placeholder="ten-san-pham" {...field} />
                  </FormControl>
                  <FormDescription>
                    Đường dẫn URL của sản phẩm
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="onlinePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giá bán online</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={product.sellingPrice?.toString() || "Để trống để dùng giá gốc"}
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>
                    Để trống để sử dụng giá bán gốc
                    {product.sellingPrice && ` (${formatCurrency(product.sellingPrice)})`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="onlineDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả online</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Mô tả chi tiết sản phẩm cho khách hàng online..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="seoTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SEO Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Tiêu đề SEO" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="seoDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SEO Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Mô tả SEO" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="displayOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thứ tự hiển thị</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Số nhỏ hơn sẽ hiển thị trước
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Hiển thị sản phẩm</FormLabel>
                    <FormDescription>
                      Sản phẩm sẽ hiển thị trên cửa hàng online
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
