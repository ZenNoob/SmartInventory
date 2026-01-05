'use client'

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Search, Check, ChevronsUpDown } from "lucide-react"

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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"
import { cn, formatCurrency } from "@/lib/utils"
import { createOnlineProduct } from "../../../actions"
import { getProducts } from "@/app/products/actions"

interface Product {
  id: string;
  name: string;
  barcode?: string;
  sellingPrice?: number;
  currentStock: number;
}

const formSchema = z.object({
  productId: z.string().min(1, "Vui lòng chọn sản phẩm"),
  seoSlug: z.string()
    .min(3, "Slug phải có ít nhất 3 ký tự")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ được chứa chữ thường, số và dấu gạch ngang"),
  isPublished: z.boolean(),
  onlinePrice: z.number().optional(),
  onlineDescription: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddProductDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onlineStoreId: string;
}

export function AddProductDialog({ isOpen, onOpenChange, onlineStoreId }: AddProductDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: "",
      seoSlug: "",
      isPublished: true,
      onlinePrice: undefined,
      onlineDescription: "",
      seoTitle: "",
      seoDescription: "",
    },
  });

  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const result = await getProducts({ pageSize: 1000, status: 'active' });
      if (result.success && result.data) {
        setProducts(result.data.map(p => ({
          id: p.id,
          name: p.name,
          barcode: p.barcode,
          sellingPrice: p.sellingPrice,
          currentStock: p.currentStock,
        })));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      form.reset();
    }
  }, [isOpen, fetchProducts, form]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const selectedProduct = products.find(p => p.id === form.watch("productId"));

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createOnlineProduct(onlineStoreId, {
        productId: values.productId,
        seoSlug: values.seoSlug,
        isPublished: values.isPublished,
        onlinePrice: values.onlinePrice,
        onlineDescription: values.onlineDescription || undefined,
        seoTitle: values.seoTitle || undefined,
        seoDescription: values.seoDescription || undefined,
      });

      if (result.success) {
        toast({
          title: "Thành công!",
          description: "Đã thêm sản phẩm vào danh mục online.",
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
        description: "Đã xảy ra lỗi khi thêm sản phẩm",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm sản phẩm vào cửa hàng online</DialogTitle>
          <DialogDescription>
            Chọn sản phẩm từ kho hàng để bán trực tuyến
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Sản phẩm *</FormLabel>
                  <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {selectedProduct ? selectedProduct.name : "Chọn sản phẩm..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Tìm sản phẩm..." />
                        <CommandList>
                          <CommandEmpty>
                            {isLoadingProducts ? "Đang tải..." : "Không tìm thấy sản phẩm."}
                          </CommandEmpty>
                          <CommandGroup>
                            {products.map((product) => (
                              <CommandItem
                                key={product.id}
                                value={product.name}
                                onSelect={() => {
                                  field.onChange(product.id);
                                  form.setValue("seoSlug", generateSlug(product.name));
                                  form.setValue("seoTitle", product.name);
                                  setProductPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === product.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex-1">
                                  <div>{product.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {product.barcode && `${product.barcode} • `}
                                    {product.sellingPrice ? formatCurrency(product.sellingPrice) : 'Chưa có giá'}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    Đường dẫn URL của sản phẩm (chỉ chữ thường, số và dấu gạch ngang)
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
                      placeholder={selectedProduct?.sellingPrice?.toString() || "Để trống để dùng giá gốc"}
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>
                    Để trống để sử dụng giá bán gốc
                    {selectedProduct?.sellingPrice && ` (${formatCurrency(selectedProduct.sellingPrice)})`}
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
              name="isPublished"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Hiển thị ngay</FormLabel>
                    <FormDescription>
                      Sản phẩm sẽ hiển thị trên cửa hàng online ngay sau khi thêm
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
                {isSubmitting ? "Đang thêm..." : "Thêm sản phẩm"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
