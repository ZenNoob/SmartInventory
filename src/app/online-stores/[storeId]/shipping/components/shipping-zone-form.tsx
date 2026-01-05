'use client'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { X } from "lucide-react"

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
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { createShippingZone, updateShippingZone, ShippingZone } from "../../../actions"

// Vietnam provinces list
const VIETNAM_PROVINCES = [
  'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu',
  'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước',
  'Bình Thuận', 'Cà Mau', 'Cần Thơ', 'Cao Bằng', 'Đà Nẵng',
  'Đắk Lắk', 'Đắk Nông', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp',
  'Gia Lai', 'Hà Giang', 'Hà Nam', 'Hà Nội', 'Hà Tĩnh',
  'Hải Dương', 'Hải Phòng', 'Hậu Giang', 'Hòa Bình', 'Hưng Yên',
  'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu', 'Lâm Đồng',
  'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An',
  'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên', 'Quảng Bình',
  'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sóc Trăng',
  'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên', 'Thanh Hóa',
  'Thừa Thiên Huế', 'Tiền Giang', 'TP. Hồ Chí Minh', 'Trà Vinh', 'Tuyên Quang',
  'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái',
];

const formSchema = z.object({
  name: z.string().min(1, "Tên vùng giao hàng là bắt buộc"),
  provinces: z.array(z.string()).min(1, "Vui lòng chọn ít nhất một tỉnh/thành phố"),
  flatRate: z.number().optional(),
  freeShippingThreshold: z.number().optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface ShippingZoneFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onlineStoreId: string;
  zone?: ShippingZone | null;
}

export function ShippingZoneForm({ isOpen, onOpenChange, onlineStoreId, zone }: ShippingZoneFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      provinces: [],
      flatRate: undefined,
      freeShippingThreshold: undefined,
      isActive: true,
    },
  });

  useEffect(() => {
    if (zone) {
      form.reset({
        name: zone.name,
        provinces: zone.provinces,
        flatRate: zone.flatRate || undefined,
        freeShippingThreshold: zone.freeShippingThreshold || undefined,
        isActive: zone.isActive,
      });
    } else {
      form.reset({
        name: "",
        provinces: [],
        flatRate: undefined,
        freeShippingThreshold: undefined,
        isActive: true,
      });
    }
  }, [zone, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const result = zone
        ? await updateShippingZone(onlineStoreId, zone.id, values)
        : await createShippingZone(onlineStoreId, values);

      if (result.success) {
        toast({
          title: "Thành công!",
          description: zone ? "Đã cập nhật vùng giao hàng." : "Đã tạo vùng giao hàng mới.",
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
        description: "Đã xảy ra lỗi",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProvinces = form.watch("provinces");

  const filteredProvinces = VIETNAM_PROVINCES.filter(
    (province) =>
      province.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selectedProvinces.includes(province)
  );

  const addProvince = (province: string) => {
    const current = form.getValues("provinces");
    form.setValue("provinces", [...current, province]);
    setSearchTerm("");
  };

  const removeProvince = (province: string) => {
    const current = form.getValues("provinces");
    form.setValue("provinces", current.filter((p) => p !== province));
  };

  const addAllProvinces = () => {
    form.setValue("provinces", [...VIETNAM_PROVINCES]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{zone ? "Chỉnh sửa vùng giao hàng" : "Thêm vùng giao hàng"}</DialogTitle>
          <DialogDescription>
            Cấu hình phí vận chuyển cho các tỉnh/thành phố
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên vùng giao hàng *</FormLabel>
                  <FormControl>
                    <Input placeholder="VD: Miền Bắc, Nội thành HCM..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="provinces"
              render={() => (
                <FormItem>
                  <FormLabel>Tỉnh/Thành phố *</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Tìm tỉnh/thành phố..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <Button type="button" variant="outline" onClick={addAllProvinces}>
                        Chọn tất cả
                      </Button>
                    </div>

                    {/* Selected provinces */}
                    {selectedProvinces.length > 0 && (
                      <div className="flex flex-wrap gap-1 p-2 border rounded-md">
                        {selectedProvinces.map((province) => (
                          <Badge key={province} variant="secondary" className="gap-1">
                            {province}
                            <button
                              type="button"
                              onClick={() => removeProvince(province)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Province suggestions */}
                    {searchTerm && filteredProvinces.length > 0 && (
                      <div className="border rounded-md max-h-40 overflow-y-auto">
                        {filteredProvinces.slice(0, 10).map((province) => (
                          <button
                            key={province}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                            onClick={() => addProvince(province)}
                          >
                            {province}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <FormDescription>
                    Đã chọn {selectedProvinces.length} tỉnh/thành phố
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="flatRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phí vận chuyển (VNĐ)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="30000"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="freeShippingThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Miễn phí từ (VNĐ)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="500000"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Đơn hàng từ giá trị này sẽ được miễn phí ship
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Kích hoạt</FormLabel>
                    <FormDescription>
                      Vùng giao hàng sẽ được áp dụng khi khách đặt hàng
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
                {isSubmitting ? "Đang lưu..." : zone ? "Cập nhật" : "Tạo vùng"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
