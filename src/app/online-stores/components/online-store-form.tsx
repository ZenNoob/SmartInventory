'use client'

import { useState } from "react"
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
import { useToast } from "@/hooks/use-toast"
import { createOnlineStore, OnlineStore } from "../actions"

const formSchema = z.object({
  storeName: z.string().min(1, "Tên cửa hàng là bắt buộc"),
  slug: z.string()
    .min(3, "Slug phải có ít nhất 3 ký tự")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ được chứa chữ thường, số và dấu gạch ngang"),
  contactEmail: z.string().email("Email không hợp lệ"),
  contactPhone: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface OnlineStoreFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  store?: OnlineStore;
}

export function OnlineStoreForm({ isOpen, onOpenChange, store }: OnlineStoreFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      storeName: store?.storeName || "",
      slug: store?.slug || "",
      contactEmail: store?.contactEmail || "",
      contactPhone: store?.contactPhone || "",
      description: store?.description || "",
      address: store?.address || "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createOnlineStore(values);
      if (result.success) {
        toast({
          title: "Thành công!",
          description: "Đã tạo cửa hàng online mới.",
        });
        form.reset();
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
        description: "Đã xảy ra lỗi khi tạo cửa hàng",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tạo cửa hàng online mới</DialogTitle>
          <DialogDescription>
            Điền thông tin cơ bản để tạo cửa hàng online. Bạn có thể cấu hình thêm sau.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="storeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên cửa hàng *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Cửa hàng ABC" 
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (!form.getValues("slug")) {
                          form.setValue("slug", generateSlug(e.target.value));
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug (URL) *</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <span className="mr-2 text-sm text-muted-foreground whitespace-nowrap">
                        /store/
                      </span>
                      <Input placeholder="cua-hang-abc" {...field} />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Đường dẫn URL của cửa hàng (chỉ chữ thường, số và dấu gạch ngang)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email liên hệ *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số điện thoại</FormLabel>
                  <FormControl>
                    <Input placeholder="0123 456 789" {...field} />
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
                    <Textarea 
                      placeholder="Mô tả ngắn về cửa hàng của bạn..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa chỉ</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Đường ABC, Quận XYZ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang tạo..." : "Tạo cửa hàng"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
